export type UserRole = 'super_admin' | 'business_admin' | 'employee';
export type BusinessStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type DebtStatus = 'pending' | 'partially_paid' | 'fully_paid' | 'overdue';
export type NotificationChannel = 'sms' | 'whatsapp';
export type QueueStatus = 'pending' | 'sent' | 'failed' | 'cancelled';
export type ReminderType = 'upcoming' | 'due_today' | 'overdue';

export interface BusinessSettings {
  id: string;
  business_id: string;
  sms_provider: string;
  api_key: string | null;
  api_username: string | null;
  sender_id: string | null;
  default_currency: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  business_id: string | null;
  role: UserRole;
  name: string;
  email: string;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  business_id: string;
  customer_id: string;
  amount: number;
  amount_paid: number;
  description: string;
  payment_instructions: string | null;
  due_date: string;
  status: DebtStatus;
  created_at: string;
  updated_at: string;
  customers?: Customer;
}

export interface Payment {
  id: string;
  business_id: string;
  debt_id: string;
  amount_paid: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
  debts?: Debt;
}

export interface NotificationTemplate {
  id: string;
  business_id: string;
  type: ReminderType;
  channel: NotificationChannel;
  message_template: string;
  days_offset: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationQueueItem {
  id: string;
  business_id: string;
  debt_id: string;
  customer_id: string;
  channel: NotificationChannel;
  recipient_phone: string;
  message_body: string;
  scheduled_for: string;
  status: QueueStatus;
  attempts: number;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  customers?: Customer;
}