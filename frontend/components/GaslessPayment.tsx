'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAccount, useBalance } from 'wagmi';
import { parseUnits, encodeFunctionData, numberToHex } from 'viem';
import type { Address } from 'viem';
import { Zap, Shield, ExternalLink, AlertCircle, Loader2, CheckCircle, Send } from 'lucide-react';
import { useBaseAccount } from '@/lib/hooks/useBaseAccount';
import { usePaymasterCapabilities } from '@/lib/hooks/usePaymasterCapabilities';
import { 
  BASE_SEPOLIA_CHAIN_ID, 
  USDC_CONTRACT_ADDRESS, 
  ERC20_ABI, 
  DEMO_ADDRESSES,
  formatAddress 
} from '@/lib/constants';

export default function GaslessPayment() {
  const [amount, setAmount] = useState('10');
  const [recipient, setRecipient] = useState<Address>(DEMO_ADDRESSES.recipient1);
  const [description, setDescription] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const { isConnected } = useAccount();
  
  // Initialize Base Account SDK - get address from getCryptoKeyAccount()
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

  const { data: ethBalance } = useBalance({
    address: fromAddress as Address,
  });

  // Check if paymaster is supported
  const { 
    isSupported: paymasterSupported, 
    isChecking: checkingPaymaster,
    error: paymasterError 
  } = usePaymasterCapabilities(provider, fromAddress, isInitialized);

  // Log the address from getCryptoKeyAccount
  useEffect(() => {
    if (isInitialized && fromAddress) {
      console.log('✅ Using address from getCryptoKeyAccount():', fromAddress);
    }
  }, [isInitialized, fromAddress]);

  const handleSendSponsoredTransaction = async () => {
    // Validation - exactly as in official docs
    if (!fromAddress) {
      console.error('❌ No account found');
      setErrorMessage('No account found');
      return;
    }

    if (!provider || !amount || !recipient) {
      console.error('❌ Missing required parameters:', {
        provider: !!provider,
        fromAddress,
        amount,
        recipient
      });
      return;
    }

    setTransactionStatus('pending');
    setErrorMessage('');
    setTxHash('');

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
            args: [recipient, amountWei]
          })
        }
      ];

      console.log('🚀 Sending sponsored transaction:', {
        from: fromAddress,
        to: USDC_CONTRACT_ADDRESS,
        amount: amount + ' USDC',
        recipient,
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
      
      setTxHash(result as string);
      setTransactionStatus('success');

      // Refetch balance after successful transaction
      setTimeout(() => {
        refetchBalance();
      }, 3000);

      // Reset form after 5 seconds
      setTimeout(() => {
        setTransactionStatus('idle');
        setAmount('');
        setDescription('');
        setTxHash('');
      }, 5000);

    } catch (error) {
      console.error('❌ Sponsored transaction failed:', error);
      setTransactionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
      
      setTimeout(() => {
        setTransactionStatus('idle');
        setErrorMessage('');
      }, 5000);
    }
  };

  const currentBalance = parseFloat(usdcBalance?.formatted || '0');
  const ethBalanceNum = parseFloat(ethBalance?.formatted || '0');
  const requestedAmount = parseFloat(amount || '0');

  const isValidTransaction = 
    isConnected && 
    fromAddress && 
    amount && 
    recipient && 
    requestedAmount > 0 && 
    requestedAmount <= currentBalance &&
    provider &&
    isInitialized;

  // Show loading state while initializing
  if (isConnected && !isInitialized && !baseAccountError) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-3 py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-gray-600">Initializing Base Account SDK...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Zap className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-semibold">Gasless USDC Transfer</h3>
        {checkingPaymaster ? (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Checking...
          </Badge>
        ) : paymasterSupported ? (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Shield className="w-3 h-3 mr-1" />
            Gas Sponsored
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            Gas Required
          </Badge>
        )}
      </div>

      <div className="space-y-4">
       

        {/* Balance Display */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50 rounded border">
            <p className="text-sm text-gray-600">USDC Balance</p>
            <p className="text-xl font-bold text-blue-600">
              {currentBalance.toFixed(2)} USDC
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded border">
            <p className="text-sm text-gray-600">ETH Balance</p>
            <p className="text-lg font-bold text-gray-600">
              {ethBalanceNum.toFixed(4)} ETH
            </p>
            {paymasterSupported && (
              <p className="text-xs text-green-600 mt-1">⚡ No gas needed!</p>
            )}
          </div>
        </div>

        {/* Error Messages */}
        {baseAccountError && (
          <Card className="p-3 bg-red-50 border-red-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Base Account Error</p>
                <p className="text-xs text-red-700 mt-1">{baseAccountError.message}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Paymaster Status */}
        {isConnected && isInitialized && !checkingPaymaster && (
          <Card className={`p-3 ${
            paymasterSupported 
              ? 'bg-green-50 border-green-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-start space-x-2">
              {paymasterSupported ? (
                <Shield className="w-4 h-4 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  paymasterSupported ? 'text-green-800' : 'text-orange-800'
                }`}>
                  {paymasterSupported 
                    ? '✅ Gasless Transaction Enabled' 
                    : '⚠️ Paymaster Not Available'
                  }
                </p>
                <p className={`text-xs mt-1 ${
                  paymasterSupported ? 'text-green-700' : 'text-orange-700'
                }`}>
                  {paymasterSupported 
                    ? 'Transaction will be sponsored by Coinbase Paymaster.'
                    : paymasterError || 'Paymaster service not available.'
                  }
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Connection Warning */}
        {!isConnected && (
          <Card className="p-3 bg-yellow-50 border-yellow-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Please connect your smart wallet to send USDC
              </p>
            </div>
          </Card>
        )}

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount (USDC)</label>
          <Input
            type="number"
            placeholder="10.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={transactionStatus === 'pending'}
            min="0.01"
            max={currentBalance.toString()}
            step="0.01"
          />
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              Available: {currentBalance.toFixed(2)} USDC
            </span>
            {requestedAmount > currentBalance && (
              <span className="text-red-600">Insufficient balance</span>
            )}
          </div>
        </div>

        {/* Recipient Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Recipient</label>
          <Input
            placeholder="0xRecipientAddress"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value as Address)}
            disabled={transactionStatus === 'pending'}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description (Optional)</label>
          <Input
            placeholder="What's this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={transactionStatus === 'pending'}
          />
        </div>

        {/* Send Button */}
        <Button 
          onClick={handleSendSponsoredTransaction}
          disabled={!isValidTransaction || transactionStatus === 'pending'}
          className="w-full"
          size="lg"
        >
          {transactionStatus === 'pending' ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing Transaction...</span>
            </div>
          ) : !isConnected ? (
            'Connect Wallet to Send'
          ) : !isInitialized ? (
            'Initializing...'
          ) : !fromAddress ? (
            'No Account Found'
          ) : (
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4" />
              {paymasterSupported && <Zap className="w-4 h-4" />}
              <span>
                Send {amount} USDC {paymasterSupported ? '(Gas Free)' : ''}
              </span>
            </div>
          )}
        </Button>

        {/* Transaction Status */}
        {transactionStatus !== 'idle' && (
          <Card className={`p-4 ${
            transactionStatus === 'success' ? 'bg-green-50 border-green-200' :
            transactionStatus === 'error' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start space-x-3">
              {transactionStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
              {transactionStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />}
              {transactionStatus === 'pending' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin mt-0.5" />}
              
              <div className="flex-1">
                <p className={`font-medium ${
                  transactionStatus === 'success' ? 'text-green-800' :
                  transactionStatus === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {transactionStatus === 'success' && (paymasterSupported ? '✅ Gasless Transaction Successful!' : '✅ Transaction Successful!')}
                  {transactionStatus === 'error' && '❌ Transaction Failed'}
                  {transactionStatus === 'pending' && '⚡ Processing Transaction...'}
                </p>
                
                <p className={`text-sm mt-1 ${
                  transactionStatus === 'success' ? 'text-green-700' :
                  transactionStatus === 'error' ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  {transactionStatus === 'success' && `Sent ${amount} USDC to ${formatAddress(recipient)}${paymasterSupported ? ' with ZERO gas fees!' : ''}`}
                  {transactionStatus === 'error' && (errorMessage || 'Please try again')}
                  {transactionStatus === 'pending' && 'Your transaction is being processed...'}
                </p>

                {txHash && (
                  <a 
                    href={`https://sepolia.basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 underline mt-2"
                  >
                    <span>View on BaseScan: {formatAddress(txHash)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Info */}
        <div className="p-3 bg-blue-50 rounded border">
          <p className="text-xs text-blue-700">
            ⚡ <strong>Official Pattern:</strong> Using getCryptoKeyAccount() to get address, exactly as shown in Base documentation.
          </p>
        </div>

        {/* Testnet Notice */}
        <div className="p-3 bg-yellow-50 rounded border">
          <p className="text-xs text-yellow-700">
            🧪 <strong>Base Sepolia Testnet:</strong> Get test USDC from{' '}
            <a 
              href="https://faucet.circle.com/" 
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Circle Faucet
            </a>
          </p>
        </div>
      </div>
    </Card>
  );
}
