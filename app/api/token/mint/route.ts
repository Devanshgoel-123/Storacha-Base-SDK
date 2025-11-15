// app/api/mint/route.ts
import { NextResponse } from "next/server";
import { mintTokenDirect } from "@/lib/serverMint";

export async function POST(req: Request) {
  try {
    const envToken = process.env.MINT_API_TOKEN;
    if (envToken) {
      const auth = req.headers.get("authorization") || "";
      if (!auth.startsWith("Bearer ") || auth.split(" ")[1] !== envToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const to = (body?.to || "").trim();
    const amountStr = (body?.amount || "").toString().trim();
    const decimalsOverride = body?.decimals;

    if (!to || !amountStr) {
      return NextResponse.json({ error: "Missing to or amount" }, { status: 400 });
    }

    const result = await mintTokenDirect({
      to,
      amount: amountStr,
      decimals: decimalsOverride,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Mint route error:", err);
    return NextResponse.json({ error: err?.message || "Mint failed" }, { status: 500 });
  }
}
