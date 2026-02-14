import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Public read-only HTTP API for web apps to fetch project/task data.
 * No auth required (read-only).
 *
 * GET /api/tick/projects         — list all projects
 * GET /api/tick/tasks?slug=X     — tasks for a project
 */

export const listProjects = httpAction(async (ctx) => {
  const projects = await ctx.runQuery(api.projects.list, {});

  return new Response(JSON.stringify(projects), {
    headers: corsHeaders(),
  });
});

export const getTasks = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing ?slug= parameter" }), {
      status: 400,
      headers: corsHeaders(),
    });
  }

  const project = await ctx.runQuery(api.projects.getBySlug, { slug });

  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers: corsHeaders(),
    });
  }

  const tasks = await ctx.runQuery(api.projects.tasks, {
    projectSlug: slug,
  });

  return new Response(JSON.stringify({ project, tasks }), {
    headers: corsHeaders(),
  });
});

export const handleCors = httpAction(async () => {
  return new Response(null, { status: 204, headers: corsHeaders() });
});

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
