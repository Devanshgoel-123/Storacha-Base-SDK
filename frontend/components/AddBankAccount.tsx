'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAccount } from 'wagmi';
import { Building2, Loader2, AlertCircle } from 'lucide-react';

export default function AddBankAccount() {
  const { address, isConnected } = useAccount();

  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/circle/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber,
          routingNumber,
          accountHolderName,
          bankName,
          address: {
            line1: bankName,  // Using bankName here as line1; you can add UI for proper street if required
            city,
            state,
            postalCode,
            country,
          },
          baseWalletAddress: address, // Attach connected base wallet address to bank account details
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage('Bank account added successfully!');
        setAccountNumber('');
        setRoutingNumber('');
        setAccountHolderName('');
        setBankName('');
        setCity('');
        setState('');
        setPostalCode('');
        setCountry('US');
      } else {
        setMessage(data.error || 'Failed to add bank account');
      }
    } catch (error) {
      setMessage('Error submitting bank account');
    }

    setIsLoading(false);
  };

  if (!isConnected) {
    return (
      <Card className="p-6">
        <AlertCircle className="w-5 h-5 text-yellow-600 mb-2" />
        <p>Please connect wallet to add bank details.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4 max-w-md mx-auto">
      <h3 className="text-lg font-bold">Add Bank Account</h3>

      <Input
        placeholder="Account Holder Name"
        value={accountHolderName}
        onChange={(e) => setAccountHolderName(e.target.value)}
        disabled={isLoading}
      />
      <Input
        placeholder="Bank Name"
        value={bankName}
        onChange={(e) => setBankName(e.target.value)}
        disabled={isLoading}
      />
      <Input
        placeholder="Account Number"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        disabled={isLoading}
      />
      <Input
        placeholder="Routing Number"
        value={routingNumber}
        onChange={(e) => setRoutingNumber(e.target.value)}
        disabled={isLoading}
      />
      <Input
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        disabled={isLoading}
      />
      <Input
        placeholder="State"
        value={state}
        onChange={(e) => setState(e.target.value)}
        disabled={isLoading}
      />
      <Input
        placeholder="Postal Code"
        value={postalCode}
        onChange={(e) => setPostalCode(e.target.value)}
        disabled={isLoading}
      />
      <Input
        placeholder="Country (ISO)"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        disabled={isLoading}
      />

      <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          'Add Bank Account'
        )}
      </Button>

      {message && <p className="text-center mt-2 text-sm">{message}</p>}
    </Card>
  );
}
