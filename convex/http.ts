import { httpRouter } from "convex/server";
import { sync } from "./sync";
import { listProjects, getTasks, handleCors } from "./publicApi";

const http = httpRouter();

// Write endpoint (auth required)
http.route({
  path: "/api/tick/sync",
  method: "POST",
  handler: sync,
});

// Public read endpoints
http.route({
  path: "/api/tick/projects",
  method: "GET",
  handler: listProjects,
});

http.route({
  path: "/api/tick/tasks",
  method: "GET",
  handler: getTasks,
});

// CORS preflight
http.route({
  path: "/api/tick/projects",
  method: "OPTIONS",
  handler: handleCors,
});

http.route({
  path: "/api/tick/tasks",
  method: "OPTIONS",
  handler: handleCors,
});

export default http;
