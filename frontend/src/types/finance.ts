import type { Customer } from './crm';
import type { Order } from './order';

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
export type InvoiceType = 'full' | 'down_payment' | 'final_settlement';
export type PaymentMethod = 'bank_transfer' | 'cash' | 'qris' | 'other';
export type PaymentStatus = 'confirmed' | 'pending_verification' | 'rejected';

export interface Payment {
  id: number;
  tenant_id: number;
  invoice_id: number;
  order_id: number;
  customer_id: number;
  payment_number: string;
  payment_date: string;
  amount: number | string;
  payment_method: PaymentMethod;
  destination_bank_account?: string | null;
  reference_number?: string | null;
  proof_image_url?: string | null;
  status: PaymentStatus;
  notes?: string | null;
  received_by?: number | null;
  receiver?: {
    id: number;
    name: string;
    email: string;
  } | null;
  invoice?: Invoice;
  order?: Order;
  customer?: Customer;
  created_at: string;
}

export interface Invoice {
  id: number;
  tenant_id: number;
  order_id: number;
  customer_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  invoice_type: InvoiceType;
  subtotal_amount: number | string;
  delivery_fee: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  paid_amount: number | string;
  remaining_amount: number | string;
  status: InvoiceStatus;
  notes?: string | null;
  terms_and_conditions?: string | null;
  created_by?: number | null;
  creator?: {
    id: number;
    name: string;
    email: string;
  } | null;
  order?: Order;
  customer?: Customer;
  payments?: Payment[];
  tenant?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    bank_accounts?: Array<{
      bank_name: string;
      account_number: string;
      account_name: string;
    }>;
  };
  created_at: string;
  updated_at: string;
}

export interface FinanceSummary {
  total_receivables: number;
  paid_this_month: number;
  total_revenue_all_time: number;
  total_invoices_count: number;
  unpaid_count: number;
  partially_paid_count: number;
  paid_count: number;
}

export interface CreateInvoicePayload {
  order_id: number;
  invoice_type?: InvoiceType;
  invoice_date?: string;
  due_date?: string;
  total_amount?: number;
  notes?: string;
  terms_and_conditions?: string;
}

export interface RecordPaymentPayload {
  amount: number;
  payment_date?: string;
  payment_method: PaymentMethod;
  destination_bank_account?: string;
  reference_number?: string;
  proof_image_url?: string;
  notes?: string;
}
