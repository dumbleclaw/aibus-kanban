import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const deleteProject = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const project = await ctx.db
      .query("tickProjects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (project) await ctx.db.delete(project._id);

    const tasks = await ctx.db
      .query("tickTasks")
      .withIndex("by_project", (q) => q.eq("projectSlug", slug))
      .collect();
    for (const t of tasks) await ctx.db.delete(t._id);

    return { deleted: { project: !!project, tasks: tasks.length } };
  },
});
