import { NextRequest, NextResponse } from 'next/server';
import { paymasterService } from '@/lib/paymaster';

interface PaymasterRequest {
  userAddress: string;
  transaction: {
    to: string;
    data: string;
    value: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { userAddress, transaction }: PaymasterRequest = await request.json();

    if (!userAddress || !transaction) {
      return NextResponse.json({
        success: false,
        sponsored: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    console.log('💰 Paymaster request received:', {
      userAddress,
      to: transaction.to,
      value: transaction.value
    });

    // Check if paymaster service is available
    if (!await paymasterService.isAvailable()) {
      return NextResponse.json({
        success: true,
        sponsored: false,
        error: 'Paymaster service not available'
      });
    }

    // Check sponsorship eligibility using our service
    const isEligible = await paymasterService.isEligibleForSponsorship(
      userAddress as `0x${string}`,
      transaction.to as `0x${string}`,
      BigInt(transaction.value || '0'),
      transaction.data as `0x${string}`
    );

    if (!isEligible) {
      return NextResponse.json({
        success: true,
        sponsored: false,
        error: 'Transaction not eligible for sponsorship'
      });
    }
    console.log('🔄 Requesting paymaster sponsorship from Coinbase Paymaster...');

    // Production paymaster call (uncomment when you have real paymaster setup)
    const paymasterResponse = await fetch(process.env.NEXT_PUBLIC_PAYMASTER_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.COINBASE_PAYMASTER_API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'pm_sponsorUserOperation',
        params: [
          {
            sender: userAddress,
            callData: transaction.data,
            nonce: '0x0',
            initCode: '0x',
            callGasLimit: '0x76c0',
            verificationGasLimit: '0x76c0',
            preVerificationGas: '0x1388',
            maxFeePerGas: '0x59682f00',
            maxPriorityFeePerGas: '0x59682f00',
            paymasterAndData: '0x',
            signature: '0x',
          },
          '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' // EntryPoint
        ],
        id: 1,
      }),
    });

    if (!paymasterResponse.ok) {
      throw new Error('Paymaster API request failed');
    }

    const result = await paymasterResponse.json();

    if (result.error) {
      return NextResponse.json({
        success: true,
        sponsored: false,
        error: result.error.message
      });
    }

    return NextResponse.json({
      success: true,
      sponsored: true,
      paymaster: result.result.paymaster,
      paymasterData: result.result.paymasterData,
    });
    

 

  } catch (error) {
    console.error('❌ Paymaster error:', error);
    return NextResponse.json({
      success: false,
      sponsored: false,
      error: error instanceof Error ? error.message : 'Paymaster request failed'
    }, { status: 500 });
  }
}
