import { NextRequest, NextResponse } from 'next/server';
import { getCircleClient } from '@/lib/circle/client';

export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json({ success: false, error: 'User address required' }, { status: 400 });
    }

    const client = getCircleClient();
    const description = `User wallet ${userAddress}`;
    const chain = 'BASE';

    console.log('Creating recipient address:', { userAddress, chain });

    const response = await client.createRecipientAddress({
      description,
      chain,
      address: userAddress,
      currency: 'USD',
    }) as { data: any }; 

    return NextResponse.json({
      success: true,
      recipient: response.data,
      message: 'Recipient blockchain address created successfully',
    });
  } catch (error) {
    console.error('❌ Recipient creation failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create recipient address',
    }, { status: 500 });
  }
}
