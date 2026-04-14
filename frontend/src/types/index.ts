// Shared types for the frontend application
// These types match the database schema defined in backend/src/migrations/001_initial_schema.sql

export interface User {
  id: string;
  email: string;
  role: 'superadmin' | 'admin';
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  referral_code: string;
  contact_number?: string;
  email?: string;
  role?: string;
  team_leader_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  category: 'Residential' | 'Business';
  speed: string;
  price: number;
  inclusions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  birthday: string;
  contact_number: string;
  email?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  house_photo_url?: string;
  government_id_url?: string;
  id_selfie_url?: string;
  signature_url?: string;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Scheduled for Installation' | 'Activated' | 'Denied' | 'Voided';
  status_reason?: string;
  agent_id: string;
  plan_id: string;
  created_at: string;
  updated_at: string;
  activated_at?: string;
  data_purged: boolean;
  data_purged_at?: string;
}

export interface Commission {
  id: string;
  agent_id: string;
  subscriber_id: string;
  amount: number;
  status: 'Pending' | 'Eligible' | 'Paid';
  date_activated: string;
  date_paid?: string;
  created_at: string;
  updated_at: string;
}

export interface Subscriber extends Application {
  commission_status: 'Pending' | 'Eligible' | 'Paid';
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  fields_purged?: string[];
  files_deleted?: string[];
  performed_by: string;
  performed_at: string;
  metadata?: Record<string, any>;
}
