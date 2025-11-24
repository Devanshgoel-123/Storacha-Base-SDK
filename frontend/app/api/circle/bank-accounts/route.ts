import { NextRequest, NextResponse } from 'next/server';
import { getCircleClient } from '@/lib/circle/client';
import { useAccount } from 'wagmi';

export async function GET(request: NextRequest) {
  try {
    
    const client = getCircleClient();
    const response = await client.getWireBankAccounts() as { data: any[] }; // Type assertion added

    const accounts = response.data || [];

    return NextResponse.json({
      success: true,
      bankAccounts: accounts,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get bank accounts',
      bankAccounts: [],
    }, { status: 500 });
  }
}

/**
 * POST: Create a new bank account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountNumber,
      routingNumber,
      accountHolderName,
      bankName,
      address,
      baseWalletAddress,  // Optional, your addition
    } = body;

    if (!accountNumber || !routingNumber || !accountHolderName || !address) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Optionally add base wallet address to description for tracking
    const description = baseWalletAddress 
      ? `Wallet: ${baseWalletAddress.slice(0, 10)}...`
      : 'No wallet address';

    const client = getCircleClient();
    const response = await client.createWireBankAccount({
      accountNumber,
      routingNumber,
      billingDetails: {
        name: accountHolderName,
        line1: address.line1,
        city: address.city,
        district: address.state || address.district,
        postalCode: address.postalCode,
        country: address.country || 'US',
      },
      bankAddress: {
        bankName: bankName || 'Bank',
        city: address.city,
        country: address.country || 'US',
      },
      // Could add description or metadata if Circle supports it
      // Here we send as 'bankName' or billingDetails.name, depending on API
    });

    return NextResponse.json({
      success: true,
      bankAccount: (response as { data: any }).data,
      description,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create bank account' },
      { status: 500 }
    );
  }
}
