export interface WhatsAppTemplate {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  category: string;
  body_text: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppLog {
  id: number;
  tenant_id: number;
  order_id?: number;
  recipient_phone: string;
  recipient_name?: string;
  template_code?: string;
  message_body: string;
  provider: string;
  provider_message_id?: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  order?: {
    id: number;
    order_number: string;
  };
}
