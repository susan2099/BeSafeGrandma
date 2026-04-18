// server.ts — run with: deno run -A server.ts
import { ElevenLabsClient } from "npm:@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: Deno.env.get("ELEVENLABS_API_KEY") ?? "",
});

Deno.serve({ port: 3001 }, async (req) => {
  const url = new URL(req.url);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Token endpoint
  if (url.pathname === "/scribe-token" && req.method === "GET") {
    try {
      const token = await elevenlabs.tokens.singleUse.create("realtime_scribe");
      return Response.json(token, {
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    } catch (e) {
      console.error("Token error:", e);
      return Response.json({ error: String(e) }, {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  return new Response("Not found", { status: 404 });
});

console.log("Token server running on http://localhost:3001");
