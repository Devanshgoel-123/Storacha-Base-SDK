'use client';
import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpFromLine, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { BASE_SEPOLIA_CHAIN_ID, ERC20_ABI, USDC_CONTRACT_ADDRESS } from '@/lib/constants';
import { useBaseAccount } from '@/lib/hooks/useBaseAccount';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Address, encodeFunctionData, numberToHex, parseUnits } from 'viem';
import { usePaymasterCapabilities } from '@/lib/hooks/usePaymasterCapabilities';

const TREASURY_ADDRESS = '0x9de5b155a9f89c343ced429a5fe10eb60750ffc0';

export default function CircleWithdraw() {
  const [amount, setAmount] = useState('');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [stage, setStage] = useState<'start' | 'processing' | 'done'>('start');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const { address: walletAddress, isConnected } = useAccount();

  const { 
    provider, 
    address: fromAddress, // This is cryptoAccount?.account?.address
    isInitialized, 
    error: baseAccountError 
  } = useBaseAccount();

  const { data: usdcBalance, refetch: refetchBalance } = useBalance({
    address: fromAddress as Address,
    token: USDC_CONTRACT_ADDRESS,
  });


  const currentBalance = parseFloat(usdcBalance?.formatted || '0');


  const handleSendSponsoredTransaction = async () => {
    // Validation - exactly as in official docs
    if (!fromAddress) {
      console.error('❌ No account found');
      return;
    }

    if (!provider || !amount || !TREASURY_ADDRESS) {
      console.error('❌ Missing required parameters:', {
        provider: !!provider,
        fromAddress,
        amount,
        TREASURY_ADDRESS
      });
      return;
    }

    try {
      const amountWei = parseUnits(amount, 6); // USDC has 6 decimals

      // Your Paymaster service URL (use your proxy URL) - exactly as in official docs
      const paymasterServiceUrl = process.env.NEXT_PUBLIC_PAYMASTER_PROXY_SERVER_URL || 
                                  process.env.NEXT_PUBLIC_PAYMASTER_URL;

      if (!paymasterServiceUrl) {
        throw new Error('Paymaster service URL not configured');
      }

      // Prepare the transaction call - exactly as in official docs
      const calls = [
        {
          to: USDC_CONTRACT_ADDRESS,
          value: '0x0',
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [TREASURY_ADDRESS, amountWei]
          })
        }
      ];

      console.log('🚀 Sending sponsored transaction:', {
        from: fromAddress,
        to: USDC_CONTRACT_ADDRESS,
        amount: amount + ' USDC',
        TREASURY_ADDRESS,
        paymasterServiceUrl: 'configured'
      });

      // Send the transaction with paymaster capabilities - exactly as in official docs
      const result = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '1.0',
          chainId: numberToHex(BASE_SEPOLIA_CHAIN_ID),
          from: fromAddress,
          calls: calls,
          capabilities: {
            paymasterService: {
              url: paymasterServiceUrl
            }
          }
        }]
      });

      console.log('✅ Sponsored transaction sent:', result);
    

      // Refetch balance after successful transaction
      setTimeout(() => {
        refetchBalance();
      }, 3000);


    } catch (error) {
      console.error('❌ Sponsored transaction failed:', error);

    }
  };


  useEffect(() => {
    if (!isConnected) return;
    (async () => {
      try {
        const res = await fetch('/api/circle/bank-accounts');
        const data = await res.json();
        if (data.success) {
          setBankAccounts(data.bankAccounts);
          setSelectedBank(data.bankAccounts[0]?.id);
        }
      } catch (error) {
        console.error('Failed to load bank accounts:', error);
      }
    })();
  }, [isConnected]);


  async function withdraw() {
    setLoading(true);
    setStage('processing');
    setMsg('');

    try {
      // First burn or transfer USDC from user wallet to treasury (on-chain)
      await handleSendSponsoredTransaction();

      // Then call backend to payout via Circle
      const res = await fetch('/api/circle/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          bankAccountId: selectedBank,
          userAddress: walletAddress,
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setStage('done');
      setMsg(`Withdrawal of $${amount} sent to bank.`);
    } catch (error) {
      setStage('start');
      setMsg(error instanceof Error ? error.message : 'Withdraw failed');
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <Card className="p-6">
        <AlertCircle className="w-4 h-4 text-yellow-600 inline mr-2" />
        Please connect wallet
      </Card>
    );
  }

  if (!isInitialized) {
    return (
      <Card className="p-6">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        <p className="text-center mt-2">Initializing wallet…</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ArrowUpFromLine className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-semibold">Withdraw USDC → Bank</h3>
        <Badge variant="outline">Off-ramp</Badge>
      </div>

      <div className="p-3 bg-green-50 rounded border">
        <p className="text-sm text-gray-600">USDC Balance</p>
        <p className="text-xl font-bold text-green-700">{currentBalance} USDC</p>
      </div>

      {stage === 'start' && (
        <>
          <Input
            type="number"
            placeholder="Amount in USD"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            max={currentBalance}
          />
          <Select value={selectedBank} onValueChange={setSelectedBank}>
            <SelectTrigger>
              <SelectValue placeholder="Select Bank Account" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  {bank.description || `****${bank.accountNumber?.slice(-4)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={withdraw} disabled={loading || !amount || !selectedBank} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Withdraw ${amount}
          </Button>
        </>
      )}

      {stage === 'processing' && (
        <Card className="p-5 bg-blue-50 border-blue-200 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto mb-2" />
          Processing withdrawal...
        </Card>
      )}

      {stage === 'done' && (
        <Card className="p-5 bg-green-50 border-green-200 text-center">
          <CheckCircle className="w-6 h-6 text-green-700 mx-auto mb-2" />{msg}
        </Card>
      )}

      {msg && stage !== 'done' && (
        <p className="text-center text-xs text-red-600 mt-2">{msg}</p>
      )}
    </Card>
  );
}
