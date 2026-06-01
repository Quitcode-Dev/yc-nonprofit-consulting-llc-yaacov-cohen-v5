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
        AND role = 'fundraiser'
    )
  );

-- Solicitors can UPDATE only characteristic boolean fields on their assigned donors
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
        AND role = 'fundraiser'
    )
  )
  WITH CHECK (
    assigned_solicitor_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'fundraiser'
    )
  );

-- ============================================================================
-- MOVES TABLE — Solicitor Policies
-- ============================================================================

-- Solicitors can SELECT only their own moves
CREATE POLICY "solicitors_select_own_moves"
  ON moves
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'fundraiser'
    )
  );

-- Solicitors can INSERT moves assigned to themselves
CREATE POLICY "solicitors_insert_own_moves"
  ON moves
  FOR INSERT
  WITH CHECK (
    assigned_to = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'fundraiser'
    )
  );

-- Solicitors can UPDATE only their own moves
CREATE POLICY "solicitors_update_own_moves"
  ON moves
  FOR UPDATE
  USING (
    assigned_to = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'fundraiser'
    )
  )
  WITH CHECK (
    assigned_to = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'fundraiser'
    )
  );

-- NOTE: No DELETE policy for solicitors on moves — solicitors cannot delete moves.

-- ============================================================================
-- MOVE_IDEAS TABLE — Solicitor Policies
-- ============================================================================

-- Solicitors can SELECT move_ideas that belong to their organization OR are global (org IS NULL)
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
        AND role = 'fundraiser'
    )
  );
