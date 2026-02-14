import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Queries for tick-coord project board UI.
 * Copy into your project's convex/ directory.
 */

// List all projects with summary stats
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tickProjects").collect();
  },
});

// Get a single project by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("tickProjects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

// Get all tasks for a project
export const tasks = query({
  args: { projectSlug: v.string() },
  handler: async (ctx, { projectSlug }) => {
    return await ctx.db
      .query("tickTasks")
      .withIndex("by_project", (q) => q.eq("projectSlug", projectSlug))
      .collect();
  },
});

// Get tasks filtered by status
export const tasksByStatus = query({
  args: { projectSlug: v.string(), status: v.string() },
  handler: async (ctx, { projectSlug, status }) => {
    return await ctx.db
      .query("tickTasks")
      .withIndex("by_project_status", (q) =>
        q.eq("projectSlug", projectSlug).eq("status", status)
      )
      .collect();
  },
});

// Get a single task by tickId
export const taskByTickId = query({
  args: { projectSlug: v.string(), tickId: v.string() },
  handler: async (ctx, { projectSlug, tickId }) => {
    return await ctx.db
      .query("tickTasks")
      .withIndex("by_project_tickId", (q) =>
        q.eq("projectSlug", projectSlug).eq("tickId", tickId)
      )
      .first();
  },
});

// Get threads for a task
export const threads = query({
  args: { projectSlug: v.string(), tickId: v.string() },
  handler: async (ctx, { projectSlug, tickId }) => {
    return await ctx.db
      .query("tickThreads")
      .withIndex("by_task", (q) =>
        q.eq("projectSlug", projectSlug).eq("tickId", tickId)
      )
      .collect();
  },
});
