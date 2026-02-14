import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal mutations called by the sync HTTP action.
 * Not exposed to clients directly.
 */

export const upsertProject = internalMutation({
  args: {
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    schemaVersion: v.string(),
    agents: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
        roles: v.array(v.string()),
        status: v.string(),
        workingOn: v.optional(v.string()),
      })
    ),
    taskCount: v.number(),
    doneCount: v.number(),
    inProgressCount: v.number(),
    blockedCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tickProjects")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    const data = {
      slug: args.slug,
      name: args.name,
      description: args.description,
      schemaVersion: args.schemaVersion,
      agents: args.agents,
      taskCount: args.taskCount,
      doneCount: args.doneCount,
      inProgressCount: args.inProgressCount,
      blockedCount: args.blockedCount,
      lastSyncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("tickProjects", data);
    }
  },
});

export const syncTasks = internalMutation({
  args: {
    projectSlug: v.string(),
    tasks: v.array(
      v.object({
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
        history: v.array(
          v.object({
            ts: v.string(),
            who: v.string(),
            action: v.string(),
            note: v.optional(v.string()),
            from: v.optional(v.string()),
            to: v.optional(v.string()),
          })
        ),
        createdAt: v.string(),
        updatedAt: v.string(),
      })
    ),
  },
  handler: async (ctx, { projectSlug, tasks }) => {
    // Get all existing tasks for this project
    const existing = await ctx.db
      .query("tickTasks")
      .withIndex("by_project", (q) => q.eq("projectSlug", projectSlug))
      .collect();

    const existingByTickId = new Map(existing.map((t) => [t.tickId, t]));
    const incomingTickIds = new Set(tasks.map((t) => t.tickId));

    // Upsert incoming tasks
    for (const task of tasks) {
      const ex = existingByTickId.get(task.tickId);
      const data = { projectSlug, ...task };

      if (ex) {
        await ctx.db.patch(ex._id, data);
      } else {
        await ctx.db.insert("tickTasks", data);
      }
    }

    // Delete tasks that no longer exist in TICK.md
    for (const ex of existing) {
      if (!incomingTickIds.has(ex.tickId)) {
        await ctx.db.delete(ex._id);
      }
    }
  },
});
