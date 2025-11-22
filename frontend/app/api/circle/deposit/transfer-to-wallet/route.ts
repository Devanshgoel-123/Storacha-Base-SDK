import { NextRequest, NextResponse } from 'next/server';
import { getCircleClient } from '@/lib/circle/client';

export async function POST(request: NextRequest) {
  try {
    const { amount, userAddress } = await request.json();

    if (!amount || !userAddress) {
      return NextResponse.json({
        success: false,
        error: 'Amount and user address required',
      }, { status: 400 });
    }

    const client = getCircleClient();

    // Get all recipient addresses
    const allRecipientsResponse = await client.getReciepientAddresses();
    console.log('📬 All Recipients:', (allRecipientsResponse as { data: any }).data);
    const recipients = (allRecipientsResponse as { data: any }).data || [];

    // Try to find existing recipient by address and chain
    const existingRecipient = recipients.find(
      (r: any) => r.address.toLowerCase() === userAddress.toLowerCase() && r.chain === 'BASE'
    );

    let addressId;
    if (existingRecipient) {
      addressId = existingRecipient.id;
    } else {
      // Create new recipient if not found
      const createdRecipient = await client.createRecipientAddress({
        description: `Base Wallet: ${userAddress}`,
        chain: 'BASE',
        address: userAddress,
        currency: 'USD',
      }) as { data: { id: string } };

      addressId = createdRecipient.data?.id;
      if (!addressId) throw new Error('Failed to create recipient address');

      return NextResponse.json({
        success: true,
        transfer: null,
        message: `Recipient address created. Please wait for the confirmation from admin and retry the transfer.`,
      });
    }

    // Create transfer to the verified blockchain address
    const transfer = await client.createTransferById({
      addressId,
      amount: {
        amount: amount.toString(),
        currency: 'USD',
      },
    }) as { data: any }; // Cast to expected type

    return NextResponse.json({
      success: true,
      transfer: transfer.data,
      message: `${amount} USDC transferred to verified blockchain address (Base).`,
    });
  } catch (error) {
    console.error('❌ Transfer to wallet error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Transfer failed',
    }, { status: 500 });
  }
}
