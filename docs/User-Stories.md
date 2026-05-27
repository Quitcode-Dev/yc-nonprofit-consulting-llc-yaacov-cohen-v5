# User Stories: yc_nonprofit_consulting_llc_yaacov_cohen

## US-008: Create a New Client Organization

- Epic: E-002: Multi-Tenant Organization Management
- Status: approved
- Priority: must
- Effort: M

**As a** Super Admin
**I want** to create a new client organization by entering a name and basic details
**So that** I can onboard a new consulting client to the platform quickly without manual configuration

### Acceptance Criteria

- A 'Create Organization' form is accessible from the Super Admin dashboard
- The form requires at minimum: organization name (required), primary contact name (optional), and contact email (optional)
- Submitting the form with a valid organization name creates the organization and it appears immediately in the organization list
- The entire creation flow can be completed in under 5 minutes
- A duplicate organization name triggers a visible validation error and prevents creation
- The newly created organization has an isolated data environment with no donor records, users, or settings inherited from other organizations
- The Super Admin is redirected to the new organization's detail page upon successful creation

## US-009: Super Admin Login with Full Platform Access

- Epic: E-001: User Authentication & Role-Based Access Control
- Status: approved
- Priority: must
- Effort: M

**As a** Super Admin
**I want** to log in to the platform with my credentials and access all organizations and global settings
**So that** I can manage the platform, onboard client organizations, and oversee all activity across the system

### Acceptance Criteria

- Given valid Super Admin credentials, when I submit the login form, then I am redirected to the Super Admin dashboard showing all organizations
- Given I am logged in as Super Admin, when I navigate to any organization's data, then I can view and manage it without restriction
- Given I am logged in as Super Admin, when I access global settings, then I can create, edit, and delete global Move Ideas and manage organization accounts
- Given invalid credentials are submitted, when the login form is processed, then an error message is displayed and access is denied
- Given a Super Admin session, when the server receives a request, then role authorization is enforced server-side and cannot be bypassed by client-side manipulation
- Given I am logged in as Super Admin, when I attempt to access an Organization Admin or Solicitor restricted route, then access is granted because Super Admin supersedes all roles

## US-009: View All Organizations on the Platform

- Epic: E-002: Multi-Tenant Organization Management
- Status: approved
- Priority: must
- Effort: S

**As a** Super Admin
**I want** to view a list of all client organizations on the platform
**So that** I have centralized visibility into all consulting clients I manage

### Acceptance Criteria

- A dedicated 'Organizations' page is accessible from the Super Admin navigation
- The list displays each organization's name, creation date, and active/inactive status
- The list supports at least basic alphabetical sorting by organization name
- Each organization row includes a link or button to navigate to that organization's detail or admin view
- If no organizations exist, a clear empty state message is displayed
- The list loads within 3 seconds even when 100+ organizations are present

## US-010: Organization Admin Login with Scoped Access

- Epic: E-001: User Authentication & Role-Based Access Control
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** to log in and access only my own organization's data, settings, and users
**So that** I can manage my team and donor records without risk of accessing or exposing another organization's data

### Acceptance Criteria

- Given valid Organization Admin credentials, when I submit the login form, then I am redirected to my organization's dashboard
- Given I am logged in as Organization Admin, when I attempt to access another organization's donor records or settings via URL manipulation, then the server returns a 403 Forbidden response
- Given I am logged in as Organization Admin, when I navigate the platform, then I can only see data, users, and settings belonging to my own organization
- Given I am logged in as Organization Admin, when I access solicitor management, then I can view, invite, and manage only solicitors within my organization
- Given invalid credentials are submitted, when the login form is processed, then a generic error message is shown and no organization data is exposed

## US-010: Access Any Organization's Admin View for Support

- Epic: E-002: Multi-Tenant Organization Management
- Status: approved
- Priority: must
- Effort: M

**As a** Super Admin
**I want** to access any organization's admin view directly from the platform
**So that** I can provide support, troubleshoot issues, and verify configurations for any client organization without requiring separate credentials

### Acceptance Criteria

- From the organization list or detail page, the Super Admin can click an 'Access as Admin' action to enter that organization's admin view
- While in an organization's admin view, the Super Admin sees all data, settings, and users belonging to that organization
- A persistent banner or indicator is displayed when the Super Admin is viewing as an organization admin, clearly identifying the context
- The Super Admin can exit the organization admin view and return to the Super Admin global view at any time
- Actions taken by the Super Admin while in the organization admin view are correctly attributed and do not expose data from other organizations
- The Super Admin's access to the organization admin view does not require the Organization Admin's password

## US-011: Solicitor Login with Assigned Donor Access Only

- Epic: E-001: User Authentication & Role-Based Access Control
- Status: approved
- Priority: must
- Effort: M

**As a** Solicitor
**I want** to log in and see only the donors and moves assigned to me
**So that** I can focus on my portfolio without being overwhelmed by or accidentally modifying other solicitors' data

### Acceptance Criteria

- Given valid Solicitor credentials, when I submit the login form, then I am redirected to my personal dashboard showing only my assigned donors and moves
- Given I am logged in as a Solicitor, when I attempt to access another solicitor's donor profile or moves via URL manipulation, then the server returns a 403 Forbidden response
- Given I am logged in as a Solicitor, when I navigate to the donors list, then only donors assigned to me are displayed
- Given I am logged in as a Solicitor, when I attempt to access organization settings or admin panels, then the server returns a 403 Forbidden response
- Given I am logged in as a Solicitor, when I attempt to access Super Admin global settings via direct URL, then the server returns a 403 Forbidden response
- Given role permissions are configured, when any Solicitor request reaches the server, then authorization is validated server-side before any data is returned

## US-011: View and Update Organization Profile and Settings

- Epic: E-002: Multi-Tenant Organization Management
- Status: approved
- Priority: must
- Effort: S

**As a** Organization Admin
**I want** to view and update my organization's profile and settings
**So that** I can keep our organization's information current and configure the platform to match our needs

### Acceptance Criteria

- An 'Organization Settings' page is accessible from the Organization Admin navigation
- The settings page displays the organization name and any editable profile fields (e.g., contact name, contact email)
- The Organization Admin can edit and save changes to the organization name and profile fields
- A success confirmation message is displayed upon saving changes
- Invalid or empty required fields (e.g., blank organization name) trigger inline validation errors and prevent saving
- Changes to one organization's profile do not affect any other organization's data or settings
- The Organization Admin cannot access settings or data belonging to any other organization

## US-012: Invite Solicitor Users to an Organization

- Epic: E-002: Multi-Tenant Organization Management
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** to invite new solicitors to my organization by entering their email address
**So that** my fundraising team can access the platform and begin logging moves for their assigned donors

### Acceptance Criteria

- An 'Invite Solicitor' action is accessible from the user management section of the Organization Admin view
- The invite form requires a valid email address and optionally a first and last name
- Submitting the form sends an invitation email to the specified address containing a unique signup link
- The invited solicitor appears in the user list with an 'Invited' or 'Pending' status immediately after the invitation is sent
- Attempting to invite an email address already associated with an active user in the same organization displays a validation error
- The invitation link expires after a defined period (e.g., 48 hours) and displays an appropriate message if the solicitor attempts to use an expired link
- Invited solicitors are scoped only to the inviting organization and cannot access any other organization's data upon signup

## US-012: Solicitor Invitation via Tokenized Email Link

- Epic: E-001: User Authentication & Role-Based Access Control
- Status: approved
- Priority: must
- Effort: L

**As a** Organization Admin
**I want** to invite Solicitors to the platform via email so that they receive a secure, tokenized signup link
**So that** only authorized individuals can join my organization and I do not need to manually create their accounts

### Acceptance Criteria

- Given I am logged in as Organization Admin, when I enter a solicitor's email address and submit the invite form, then a unique tokenized invitation link is generated and an email is sent to that address
- Given an invitation email is sent, when the solicitor clicks the link within 72 hours, then they are directed to a registration page to set their name and password
- Given an invitation token has expired (after 72 hours), when the solicitor clicks the link, then they see an error message stating the link has expired and are prompted to request a new invitation
- Given the same invitation email is sent twice, when the first link is used to complete registration, then the second link is automatically invalidated
- Given a solicitor has not completed registration, when they attempt to log in, then access is denied and they are prompted to complete signup via their invitation link
- Given a solicitor completes registration via the invitation link, when they first log in, then they are automatically scoped to the inviting organization with the Solicitor role
- Given I am logged in as Organization Admin, when I view the solicitor management page, then I can see the invitation status (Pending / Active) for each solicitor

## US-013: Password Reset for All User Types

- Epic: E-001: User Authentication & Role-Based Access Control
- Status: approved
- Priority: must
- Effort: M

**As a** platform user (Super Admin, Organization Admin, or Solicitor)
**I want** to reset my password via a secure email link when I have forgotten it
**So that** I can regain access to my account without requiring manual intervention from a system administrator

### Acceptance Criteria

- Given I am on the login page, when I click 'Forgot Password' and enter my registered email address, then a password reset email is sent to that address if an account exists
- Given a password reset email is sent, when I click the reset link within 1 hour, then I am directed to a form to enter and confirm a new password
- Given a password reset token has expired (after 1 hour), when I click the link, then I see an error message and am prompted to request a new reset email
- Given I successfully reset my password, when I submit the new password form, then my old password is invalidated and I am redirected to the login page
- Given I request a password reset for an email not associated with any account, when the request is submitted, then the system shows the same confirmation message as a valid request to prevent email enumeration
- Given a password reset link has already been used, when it is clicked again, then the server returns an error stating the link is no longer valid

## US-013: View and Manage Solicitor Accounts Within an Organization

- Epic: E-002: Multi-Tenant Organization Management
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** to view all solicitor accounts in my organization and activate or deactivate them
**So that** I can control who has access to our organization's data and maintain appropriate team membership

### Acceptance Criteria

- A user management page within the Organization Admin view lists all solicitors associated with the organization
- Each solicitor entry displays: name, email address, account status (active, inactive, or invited/pending), and date added
- The Organization Admin can deactivate an active solicitor account; the deactivated solicitor immediately loses the ability to log in
- The Organization Admin can reactivate a previously deactivated solicitor account
- Deactivating a solicitor does not delete their historical move records or donor assignments
- The Organization Admin can only manage solicitors within their own organization
- A deactivated solicitor attempting to log in sees an appropriate access denied message

## US-014: Deactivate an Organization Without Affecting Other Organizations

- Epic: E-002: Multi-Tenant Organization Management
- Status: approved
- Priority: must
- Effort: M

**As a** Super Admin
**I want** to deactivate a client organization on the platform
**So that** I can offboard a client while ensuring their deactivation has no impact on other organizations' data or operations

### Acceptance Criteria

- The Super Admin can set an organization's status to 'Inactive' from the organization detail page
- Deactivating an organization prevents all users belonging to that organization from logging in
- All data (donor records, moves, settings, users) belonging to the deactivated organization is retained and not deleted
- After deactivating one organization, all other active organizations' data, user access, and settings remain completely unaffected
- The deactivated organization still appears in the Super Admin's organization list with an 'Inactive' status indicator
- The Super Admin can reactivate a deactivated organization, restoring login access for its users
- A confirmation prompt is displayed before deactivation is applied to prevent accidental action

## US-014: Session Expiration and Re-Authentication

- Epic: E-001: User Authentication & Role-Based Access Control
- Status: approved
- Priority: should
- Effort: S

**As a** platform user
**I want** my session to automatically expire after a period of inactivity
**So that** unauthorized individuals cannot access my account if I leave my browser unattended

### Acceptance Criteria

- Given I am logged in as any user role, when my session has been inactive for 30 minutes, then my session is invalidated server-side
- Given my session has expired, when I attempt to perform any action or navigate to any protected page, then I am redirected to the login page with a message stating my session has expired
- Given my session has expired and I log in again, when authentication succeeds, then I am redirected to the page I last attempted to access
- Given I am actively using the platform, when I perform actions within the inactivity window, then my session timer resets and I am not logged out
- Given a session token has been invalidated by expiration, when it is replayed in an API request, then the server returns a 401 Unauthorized response and does not return any data

## US-015: Configure Independent Scoring and Tier Settings Per Organization

- Epic: E-002: Multi-Tenant Organization Management
- Status: approved
- Priority: must
- Effort: L

**As a** Organization Admin
**I want** to configure my organization's scoring field point values, tier definitions, and move idea library independently of other organizations
**So that** our donor scoring model and cultivation approach reflect our organization's unique characteristics without affecting any other client's configuration

### Acceptance Criteria

- The Organization Settings page includes a scoring configuration section where checkbox fields can be enabled or disabled
- Each enabled scoring field allows the Organization Admin to set a custom point value via a numeric input
- The Organization Admin can define donor tiers by specifying a tier name and a minimum and maximum score range
- Changes to scoring field values or tier definitions in one organization are fully isolated and do not affect scoring or tier definitions in any other organization
- The Organization Admin can create, edit, and delete move ideas specific to their organization without modifying the global move ideas library
- Saved scoring configurations are persisted and correctly applied when donor scores are recalculated
- The UI prevents saving tier configurations where score ranges overlap, displaying an appropriate validation error

## US-016: Create and Store Individual Donor Record

- Epic: E-003: Donor Records & Scoring Engine
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** to create a donor record with all required constituent fields
**So that** each donor is stored as a complete individual profile within my organization

### Acceptance Criteria

- Admin can create a new donor record with fields: first name, last name, phone, email, capacity, assigned solicitor
- All nine boolean characteristic fields are present on the record: Parent, Grandparent, Alumni, Board Member, Community Builder, Program Attendee, Volunteer, Donor Advised Fund, Foundation/Trustee
- First name and last name are required fields; form cannot be submitted without them
- Email field validates proper email format and rejects invalid entries
- Phone field accepts standard phone number formats
- Capacity field accepts numeric input only
- Assigned solicitor field displays a dropdown of active solicitors within the organization
- On save, the new donor record appears in the organization's donor list
- Score and tier fields are read-only on the form and populated automatically by the scoring engine

## US-016: Solicitor Registration Completion via Invitation

- Epic: E-001: User Authentication & Role-Based Access Control
- Status: approved
- Priority: must
- Effort: M

**As a** invited Solicitor
**I want** to complete my account registration by setting my name and password via the tokenized invitation link
**So that** I can activate my account securely without needing a temporary password or admin assistance

### Acceptance Criteria

- Given I receive an invitation email, when I click the tokenized link, then I am directed to a registration page pre-populated with my email address (read-only)
- Given I am on the registration page, when I enter my first name, last name, and a password meeting minimum requirements (at least 8 characters, at least one number, at least one special character), then I can submit the form to complete registration
- Given I submit the registration form with a password that does not meet minimum requirements, when validation runs, then an inline error message specifies the unmet requirements and the form is not submitted
- Given I submit a valid registration form, when the account is created, then I am immediately logged in and redirected to my Solicitor dashboard scoped to my assigned organization
- Given I have completed registration, when I attempt to use the same invitation link again, then the server returns an error stating the link has already been used
- Given registration is complete, when my account record is inspected server-side, then my role is set to Solicitor and my organization association matches the inviting organization

## US-017: Configure Scoring Field Weights and Enable/Disable Fields

- Epic: E-003: Donor Records & Scoring Engine
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** to enable or disable each boolean characteristic field and assign a point value to each enabled field
**So that** the scoring engine reflects my organization's specific donor cultivation priorities

### Acceptance Criteria

- Settings UI lists all nine boolean characteristic fields with a toggle to enable or disable each one
- Each enabled field has a numeric input for its point value; disabled fields do not accept point values
- Point values accept positive integers only; empty or negative values are rejected with an inline error message
- Admin can save the configuration; a success confirmation is displayed on save
- Disabled fields are excluded from score calculation immediately after saving
- Changes to point values or enabled/disabled status trigger automatic recalculation of all donor scores in the organization
- UI reflects the current saved configuration when the admin revisits the settings page

## US-018: Automatic Donor Score Calculation

- Epic: E-003: Donor Records & Scoring Engine
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** the system to automatically calculate each donor's total score based on their checked characteristics and current scoring settings
**So that** scores are always accurate and require no manual calculation

### Acceptance Criteria

- A donor's total score equals the sum of point values for all enabled characteristic fields that are checked on that donor's record
- Unchecked characteristic fields contribute zero points regardless of their configured point value
- Disabled characteristic fields contribute zero points even if checked on the donor record
- Score updates immediately when a solicitor or admin checks or unchecks a characteristic field on a donor record
- Score updates for all donors in the organization within 60 seconds when an admin changes scoring field settings
- Score is displayed as a numeric value on both the donor list view and the individual donor profile
- A score breakdown section on the donor profile lists each enabled, checked field and its point contribution

## US-021: Configure Moves-Needed Thresholds Per Score Band

- Epic: E-003: Donor Records & Scoring Engine
- Status: approved
- Priority: must
- Effort: S

**As a** Organization Admin
**I want** to set the number of moves needed per score band
**So that** solicitors have clear cultivation activity targets based on each donor's score level

### Acceptance Criteria

- Admin can define one or more score bands with a minimum score, maximum score, and a required number of moves
- Score bands accept positive integer values for both range boundaries and moves-needed count
- Admin can save, edit, and delete score band configurations
- Score bands are stored per organization and do not affect other organizations
- Saved threshold configuration is visible when the admin revisits the settings page
- Moves-needed value derived from the score band is visible on the donor profile for solicitors and admins

## US-022: View Full Donor List with Score, Tier, and Solicitor

- Epic: E-003: Donor Records & Scoring Engine
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** to view a paginated list of all donors in my organization showing score, tier, and assigned solicitor
**So that** I can monitor the state of the full donor portfolio at a glance

### Acceptance Criteria

- Donor list displays columns for: full name, email, score, tier, and assigned solicitor
- List supports sorting by score, tier, and name
- List supports text-based search filtering by donor name and email
- List is paginated with a configurable page size of at least 25 and 50 records per page
- Scores and tiers displayed in the list reflect the current calculated values
- Donors with no assigned solicitor display 'Unassigned' in the solicitor column
- Admin can click any donor row to navigate to that donor's full profile

## US-023: Solicitor Views and Edits Characteristics on Assigned Donors

- Epic: E-003: Donor Records & Scoring Engine
- Status: approved
- Priority: must
- Effort: M

**As a** Solicitor
**I want** to view and edit the boolean characteristic fields on donors assigned to me
**So that** I can keep donor profiles accurate and see how characteristics affect each donor's score

### Acceptance Criteria

- Solicitor can only access donor profiles for donors assigned to them; attempting to access an unassigned donor returns an access-denied message
- Solicitor can view all nine boolean characteristic fields on an assigned donor's profile
- Solicitor can check or uncheck any boolean characteristic field and save the change
- Upon saving a characteristic change, the donor's score recalculates and the updated score is displayed within 5 seconds
- Solicitor cannot edit scoring field point values, tier definitions, or any other organization settings
- Donor profile visible to the solicitor includes: characteristic fields, score breakdown, tier, donation history summary, and move history
- Solicitor cannot view or edit the profiles of donors assigned to other solicitors

## US-024: Enter and Save Bloomerang API Key

- Epic: E-004: Bloomerang CRM Integration & Data Import
- Status: approved
- Priority: must
- Effort: S

**As a** Organization Admin
**I want** to enter and save my Bloomerang API key in Settings → Integrations
**So that** the platform can authenticate with my Bloomerang account and access my donor data

### Acceptance Criteria

- Settings → Integrations page contains a clearly labeled 'Bloomerang API Key' input field
- The input field masks the entered key after saving (displays as asterisks or truncated)
- A 'Save' button is present and enabled only when the input field is non-empty
- Clicking 'Save' persists the API key securely and does not expose it in the UI or network response payload
- A success confirmation message is displayed immediately after a valid key is saved
- Admin can update the saved key by entering a new value and clicking 'Save' again
- The previously saved key cannot be retrieved in plain text via the UI

## US-025: Validate Bloomerang API Key

- Epic: E-004: Bloomerang CRM Integration & Data Import
- Status: approved
- Priority: must
- Effort: S

**As a** Organization Admin
**I want** the system to validate my Bloomerang API key when I save it
**So that** I know immediately whether my key is correct and the integration is ready to use

### Acceptance Criteria

- When a valid API key is saved, the system makes a test call to the Bloomerang API and displays a 'Connection successful' status indicator in green
- When an invalid or expired API key is saved, the system displays an 'Invalid API key — please check your credentials' error message in red
- When the Bloomerang API is unreachable (network timeout), the system displays a 'Connection failed — please try again later' error message
- The validation result (success or error) is displayed within 5 seconds of clicking 'Save'
- A failed validation does not save the key to the database
- The connection status indicator in Settings reflects the most recent validation result at all times

## US-026: Initial Bloomerang Data Sync — Constituent Records

- Epic: E-004: Bloomerang CRM Integration & Data Import
- Status: approved
- Priority: must
- Effort: L

**As a** Organization Admin
**I want** the platform to import all constituent records from Bloomerang on the initial sync
**So that** my full donor roster is available in the platform without manual data export

### Acceptance Criteria

- After a valid API key is saved, Admin can trigger an initial sync via a clearly labeled 'Sync Now' button in Settings → Integrations
- The sync imports all Bloomerang constituent records as individual donor records (household grouping is not applied)
- Each imported donor record captures at minimum: first name, last name, email address, and phone number where available in Bloomerang
- A progress indicator is displayed while the sync is running
- Upon completion, a summary is displayed showing total records imported and any records skipped with reasons
- Imported donor records are immediately visible in the organization's donor list
- If a constituent record is missing first name and last name, the record is skipped and listed in the import error summary
- The sync handles a minimum of 5,000 constituent records without timeout or data loss

## US-028: On-Demand Bloomerang Re-Sync

- Epic: E-004: Bloomerang CRM Integration & Data Import
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** to trigger a Bloomerang re-sync at any time from Settings → Integrations
**So that** my donor records and donation history reflect the latest data from Bloomerang without requiring a manual export

### Acceptance Criteria

- A 'Sync Now' button is visible and clickable in Settings → Integrations after initial sync has completed
- Clicking 'Sync Now' initiates a re-sync that pulls all updated constituent and transaction records from Bloomerang since the last sync
- Existing donor records are updated with new data from Bloomerang and not duplicated
- New constituent records added in Bloomerang since the last sync are created as new donor records in the platform
- Donor records deleted in Bloomerang are not automatically removed from the platform; they remain unchanged
- Upon re-sync completion, a summary is displayed showing: records updated, records added, records skipped, and any errors
- A re-sync cannot be triggered while a sync is already in progress; the button is disabled and shows a 'Syncing…' state during an active sync

## US-029: Display Bloomerang Sync Status in Settings

- Epic: E-004: Bloomerang CRM Integration & Data Import
- Status: approved
- Priority: must
- Effort: S

**As a** Organization Admin
**I want** to see the Bloomerang sync status including the last synced timestamp and record count in Settings → Integrations
**So that** I can confirm when data was last refreshed and how many records are currently synced

### Acceptance Criteria

- Settings → Integrations displays a 'Last synced' timestamp that updates after every successful sync
- The timestamp is displayed in the organization's local time zone in a human-readable format (e.g., 'June 12, 2025 at 3:45 PM')
- Settings → Integrations displays the total number of donor records currently synced from Bloomerang
- If no sync has been performed yet, the status area displays 'Never synced' and record count shows 0
- If the most recent sync resulted in an error, the status displays 'Last sync failed' with the error timestamp
- The sync status updates within 30 seconds of a sync completing

## US-030: CSV Donor Import with Field Mapping

- Epic: E-004: Bloomerang CRM Integration & Data Import
- Status: approved
- Priority: must
- Effort: L

**As a** Organization Admin
**I want** to upload a CSV file of donor records and map source columns to platform fields before importing
**So that** I can bring in donor data from organizations not using Bloomerang or supplement existing synced data

### Acceptance Criteria

- Settings → Integrations (or a dedicated Import section) contains a 'Upload CSV' button that accepts .csv files only
- After upload, the system displays a field mapping screen listing each detected CSV column alongside a dropdown of platform donor fields
- Required platform fields (first name, last name) are visually highlighted as mandatory in the mapping screen
- Admin must map at least first name and last name fields before the 'Import' button becomes enabled
- Admin can mark unmapped CSV columns as 'Skip this column' to exclude them from the import
- Clicking 'Import' processes the mapped data and displays a results summary: records created, records skipped, and errors with row-level detail
- CSV files up to 10MB and 10,000 rows are supported without timeout
- Uploading a CSV with a duplicate email address that matches an existing donor record skips the duplicate row and reports it in the error summary

## US-030: Create a Move for an Assigned Donor

- Epic: E-005: Moves Management & Workflow
- Status: approved
- Priority: must
- Effort: M

**As a** Solicitor
**I want** to create a move by selecting one of my assigned donors, choosing a Move Idea from the library, and setting a due date
**So that** I have a structured, trackable outreach task recorded in the system

### Acceptance Criteria

- Solicitor can only select donors assigned to them from the donor picker
- Move Idea picker displays all available Move Ideas from the library (global + org-level)
- Due date field is required and must be a valid future or present date
- Created move record stores: title (inherited from Move Idea), associated donor, associated solicitor (auto-assigned to logged-in user), due date, status defaulting to 'Pending', and creation date
- Solicitor is redirected to the move detail view or moves list upon successful creation
- A move cannot be saved without all three required fields: donor, move idea, and due date
- Created move appears immediately in the solicitor's moves list with status 'Pending'

## US-031: Complete a Move with Notes and Optional Follow-Up

- Epic: E-005: Moves Management & Workflow
- Status: approved
- Priority: must
- Effort: L

**As a** Solicitor
**I want** to mark a move as complete, add completion notes, and optionally create a follow-up move in a single guided flow
**So that** I can close out an outreach activity and immediately plan the next step without losing donor context

### Acceptance Criteria

- A 'Complete Move' action is available on any move with status 'Pending'
- Completion flow presents a text area for completion notes (required to proceed)
- Completion flow presents an optional step to create a follow-up move
- If follow-up move is chosen, the new move form is pre-populated with the same donor and solicitor from the completed move
- Follow-up move requires the solicitor to select a Move Idea and set a due date before saving
- Upon submission, the original move status changes from 'Pending' to 'Completed' and completion notes are saved
- If a follow-up move is created, it is linked to the completed move via a follow-up move linkage field
- Completed move no longer appears in the solicitor's pending moves list
- Completion date is recorded on the move record at the time of submission

## US-031: View Import Results Summary

- Epic: E-004: Bloomerang CRM Integration & Data Import
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** to see a detailed results summary after each CSV import or Bloomerang sync completes
**So that** I can understand exactly what data was imported, what was skipped, and what errors occurred

### Acceptance Criteria

- After every CSV import, a results panel is displayed showing: total rows processed, records successfully created, records skipped, and records that produced errors
- After every Bloomerang sync, a results panel is displayed showing: records created, records updated, records skipped, and errors
- Error entries include a specific reason for each failure (e.g., 'Row 14: Missing last name', 'Row 22: Duplicate email address')
- The results summary is displayed on-screen immediately after the import or sync completes without requiring a page refresh
- Admin can dismiss the results panel; a persistent log of the last 10 import/sync results is accessible in Settings → Integrations
- Each historical log entry shows the import type (CSV or Bloomerang sync), timestamp, and summary counts

## US-032: View My Assigned Moves List

- Epic: E-005: Moves Management & Workflow
- Status: approved
- Priority: must
- Effort: M

**As a** Solicitor
**I want** to see a list of only my assigned moves filtered by status
**So that** I can quickly identify which outreach tasks need my attention without seeing other solicitors' work

### Acceptance Criteria

- Solicitor's moves list displays only moves where the assigned solicitor matches the logged-in user
- List displays move title, associated donor name, due date, and status for each move
- Solicitor can filter the list by status: All, Pending, Completed
- Overdue moves (status = Pending and due date is in the past) are visually distinguished from non-overdue pending moves (e.g., different color, icon, or label)
- List is sortable by due date (ascending/descending)
- Solicitor cannot view or access moves assigned to other solicitors from this view
- Empty state message is shown when no moves match the selected filter

## US-033: View All Moves Across All Solicitors as Admin

- Epic: E-005: Moves Management & Workflow
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** to view all moves across all solicitors in my organization in a single list
**So that** I can monitor solicitor activity, identify overdue tasks, and ensure the team is executing the moves management methodology

### Acceptance Criteria

- Admin moves list displays moves from all solicitors within the admin's organization
- Each move row displays: move title, associated donor name, assigned solicitor name, due date, and status
- Admin can filter the list by solicitor, status (Pending/Completed), and date range
- Overdue moves (Pending and past due date) are visually distinguished in the admin view
- Admin cannot view moves belonging to a different organization
- List supports pagination or infinite scroll when more than 50 records are present
- Admin can click into any move to view full move details including completion notes

## US-034: View Moves in a Calendar View

- Epic: E-005: Moves Management & Workflow
- Status: approved
- Priority: must
- Effort: L

**As a** Solicitor
**I want** to view my upcoming and overdue moves in a calendar timeline format
**So that** I can plan my outreach schedule visually and identify time-sensitive tasks at a glance

### Acceptance Criteria

- Calendar view is accessible from the main navigation
- Calendar displays only the logged-in solicitor's moves by default
- Each move appears on the calendar on its due date, showing the move title and associated donor name
- Overdue moves (Pending, past due date) are visually distinguished on the calendar (e.g., different color or indicator)
- Completed moves are either hidden by default or visually distinct from pending moves
- Solicitor can navigate between weeks or months
- Clicking a move on the calendar opens the move detail view
- Admin viewing the calendar can toggle between viewing all solicitors or filtering by a specific solicitor

## US-035: View Move History on Donor Profile

- Epic: E-005: Moves Management & Workflow
- Status: approved
- Priority: must
- Effort: M

**As a** Solicitor
**I want** to see a full history of all moves associated with a donor on their profile page
**So that** I can review past outreach activities and context before planning my next interaction with that donor

### Acceptance Criteria

- Donor profile page includes a Move History section
- Move History lists all moves (Pending and Completed) associated with that donor
- Each move entry displays: move title, assigned solicitor name, due date, status, and completion notes (if completed)
- Moves are displayed in reverse chronological order by creation date by default
- Follow-up move linkage is visible, showing which completed move triggered each follow-up
- Solicitor can only view move history for donors assigned to them; Admin can view move history for any donor in the organization
- Move History section shows an empty state message if no moves have been created for that donor

## US-036: Visually Identify Overdue Moves Across the Platform

- Epic: E-005: Moves Management & Workflow
- Status: approved
- Priority: must
- Effort: S

**As a** Solicitor
**I want** overdue moves to be clearly and consistently highlighted wherever moves are displayed
**So that** I can immediately recognize which tasks are past due without manually comparing dates

### Acceptance Criteria

- A move is considered overdue when its status is 'Pending' and its due date is strictly before today's date
- Overdue moves display a distinct visual indicator (e.g., red label, warning icon, or highlighted row) in the moves list view
- Overdue moves display the same distinct visual indicator in the calendar view
- Overdue moves display the same distinct visual indicator in the donor profile move history section
- Completed moves are never marked as overdue regardless of their due date
- The overdue state is evaluated dynamically each time the page loads, not stored as a separate status field
- Overdue indicator is accompanied by accessible contrast ratios meeting WCAG AA standards

## US-037: Super Admin creates a global Move Idea

- Epic: E-006: Move Ideas Library
- Status: approved
- Priority: must
- Effort: M

**As a** Super Admin
**I want** to create a new Move Idea in the global library with a title and category
**So that** all organizations on the platform have access to a pre-configured set of cultivation activity templates

### Acceptance Criteria

- A 'Create Move Idea' form is accessible from the Super Admin Move Ideas Library management screen
- The form requires a Title field (text, max 150 characters) and a Category field (selectable from a predefined list or free-text entry)
- Submitting the form with both fields populated saves the Move Idea to the global library
- The newly created Move Idea appears immediately in the global library list
- Submitting the form with Title empty displays a validation error and does not save
- Submitting the form with Category empty displays a validation error and does not save
- The created Move Idea is visible to all organizations when creating a move

## US-038: Super Admin edits and deletes a global Move Idea

- Epic: E-006: Move Ideas Library
- Status: approved
- Priority: must
- Effort: M

**As a** Super Admin
**I want** to edit or delete any Move Idea in the global library
**So that** I can keep the global library accurate, current, and relevant for all organizations

### Acceptance Criteria

- Each global Move Idea in the library list has an Edit action that opens a pre-populated form with the existing Title and Category
- Saving an edited Move Idea updates the record immediately and the updated values are reflected across all organizations
- Each global Move Idea has a Delete action that triggers a confirmation prompt before permanent removal
- Confirming deletion removes the Move Idea from the global library and it no longer appears in the move creation dropdown for new moves
- Deleting a global Move Idea does not delete or alter any historical move records that previously referenced it
- Historical moves that referenced a deleted Move Idea continue to display the original Move Idea title as a read-only reference
- Cancelling the delete confirmation prompt leaves the Move Idea unchanged

## US-039: Organization Admin creates an organization-specific Move Idea

- Epic: E-006: Move Ideas Library
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** to create custom Move Ideas specific to my organization
**So that** my solicitors can select cultivation activities that reflect our organization's unique outreach strategies

### Acceptance Criteria

- An Organization Admin can access a Move Ideas management section within their organization's settings
- The form requires a Title (max 150 characters) and a Category, both mandatory
- A saved organization-specific Move Idea is visible only to users within that organization and not to any other organization
- Organization-specific Move Ideas are visually distinguished from global Move Ideas in the management list (e.g., labeled 'Custom' or 'Organization')
- An Organization Admin cannot create, edit, or delete global Move Ideas
- Saving with a missing Title or Category displays a validation error and does not save

## US-040: Organization Admin edits and deletes an organization-specific Move Idea

- Epic: E-006: Move Ideas Library
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** to edit or delete Move Ideas I have created for my organization
**So that** I can maintain an accurate and relevant custom library for my solicitor team

### Acceptance Criteria

- Each organization-specific Move Idea in the admin list has an Edit action that opens a pre-populated form
- Saving an edited organization Move Idea immediately updates the Title and Category in the library
- Each organization-specific Move Idea has a Delete action that triggers a confirmation prompt
- Confirming deletion removes the Move Idea from the organization library and it no longer appears in the move creation dropdown for new moves
- Deleting an organization Move Idea does not delete or alter historical moves that referenced it
- An Organization Admin cannot edit or delete global Move Ideas
- An Organization Admin cannot edit or delete Move Ideas belonging to a different organization

## US-041: Solicitor selects a Move Idea when creating a move

- Epic: E-006: Move Ideas Library
- Status: approved
- Priority: must
- Effort: M

**As a** Solicitor
**I want** to select from both global and my organization's custom Move Ideas when creating a move
**So that** I can quickly choose a pre-configured cultivation activity without manually typing move details from scratch

### Acceptance Criteria

- The move creation form includes a Move Idea selector (dropdown or searchable list)
- The selector displays all global Move Ideas and all Move Ideas belonging to the solicitor's organization
- Global and organization-specific Move Ideas are grouped or labeled to indicate their source
- Selecting a Move Idea auto-populates the move Title field with the Move Idea's title
- The solicitor can override the auto-populated title before saving
- If no Move Ideas exist for the organization and the global library is empty, the selector displays an empty state message
- The Move Idea selector is accessible within the move creation flow without navigating away from the current workflow

## US-042: Global Move Ideas are available to all organizations immediately upon creation

- Epic: E-006: Move Ideas Library
- Status: approved
- Priority: must
- Effort: S

**As a** Super Admin
**I want** changes I make to global Move Ideas to be reflected across all organizations instantly
**So that** all organizations always have access to the most current set of global cultivation templates without requiring any action from their admins

### Acceptance Criteria

- A newly created global Move Idea appears in the move creation selector for all organizations without requiring a page refresh beyond normal browser navigation
- An edited global Move Idea's updated Title and Category are displayed in the move creation selector for all organizations after the edit is saved
- A deleted global Move Idea no longer appears in the move creation selector for any organization after deletion is confirmed
- The update is reflected for a solicitor in Organization A and a solicitor in Organization B independently to confirm cross-organization propagation
- No Organization Admin action is required to receive the updated global Move Ideas

## US-043: Move Ideas library is accessible inline during move creation

- Epic: E-006: Move Ideas Library
- Status: approved
- Priority: must
- Effort: M

**As a** Solicitor
**I want** to access and browse the Move Ideas library without leaving the move creation workflow
**So that** I can select a move idea and return to completing the move form without losing my progress

### Acceptance Criteria

- The Move Idea selector is embedded directly in the move creation form (e.g., inline dropdown, modal, or side panel) and does not navigate the user away from the form
- Any data already entered in the move creation form (donor selection, due date) is preserved after selecting a Move Idea
- The solicitor can search or filter Move Ideas by title or category within the selector
- Selecting a Move Idea and dismissing the selector returns the solicitor to the move creation form with the selected Move Idea applied
- The solicitor can clear a selected Move Idea and reselect a different one without losing other form data

## US-044: Solicitor Personal Dashboard

- Epic: E-007: Dashboards & Reporting
- Status: approved
- Priority: must
- Effort: M

**As a** Solicitor
**I want** a personal dashboard that displays my assigned donors ranked by score, my pending moves, and any moves due today or overdue
**So that** I can immediately see where to focus my attention without navigating through multiple pages

### Acceptance Criteria

- Dashboard displays only donors assigned to the logged-in solicitor
- Donors are listed in descending order by their current calculated score
- A 'Pending Moves' section lists all moves with status 'pending' assigned to the solicitor
- Moves due today are visually distinguished (e.g., highlighted or badged) from future pending moves
- Overdue moves (due date is in the past and status is pending) are visually flagged with a distinct indicator
- Dashboard does not display donors or moves belonging to other solicitors
- Dashboard does not display data from other organizations
- Dashboard loads within 3 seconds on a standard broadband connection
- Clicking a donor row navigates directly to that donor's profile page

## US-045: Organization Admin Dashboard — Aggregate Metrics

- Epic: E-007: Dashboards & Reporting
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** a dashboard showing aggregate organizational metrics including total donors, moves needed, total moves, moves completed, and pending moves
**So that** I can monitor my organization's overall fundraising activity and progress at a glance

### Acceptance Criteria

- Dashboard displays a 'Total Donors' count reflecting all donor records in the organization
- Dashboard displays a 'Moves Needed' count based on the organization's configured moves-needed thresholds by score band
- Dashboard displays a 'Total Moves' count reflecting all moves ever created in the organization
- Dashboard displays a 'Moves Completed' count reflecting all moves with status 'completed' in the organization
- Dashboard displays a 'Pending Moves' count reflecting all moves with status 'pending' in the organization
- All metric counts are scoped exclusively to the logged-in admin's organization
- Metrics reflect the real-time state of the platform with no stale data beyond acceptable cache limits
- Dashboard loads within 3 seconds on a standard broadband connection
- Each metric card displays its label and numeric value clearly

## US-046: Top Solicitors Leaderboard on Admin Dashboard

- Epic: E-007: Dashboards & Reporting
- Status: approved
- Priority: must
- Effort: S

**As a** Organization Admin
**I want** a top solicitors leaderboard on my dashboard ranked by each solicitor's average donor score
**So that** I can identify high-performing solicitors and those who may need additional support or coaching

### Acceptance Criteria

- Leaderboard is visible only to Organization Admins and Super Admins, not to Solicitors
- Leaderboard lists all active solicitors in the organization ranked in descending order by their average donor score
- Each leaderboard row displays the solicitor's full name and their average donor score
- Average donor score is calculated as the mean score of all donors assigned to that solicitor
- Solicitors with no assigned donors are either excluded from the leaderboard or displayed at the bottom with a score of 0 or N/A
- Leaderboard data is scoped to the current organization only and does not include solicitors from other organizations
- Leaderboard is visible as part of the Admin dashboard and loads within the overall 3-second page load requirement

## US-047: Admin Navigation to Solicitor Donor List from Dashboard

- Epic: E-007: Dashboards & Reporting
- Status: approved
- Priority: must
- Effort: S

**As a** Organization Admin
**I want** to click on a solicitor's name from the dashboard leaderboard and navigate directly to that solicitor's donor list
**So that** I can quickly drill down into a specific solicitor's portfolio without manually filtering

### Acceptance Criteria

- Each solicitor name on the leaderboard is a clickable link or button
- Clicking a solicitor's name navigates the admin to the donor list pre-filtered to show only that solicitor's assigned donors
- The filtered donor list displays all standard donor list columns (name, score, tier, assigned solicitor)
- A clear filter indicator or breadcrumb shows that the list is filtered by the selected solicitor
- Admin can clear the filter to return to the full organizational donor list
- Navigation works without full page reload or results in an acceptable single-page transition
- The destination donor list only shows donors from the admin's own organization

## US-049: Real-Time Dashboard Data Refresh

- Epic: E-007: Dashboards & Reporting
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** dashboard metrics to reflect the current real-time state of the platform
**So that** I am making decisions based on accurate, up-to-date information rather than stale cached data

### Acceptance Criteria

- Dashboard metrics (total donors, moves completed, pending moves, moves needed) update to reflect changes made in the platform within an acceptable time window (no longer than 60 seconds after a change occurs)
- A move logged as completed by a solicitor is reflected in the 'Moves Completed' and 'Pending Moves' counts on the admin dashboard within the acceptable refresh window
- A newly added donor record is reflected in the 'Total Donors' count within the acceptable refresh window
- The solicitor leaderboard average scores update when donor scores are recalculated within the acceptable refresh window
- No manual page action (other than a standard browser refresh) is required to receive updated metrics within the acceptable window
- Documented cache TTL or refresh strategy is defined and does not exceed 60 seconds for any dashboard metric

## US-050: Access Persistent Feedback Submission Button

- Epic: E-008: In-App Feedback System
- Status: approved
- Priority: must
- Effort: S

**As a** authenticated user
**I want** a persistent, always-visible feedback button or widget within the platform UI
**So that** I can submit feedback at any time without navigating away from my current workflow

### Acceptance Criteria

- A feedback button or icon is visible on every authenticated page of the platform regardless of user role
- The feedback button is not visible to unauthenticated users
- Clicking the button opens a feedback submission form without navigating away from the current page (e.g., modal or slide-out panel)
- The feedback button does not obscure primary page content or key interactive UI elements
- The feedback button is visible and accessible on desktop browsers at standard screen resolutions (1280px and above)

## US-050: Solicitor Dashboard Donor Click-Through to Donor Profile

- Epic: E-007: Dashboards & Reporting
- Status: approved
- Priority: must
- Effort: S

**As a** Solicitor
**I want** to click on a donor's name from my dashboard and be taken directly to that donor's full profile
**So that** I can quickly access a donor's score breakdown, donation history, characteristics, and move history without additional navigation steps

### Acceptance Criteria

- Every donor name or row displayed on the solicitor dashboard is clickable
- Clicking a donor navigates the solicitor to the donor's individual profile page
- The donor profile page includes the donor's score, tier, score breakdown, assigned solicitor, and move history
- The solicitor can only click through to donors assigned to them; no links to other solicitors' donors are present on their dashboard
- The donor profile page loads within 3 seconds of the navigation action
- A back-navigation option (browser back or breadcrumb) returns the solicitor to the dashboard without data loss

## US-051: Organization Data Isolation Across Dashboards

- Epic: E-007: Dashboards & Reporting
- Status: approved
- Priority: must
- Effort: M

**As a** Organization Admin
**I want** all dashboard metrics and data to be strictly scoped to my organization
**So that** confidential donor and performance data from my organization is never exposed to users of other organizations

### Acceptance Criteria

- No metric, donor record, solicitor name, or move displayed on the Organization Admin dashboard belongs to any organization other than the logged-in admin's organization
- No metric, donor record, or move displayed on the Solicitor dashboard belongs to any organization other than the solicitor's own organization
- API endpoints backing the dashboard enforce server-side organization scoping and do not rely solely on client-side filtering
- Manually altering query parameters or API calls to reference another organization's ID returns an authorization error (403) with no data returned
- Automated tests confirm that a user from Organization A cannot retrieve dashboard data from Organization B under any scenario

## US-051: Submit Categorized Feedback Form

- Epic: E-008: In-App Feedback System
- Status: approved
- Priority: must
- Effort: M

**As a** authenticated user
**I want** to submit a feedback form with a category, title, description, and optional file attachment
**So that** I can clearly communicate bug reports, feature requests, or questions to the platform operator

### Acceptance Criteria

- The feedback form contains a required category field with exactly three options: Bug Report, Feature Request, Question
- The feedback form contains a required title field with a maximum of 150 characters
- The feedback form contains a required description field with a maximum of 2000 characters
- The feedback form contains an optional file attachment field accepting image files (PNG, JPG) and PDF up to 10MB
- Submitting the form without selecting a category, entering a title, or entering a description displays inline validation errors and prevents submission
- Attaching a file exceeding 10MB displays an error message and prevents submission
- A successfully submitted form closes the modal and displays a confirmation message to the user (e.g., 'Your feedback has been received')
- The confirmation message is visible for at least 3 seconds before auto-dismissing or requires manual dismissal

## US-052: Store Feedback with User and Organization Metadata

- Epic: E-008: In-App Feedback System
- Status: approved
- Priority: must
- Effort: M

**As a** system
**I want** to automatically capture and store the submitting user's identity, their organization, and a timestamp alongside each feedback submission
**So that** the Super Admin can contextualize feedback without requiring users to manually enter this information

### Acceptance Criteria

- Each stored feedback record includes the submitting user's full name and email address as recorded in the platform
- Each stored feedback record includes the organization the submitting user belongs to
- Each stored feedback record includes a UTC timestamp of when the submission was made
- User identity and organization metadata are captured server-side and cannot be altered by the submitting user
- Feedback records from one organization are not accessible to users of any other organization
- A feedback submission by a Super Admin records their identity and flags them as Super Admin in the stored record

## US-053: View All Feedback in Super Admin Inbox

- Epic: E-008: In-App Feedback System
- Status: approved
- Priority: must
- Effort: M

**As a** Super Admin
**I want** a dedicated inbox view that displays all feedback submissions from all organizations
**So that** I can review and manage product feedback from a single centralized location

### Acceptance Criteria

- A Feedback Inbox menu item or section is accessible only to users with the Super Admin role
- The inbox displays all feedback submissions across all organizations in a list or table format
- Each row in the inbox displays: submission title, category, submitting user name, organization name, and submission date
- Clicking a feedback row opens a detail view showing the full description, all metadata, and any attached file
- Attached files can be downloaded or previewed from the detail view
- The inbox loads and displays up to 50 submissions per page with pagination or infinite scroll for additional records
- Non-Super Admin users receive a 403 or equivalent access-denied response if they attempt to access the feedback inbox URL directly

## US-054: Filter and Sort Feedback Submissions

- Epic: E-008: In-App Feedback System
- Status: approved
- Priority: must
- Effort: M

**As a** Super Admin
**I want** to filter and sort feedback submissions by category, organization, and submission date
**So that** I can prioritize and triage feedback efficiently as submission volume grows

### Acceptance Criteria

- The feedback inbox includes a filter control for category with options: All, Bug Report, Feature Request, Question
- The feedback inbox includes a filter control for organization populated with all organizations that have submitted at least one feedback item
- The feedback inbox includes a date range filter allowing the Super Admin to specify a start date and end date
- The feedback inbox includes a sort control allowing sorting by submission date (newest first, oldest first)
- Applying any filter combination updates the displayed list without a full page reload
- When filters are active, the UI indicates which filters are applied and provides a way to clear all filters
- Filters can be combined simultaneously (e.g., category = Bug Report AND organization = TA AND date range = last 7 days)

## US-055: Mark Feedback as Reviewed or Resolved

- Epic: E-008: In-App Feedback System
- Status: approved
- Priority: could
- Effort: S

**As a** Super Admin
**I want** to mark individual feedback submissions as Reviewed or Resolved
**So that** I can track which submissions have been actioned and focus on outstanding items

### Acceptance Criteria

- Each feedback submission has a status field that defaults to 'New' upon submission
- The Super Admin can change the status of any feedback item to 'Reviewed' or 'Resolved' from the detail view
- The Super Admin can change status back from 'Resolved' to 'Reviewed' or 'New' if needed
- The updated status is reflected immediately in the inbox list view without requiring a page refresh
- The feedback inbox includes a filter option for status (New, Reviewed, Resolved, All) so the Super Admin can view only unactioned items
- Status changes are recorded with the timestamp of the change and visible in the detail view
- Submitting users do not receive any notification when the status of their feedback changes in Phase 1

## US-056: Receive Submission Confirmation Notification

- Epic: E-008: In-App Feedback System
- Status: approved
- Priority: could
- Effort: S

**As a** authenticated user
**I want** to receive a clear confirmation after submitting feedback
**So that** I know my submission was successfully received and do not submit duplicate entries

### Acceptance Criteria

- Upon successful form submission, an in-app confirmation message is displayed stating the feedback was received (e.g., 'Thank you! Your feedback has been submitted successfully')
- The confirmation message appears within 2 seconds of the user clicking the submit button
- If the submission fails due to a server or network error, an error message is displayed instructing the user to try again; the form content is preserved so the user does not lose their input
- The feedback submission form is cleared and closed after a successful submission
- No confirmation email is sent in Phase 1; confirmation is in-app only
