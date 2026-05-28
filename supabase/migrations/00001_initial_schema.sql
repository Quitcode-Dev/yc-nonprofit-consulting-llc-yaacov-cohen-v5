-- ============================================================================
-- 00001_initial_schema.sql
-- Foundational database schema for the multi-tenant platform
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'org_admin', 'solicitor');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE org_status AS ENUM ('active', 'inactive');
CREATE TYPE org_user_role AS ENUM ('org_admin', 'solicitor');
CREATE TYPE org_user_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE move_status AS ENUM ('pending', 'completed');
CREATE TYPE feedback_category AS ENUM ('bug_report', 'feature_request', 'question');
CREATE TYPE feedback_status AS ENUM ('new', 'reviewed', 'resolved');
CREATE TYPE import_type AS ENUM ('csv', 'bloomerang');
CREATE TYPE bloomerang_status AS ENUM ('not_connected', 'connected', 'failed');

-- ============================================================================
-- TABLES
-- ============================================================================

-- profiles
CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    first_name text,
    last_name text,
    email text,
    role user_role NOT NULL DEFAULT 'solicitor',
    status user_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- organizations
CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    contact_name text,
    contact_email text,
    status org_status NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- organization_users
CREATE TABLE organization_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role org_user_role NOT NULL DEFAULT 'solicitor',
    status org_user_status NOT NULL DEFAULT 'pending',
    invited_email text,
    invitation_token text UNIQUE,
    invitation_expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- donors
CREATE TABLE donors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    capacity numeric,
    assigned_solicitor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    score integer NOT NULL DEFAULT 0,
    tier text,
    is_parent boolean NOT NULL DEFAULT false,
    is_grandparent boolean NOT NULL DEFAULT false,
    is_alumni boolean NOT NULL DEFAULT false,
    is_board_member boolean NOT NULL DEFAULT false,
    is_community_builder boolean NOT NULL DEFAULT false,
    is_program_attendee boolean NOT NULL DEFAULT false,
    is_volunteer boolean NOT NULL DEFAULT false,
    is_donor_advised_fund boolean NOT NULL DEFAULT false,
    is_foundation_trustee boolean NOT NULL DEFAULT false,
    bloomerang_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- donations
CREATE TABLE donations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id uuid NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount numeric,
    date date,
    source text,
    bloomerang_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- move_ideas (must be created before moves since moves references it)
CREATE TABLE move_ideas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    category text NOT NULL,
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- moves
CREATE TABLE moves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    donor_id uuid NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    solicitor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    move_idea_id uuid REFERENCES move_ideas(id) ON DELETE SET NULL,
    title text NOT NULL,
    due_date date NOT NULL,
    status move_status NOT NULL DEFAULT 'pending',
    completion_notes text,
    completed_at timestamptz,
    follow_up_move_id uuid REFERENCES moves(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- scoring_configs
CREATE TABLE scoring_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    parent_enabled boolean NOT NULL DEFAULT true,
    parent_points integer NOT NULL DEFAULT 0,
    grandparent_enabled boolean NOT NULL DEFAULT true,
    grandparent_points integer NOT NULL DEFAULT 0,
    alumni_enabled boolean NOT NULL DEFAULT true,
    alumni_points integer NOT NULL DEFAULT 0,
    board_member_enabled boolean NOT NULL DEFAULT true,
    board_member_points integer NOT NULL DEFAULT 0,
    community_builder_enabled boolean NOT NULL DEFAULT true,
    community_builder_points integer NOT NULL DEFAULT 0,
    program_attendee_enabled boolean NOT NULL DEFAULT true,
    program_attendee_points integer NOT NULL DEFAULT 0,
    volunteer_enabled boolean NOT NULL DEFAULT true,
    volunteer_points integer NOT NULL DEFAULT 0,
    donor_advised_fund_enabled boolean NOT NULL DEFAULT true,
    donor_advised_fund_points integer NOT NULL DEFAULT 0,
    foundation_trustee_enabled boolean NOT NULL DEFAULT true,
    foundation_trustee_points integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- tier_configs
CREATE TABLE tier_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    min_score integer NOT NULL,
    max_score integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- score_band_configs
CREATE TABLE score_band_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    min_score integer,
    max_score integer,
    moves_needed integer,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- feedback
CREATE TABLE feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
    category feedback_category NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    file_url text,
    status feedback_status NOT NULL DEFAULT 'new',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- import_logs
CREATE TABLE import_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    import_type import_type NOT NULL,
    records_created integer,
    records_updated integer,
    records_skipped integer,
    errors jsonb,
    started_at timestamptz,
    completed_at timestamptz
);

-- integrations
CREATE TABLE integrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    bloomerang_api_key_encrypted text,
    bloomerang_status bloomerang_status NOT NULL DEFAULT 'not_connected',
    last_synced_at timestamptz,
    synced_record_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_organization_users_organization_id ON organization_users(organization_id);
CREATE INDEX idx_organization_users_user_id ON organization_users(user_id);
CREATE INDEX idx_donors_organization_id ON donors(organization_id);
CREATE INDEX idx_donors_assigned_solicitor_id ON donors(assigned_solicitor_id);
CREATE INDEX idx_donations_donor_id ON donations(donor_id);
CREATE INDEX idx_donations_organization_id ON donations(organization_id);
CREATE INDEX idx_moves_organization_id ON moves(organization_id);
CREATE INDEX idx_moves_donor_id ON moves(donor_id);
CREATE INDEX idx_moves_solicitor_id ON moves(solicitor_id);
CREATE INDEX idx_move_ideas_organization_id ON move_ideas(organization_id);
CREATE INDEX idx_tier_configs_organization_id ON tier_configs(organization_id);
CREATE INDEX idx_score_band_configs_organization_id ON score_band_configs(organization_id);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_organization_id ON feedback(organization_id);
CREATE INDEX idx_import_logs_organization_id ON import_logs(organization_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_band_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- profiles: users can read their own row
CREATE POLICY "Users can read own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- profiles: super_admin can read all profiles
CREATE POLICY "Super admins can read all profiles"
    ON profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- profiles: users can update their own row
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- profiles: super_admin can manage all profiles
CREATE POLICY "Super admins can manage all profiles"
    ON profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- organizations: super_admin can manage all
CREATE POLICY "Super admins can manage organizations"
    ON organizations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- organizations: org members can read their own org
CREATE POLICY "Org members can read their organization"
    ON organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_users AS ou
            WHERE ou.organization_id = organizations.id
              AND ou.user_id = auth.uid()
              AND ou.status = 'active'
        )
    );

-- organization_users: super_admin can manage all
CREATE POLICY "Super admins can manage organization_users"
    ON organization_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- organization_users: members can read their own org's users
CREATE POLICY "Org members can read their organization_users"
    ON organization_users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_users AS ou
            WHERE ou.organization_id = organization_users.organization_id
              AND ou.user_id = auth.uid()
              AND ou.status = 'active'
        )
    );

-- donors: super_admin can manage all
CREATE POLICY "Super admins can manage donors"
    ON donors
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- donors: org members can read their org's donors
CREATE POLICY "Org members can read their donors"
    ON donors
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_users AS ou
            WHERE ou.organization_id = donors.organization_id
              AND ou.user_id = auth.uid()
              AND ou.status = 'active'
        )
    );

-- donations: super_admin can manage all
CREATE POLICY "Super admins can manage donations"
    ON donations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- donations: org members can read their org's donations
CREATE POLICY "Org members can read their donations"
    ON donations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_users AS ou
            WHERE ou.organization_id = donations.organization_id
              AND ou.user_id = auth.uid()
              AND ou.status = 'active'
        )
    );

-- moves: super_admin can manage all
CREATE POLICY "Super admins can manage moves"
    ON moves
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- moves: org members can read their org's moves
CREATE POLICY "Org members can read their moves"
    ON moves
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_users AS ou
            WHERE ou.organization_id = moves.organization_id
              AND ou.user_id = auth.uid()
              AND ou.status = 'active'
        )
    );

-- move_ideas: super_admin can manage all
CREATE POLICY "Super admins can manage move_ideas"
    ON move_ideas
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- move_ideas: org members can read global + their org's move ideas
CREATE POLICY "Org members can read move_ideas"
    ON move_ideas
    FOR SELECT
    USING (
        move_ideas.organization_id IS NULL
        OR EXISTS (
            SELECT 1 FROM organization_users AS ou
            WHERE ou.organization_id = move_ideas.organization_id
              AND ou.user_id = auth.uid()
              AND ou.status = 'active'
        )
    );

-- scoring_configs: super_admin can manage all
CREATE POLICY "Super admins can manage scoring_configs"
    ON scoring_configs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- scoring_configs: org members can read their org's config
CREATE POLICY "Org members can read their scoring_configs"
    ON scoring_configs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_users AS ou
            WHERE ou.organization_id = scoring_configs.organization_id
              AND ou.user_id = auth.uid()
              AND ou.status = 'active'
        )
    );

-- tier_configs: super_admin can manage all
CREATE POLICY "Super admins can manage tier_configs"
    ON tier_configs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- tier_configs: org members can read their org's tiers
CREATE POLICY "Org members can read their tier_configs"
    ON tier_configs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_users AS ou
            WHERE ou.organization_id = tier_configs.organization_id
              AND ou.user_id = auth.uid()
              AND ou.status = 'active'
        )
    );

-- score_band_configs: super_admin can manage all
CREATE POLICY "Super admins can manage score_band_configs"
    ON score_band_configs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- score_band_configs: org members can read their org's bands
CREATE POLICY "Org members can read their score_band_configs"
    ON score_band_configs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_users AS ou
            WHERE ou.organization_id = score_band_configs.organization_id
              AND ou.user_id = auth.uid()
              AND ou.status = 'active'
        )
    );

-- feedback: super_admin can manage all
CREATE POLICY "Super admins can manage feedback"
    ON feedback
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- feedback: users can read their own feedback
CREATE POLICY "Users can read own feedback"
    ON feedback
    FOR SELECT
    USING (auth.uid() = user_id);

-- feedback: users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
    ON feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- import_logs: super_admin can manage all
CREATE POLICY "Super admins can manage import_logs"
    ON import_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- import_logs: org members can read their org's logs
CREATE POLICY "Org members can read their import_logs"
    ON import_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_users AS ou
            WHERE ou.organization_id = import_logs.organization_id
              AND ou.user_id = auth.uid()
              AND ou.status = 'active'
        )
    );

-- integrations: super_admin can manage all
CREATE POLICY "Super admins can manage integrations"
    ON integrations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
        )
    );

-- integrations: org members can read their org's integrations
CREATE POLICY "Org members can read their integrations"
    ON integrations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_users AS ou
            WHERE ou.organization_id = integrations.organization_id
              AND ou.user_id = auth.uid()
              AND ou.status = 'active'
        )
    );

-- ============================================================================
-- TRIGGER: auto-update updated_at columns
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_donors_updated_at
    BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_moves_updated_at
    BEFORE UPDATE ON moves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_move_ideas_updated_at
    BEFORE UPDATE ON move_ideas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_scoring_configs_updated_at
    BEFORE UPDATE ON scoring_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
