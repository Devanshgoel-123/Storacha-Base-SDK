import { NextRequest, NextResponse } from 'next/server';
import { getCircleClient } from '@/lib/circle/client';

export async function POST(request: NextRequest) {
  try {
    const { bankAccountId, amount } = await request.json();

    if (!bankAccountId) {
      return NextResponse.json({
        success: false,
        error: 'Bank account ID required',
      }, { status: 400 });
    }

    const client = getCircleClient();
    const instructions = await client.getWireInstructions(bankAccountId, 'USD');

    return NextResponse.json({
      success: true,
      instructions: (instructions as { data: any }).data, // Type assertion added here
      amount,
    });
  } catch (error) {
    console.error('Get wire instructions error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get instructions',
    }, { status: 500 });
  }
}
