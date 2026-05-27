# Epics: yc_nonprofit_consulting_llc_yaacov_cohen

## E-001: User Authentication & Role-Based Access Control

- Status: approved
- Priority: must

Establish secure, multi-role authentication for Super Admins, Organization Admins, and Solicitors. Each role must have clearly scoped access permissions that enforce data isolation between organizations. This epic underpins all other platform functionality and must be delivered first.

### Acceptance Criteria

• Super Admin can log in and access all organizations and global settings
• Organization Admin can log in and access only their own organization's data
• Solicitor can log in and access only their assigned donors and moves
• Email-based invitation flow allows Admins to invite Solicitors who complete signup via a tokenized link
• Invited Solicitors cannot access the platform until they complete registration
• Role permissions are enforced server-side, not just client-side
• Sessions expire and re-authentication is required after inactivity
• Password reset flow is available to all user types
• Unauthorized access attempts return appropriate error responses

## E-002: Multi-Tenant Organization Management

- Status: approved
- Priority: must

Enable the Super Admin to create and manage multiple client organizations on the platform, each operating in a fully isolated data environment. Organization Admins can manage their own settings, users, and configurations independently. This epic establishes the multi-tenant foundation required for all other epics.

### Acceptance Criteria

• Super Admin can create a new organization with name and basic details in under 5 minutes
• Each organization's donor records, moves, settings, and users are fully isolated from other organizations
• Super Admin can view a list of all organizations on the platform
• Super Admin can access any organization's admin view for support purposes
• Organization Admin can view and update their organization's profile and settings
• Organization Admin can invite, view, activate, and deactivate Solicitor accounts within their organization
• Deleting or deactivating an organization does not affect other organizations' data
• Each organization can have independent scoring configurations, tier definitions, and move idea libraries

## E-003: Donor Records & Scoring Engine

- Status: approved
- Priority: must

Provide a comprehensive donor record system where each donor is stored as an individual constituent with characteristic fields, donation history, a calculated score, and an assigned tier. Organization Admins can configure scoring field weights and tier thresholds via a UI, with scores recalculating automatically when settings change. This is the core data model of the platform.

### Acceptance Criteria

• Each donor record stores: first name, last name, phone, email, capacity, score, tier, assigned solicitor, and all boolean characteristic fields (Parent, Grandparent, Alumni, Board Member, Community Builder, Program Attendee, Volunteer, Donor Advised Fund, Foundation/Trustee)
• Admin can enable or disable individual scoring fields per organization
• Admin can set point values for each enabled boolean characteristic field
• Admin can define donor tiers with custom names and score ranges
• Admin can set moves-needed thresholds per score band
• Donor total score is automatically calculated as the sum of all enabled, checked characteristic field point values
• Donor tier is automatically assigned based on total score and current tier configuration
• Score and tier recalculate automatically when Admin changes scoring settings
• Admin can view the full list of donors with score, tier, and solicitor assignment
• Solicitors can view and edit characteristic fields on their assigned donors
• Donor profile displays donation history, score breakdown, characteristics, and move history

## E-004: Bloomerang CRM Integration & Data Import

- Status: approved
- Priority: must

Enable Organization Admins to connect their Bloomerang CRM account via API key and sync donor records and donation transactions directly into the platform without manual file exports. A CSV import fallback is also supported for organizations not using Bloomerang or needing to supplement synced data. This epic eliminates the fragile Zapier-based data pipeline currently in use.

### Acceptance Criteria

• Admin can enter and save a Bloomerang API key in Settings → Integrations
• System validates the API key and displays a success or error state
• On initial sync, all constituent records and donation transactions are imported at the individual constituent level
• Donation history per donor is stored and displayed on the donor profile
• Admin can trigger an on-demand re-sync at any time to pull the latest Bloomerang data
• Re-sync updates existing records and adds new records without duplicating data
• CSV import is available as a fallback, supporting field mapping during upload
• CSV import maps source columns to platform donor fields before committing data
• Import results (records created, records skipped, errors) are displayed after each import
• Bloomerang sync status (last synced timestamp, record count) is visible in Settings
• Household-level grouping is explicitly out of scope for Phase 1; all records are imported as individual constituents

## E-005: Moves Management & Workflow

- Status: approved
- Priority: must

Provide Solicitors and Admins with a structured workflow for creating, scheduling, completing, and following up on outreach activities (Moves) assigned to specific donors. This epic encodes the core Moves Management methodology into the platform, replacing informal Airtable row entries with a guided, accountable workflow.

### Acceptance Criteria

• Solicitor can create a move by selecting a donor, choosing a Move Idea from the library, and setting a due date
• Move records store: title, associated donor, associated solicitor, due date, status (pending/completed), completion notes, follow-up move linkage, creation date
• Solicitor can mark a move as complete, add completion notes, and optionally create a follow-up move in a single guided flow
• Follow-up move is pre-populated with the donor context from the completed move
• Admin can view all moves across all solicitors in the organization
• Solicitor can view only their own assigned moves by default
• Calendar view displays all upcoming and overdue moves in a timeline format
• Move status transitions are: Pending → Completed
• Overdue moves (past due date, still pending) are visually distinguished
• Move history per donor is visible on the donor profile page

## E-006: Move Ideas Library

- Status: approved
- Priority: must

Maintain a global library of Move Ideas managed by the Super Admin that is available to all organizations as a starting point, with the ability for organizations to add their own custom Move Ideas. This library provides pre-configured cultivation activity templates so new organizations can begin tracking moves immediately upon onboarding.

### Acceptance Criteria

• Super Admin can create, edit, and delete Move Ideas in a global library
• Global Move Ideas are available to all organizations on the platform
• Each Move Idea has a title and category
• Organization Admin can create organization-specific Move Ideas visible only to their organization
• Solicitors can select from both global and their organization's Move Ideas when creating a move
• Super Admin changes to global Move Ideas are reflected across all organizations
• Deleting a global Move Idea does not delete historical moves that referenced it
• Move Ideas library is accessible from the move creation flow without leaving the workflow

## E-007: Dashboards & Reporting

- Status: approved
- Priority: must

Provide role-specific dashboards that surface the most actionable metrics for Solicitors, Organization Admins, and the Super Admin. Solicitor dashboards focus on their personal task queue and assigned donors, while Admin dashboards provide organizational performance metrics and solicitor accountability views.

### Acceptance Criteria

• Solicitor dashboard displays: assigned donors ranked by score, pending moves, and moves due today or overdue
• Organization Admin dashboard displays: total donors, moves needed, total moves, moves completed, pending moves, and a top solicitors leaderboard ranked by average donor score
• Top solicitors leaderboard is visible to Admins and shows each solicitor's name and average donor score
• Dashboard data reflects real-time state of the platform (no stale cache beyond acceptable limits)
• Dashboard loads in ≤ 3 seconds on a standard broadband connection
• Admin can navigate from the dashboard to any solicitor's donor list or move list
• Solicitor can click a donor from their dashboard to go directly to the donor profile
• All dashboard metrics are scoped to the current organization and do not expose data from other organizations

## E-008: In-App Feedback System

- Status: approved
- Priority: must

Allow any authenticated user to submit bug reports, feature requests, or questions directly within the platform. The Super Admin has a centralized inbox to review all submissions across all organizations, replacing ad-hoc email and enabling structured product feedback collection during and after beta.

### Acceptance Criteria

• Any authenticated user can access a feedback submission form from within the platform (e.g., persistent UI element)
• Feedback form captures: category (bug report / feature request / question), title, description, and optional file attachment
• Submitted feedback is stored with the submitting user's identity, their organization, and submission timestamp
• Super Admin has a dedicated inbox view showing all feedback submissions across all organizations
• Super Admin can filter or sort feedback by category, organization, or date
• Submitting user receives a confirmation that their feedback was received
• Feedback submissions do not expose one organization's data to another organization's users
• Super Admin can mark feedback items as reviewed or resolved
