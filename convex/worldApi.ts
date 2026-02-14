import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

// GET /api/clawarts/world
export const getWorld = httpAction(async (ctx) => {
  const state = await ctx.runQuery(api.world.getState);
  return new Response(JSON.stringify(state ?? { error: "World not initialized" }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// GET /api/clawarts/round
export const getRound = httpAction(async (ctx) => {
  const round = await ctx.runQuery(api.world.getCurrentRound);
  return new Response(JSON.stringify(round ?? { error: "No active round" }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// GET /api/clawarts/characters
export const getCharacters = httpAction(async (ctx) => {
  const characters = await ctx.runQuery(api.world.getCharacters, { limit: 50 });
  return new Response(JSON.stringify({ characters }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// GET /api/clawarts/history
export const getHistory = httpAction(async (ctx) => {
  const rounds = await ctx.runQuery(api.world.getHistory, { limit: 20 });
  return new Response(JSON.stringify({ rounds }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// POST /api/clawarts/idea
export const postIdea = httpAction(async (ctx, request) => {
  const body = await request.json();
  const { roundId, title, description, submittedBy, stakeAmount, stakeCurrency } = body;
  if (!roundId || !title || !submittedBy) {
    return new Response(JSON.stringify({ error: "Missing required fields: roundId, title, submittedBy" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  const id = await ctx.runMutation(api.world.submitIdea, {
    roundId,
    title,
    description: description ?? "",
    submittedBy,
    stakeAmount: stakeAmount ?? 0,
    stakeCurrency: stakeCurrency ?? "DUMBLE",
  });
  return new Response(JSON.stringify({ ok: true, ideaId: id }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// POST /api/clawarts/spell
export const postSpell = httpAction(async (ctx, request) => {
  const body = await request.json();
  const { roundId, word, caster, cost } = body;
  if (!roundId || !word || !caster) {
    return new Response(JSON.stringify({ error: "Missing required fields: roundId, word, caster" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  const spellId = await ctx.runMutation(api.world.castSpell, {
    roundId,
    word,
    caster,
    cost: cost ?? 1,
  });
  return new Response(JSON.stringify({ ok: true, spellId }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// POST /api/clawarts/join
export const postJoin = httpAction(async (ctx, request) => {
  const body = await request.json();
  const { address, displayName, isAgent } = body;
  if (!address || !displayName) {
    return new Response(JSON.stringify({ error: "Missing required fields: address, displayName" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  const id = await ctx.runMutation(api.world.joinWorld, {
    address,
    displayName,
    isAgent: isAgent ?? false,
  });
  return new Response(JSON.stringify({ ok: true, participantId: id }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// POST /api/clawarts/startRound
export const postStartRound = httpAction(async (ctx) => {
  const roundId = await ctx.runMutation(api.world.startRound, {});
  return new Response(JSON.stringify({ ok: true, roundId }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// POST /api/clawarts/summon
export const postSummon = httpAction(async (ctx, request) => {
  const body = await request.json();
  const { spellWord, roundId } = body;
  if (!spellWord || !roundId) {
    return new Response(JSON.stringify({ error: "Missing spellWord or roundId" }), {
      status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  const characterId = await ctx.runMutation(api.world.summonCharacter, { spellWord, roundId });
  const character = await ctx.runQuery(api.world.getCharacterBySpell, { spellWord: spellWord.toLowerCase() });
  return new Response(JSON.stringify({ ok: true, characterId, character }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// POST /api/clawarts/updateCharacter
export const postUpdateCharacter = httpAction(async (ctx, request) => {
  const body = await request.json();
  const { id, name, description } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  await ctx.runMutation(api.world.updateCharacter, { id, name, description });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// POST /api/clawarts/vote
export const postVote = httpAction(async (ctx, request) => {
  const body = await request.json();
  const { roundId, characterId, ideaId, reasoning, weight } = body;
  if (!roundId || !characterId || !ideaId) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  await ctx.runMutation(api.world.submitVote, {
    roundId, characterId, ideaId, reasoning: reasoning ?? "", weight: weight ?? 1,
  });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// POST /api/clawarts/declareWinner
export const postDeclareWinner = httpAction(async (ctx, request) => {
  const body = await request.json();
  const { roundId, ideaId } = body;
  if (!roundId || !ideaId) {
    return new Response(JSON.stringify({ error: "Missing roundId or ideaId" }), {
      status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  await ctx.runMutation(api.world.declareWinner, { roundId, ideaId });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// POST /api/clawarts/completeRound
export const postCompleteRound = httpAction(async (ctx, request) => {
  const body = await request.json();
  const { roundId, appUrl, tokenAddress, tokenSymbol } = body;
  if (!roundId) {
    return new Response(JSON.stringify({ error: "Missing roundId" }), {
      status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  await ctx.runMutation(api.world.completeRound, { roundId, appUrl, tokenAddress, tokenSymbol });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// POST /api/clawarts/setPhase
export const postSetPhase = httpAction(async (ctx, request) => {
  const body = await request.json();
  const { phase } = body;
  if (!phase) {
    return new Response(JSON.stringify({ error: "Missing phase" }), {
      status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  await ctx.runMutation(api.world.setPhase, { phase });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

// CORS preflight
export const cors = httpAction(async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-tick-key",
    },
  });
});
