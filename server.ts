// server.ts — run with: deno run -A server.ts
import { ElevenLabsClient } from "npm:@elevenlabs/elevenlabs-js";
import { GoogleGenAI, Type } from "npm:@google/genai";

import "jsr:@std/dotenv/load";

const elevenlabs = new ElevenLabsClient({
  apiKey: Deno.env.get("ELEVENLABS_API_KEY") ?? "",
});

const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
const genAI = new GoogleGenAI(apiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

/*
const riskKeywords = {
  critical: ["social security", "wire transfer", "gift card", "crypto", "bitcoin"],
  high: ["urgent", "bank account", "otp", "verification code", "password", "remote access"],
  medium: ["act now", "limited time", "confirm identity", "suspended", "payment failed"],
};

function scoreTranscript(transcript: string) {
  const text = transcript.toLowerCase();
  const flaggedWords = new Set<string>();
  let score = 10;

  for (const keyword of riskKeywords.medium) {
    if (text.includes(keyword)) {
      flaggedWords.add(keyword);
      score += 10;
    }
  }
  for (const keyword of riskKeywords.high) {
    if (text.includes(keyword)) {
      flaggedWords.add(keyword);
      score += 18;
    }
  }
  for (const keyword of riskKeywords.critical) {
    if (text.includes(keyword)) {
      flaggedWords.add(keyword);
      score += 25;
    }
  }

  const percentage = Math.max(0, Math.min(100, score));
  const riskLevel =
    percentage >= 85 ? "critical" :
    percentage >= 60 ? "high" :
    percentage >= 30 ? "medium" :
    "low";

  const summary =
    flaggedWords.size > 0
      ? `Potential scam signals detected: ${Array.from(flaggedWords).join(", ")}.`
      : "No obvious scam language detected in this transcript segment.";

  return {
    riskLevel,
    percentage,
    flaggedWords: Array.from(flaggedWords),
    summary,
  };
}

function scoreTranscript(data ) {
  const text = transcript.toLowerCase();
  const flaggedWords = new Set<string>();
  let score = 10;

  for (const keyword of riskKeywords.medium) {
    if (text.includes(keyword)) {
      flaggedWords.add(keyword);
      score += 10;
    }
  }
  for (const keyword of riskKeywords.high) {
    if (text.includes(keyword)) {
      flaggedWords.add(keyword);
      score += 18;
    }
  }
  for (const keyword of riskKeywords.critical) {
    if (text.includes(keyword)) {
      flaggedWords.add(keyword);
      score += 25;
    }
  }

  const percentage = Math.max(0, Math.min(100, score));
  const riskLevel =
    percentage >= 85 ? "critical" :
    percentage >= 60 ? "high" :
    percentage >= 30 ? "medium" :
    "low";

  const summary =
    flaggedWords.size > 0
      ? `Potential scam signals detected: ${Array.from(flaggedWords).join(", ")}.`
      : "No obvious scam language detected in this transcript segment.";

  return {
    riskLevel,
    percentage,
    flaggedWords: Array.from(flaggedWords),
    summary,
  };
}
*/

type RiskLevel = "low" | "medium" | "high" | "critical";

type TranscriptScoreResult = {
  riskLevel: RiskLevel;
  percentage: number;
  flaggedWords: string[];
  summary: string;
};

type ScamAnalysis = {
  score: number;
  verdict: string;
  redFlags: {
    text: string;
    reason: string;
  }[];
  summary?: string;
};

function mapScoreToRiskLevel(score: number): RiskLevel {
  if (score >= 85) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function scoreTranscriptFromLLM(parsed: ScamAnalysis): TranscriptScoreResult {
  const percentage = Math.max(0, Math.min(100, parsed.score));

  const flaggedWords = parsed.redFlags.map((flag) => {
    const reason = flag.reason?.trim();
    const text = flag.text?.trim();

    if (reason && text) {
      return `${reason}: ${text}`;
    }
    return reason || text || "";
  }).filter(Boolean);

  const summary =
    parsed.summary?.trim() ||
    (flaggedWords.length > 0
      ? `Potential scam signals detected: ${flaggedWords.join(", ")}.`
      : "No obvious scam language detected in this transcript segment.");

  return {
    riskLevel: mapScoreToRiskLevel(percentage),
    percentage,
    flaggedWords,
    summary,
  };
}

async function runScamInvestigationForGemma(transcript_text: string) {
  const prompt = `
  You are an expert fraud investigator. Analyze phone call transcripts for signs of social engineering, phishing, or financial scams.

  Provide a likelihood score from 1 (Safe) to 100 (Definite Scam).

  Extract the specific text segments that serve as red flags, such as:
  - urgency
  - requests for OTP
  - impersonation
  - financial pressure
  - suspicious links

  Return ONLY valid JSON in this exact format:
  {
    "score": 0,
    "verdict": "Safe | Suspicious | Scam",
    "redFlags": [
      {
        "text": "string",
        "reason": "string"
      }
    ],
    "summary": "string"
  }

  Analyze the following transcript:

  ${transcript_text}
  `;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemma4:e4b",
        prompt,
        stream: false,
        format: "json",
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    try {
      const parsed = JSON.parse(data.response);
      return parsed;
    } catch (err) {
      console.error("Failed to parse model JSON:", err);
      throw new Error("Model did not return valid JSON.");
    }
}

async function runScamInvestigation(transcript_text:string) {
  // Use a model like 'gemini-1.5-flash' for faster responses

  const transcriptText = transcript_text; // 기존 변수 사용

  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash-lite",

    contents: `Analyze the following transcript:\n\n${transcriptText}`,

    config: {
      systemInstruction: `
    You are an expert fraud investigator. Analyze phone call transcripts for signs of social engineering, phishing, or financial scams.

    Provide a likelihood score from 1 (Safe) to 100 (Definite Scam).

    Extract the specific text segments that serve as red flags, such as:
    - urgency
    - requests for OTP
    - impersonation
    - financial pressure
    - suspicious links
    `,

        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: "1 to 100 likelihood of scam",
            },
            verdict: {
              type: Type.STRING,
              description: "Safe / Suspicious / Scam",
            },
            redFlags: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
              },
            },
            summary: {
              type: Type.STRING,
            },
          },
          required: ["score", "verdict", "redFlags"],
        },
      },
    });

    console.log(response.text);
}

Deno.serve({ port: 3001 }, async (req) => {
  const url = new URL(req.url);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Token endpoint
  if (url.pathname === "/scribe-token" && req.method === "GET") {
    try {
      const token = await elevenlabs.tokens.singleUse.create("realtime_scribe");
      return Response.json(token, {
        headers: corsHeaders,
      });
    } catch (e) {
      console.error("Token error:", e);
      return Response.json({ error: String(e) }, {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  // Transcript analysis endpoint (Gemini-ready response shape)
  if (url.pathname === "/api/analyze" && req.method === "POST") {
    try {
      const body = await req.json();
      const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
      const now = new Date();
      //console.log(now + " : " + transcript);

      //runScamInvestigation(transcript);
      const parsed = await runScamInvestigationForGemma(transcript)

      if (!transcript) {
        return Response.json(
          { error: "Missing or empty 'transcript' in request body." },
          { status: 400, headers: corsHeaders },
        );
      }

      // TODO: Replace this heuristic scorer with a Gemini call.
     //const result = scoreTranscript(transcript);
     const result = scoreTranscriptFromLLM(parsed);
      return Response.json(result, { headers: corsHeaders });
    } catch (e) {
      console.error("Analyze error:", e);
      return Response.json({ error: String(e) }, {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  return new Response("Not found", { status: 404 });
});

console.log("Server running on http://localhost:3001");
