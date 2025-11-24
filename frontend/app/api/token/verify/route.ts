// app/api/token/verify/route.ts
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { fetchBalance } from "@/lib/token";

/**
 * POST body: { address: string, required?: number }
 * Returns: { ok: boolean, address, balance, required, allowed }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const address = String(body?.address || "").trim();
  const required = Number(body?.required ?? 10);

  if (!isAddress(address)) {
    return NextResponse.json({ ok: false, error: "invalid_address" }, { status: 400 });
  }

  try {
    const balStr = await fetchBalance(address as `0x${string}`);
    const balance = Number(balStr);
    const allowed = balance >= required;
    return NextResponse.json({ ok: true, address, balance, required, allowed });
  } catch (err: any) {
    console.error("verify error", err);
    return NextResponse.json({ ok: false, error: "node_error", details: String(err) }, { status: 500 });
  }
}
