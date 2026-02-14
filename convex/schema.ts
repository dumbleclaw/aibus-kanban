import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * tick-coord Convex schema
 *
 * Mirrors TICK.md structure for real-time UI access.
 * Add these tables to your project's existing schema.
 */

const historyEntry = v.object({
  ts: v.string(),
  who: v.string(),
  action: v.string(),
  note: v.optional(v.string()),
  from: v.optional(v.string()),
  to: v.optional(v.string()),
});

export const tickTables = {
  // Project metadata (one per TICK.md file)
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

  // Individual tasks synced from TICK.md
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

  // Discussion threads per task (optional, for community participation)
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

// Standalone schema (if tick-coord is the only thing using Convex)
export default defineSchema(tickTables);
