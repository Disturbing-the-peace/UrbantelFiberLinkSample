// Shared types for the backend API
// These types match the database schema defined in migrations/001_initial_schema.sql

export interface Branch {
  id: string;
  name: string;
  address?: string;
  contact_number?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBranch {
  id: string;
  user_id: string;
  branch_id: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'system_administrator';
  full_name: string;
  is_active: boolean;
  primary_branch_id: string;
  profile_picture_url?: string;
  is_first_login: boolean;
  onboarding_completed: boolean;
  password_changed_at?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  branches?: Branch[]; // Array of branches user has access to
}

export interface Agent {
  id: string;
  name: string;
  referral_code: string;
  contact_number?: string;
  email?: string;
  role?: string;
  team_leader_id?: string;
  branch_id: string;
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
  branch_id: string;
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
  branch_id: string;
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
  branch_id: string;
  date_activated: string;
  date_paid?: string;
  created_at: string;
  updated_at: string;
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

export interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  color: string;
  branch_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Referrer {
  id: string;
  name: string;
  referral_code: string;
  contact_number?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentApplication {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  birthday: string;
  contact_number: string;
  email?: string;
  address: string;
  resume_url?: string;
  valid_id_url?: string;
  barangay_clearance_url?: string;
  gcash_screenshot_url?: string;
  referred_by_referrer_id?: string;
  created_at: string;
  updated_at: string;
}
