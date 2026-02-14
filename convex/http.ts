import { httpRouter } from "convex/server";
import { sync } from "./sync";
import { listProjects, getTasks, handleCors } from "./publicApi";
import { getWorld, getRound, getCharacters, getHistory, postIdea, postSpell, postJoin, postStartRound, postSummon, postUpdateCharacter, postVote, postDeclareWinner, postCompleteRound, postSetPhase, cors } from "./worldApi";

const http = httpRouter();

// ─── tick-coord routes ───

http.route({ path: "/api/tick/sync", method: "POST", handler: sync });
http.route({ path: "/api/tick/projects", method: "GET", handler: listProjects });
http.route({ path: "/api/tick/tasks", method: "GET", handler: getTasks });
http.route({ path: "/api/tick/projects", method: "OPTIONS", handler: handleCors });
http.route({ path: "/api/tick/tasks", method: "OPTIONS", handler: handleCors });

// ─── Clawarts World API ───

http.route({ path: "/api/clawarts/world", method: "GET", handler: getWorld });
http.route({ path: "/api/clawarts/round", method: "GET", handler: getRound });
http.route({ path: "/api/clawarts/characters", method: "GET", handler: getCharacters });
http.route({ path: "/api/clawarts/history", method: "GET", handler: getHistory });
http.route({ path: "/api/clawarts/idea", method: "POST", handler: postIdea });
http.route({ path: "/api/clawarts/spell", method: "POST", handler: postSpell });
http.route({ path: "/api/clawarts/join", method: "POST", handler: postJoin });
http.route({ path: "/api/clawarts/startRound", method: "POST", handler: postStartRound });
http.route({ path: "/api/clawarts/summon", method: "POST", handler: postSummon });
http.route({ path: "/api/clawarts/updateCharacter", method: "POST", handler: postUpdateCharacter });
http.route({ path: "/api/clawarts/vote", method: "POST", handler: postVote });
http.route({ path: "/api/clawarts/declareWinner", method: "POST", handler: postDeclareWinner });
http.route({ path: "/api/clawarts/completeRound", method: "POST", handler: postCompleteRound });
http.route({ path: "/api/clawarts/setPhase", method: "POST", handler: postSetPhase });

// CORS preflight for all Clawarts routes
for (const path of ["/api/clawarts/world", "/api/clawarts/round", "/api/clawarts/characters", "/api/clawarts/history", "/api/clawarts/idea", "/api/clawarts/spell", "/api/clawarts/join", "/api/clawarts/startRound", "/api/clawarts/summon", "/api/clawarts/updateCharacter", "/api/clawarts/vote", "/api/clawarts/declareWinner", "/api/clawarts/completeRound", "/api/clawarts/setPhase"]) {
  http.route({ path, method: "OPTIONS", handler: cors });
}

export default http;
