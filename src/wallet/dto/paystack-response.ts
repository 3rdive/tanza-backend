export interface PaystackChargeSuccessEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string; // ISO date string
    created_at: string; // ISO date string
    channel: string;
    currency: string;
    ip_address: string | null;
    metadata: {
      receiver_account_number: string;
      receiver_bank: string;
      receiver_account_type: string | null;
      custom_fields: Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
    };
    fees_breakdown: any;
    log: any;
    fees: number;
    fees_split: any;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string | null;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string | null;
      account_name: string | null;
      sender_country: string;
      sender_bank: string | null;
      sender_bank_account_number: string;
      receiver_bank_account_number: string;
      receiver_bank: string;
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: any;
      risk_action: string;
      international_format_phone: string | null;
    };
    plan: Record<string, unknown>;
    subaccount: Record<string, unknown>;
    split: Record<string, unknown>;
    order_id: string | null;
    paidAt: string; // ISO date string
    requested_amount: number;
    pos_transaction_data: any;
    source: any;
  };
}
