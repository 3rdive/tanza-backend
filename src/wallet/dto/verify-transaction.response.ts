export interface PaystackTransaction {
  id: number;
  domain: string;
  status: string;
  reference: string;
  receipt_number: string | null;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string; // ISO date string
  created_at: string; // ISO date string
  channel: string;
  currency: string;
  ip_address: string;
  metadata: string | Record<string, unknown> | null;

  log: {
    start_time: number;
    time_spent: number;
    attempts: number;
    errors: number;
    success: boolean;
    mobile: boolean;
    input: unknown[];
    history: {
      type: string;
      message: string;
      time: number;
    }[];
  };

  fees: number;
  fees_split: string | null;

  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string | null;
  };

  customer: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    customer_code: string;
    phone: string | null;
    metadata: string | Record<string, unknown> | null;
    risk_action: string;
    international_format_phone: string | null;
  };

  plan: string | null;
  split: Record<string, unknown>;
  order_id: string | null;
  paidAt: string; // ISO date string
  createdAt: string; // ISO date string
  requested_amount: number;
  pos_transaction_data: string | null;
  source: string | null;
  fees_breakdown: string | null;
  connect: string | null;
  transaction_date: string; // ISO date string
  plan_object: Record<string, unknown>;
  subaccount: Record<string, unknown>;
}
