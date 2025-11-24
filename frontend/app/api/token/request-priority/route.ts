// app/api/token/request-priority/route.ts
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { fetchBalance } from "@/lib/token";

/**
 * Request priority processing. Minimum balance required: 100 FST (Silver)
 * Returns: { ok, jobId, balance } or error
 */

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const address = String(body?.address || "").trim();

  if (!isAddress(address)) {
    return NextResponse.json({ ok: false, error: "invalid_address" }, { status: 400 });
  }

  try {
    const balStr = await fetchBalance(address as `0x${string}`);
    const bal = Number(balStr);

    if (bal < 100) {
      return NextResponse.json({ ok: false, error: "insufficient_balance", balance: bal }, { status: 403 });
    }

    // enqueue job in your queue system (Redis/DB). Here we return a fake job id.
    const jobId = "prio_" + Math.random().toString(36).slice(2, 10);

    // optionally persist to DB: { jobId, address, createdAt }

    return NextResponse.json({ ok: true, jobId, balance: bal });
  } catch (err: any) {
    console.error("request-priority err", err);
    return NextResponse.json({ ok: false, error: "server_error", details: String(err) }, { status: 500 });
  }
}
