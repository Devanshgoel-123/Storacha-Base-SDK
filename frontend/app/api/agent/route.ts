// /app/api/agent/route.ts
import { NextRequest } from "next/server";
import { baseAgent } from "@/agent/baseAgent";

export const runtime = "nodejs";


import { NextResponse } from "next/server";

export async function GET() {
  const apiKeyName = process.env.CDP_API_KEY_NAME;
  const privateKey = process.env.CDP_API_KEY_PRIVATE_KEY;
  const geminikey = process.env.GEMINI_API_KEY;

  if (!apiKeyName || !privateKey || !geminikey) {
    return NextResponse.json({ error: "Missing environment variables" }, { status: 500 });
  }

  return NextResponse.json({ message: "API is working", apiKeyName });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, wallet, confirm, action } = body ?? {};

    // Support confirm-execute payloads
    if (confirm === true && action) {
      const execResult = await baseAgent.run({
        input: { confirm: true, action },
        context: { wallet },
      });
      return new Response(
        JSON.stringify({ executed: true, result: execResult }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!messages) {
      return new Response(
        JSON.stringify({ error: "Missing 'messages' in request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = await baseAgent.run({
      input: messages,
      context: { wallet },
    });

    // If the agent returned a JSON string asking for confirmation, try to
    // parse it and return as structured JSON so the frontend can render a
    // confirmation UI.
    if (typeof result === "string") {
      try {
        const parsed = JSON.parse(result);
        if (parsed && parsed.requiresConfirmation) {
          return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        // not JSON — fallthrough
      }
    }

    const reply = typeof result === "string" ? result : JSON.stringify(result);

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
