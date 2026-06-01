-- ============================================================
-- RLS Policies for multi-tenant organization scoping
-- ============================================================

-- Helper function: check if the current auth user is a super_admin
-- NOTE: This function queries profiles. Do NOT use it in RLS policies
-- on the profiles table itself to avoid infinite recursion.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin
     FROM public.profiles
     WHERE id = auth.uid()),
    false
  );
$$;

-- Helper function: get the organization_id(s) for the current auth user
-- NOTE: This function queries organization_users. Do NOT use it in RLS
-- policies on the organization_users table itself to avoid infinite recursion.
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT organization_id
  FROM public.organization_users
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;

-- ============================================================
-- PROFILES (users can read/update their own profile)
-- Must come first: is_super_admin() depends on reading profiles,
-- so we inline the super-admin check here to avoid recursion.
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access to all profiles (inlined check to avoid recursion)
CREATE POLICY "super_admin_all_profiles"
  ON public.profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_super_admin = true
    )
  );

-- Users can read their own profile
CREATE POLICY "users_select_own_profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "users_update_own_profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- ORGANIZATION_USERS
-- Must come before tables that use user_organization_ids().
-- Inline checks here to avoid recursion since the helper queries
-- this table.
-- ============================================================
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access (uses is_super_admin which reads profiles, not this table)
CREATE POLICY "super_admin_all_organization_users"
  ON public.organization_users
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org members can see other members in their organization (inlined to avoid recursion)
CREATE POLICY "org_members_select_organization_users"
  ON public.organization_users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT ou.organization_id
      FROM public.organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = 'active'
    )
  );

-- Users can always read their own membership record
CREATE POLICY "users_select_own_org_membership"
  ON public.organization_users
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access to all organizations
CREATE POLICY "super_admin_all_organizations"
  ON public.organizations
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org members can read their own organization
CREATE POLICY "org_members_select_organization"
  ON public.organizations
  FOR SELECT
  USING (id IN (SELECT public.user_organization_ids()));

-- ============================================================
-- DONORS
-- ============================================================
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access to all donors
CREATE POLICY "super_admin_all_donors"
  ON public.donors
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org Admin / Fundraiser: full access to donors in their organization
CREATE POLICY "org_members_select_donors"
  ON public.donors
  FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_insert_donors"
  ON public.donors
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_update_donors"
  ON public.donors
  FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_delete_donors"
  ON public.donors
  FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- ============================================================
-- MOVES
-- ============================================================
ALTER TABLE public.moves ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access to all moves
CREATE POLICY "super_admin_all_moves"
  ON public.moves
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org members: full access to moves in their organization
CREATE POLICY "org_members_select_moves"
  ON public.moves
  FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_insert_moves"
  ON public.moves
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_update_moves"
  ON public.moves
  FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_delete_moves"
  ON public.moves
  FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- ============================================================
-- MOVE_IDEAS
-- ============================================================
ALTER TABLE public.move_ideas ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access to all move_ideas
CREATE POLICY "super_admin_all_move_ideas"
  ON public.move_ideas
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org members: full access to move_ideas in their organization
CREATE POLICY "org_members_select_move_ideas"
  ON public.move_ideas
  FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_insert_move_ideas"
  ON public.move_ideas
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_update_move_ideas"
  ON public.move_ideas
  FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_delete_move_ideas"
  ON public.move_ideas
  FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- ============================================================
-- SCORING_CONFIGS
-- ============================================================
ALTER TABLE public.scoring_configs ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access
CREATE POLICY "super_admin_all_scoring_configs"
  ON public.scoring_configs
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org members: full access within their organization
CREATE POLICY "org_members_select_scoring_configs"
  ON public.scoring_configs
  FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_insert_scoring_configs"
  ON public.scoring_configs
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_update_scoring_configs"
  ON public.scoring_configs
  FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_delete_scoring_configs"
  ON public.scoring_configs
  FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- ============================================================
-- TIER_CONFIGS
-- ============================================================
ALTER TABLE public.tier_configs ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access
CREATE POLICY "super_admin_all_tier_configs"
  ON public.tier_configs
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org members: full access within their organization
CREATE POLICY "org_members_select_tier_configs"
  ON public.tier_configs
  FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_insert_tier_configs"
  ON public.tier_configs
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_update_tier_configs"
  ON public.tier_configs
  FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_delete_tier_configs"
  ON public.tier_configs
  FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- ============================================================
-- SCORE_BAND_CONFIGS
-- ============================================================
ALTER TABLE public.score_band_configs ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access
CREATE POLICY "super_admin_all_score_band_configs"
  ON public.score_band_configs
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org members: full access within their organization
CREATE POLICY "org_members_select_score_band_configs"
  ON public.score_band_configs
  FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_insert_score_band_configs"
  ON public.score_band_configs
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_update_score_band_configs"
  ON public.score_band_configs
  FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_delete_score_band_configs"
  ON public.score_band_configs
  FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- ============================================================
-- FEEDBACK
-- ============================================================
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access
CREATE POLICY "super_admin_all_feedback"
  ON public.feedback
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org members: full access within their organization
CREATE POLICY "org_members_select_feedback"
  ON public.feedback
  FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_insert_feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_update_feedback"
  ON public.feedback
  FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_delete_feedback"
  ON public.feedback
  FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- ============================================================
-- INTEGRATIONS
-- ============================================================
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access
CREATE POLICY "super_admin_all_integrations"
  ON public.integrations
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org members: full access within their organization
CREATE POLICY "org_members_select_integrations"
  ON public.integrations
  FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_insert_integrations"
  ON public.integrations
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_update_integrations"
  ON public.integrations
  FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_delete_integrations"
  ON public.integrations
  FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- ============================================================
-- IMPORT_LOGS
-- ============================================================
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access
CREATE POLICY "super_admin_all_import_logs"
  ON public.import_logs
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org members: full access within their organization
CREATE POLICY "org_members_select_import_logs"
  ON public.import_logs
  FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_insert_import_logs"
  ON public.import_logs
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_update_import_logs"
  ON public.import_logs
  FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "org_members_delete_import_logs"
  ON public.import_logs
  FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids()));
