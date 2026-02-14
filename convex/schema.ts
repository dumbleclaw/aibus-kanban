import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ─── tick-coord tables ───

const historyEntry = v.object({
  ts: v.string(),
  who: v.string(),
  action: v.string(),
  note: v.optional(v.string()),
  from: v.optional(v.string()),
  to: v.optional(v.string()),
});

export const tickTables = {
  tickProjects: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    schemaVersion: v.string(),
    taskCount: v.number(),
    doneCount: v.number(),
    inProgressCount: v.number(),
    blockedCount: v.number(),
    agents: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
        roles: v.array(v.string()),
        status: v.string(),
        workingOn: v.optional(v.string()),
      })
    ),
    lastSyncedAt: v.number(),
  }).index("by_slug", ["slug"]),

  tickTasks: defineTable({
    projectSlug: v.string(),
    tickId: v.string(),
    title: v.string(),
    status: v.string(),
    priority: v.string(),
    assignedTo: v.optional(v.string()),
    claimedBy: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    tags: v.array(v.string()),
    dependsOn: v.array(v.string()),
    blocks: v.array(v.string()),
    description: v.optional(v.string()),
    history: v.array(historyEntry),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_project", ["projectSlug"])
    .index("by_project_status", ["projectSlug", "status"])
    .index("by_project_tickId", ["projectSlug", "tickId"]),

  tickThreads: defineTable({
    projectSlug: v.string(),
    tickId: v.string(),
    userId: v.string(),
    userName: v.string(),
    message: v.string(),
    createdAt: v.number(),
  })
    .index("by_task", ["projectSlug", "tickId"])
    .index("by_user", ["userId"]),
};

// ─── Clawarts World tables ───

export const clawartsTables = {
  // World state (singleton-ish, one active world)
  worldState: defineTable({
    phase: v.string(), // cauldron | spells | council | forge | portal | idle
    currentRound: v.optional(v.string()), // round ID
    treasuryDumble: v.number(),
    treasuryMon: v.number(),
    totalRounds: v.number(),
    totalAppsBuilt: v.number(),
    totalSpellsCast: v.number(),
    totalCharacters: v.number(),
    updatedAt: v.number(),
  }),

  // Persistent characters (the collectible entities)
  characters: defineTable({
    name: v.string(),
    spellWord: v.string(), // original spell that created them
    role: v.string(), // tech | marketing | design | growth | product | founder | compliance | finance | vc
    description: v.string(), // personality flavor text
    imageUrl: v.optional(v.string()),
    // Stats
    appearances: v.number(),
    wins: v.number(),
    losses: v.number(),
    roundsServed: v.array(v.string()), // round IDs
    // Rarity
    rarity: v.string(), // common | uncommon | rare | legendary
    createdAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_spellWord", ["spellWord"])
    .index("by_rarity", ["rarity"])
    .index("by_appearances", ["appearances"])
    .index("by_role", ["role"]),

  // Rounds (one per cycle)
  rounds: defineTable({
    roundId: v.string(), // e.g. "ROUND-001"
    phase: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    winningIdeaId: v.optional(v.string()),
    // Results
    appName: v.optional(v.string()),
    appUrl: v.optional(v.string()),
    tokenAddress: v.optional(v.string()),
    tokenSymbol: v.optional(v.string()),
  })
    .index("by_roundId", ["roundId"])
    .index("by_phase", ["phase"]),

  // Ideas submitted per round
  ideas: defineTable({
    roundId: v.string(),
    title: v.string(),
    description: v.string(),
    submittedBy: v.string(), // address or agent name
    stakeAmount: v.number(),
    stakeCurrency: v.string(), // DUMBLE | MON
    votes: v.number(), // council votes received
    isWinner: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_round", ["roundId"])
    .index("by_round_winner", ["roundId", "isWinner"]),

  // Spells cast per round
  spells: defineTable({
    roundId: v.string(),
    word: v.string(), // the raw spell-word
    caster: v.string(), // address or agent name
    characterId: v.optional(v.id("characters")), // which character it summoned
    cost: v.number(),
    createdAt: v.number(),
  })
    .index("by_round", ["roundId"])
    .index("by_caster", ["caster"]),

  // Council votes per round
  councilVotes: defineTable({
    roundId: v.string(),
    characterId: v.id("characters"),
    ideaId: v.id("ideas"),
    reasoning: v.string(), // the character's public reasoning
    weight: v.number(), // vote weight
    createdAt: v.number(),
  })
    .index("by_round", ["roundId"])
    .index("by_character", ["characterId"]),

  // Participants registry
  participants: defineTable({
    address: v.string(), // wallet or agent identifier
    displayName: v.string(),
    isAgent: v.boolean(),
    roundsParticipated: v.number(),
    totalStaked: v.number(),
    totalWon: v.number(),
    joinedAt: v.number(),
  })
    .index("by_address", ["address"]),
};

export default defineSchema({
  ...tickTables,
  ...clawartsTables,
});
