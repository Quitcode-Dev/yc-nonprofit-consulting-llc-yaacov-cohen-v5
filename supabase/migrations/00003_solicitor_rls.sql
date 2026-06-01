-- ============================================================================
-- Migration: 00003_solicitor_rls.sql
-- Description: Add solicitor-specific RLS policies for donors, moves, and
--              move_ideas tables. Solicitors can only see their assigned
--              donors and their own moves.
-- ============================================================================

-- ============================================================================
-- DONORS TABLE — Solicitor Policies
-- ============================================================================

-- Solicitors can SELECT only donors assigned to them within their organization
DROP POLICY IF EXISTS "solicitors_select_assigned_donors" ON donors;
CREATE POLICY "solicitors_select_assigned_donors"
  ON donors
  FOR SELECT
  USING (
    assigned_solicitor_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'solicitor'
    )
  );

-- Solicitors can UPDATE only characteristic boolean fields on their assigned donors
DROP POLICY IF EXISTS "solicitors_update_assigned_donors" ON donors;
CREATE POLICY "solicitors_update_assigned_donors"
  ON donors
  FOR UPDATE
  USING (
    assigned_solicitor_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'solicitor'
    )
  )
  WITH CHECK (
    assigned_solicitor_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'solicitor'
    )
  );

-- ============================================================================
-- MOVES TABLE — Solicitor Policies
-- ============================================================================

-- Solicitors can SELECT only their own moves
DROP POLICY IF EXISTS "solicitors_select_own_moves" ON moves;
CREATE POLICY "solicitors_select_own_moves"
  ON moves
  FOR SELECT
  USING (
    solicitor_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'solicitor'
    )
  );

-- Solicitors can INSERT moves assigned to themselves
DROP POLICY IF EXISTS "solicitors_insert_own_moves" ON moves;
CREATE POLICY "solicitors_insert_own_moves"
  ON moves
  FOR INSERT
  WITH CHECK (
    solicitor_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'solicitor'
    )
  );

-- Solicitors can UPDATE only their own moves
DROP POLICY IF EXISTS "solicitors_update_own_moves" ON moves;
CREATE POLICY "solicitors_update_own_moves"
  ON moves
  FOR UPDATE
  USING (
    solicitor_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'solicitor'
    )
  )
  WITH CHECK (
    solicitor_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'solicitor'
    )
  );

-- NOTE: No DELETE policy for solicitors on moves — solicitors cannot delete moves.

-- ============================================================================
-- MOVE_IDEAS TABLE — Solicitor Policies
-- ============================================================================

-- Solicitors can SELECT move_ideas that belong to their organization OR are global (org IS NULL)
DROP POLICY IF EXISTS "solicitors_select_move_ideas" ON move_ideas;
CREATE POLICY "solicitors_select_move_ideas"
  ON move_ideas
  FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'solicitor'
    )
  );
