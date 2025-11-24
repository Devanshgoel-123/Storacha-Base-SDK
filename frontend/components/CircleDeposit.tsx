'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccount, useBalance } from 'wagmi';
import {
  ArrowDownToLine,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building2,
  Copy,
  Zap
} from 'lucide-react';
import { USDC_CONTRACT_ADDRESS } from '@/lib/constants';

export default function CircleDeposit() {
  const [amount, setAmount] = useState('100');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [wireInstructions, setWireInstructions] = useState<any>(null);
  const [stage, setStage] = useState<'start' | 'instructions' | 'processing' | 'done'>('start');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { address, isConnected } = useAccount();
  const { data: usdcBalance, refetch } = useBalance({
    address,
    token: USDC_CONTRACT_ADDRESS,
  });

  // Load bank accounts on mount
  useEffect(() => {
    if (!isConnected) return;

    (async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/circle/bank-accounts');
        const data = await response.json();

        if (data.success && data.bankAccounts.length > 0) {
          setBankAccounts(data.bankAccounts);
          setSelectedBank(data.bankAccounts[0].id);
        }
      } catch (error) {
        console.error('Failed to load bank accounts:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isConnected]);

  // Fetch wire instructions for deposit
  const getWireInstructions = async () => {
    if (!selectedBank || !amount) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/circle/deposit/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: selectedBank,
          amount: parseFloat(amount),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setWireInstructions(data.instructions);
        setStage('instructions');
      } else {
        setMessage(data.error || 'Failed to get wire instructions');
      }
    } catch (error) {
      setMessage('Error fetching wire instructions');
    }
    setIsLoading(false);
  };

  // Simulate wire deposit and mint USDC to wallet (sandbox only)
  const simulateWireDepositAndMint = async () => {
    if (!wireInstructions) return;
    setIsLoading(true);
    setStage('processing');
    setMessage('');

    try {
      // Mock the wire deposit
      const mockRes = await fetch('/api/circle/deposit/mock-wire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          trackingRef: wireInstructions.trackingRef,
          accountNumber: wireInstructions.beneficiaryBank.accountNumber,
        }),
      });
      const mockData = await mockRes.json();
      if (!mockData.success) throw new Error(mockData.error);

      // Mint USDC to user's Base wallet
      const transferRes = await fetch('/api/circle/deposit/transfer-to-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          userAddress: address,
        }),
      });
      const transferData = await transferRes.json();
      if (!transferData.success) throw new Error(transferData.error);

      if (transferData.transfer == null) {
        setStage('instructions');
        setMessage(transferData.message || 'Please wait for admin confirmation and retry.');
        setIsLoading(false);
        return;
      }

      setStage('done');
      setMessage(`Successfully minted ${amount} USDC to your Base wallet!`);
      refetch?.();
    } catch (error) {
      setStage('instructions');
      setMessage(error instanceof Error ? error.message : 'Deposit failed');
    }
    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const usdcBalanceNum = parseFloat(usdcBalance?.formatted || '0').toFixed(2);

  if (!isConnected) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-4" />
        <p className="text-yellow-800 font-semibold">Please connect your wallet to deposit funds.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-2">
      <div className="flex items-center gap-2">
        <ArrowDownToLine className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold">Deposit Fiat to USDC</h3>
        <Badge variant="outline">Bank → USDC on Base</Badge>
      </div>

      <div className="p-3 bg-blue-50 rounded border">
        <span>USDC Balance:</span>{' '}
        <span className="font-bold text-blue-700">{usdcBalanceNum} USDC</span>
      </div>

      {stage === 'start' && (
        <>
          <Input
            type="number"
            min={10}
            placeholder="Amount in USD"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
          />

          <Select value={selectedBank} onValueChange={(value) => setSelectedBank(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Deposit Bank Account" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  {bank.description || `Bank ****${bank.accountNumber?.slice(-4)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button disabled={isLoading || !amount || !selectedBank} onClick={getWireInstructions} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching Instructions
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4 mr-2" /> Get Wire Instructions
              </>
            )}
          </Button>
        </>
      )}

      {stage === 'instructions' && wireInstructions && (
        <>
          <Card className="p-4 bg-green-50 border-green-300">
            <p className="text-lg font-semibold text-green-700">Wire Transfer Details</p>
            <p><strong>Bank:</strong> {wireInstructions.beneficiaryBank.name}</p>
            <p><strong>Account Number:</strong> {wireInstructions.beneficiaryBank.accountNumber}</p>
            <p><strong>Routing Number:</strong> {wireInstructions.beneficiaryBank.routingNumber}</p>
            <p><strong>Tracking Reference:</strong> {wireInstructions.trackingRef}</p>
          </Card>

          <Button onClick={simulateWireDepositAndMint} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Simulating Deposit & Minting USDC
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" /> Simulate Deposit & Mint USDC
              </>
            )}
          </Button>

          <Button onClick={() => { setStage('start'); setWireInstructions(null); setMessage(''); }} variant="outline" className="w-full">
            Cancel
          </Button>
        </>
      )}

      {stage === 'processing' && (
        <Card className="p-6 bg-blue-50 border-blue-200 text-center">
          <Loader2 className="w-10 h-10 mx-auto mb-2 animate-spin text-blue-600" />
          <p className="font-semibold text-blue-700">Processing your deposit...</p>
        </Card>
      )}

      {stage === 'done' && (
        <Card className="p-6 bg-green-50 border-green-300 text-center">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-600" />
          <p className="font-semibold text-green-700">{message}</p>
          <Button onClick={() => { setStage('start'); setWireInstructions(null); setAmount(''); setMessage(''); }} className="mt-4 w-full">
            Make another deposit
          </Button>
        </Card>
      )}

      {message && stage !== 'done' && (
        <Card className="p-4 bg-red-50 border-red-300 space-y-1">

          <p className="text-center text-base font-semibold text-red-600">{message}</p>
        </Card>
      )}
    </Card>
  );
}
