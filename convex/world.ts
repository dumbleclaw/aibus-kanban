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

export const getActiveRound = query({
  args: {},
  handler: async (ctx) => {
    // Find latest round that isn't completed
    const rounds = await ctx.db.query("rounds").order("desc").take(10);
    const active = rounds.find((r) => r.phase !== "completed" && r.phase !== "settled");
    if (!active) return null;
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_round", (q) => q.eq("roundId", active.roundId))
      .collect();
    return { ...active, ideas };
  },
});

export const getIdeasByRound = query({
  args: { roundId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ideas")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();
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

// Legacy setPhase (world-only, no round update)
export const setPhaseGlobal = mutation({
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

// ─── Orchestration ───

export const getRoundState = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("worldState").first();
    if (!state) return { action: "none", error: "World not initialized" };
    
    const currentRoundId = state.currentRound;
    if (!currentRoundId) {
      // No active round — need to open one
      const nextNum = (state.totalRounds || 0) + 1;
      const nextRoundId = `ROUND-${String(nextNum).padStart(3, "0")}`;
      return { action: "open_round", nextRoundId, totalRounds: state.totalRounds || 0, phase: state.phase };
    }
    
    const round = await ctx.db.query("rounds").withIndex("by_roundId", q => q.eq("roundId", currentRoundId)).first();
    if (!round) return { action: "open_round", nextRoundId: currentRoundId, totalRounds: state.totalRounds || 0, phase: state.phase };
    
    const ideas = await ctx.db.query("ideas").withIndex("by_round", q => q.eq("roundId", currentRoundId)).collect();
    const spells = await ctx.db.query("spells").withIndex("by_round", q => q.eq("roundId", currentRoundId)).collect();
    
    const now = Date.now();
    const elapsed = now - round.startedAt;
    const ROUND_DURATION = 10 * 60 * 1000; // 10 minutes
    const timeLeft = Math.max(0, ROUND_DURATION - elapsed);
    const expired = timeLeft === 0;
    
    if (round.phase === "completed" || round.phase === "settled") {
      const nextNum = (state.totalRounds || 0) + 1;
      const nextRoundId = `ROUND-${String(nextNum).padStart(3, "0")}`;
      return { action: "open_round", nextRoundId, totalRounds: state.totalRounds || 0, phase: round.phase };
    }
    
    if (round.phase === "cauldron" && expired && ideas.length >= 1) {
      return {
        action: "run_council",
        roundId: currentRoundId,
        phase: round.phase,
        ideas: ideas.map(i => ({ id: i._id, title: i.title, wallet: i.wallet, totalBelieved: i.totalBelieved, totalChallenged: i.totalChallenged })),
        spells: spells.map(s => ({ word: s.word, caster: s.caster, casterType: s.casterType })),
        timeLeft: 0,
        expired: true,
      };
    }
    
    return {
      action: "wait",
      roundId: currentRoundId,
      phase: round.phase,
      ideaCount: ideas.length,
      spellCount: spells.length,
      timeLeft,
      expired,
      startedAt: round.startedAt,
      endsAt: round.startedAt + ROUND_DURATION,
    };
  },
});

export const openRound = mutation({
  args: { roundId: v.string() },
  handler: async (ctx, args) => {
    // Create round
    await ctx.db.insert("rounds", {
      roundId: args.roundId,
      phase: "cauldron",
      startedAt: Date.now(),
    });
    // Update world state
    const state = await ctx.db.query("worldState").first();
    if (state) {
      await ctx.db.patch(state._id, {
        currentRound: args.roundId,
        phase: "cauldron",
        totalRounds: (state.totalRounds || 0) + 1,
        updatedAt: Date.now(),
      });
    }
    return { ok: true, roundId: args.roundId };
  },
});

export const patchWorldState = mutation({
  args: { id: v.id("worldState"), currentRound: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { currentRound: args.currentRound, updatedAt: Date.now() });
  },
});

export const setPhase = mutation({
  args: { roundId: v.string(), phase: v.string() },
  handler: async (ctx, args) => {
    const round = await ctx.db.query("rounds").withIndex("by_roundId", q => q.eq("roundId", args.roundId)).first();
    if (round) await ctx.db.patch(round._id, { phase: args.phase });
    const state = await ctx.db.query("worldState").first();
    if (state) await ctx.db.patch(state._id, { phase: args.phase, updatedAt: Date.now() });
  },
});

export const submitIdea = mutation({
  args: {
    roundId: v.string(),
    title: v.string(),
    description: v.string(),
    submittedBy: v.string(),
    author: v.optional(v.string()),
    url: v.optional(v.string()),
    wallet: v.optional(v.string()),
    source: v.optional(v.string()),
    txHash: v.optional(v.string()),
    txStatus: v.optional(v.string()),
    stakeAmount: v.number(),
    stakeCurrency: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ideas", {
      ...args,
      txStatus: args.txStatus ?? "pending",
      votes: 0,
      isWinner: false,
      totalBelieved: 0,
      totalChallenged: 0,
      createdAt: Date.now(),
    });
  },
});

export const confirmIdea = mutation({
  args: {
    ideaId: v.id("ideas"),
    txHash: v.string(),
    txStatus: v.string(), // "submitted" | "confirmed" | "failed"
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");
    await ctx.db.patch(args.ideaId, {
      txHash: args.txHash,
      txStatus: args.txStatus,
    });
    return { ok: true };
  },
});

export const deleteIdea = mutation({
  args: { ideaId: v.id("ideas") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.ideaId);
    return { ok: true };
  },
});

export const castSpell = mutation({
  args: {
    roundId: v.string(),
    word: v.string(),
    caster: v.string(),
    cost: v.number(),
    casterType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("worldState").first();
    if (!state) throw new Error("World not initialized");

    const { casterType, ...rest } = args;
    const spellId = await ctx.db.insert("spells", {
      ...rest,
      word: args.word.toLowerCase(),
      casterType,
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

// ─── GAMELOOP v2 ───

export const fundIdea = mutation({
  args: {
    roundId: v.string(),
    ideaId: v.id("ideas"),
    funder: v.string(),
    amount: v.number(),
    direction: v.string(), // "believe" | "challenge"
  },
  handler: async (ctx, args) => {
    // Insert funding record
    await ctx.db.insert("funding", {
      roundId: args.roundId,
      ideaId: args.ideaId,
      funder: args.funder,
      amount: args.amount,
      direction: args.direction,
      createdAt: Date.now(),
    });

    // Update idea totals
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");
    if (args.direction === "believe") {
      await ctx.db.patch(args.ideaId, { totalBelieved: (idea.totalBelieved ?? 0) + args.amount });
    } else {
      await ctx.db.patch(args.ideaId, { totalChallenged: (idea.totalChallenged ?? 0) + args.amount });
    }

    // Update participant
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_address", (q) => q.eq("address", args.funder))
      .first();
    if (participant) {
      const patch: Record<string, unknown> = {
        totalStaked: participant.totalStaked + args.amount,
      };
      if (args.direction === "challenge") {
        patch.isContrarian = true;
        patch.totalChallenged = (participant.totalChallenged ?? 0) + args.amount;
      }
      await ctx.db.patch(participant._id, patch);
    }

    // If challenge: burn stake to treasury
    if (args.direction === "challenge") {
      const state = await ctx.db.query("worldState").first();
      if (state) {
        await ctx.db.patch(state._id, {
          treasuryDumble: state.treasuryDumble + args.amount,
          updatedAt: Date.now(),
        });
      }
    }

    return { ok: true };
  },
});

export const settle = mutation({
  args: { roundId: v.string() },
  handler: async (ctx, args) => {
    // Get winning idea
    const winningIdea = await ctx.db
      .query("ideas")
      .withIndex("by_round_winner", (q) => q.eq("roundId", args.roundId).eq("isWinner", true))
      .first();
    if (!winningIdea) throw new Error("No winning idea found for round");

    // Get all funding for the round
    const allFunding = await ctx.db
      .query("funding")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    const winnerFunding = allFunding.filter((f) => f.ideaId === winningIdea._id);
    const loserFunding = allFunding.filter((f) => f.ideaId !== winningIdea._id);

    // Losing believers' total stakes go to the pool
    const losingBelieversPool = loserFunding
      .filter((f) => f.direction === "believe")
      .reduce((sum, f) => sum + f.amount, 0);

    // Treasury fee: 10%
    const treasuryFee = losingBelieversPool * 0.1;
    const rewardPool = losingBelieversPool - treasuryFee;

    // Believers of winner get proportional share
    const winnerBelievers = winnerFunding.filter((f) => f.direction === "believe");
    const totalWinnerBelieved = winnerBelievers.reduce((sum, f) => sum + f.amount, 0);

    // Challengers who backed winner get bonus
    const winnerChallengers = winnerFunding.filter((f) => f.direction === "challenge");
    const challengerBonus = rewardPool * 0.1; // 10% of reward pool as challenger bonus
    const believerRewardPool = rewardPool - challengerBonus;

    // Distribute to winning believers
    for (const fund of winnerBelievers) {
      if (totalWinnerBelieved === 0) continue;
      const share = (fund.amount / totalWinnerBelieved) * believerRewardPool;
      const participant = await ctx.db
        .query("participants")
        .withIndex("by_address", (q) => q.eq("address", fund.funder))
        .first();
      if (participant) {
        await ctx.db.patch(participant._id, {
          totalWon: participant.totalWon + share,
        });
      }
    }

    // Distribute challenger bonus
    const totalChallengerStake = winnerChallengers.reduce((sum, f) => sum + f.amount, 0);
    for (const fund of winnerChallengers) {
      if (totalChallengerStake === 0) continue;
      const share = (fund.amount / totalChallengerStake) * challengerBonus;
      const participant = await ctx.db
        .query("participants")
        .withIndex("by_address", (q) => q.eq("address", fund.funder))
        .first();
      if (participant) {
        await ctx.db.patch(participant._id, {
          totalWon: participant.totalWon + share,
        });
      }
    }

    // Update treasury
    const state = await ctx.db.query("worldState").first();
    if (state) {
      await ctx.db.patch(state._id, {
        treasuryDumble: state.treasuryDumble + treasuryFee,
        updatedAt: Date.now(),
      });
    }

    // Complete the round
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_roundId", (q) => q.eq("roundId", args.roundId))
      .first();
    if (round) {
      await ctx.db.patch(round._id, { phase: "settled", endedAt: Date.now() });
    }

    return {
      ok: true,
      winningIdea: winningIdea.title,
      losingBelieversPool,
      treasuryFee,
      rewardPool,
      challengerBonus,
    };
  },
});

export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const participants = await ctx.db.query("participants").collect();
    const sorted = participants
      .sort((a, b) => b.totalWon - a.totalWon)
      .slice(0, 50)
      .map((p) => ({
        address: p.address,
        displayName: p.displayName,
        totalWon: p.totalWon,
        totalStaked: p.totalStaked,
        totalChallenged: p.totalChallenged ?? 0,
        isContrarian: p.isContrarian ?? false,
        roundsParticipated: p.roundsParticipated,
      }));
    return sorted;
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
