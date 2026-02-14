import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─── Queries ───

export const getState = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("worldState").first();
    return state ?? null;
  },
});

export const getCurrentRound = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("worldState").first();
    if (!state?.currentRound) return null;
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_roundId", (q) => q.eq("roundId", state.currentRound!))
      .first();
    if (!round) return null;
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_round", (q) => q.eq("roundId", round.roundId))
      .collect();
    const spells = await ctx.db
      .query("spells")
      .withIndex("by_round", (q) => q.eq("roundId", round.roundId))
      .collect();
    const votes = await ctx.db
      .query("councilVotes")
      .withIndex("by_round", (q) => q.eq("roundId", round.roundId))
      .collect();
    return { round, ideas, spells, votes, phase: state.phase };
  },
});

export const getCharacters = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const q = ctx.db.query("characters").order("desc");
    return args.limit ? await q.take(args.limit) : await q.collect();
  },
});

export const getCharacterBySpell = query({
  args: { spellWord: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("characters")
      .withIndex("by_spellWord", (q) => q.eq("spellWord", args.spellWord.toLowerCase()))
      .first();
  },
});

export const getHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rounds = await ctx.db
      .query("rounds")
      .order("desc")
      .take(args.limit ?? 20);
    return rounds;
  },
});

export const getParticipant = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("participants")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
  },
});

// ─── Mutations ───

export const initWorld = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("worldState").first();
    if (existing) return existing._id;
    return await ctx.db.insert("worldState", {
      phase: "idle",
      currentRound: undefined,
      treasuryDumble: 0,
      treasuryMon: 0,
      totalRounds: 0,
      totalAppsBuilt: 0,
      totalSpellsCast: 0,
      totalCharacters: 0,
      updatedAt: Date.now(),
    });
  },
});

export const setPhase = mutation({
  args: { phase: v.string() },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("worldState").first();
    if (!state) throw new Error("World not initialized");
    await ctx.db.patch(state._id, { phase: args.phase, updatedAt: Date.now() });
  },
});

export const startRound = mutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("worldState").first();
    if (!state) throw new Error("World not initialized");
    const roundNum = state.totalRounds + 1;
    const roundId = `ROUND-${String(roundNum).padStart(3, "0")}`;
    await ctx.db.insert("rounds", {
      roundId,
      phase: "cauldron",
      startedAt: Date.now(),
    });
    await ctx.db.patch(state._id, {
      phase: "cauldron",
      currentRound: roundId,
      totalRounds: roundNum,
      updatedAt: Date.now(),
    });
    return roundId;
  },
});

export const submitIdea = mutation({
  args: {
    roundId: v.string(),
    title: v.string(),
    description: v.string(),
    submittedBy: v.string(),
    stakeAmount: v.number(),
    stakeCurrency: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ideas", {
      ...args,
      votes: 0,
      isWinner: false,
      createdAt: Date.now(),
    });
  },
});

export const castSpell = mutation({
  args: {
    roundId: v.string(),
    word: v.string(),
    caster: v.string(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("worldState").first();
    if (!state) throw new Error("World not initialized");

    const spellId = await ctx.db.insert("spells", {
      ...args,
      word: args.word.toLowerCase(),
      createdAt: Date.now(),
    });

    // Update treasury with spell cost
    await ctx.db.patch(state._id, {
      totalSpellsCast: state.totalSpellsCast + 1,
      treasuryDumble: state.treasuryDumble + args.cost,
      updatedAt: Date.now(),
    });

    return spellId;
  },
});

const ROLES = [
  "tech", "marketing", "design", "growth", "product",
  "founder", "compliance", "finance", "vc",
];

const RARITIES = ["common", "common", "common", "uncommon", "uncommon", "rare", "legendary"];

export const summonCharacter = mutation({
  args: {
    spellWord: v.string(),
    roundId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalized = args.spellWord.toLowerCase();

    // Check if character already exists for this spell
    const existing = await ctx.db
      .query("characters")
      .withIndex("by_spellWord", (q) => q.eq("spellWord", normalized))
      .first();

    if (existing) {
      // Returning character — update stats
      await ctx.db.patch(existing._id, {
        appearances: existing.appearances + 1,
        lastSeenAt: Date.now(),
        roundsServed: [...existing.roundsServed, args.roundId],
      });
      return existing._id;
    }

    // New character — generate from spell word
    const state = await ctx.db.query("worldState").first();
    if (!state) throw new Error("World not initialized");

    // Deterministic-ish role from spell hash
    const hash = normalized.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const role = ROLES[hash % ROLES.length];
    const rarity = RARITIES[hash % RARITIES.length];

    const charId = await ctx.db.insert("characters", {
      name: "", // To be set by Dumbleclaw after spawning the agent
      spellWord: normalized,
      role,
      description: "", // Set by Dumbleclaw
      appearances: 1,
      wins: 0,
      losses: 0,
      roundsServed: [args.roundId],
      rarity,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    });

    await ctx.db.patch(state._id, {
      totalCharacters: state.totalCharacters + 1,
      updatedAt: Date.now(),
    });

    return charId;
  },
});

export const updateCharacter = mutation({
  args: {
    id: v.id("characters"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    const clean = Object.fromEntries(Object.entries(patch).filter(([_, v]) => v !== undefined));
    if (Object.keys(clean).length > 0) {
      await ctx.db.patch(id, clean);
    }
  },
});

export const submitVote = mutation({
  args: {
    roundId: v.string(),
    characterId: v.id("characters"),
    ideaId: v.id("ideas"),
    reasoning: v.string(),
    weight: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("councilVotes", {
      ...args,
      createdAt: Date.now(),
    });
    // Increment vote count on idea
    const idea = await ctx.db.get(args.ideaId);
    if (idea) {
      await ctx.db.patch(args.ideaId, { votes: idea.votes + args.weight });
    }
  },
});

export const declareWinner = mutation({
  args: {
    roundId: v.string(),
    ideaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ideaId, { isWinner: true });
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_roundId", (q) => q.eq("roundId", args.roundId))
      .first();
    if (round) {
      const idea = await ctx.db.get(args.ideaId);
      await ctx.db.patch(round._id, {
        phase: "forge",
        winningIdeaId: args.ideaId,
        appName: idea?.title,
      });
    }
    const state = await ctx.db.query("worldState").first();
    if (state) {
      await ctx.db.patch(state._id, { phase: "forge", updatedAt: Date.now() });
    }
  },
});

export const completeRound = mutation({
  args: {
    roundId: v.string(),
    appUrl: v.optional(v.string()),
    tokenAddress: v.optional(v.string()),
    tokenSymbol: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_roundId", (q) => q.eq("roundId", args.roundId))
      .first();
    if (round) {
      await ctx.db.patch(round._id, {
        phase: "completed",
        endedAt: Date.now(),
        appUrl: args.appUrl,
        tokenAddress: args.tokenAddress,
        tokenSymbol: args.tokenSymbol,
      });
    }
    const state = await ctx.db.query("worldState").first();
    if (state) {
      await ctx.db.patch(state._id, {
        phase: "idle",
        totalAppsBuilt: state.totalAppsBuilt + 1,
        updatedAt: Date.now(),
      });
    }
  },
});

export const joinWorld = mutation({
  args: {
    address: v.string(),
    displayName: v.string(),
    isAgent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("participants", {
      ...args,
      roundsParticipated: 0,
      totalStaked: 0,
      totalWon: 0,
      joinedAt: Date.now(),
    });
  },
});
