import { NextRequest, NextResponse } from 'next/server';
import { getCircleClient } from '@/lib/circle/client';

export async function POST(request: NextRequest) {
  try {
    const { amount, trackingRef, accountNumber } = await request.json();

    if (!amount || !trackingRef || !accountNumber) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters',
      }, { status: 400 });
    }

    console.log('Creating mock wire deposit:', { amount, trackingRef, accountNumber });

    const client = getCircleClient();
    const deposit = await client.createMockWireDeposit({
      trackingRef,
      amount: {
        amount: amount.toString(),
        currency: 'USD',
      },
      beneficiaryBank: {
        accountNumber,
      },
    });

    return NextResponse.json({
      success: true,
      deposit: (deposit as { data: any }).data, // Replace 'any' with the appropriate type if known
      message: 'Mock wire deposit created. Processing in ~15 minutes.',
    });
  } catch (error) {
    console.error('Mock wire deposit error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Mock deposit failed',
    }, { status: 500 });
  }
}
