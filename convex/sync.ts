import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * HTTP endpoint for syncing TICK.md state to Convex.
 *
 * POST /api/tick/sync
 * Headers: x-tick-key: <shared-secret>
 * Body: { project: { slug, name, ... }, agents: [...], tasks: [...] }
 *
 * Called by the tick-sync script after tick operations.
 */
export const sync = httpAction(async (ctx, request) => {
  // Auth check
  const key = request.headers.get("x-tick-key");
  const expectedKey = process.env.TICK_SYNC_KEY;
  if (!expectedKey || key !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { project, agents, tasks } = body;

    if (!project?.slug) {
      return new Response(
        JSON.stringify({ error: "Missing project.slug" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Upsert project
    await ctx.runMutation(internal.syncMutations.upsertProject, {
      slug: project.slug,
      name: project.name || project.slug,
      description: project.description,
      schemaVersion: project.schemaVersion || "1.0",
      agents: agents || [],
      taskCount: tasks?.length || 0,
      doneCount: tasks?.filter((t: any) => t.status === "done").length || 0,
      inProgressCount:
        tasks?.filter((t: any) => t.status === "in_progress").length || 0,
      blockedCount:
        tasks?.filter((t: any) => t.status === "blocked").length || 0,
    });

    // Upsert tasks
    if (tasks && tasks.length > 0) {
      await ctx.runMutation(internal.syncMutations.syncTasks, {
        projectSlug: project.slug,
        tasks: tasks.map((t: any) => ({
          tickId: t.id || t.tickId,
          title: t.title,
          status: t.status,
          priority: t.priority || "medium",
          assignedTo: t.assigned_to || t.assignedTo,
          claimedBy: t.claimed_by || t.claimedBy,
          createdBy: t.created_by || t.createdBy,
          tags: t.tags || [],
          dependsOn: t.depends_on || t.dependsOn || [],
          blocks: t.blocks || [],
          description: t.description || "",
          history: (t.history || []).map((h: any) => ({
            ts: h.ts,
            who: h.who,
            action: h.action,
            note: h.note,
            from: h.from,
            to: h.to,
          })),
          createdAt: t.created_at || t.createdAt || new Date().toISOString(),
          updatedAt: t.updated_at || t.updatedAt || new Date().toISOString(),
        })),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        project: project.slug,
        tasksSynced: tasks?.length || 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
