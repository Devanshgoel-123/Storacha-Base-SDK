import { v4 as uuidv4 } from 'uuid';

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const CIRCLE_API_BASE_URL = process.env.CIRCLE_API_BASE_URL || 'https://api-sandbox.circle.com';

export class CircleClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    if (!CIRCLE_API_KEY) {
      throw new Error('CIRCLE_API_KEY not configured');
    }
    this.apiKey = CIRCLE_API_KEY.trim();
    this.baseUrl = CIRCLE_API_BASE_URL;

    console.log('🔧 Circle Client initialized:', {
      baseUrl: this.baseUrl,
      apiKeyPrefix: this.apiKey.substring(0, 20) + '...',
      environment: this.apiKey.startsWith('TEST_API_KEY:') ? 'sandbox' : 'production',
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    console.log('📡 Circle API Request:', {
      method: options.method || 'GET',
      url,
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('📥 Response:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', errorText);
      throw new Error(`Circle API error: ${response.status}`);
    }

    return response.json();
  }

  // Bank Accounts
  async createWireBankAccount(params: {
    accountNumber: string;
    routingNumber: string;
    billingDetails: {
      name: string;
      line1: string;
      city: string;
      district: string;
      postalCode: string;
      country: string;
    };
    bankAddress: {
      bankName: string;
      city: string;
      country: string;
    };
  }) {
    return this.request('/v1/businessAccount/banks/wires', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey: uuidv4(),
        ...params,
      }),
    });
  }

  async getWireBankAccounts() {
    return this.request('/v1/businessAccount/banks/wires');
  }

  async getWireInstructions(bankAccountId: string, currency: string = 'USD') {
    return this.request(`/v1/businessAccount/banks/wires/${bankAccountId}/instructions?currency=${currency}`);
  }

  // Mock Wire Deposit (Sandbox)
  async createMockWireDeposit(params: {
    trackingRef: string;
    amount: {
      amount: string;
      currency: string;
    };
    beneficiaryBank: {
      accountNumber: string;
    };
  }) {
    return this.request('/v1/mocks/payments/wire', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Transfers (Mint USDC to blockchain)
  async createTransfer(params: {
    amount: {
      amount: string;
      currency: string;
    };
    destination: {
      type: string;
      address: string;
      chain: string;
    };
  }) {
    return this.request('/v1/businessAccount/transfers', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey: uuidv4(),
        source: {
          type: 'wallet',
          id: 'master',
        },
        ...params,
      }),
    });
  }

  async getTransfer(transferId: string) {
    return this.request(`/v1/businessAccount/transfers/${transferId}`);
  }

  // Payouts (Withdraw to bank)
  async createPayout(params: {
    amount: {
      amount: string;
      currency: string;
    };
    destination: {
      type: string;
      id: string;
    };
  }) {
    return this.request('/v1/businessAccount/payouts', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey: uuidv4(),
        ...params,
      }),
    });
  }

  // Create a verified recipient address
  async createRecipientAddress(params: {
    description: string;
    chain: string;
    address: string;
    currency?: string;
  }) {
    const idempotencyKey = uuidv4();
    return this.request('/v1/businessAccount/wallets/addresses/recipient', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey,
        ...params,
      }),
    });
  }

  // Transfer using verified blockchain addressId
  async createTransferById(params: {
    addressId: string;
    amount: { amount: string; currency: string };
  }) {
    const idempotencyKey = uuidv4();
    return this.request('/v1/businessAccount/transfers', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey,
        destination: {
          type: 'verified_blockchain',
          addressId: params.addressId,
        },
        amount: params.amount,
      }),
    });
  }

  async getReciepientAddresses() {
    return this.request(`/v1/businessAccount/wallets/addresses/recipient`);
  }


  async getPayout(payoutId: string) {
    return this.request(`/v1/businessAccount/payouts/${payoutId}`);
  }

  // Balance
  async getBalance() {
    return this.request('/v1/businessAccount/balances');
  }

  // Configuration (test connection)
  async getConfiguration() {
    return this.request('/v1/configuration');
  }
}

let instance: CircleClient | null = null;

export function getCircleClient(): CircleClient {
  if (!instance) {
    instance = new CircleClient();
  }
  return instance;
}


