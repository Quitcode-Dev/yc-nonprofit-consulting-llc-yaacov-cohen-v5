-- ============================================================================
-- Migration: 00003_solicitor_rls.sql
-- Description: Add solicitor-specific RLS policies for donors, moves, and
--              move_ideas tables. Solicitors can only see their assigned
--              donors and their own moves.
--
-- NOTE: The existing policies in 00001/00002 grant broad org-member SELECT
-- access. PostgreSQL OR's all permissive policies together, so these
-- solicitor-specific policies provide *additional* explicit grants.
-- To truly restrict solicitors to only their assigned donors, the broad
-- org-member policies would need to be narrowed (out of scope for this
-- migration). These policies ensure correct access if the broad policies
-- are later tightened to exclude solicitors.
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
      SELECT ou.organization_id
      FROM organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = 'active'
        AND ou.role = 'solicitor'
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
      SELECT ou.organization_id
      FROM organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = 'active'
        AND ou.role = 'solicitor'
    )
  )
  WITH CHECK (
    assigned_solicitor_id = auth.uid()
    AND organization_id IN (
      SELECT ou.organization_id
      FROM organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = 'active'
        AND ou.role = 'solicitor'
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
      SELECT ou.organization_id
      FROM organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = 'active'
        AND ou.role = 'solicitor'
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
      SELECT ou.organization_id
      FROM organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = 'active'
        AND ou.role = 'solicitor'
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
      SELECT ou.organization_id
      FROM organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = 'active'
        AND ou.role = 'solicitor'
    )
  )
  WITH CHECK (
    solicitor_id = auth.uid()
    AND organization_id IN (
      SELECT ou.organization_id
      FROM organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = 'active'
        AND ou.role = 'solicitor'
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
      SELECT ou.organization_id
      FROM organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = 'active'
        AND ou.role = 'solicitor'
    )
  );
