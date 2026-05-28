// ─── Enums ───────────────────────────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ORG_ADMIN = "org_admin",
  FUNDRAISER = "fundraiser",
  VIEWER = "viewer",
}

export enum OrganizationUserStatus {
  ACTIVE = "active",
  INVITED = "invited",
  DISABLED = "disabled",
}

export enum MoveStatus {
  PLANNED = "planned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  SKIPPED = "skipped",
}

export enum MoveIdeaStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
}

export enum FeedbackStatus {
  NEW = "new",
  REVIEWED = "reviewed",
  RESOLVED = "resolved",
}

export enum ImportStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum IntegrationProvider {
  SALESFORCE = "salesforce",
  HUBSPOT = "hubspot",
  BLOOMERANG = "bloomerang",
  CSV = "csv",
}

export enum IntegrationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ERROR = "error",
}

// ─── Database Entity Types ───────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUser {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  status: OrganizationUserStatus;
  invited_email: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Donor {
  id: string;
  organization_id: string;
  external_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: Record<string, unknown> | null;
  total_donated: number;
  largest_gift: number;
  last_gift_date: string | null;
  last_gift_amount: number | null;
  first_gift_date: string | null;
  donation_count: number;
  recurring_donor: boolean;
  communication_preference: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  score: number | null;
  score_updated_at: string | null;
  tier: string | null;
  created_at: string;
  updated_at: string;
}

export interface Move {
  id: string;
  organization_id: string;
  donor_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  move_type: string;
  status: MoveStatus;
  due_date: string | null;
  completed_at: string | null;
  priority: number;
  outcome: string | null;
  created_at: string;
  updated_at: string;
}

export interface MoveIdea {
  id: string;
  organization_id: string;
  donor_id: string;
  title: string;
  description: string | null;
  move_type: string;
  rationale: string | null;
  ai_generated: boolean;
  ai_model: string | null;
  ai_confidence: number | null;
  status: MoveIdeaStatus;
  converted_move_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoringConfig {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  factors: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TierConfig {
  id: string;
  organization_id: string;
  name: string;
  label: string;
  min_score: number;
  max_score: number;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ScoreBandConfig {
  id: string;
  organization_id: string;
  scoring_config_id: string;
  factor_key: string;
  min_value: number;
  max_value: number;
  points: number;
  label: string | null;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  organization_id: string;
  user_id: string;
  move_idea_id: string | null;
  donor_id: string | null;
  feedback_type: string;
  content: string;
  rating: number | null;
  status: FeedbackStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportLog {
  id: string;
  organization_id: string;
  initiated_by: string;
  source: string;
  file_name: string | null;
  file_url: string | null;
  status: ImportStatus;
  total_records: number;
  processed_records: number;
  failed_records: number;
  error_details: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  organization_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  credentials_encrypted: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  sync_frequency: string | null;
  created_at: string;
  updated_at: string;
}
