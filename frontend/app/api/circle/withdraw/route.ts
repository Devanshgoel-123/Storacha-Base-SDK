import { NextRequest, NextResponse } from 'next/server';
import { getCircleClient } from '@/lib/circle/client';

export async function POST(request: NextRequest) {
  try {
    const { amount, bankAccountId } = await request.json();

    if (!amount || !bankAccountId) {
      return NextResponse.json({
        success: false,
        error: 'Amount and bank account required',
      }, { status: 400 });
    }

    console.log('Creating payout:', { amount, bankAccountId });

    const client = getCircleClient();
    const payout = await client.createPayout({
      amount: {
        amount: amount.toString(),
        currency: 'USD',
      },
      destination: {
        type: 'wire',
        id: bankAccountId,
      },
    }) as { data: any }; 

    return NextResponse.json({
      success: true,
      payout: payout.data,
      message: `Withdrawal of $${amount} initiated`,
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Withdrawal failed',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const payoutId = searchParams.get('payoutId');

    if (!payoutId) {
      return NextResponse.json({
        success: false,
        error: 'Payout ID required',
      }, { status: 400 });
    }

    const client = getCircleClient();
    const payout = await client.getPayout(payoutId) as { data: any };

    return NextResponse.json({
      success: true,
      payout: payout.data,
    });
  } catch (error) {
    console.error('Get payout error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get payout',
    }, { status: 500 });
  }
}
