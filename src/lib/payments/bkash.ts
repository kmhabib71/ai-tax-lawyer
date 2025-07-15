import { v4 as uuidv4 } from 'uuid';

export interface BkashConfig {
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  baseUrl: string;
}

export interface PaymentRequest {
  amount: string;
  currency: string;
  intent: 'sale';
  merchantInvoiceNumber: string;
}

export interface PaymentResponse {
  paymentID: string;
  bkashURL: string;
  callbackURL: string;
  successCallbackURL: string;
  failureCallbackURL: string;
  cancelledCallbackURL: string;
  amount: string;
  intent: string;
  currency: string;
  paymentCreateTime: string;
  transactionStatus: string;
  merchantInvoiceNumber: string;
}

export interface ExecutePaymentRequest {
  paymentID: string;
}

export interface ExecutePaymentResponse {
  paymentID: string;
  trxID: string;
  transactionStatus: string;
  amount: string;
  currency: string;
  intent: string;
  paymentExecuteTime: string;
  merchantInvoiceNumber: string;
  payerType: string;
  payerAccount: string;
}

export class BkashPaymentService {
  private config: BkashConfig;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      appKey: process.env.BKASH_APP_KEY || '',
      appSecret: process.env.BKASH_APP_SECRET || '',
      username: process.env.BKASH_USERNAME || '',
      password: process.env.BKASH_PASSWORD || '',
      baseUrl: process.env.NODE_ENV === 'production' 
        ? 'https://tokenized.pay.bka.sh/v1.2.0-beta'
        : 'https://tokenized.sandbox.pay.bka.sh/v1.2.0-beta'
    };

    if (!this.config.appKey || !this.config.appSecret || !this.config.username || !this.config.password) {
      throw new Error('bKash configuration is incomplete. Please check environment variables.');
    }
  }

  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    const response = await fetch(`${this.config.baseUrl}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'username': this.config.username,
        'password': this.config.password,
      },
      body: JSON.stringify({
        app_key: this.config.appKey,
        app_secret: this.config.appSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get bKash token: ${error}`);
    }

    const data = await response.json();
    
    if (data.statusCode !== '0000') {
      throw new Error(`bKash token error: ${data.statusMessage}`);
    }

    this.token = data.id_token || '';
    // Token expires in 1 hour, refresh 5 minutes early
    this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
    
    return this.token!;
  }

  async createPayment(
    amount: number,
    subscriptionType: string,
    userId: string
  ): Promise<PaymentResponse> {
    const token = await this.getToken();
    const merchantInvoiceNumber = `AI-TAX-${subscriptionType}-${userId}-${Date.now()}`;

    const paymentRequest: PaymentRequest = {
      amount: amount.toString(),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber,
    };

    const response = await fetch(`${this.config.baseUrl}/tokenized/checkout/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': token,
        'X-APP-Key': this.config.appKey,
      },
      body: JSON.stringify(paymentRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create bKash payment: ${error}`);
    }

    const data = await response.json();
    
    if (data.statusCode !== '0000') {
      throw new Error(`bKash payment creation error: ${data.statusMessage}`);
    }

    return data;
  }

  async executePayment(paymentID: string): Promise<ExecutePaymentResponse> {
    const token = await this.getToken();

    const response = await fetch(`${this.config.baseUrl}/tokenized/checkout/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': token,
        'X-APP-Key': this.config.appKey,
      },
      body: JSON.stringify({ paymentID }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to execute bKash payment: ${error}`);
    }

    const data = await response.json();
    
    if (data.statusCode !== '0000') {
      throw new Error(`bKash payment execution error: ${data.statusMessage}`);
    }

    return data;
  }

  async queryPayment(paymentID: string): Promise<any> {
    const token = await this.getToken();

    const response = await fetch(`${this.config.baseUrl}/tokenized/checkout/payment/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': token,
        'X-APP-Key': this.config.appKey,
      },
      body: JSON.stringify({ paymentID }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to query bKash payment: ${error}`);
    }

    const data = await response.json();
    return data;
  }

  async refundPayment(paymentID: string, amount: string, trxID: string, sku: string): Promise<any> {
    const token = await this.getToken();

    const response = await fetch(`${this.config.baseUrl}/tokenized/checkout/payment/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': token,
        'X-APP-Key': this.config.appKey,
      },
      body: JSON.stringify({
        paymentID,
        amount,
        trxID,
        sku,
        reason: 'Subscription cancellation'
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refund bKash payment: ${error}`);
    }

    const data = await response.json();
    return data;
  }
}

export const bkashService = new BkashPaymentService();