// app/api/token/apply-discount/route.ts
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { fetchBalance } from "@/lib/token";

/**
 * Checks the token balance and returns a discount tier.
 * POST body: { address }
 * Returns: { ok, discount, balance } or error
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

    let discount = 0;
    if (bal >= 5000) discount = 0.5;
    else if (bal >= 1000) discount = 0.25;
    else if (bal >= 100) discount = 0.1;
    else if (bal >= 10) discount = 0.05;

    if (discount === 0) {
      return NextResponse.json({ ok: false, error: "insufficient_balance", balance: bal }, { status: 403 });
    }

    // optionally persist an entitlement record to your DB here

    return NextResponse.json({ ok: true, discount, balance: bal });
  } catch (err: any) {
    console.error("apply-discount err", err);
    return NextResponse.json({ ok: false, error: "server_error", details: String(err) }, { status: 500 });
  }
}
