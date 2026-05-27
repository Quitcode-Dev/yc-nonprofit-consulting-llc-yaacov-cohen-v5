# Product Requirements Document (PRD)
## Move Your Donors — Web Application
### YC Nonprofit Consulting LLC

---

| Field | Detail |
|---|---|
| **Document Version** | 1.2 |
| **Date Prepared** | June 2025 |
| **Prepared By** | QuitCode Delivery Team |
| **Product Owner** | Yaacov Cohen, YC Nonprofit Consulting LLC |
| **Document Status** | Active — Phase 1 Development |
| **Project Type** | Greenfield SaaS Web Application |
| **Industry** | Nonprofit Fundraising / Donor Management |

---

## Table of Contents

1. [Business Case](#1-business-case)
2. [Business Context & Goals](#2-business-context--goals)
3. [Current State Analysis](#3-current-state-analysis)
4. [Users & Stakeholders](#4-users--stakeholders)
5. [Desired Future State](#5-desired-future-state)
6. [Hypothesis](#6-hypothesis)
7. [Functional Requirements — Epics & User Stories](#7-functional-requirements--epics--user-stories)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Technical Environment & Constraints](#9-technical-environment--constraints)
10. [Success Metrics](#10-success-metrics)
11. [Out of Scope — Phase 1](#11-out-of-scope--phase-1)
12. [Open Items & Decisions Required](#12-open-items--decisions-required)

---

## 1. Business Case

### Why This Product Is Being Built

YC Nonprofit Consulting LLC (YCNP), led by fundraising consultant Yaacov Cohen, has developed a proven donor cultivation methodology called **Moves Management** — a structured system for scoring donors, assigning relationship managers (solicitors), tracking outreach activities ("moves"), and measuring progress toward fundraising goals. This methodology has been validated at the Talmudical Academy of Baltimore (TA), where its application yielded:

- **79% increase** in total annual fundraising
- **55% increase** in average gift size
- **149% increase** in major donor count
- **98% increase** in giving by major donors
- All results achieved **with no additional staff**

Despite these results, the methodology is currently delivered via manually configured **Airtable bases** — one per client — which are:

- Time-consuming to set up and maintain per organization
- Difficult for non-technical nonprofit staff to use independently
- Impossible to scale across a growing consulting client base without proportionally growing setup labor
- Lacking native CRM integrations, relying instead on fragile Zapier workarounds
- Providing no cross-organization visibility or centralized administration for the consultant

### The Opportunity

By productizing the Moves Management methodology into a purpose-built SaaS web application — **Move Your Donors** — Yaacov Cohen and YCNP can:

1. Deliver a consistent, repeatable software tool to 100+ consulting client organizations
2. Reduce per-client onboarding time from hours to minutes
3. Launch a scalable, subscription-based SaaS revenue stream
4. Differentiate YCNP's consulting offering with proprietary software
5. Establish the data and architecture foundation for future AI-powered donor enrichment and intelligence features in Phase 2+

The platform is a **greenfield build**, with Talmudical Academy of Baltimore serving as the first pilot organization. External client rollout will follow validation of the internal beta.

---

## 2. Business Context & Goals

### 2.1 Goals & Objectives

| # | Goal | Measurable Outcome | Target Timeframe |
|---|---|---|---|
| G1 | Deliver a functional Phase 1 MVP of the Move Your Donors platform | All Phase 1 scope items delivered, tested, and deployed to production | End of Phase 1 development cycle |
| G2 | Successfully migrate Talmudical Academy pilot data into the platform | All donor records, donation history, and historical moves imported from Airtable and Bloomerang with zero data loss | Within 1 week of internal beta release |
| G3 | Onboard and validate with the internal TA team | At least the full TA solicitor team is actively using the platform within 1–2 weeks of internal beta release | 2 weeks post internal beta launch |
| G4 | Establish a configurable, organization-level scoring engine | Admins can configure checkbox field point values, enable/disable fields, and define donor tiers within 5 minutes via the settings UI | Phase 1 delivery |
| G5 | Enable live Bloomerang CRM integration | Donor records and donation transactions sync via Bloomerang API with no manual export/import required; re-sync available on demand | Phase 1 delivery |
| G6 | Support multi-tenant, multi-organization architecture | Each consulting client organization operates in a fully isolated environment with separate data, settings, and user roles | Phase 1 delivery |
| G7 | Conduct external client beta with at least 1–2 additional organizations | At least one external YCNP consulting client is onboarded and actively using the platform | 1–2 weeks post internal beta validation |

> **Note — Household Support:** Household-level donor grouping, combined scoring, toggle views, and household-specific field storage were discussed during Phase 1 planning sessions (Demos #5 and #6) but have been confirmed as **deferred to Phase 2**. The data model in Phase 1 treats each donor as an individual record. See [Section 11 — Out of Scope](#11-out-of-scope--phase-1) for details.

### 2.2 Strategic Rationale

- **Productization of expertise:** Yaacov Cohen's methodology is proven but currently locked inside manual Airtable templates. Encoding it into software removes the human bottleneck from delivery.
- **Scalable revenue:** Each new client organization onboarded to the platform generates subscription revenue with minimal marginal delivery cost.
- **Competitive differentiation:** Proprietary software strengthens the YCNP consulting brand and creates switching costs that Airtable-based delivery cannot.
- **Phase 2 platform foundation:** The donor data model, CRM integrations, and multi-tenant architecture built in Phase 1 are prerequisites for planned household management, AI-powered donor enrichment, and intelligence features.

### 2.3 Key Performance Indicators (KPIs)

| KPI | Baseline (Current) | Phase 1 Target | Measurement Method |
|---|---|---|---|
| Time to onboard a new client organization | ~4–8 hours (Airtable setup) | ≤ 30 minutes (platform setup + CSV import) | Measured during first 3 external onboardings |
| TA solicitor team active adoption rate | 0% (not yet using platform) | 100% of TA solicitor team active within 2 weeks of beta launch | User login records |
| Donor records successfully imported (TA pilot) | 0 in platform | 100% of TA Airtable donor records imported without data loss | Pre/post import record count comparison |
| Historical moves migrated (TA pilot) | 0 in platform | 100% of completed TA Airtable moves migrated | Pre/post move count comparison |
| User-reported critical bugs post-beta launch | [TBD baseline] | ≤ 3 critical bugs in first 2 weeks post-beta | In-app feedback system + issue tracker |
| Solicitor invitation-to-activation rate | N/A | ≥ 80% of invited solicitors complete signup within 48 hours | Platform user registration logs |
| Dashboard load time | N/A | ≤ 3 seconds on standard broadband connection | Performance testing |

### 2.4 Definition of Success — Phase 1

Phase 1 is considered **successfully complete** when all of the following conditions are met:

1. The platform is deployed to production and accessible via web browser on desktop
2. Talmudical Academy's full donor roster, donation history, and historical moves are imported and visible in the platform
3. The full TA solicitor team has active accounts and is logging moves in the platform
4. The Bloomerang API integration allows on-demand sync without manual file exports
5. At least one external YCNP consulting client has been onboarded and is actively using the platform
6. The scoring engine is configurable per organization, and donor tier thresholds are admin-settable
7. The in-app feedback system is live and the Super Admin can review submissions

---

## 3. Current State Analysis

### 3.1 How Things Work Today

Yaacov Cohen's Moves Management methodology is currently delivered to each consulting client organization through a **manually configured Airtable base**. The process for each client follows this pattern:

1. **Setup:** Yaacov or a team member manually recreates the Airtable base structure for each new client, configuring tables, fields, views, and scoring formulas from scratch
2. **Donor import:** Client staff export donor records from their CRM (e.g., Bloomerang) and manually upload them to Airtable, often requiring re-mapping and cleanup
3. **Donation data:** Donation history is either manually entered or pulled via Zapier/Make.com automations — which are fragile, require maintenance, and demand technical setup by the consultant
4. **Scoring:** Donor scores are calculated via Airtable formula fields, which clients cannot easily customize and which break when fields are renamed or reorganized
5. **Moves tracking:** Solicitors log their outreach "moves" directly in Airtable rows — there is no guided workflow, no completion prompts, and no calendar view
6. **Reporting:** Admins and consultants must build their own Airtable views or export to spreadsheets for any aggregate reporting
7. **Access management:** There is no structured user permission system; all Airtable collaborators have broadly equivalent access unless manually restricted

### 3.2 Software Currently Used

| Tool | Purpose | Limitations |
|---|---|---|
| **Airtable** | Primary database for donor records, scores, moves tracking | Manual setup per client; no native CRM sync; formula-based scoring is fragile; not user-friendly for non-technical staff |
| **Bloomerang** (client-owned) | CRM for donor records and donation transactions | No native connection to Airtable; data must be exported and re-imported manually |
| **Zapier / Make.com** | Automation bridges between Bloomerang and Airtable | Fragile; requires technical configuration; breaks when field names or structures change |
| **Spreadsheets (Excel/Google Sheets)** | Ad-hoc reporting, data cleanup, solicitor assignments | No structure, no version control, error-prone |
| **Email** | Solicitor communication, task reminders | No tracking, no accountability |

### 3.3 Top 3 Pain Points

#### Pain Point 1: Unsustainable Per-Client Setup Overhead
Every new consulting client requires a full manual Airtable configuration from scratch — estimated at 4–8 hours of consultant or staff time. As the consulting client base grows toward 100+ organizations, this becomes a critical bottleneck that caps growth without proportionally increasing labor costs.

> *"It was like, Airtable familiarity that most clients lack. Cannot be easily scaled or maintained across a growing client base."* — Project Charter

#### Pain Point 2: No Native CRM Integration
The absence of a native Bloomerang (or any CRM) connection means:
- Donation data must be manually exported and re-imported, creating sync lag and data quality risks
- Zapier automations are brittle and require technical oversight the client does not have
- Real-time scoring based on actual giving history is not reliably achievable

> *"Lack native CRM integrations, requiring fragile Zapier workarounds."* — Project Charter

#### Pain Point 3: No Centralized Visibility or Accountability
There is no way for Yaacov Cohen as a consultant to see across all his client organizations simultaneously, nor is there a structured way to hold solicitors accountable. Solicitors log moves in shared Airtable rows with no guided workflow, no completion prompts, and no leaderboard — reducing adoption and consistency of the methodology.

> *"Provide no centralized visibility for administrators or cross-organization analytics."* — Project Charter

---

## 4. Users & Stakeholders

### 4.1 Stakeholders

| Role | Name | Organization | Responsibilities |
|---|---|---|---|
| **Sponsor / Product Owner** | Yaacov Cohen | YCNP / Talmudical Academy of Baltimore | Final decision authority on product scope, priorities, and acceptance; first end user |
| **Delivery Manager** | Roman Sydorak | QuitCode | Client relationship, technical planning oversight, scope governance |
| **Project Manager** | Ivan Solomchak | QuitCode | Day-to-day execution, demos, developer coordination |
| **Developer(s)** | [TBD] | QuitCode | All technical implementation |
| **QA** | [TBD — informal] | QuitCode | Testing and bug validation |
| **Pilot Users** | TA Development Staff & Solicitors | Talmudical Academy of Baltimore | Beta testers; first live users of the platform |
| **External Users** | YCNP consulting clients | Various nonprofits & yeshivas | Post-pilot rollout users |

### 4.2 User Personas

---

#### Persona 1: The Super Admin — "The Platform Operator"
**Representative User:** Yaacov Cohen

**Who They Are:** The owner and operator of the Move Your Donors platform. Manages the platform globally, across all client organizations. Has the highest level of system access.

**Goals:**
- Maintain a global library of Move Ideas available to all organizations
- Onboard new client organizations quickly and with minimal manual effort
- Monitor platform health and receive user feedback
- Configure platform-wide defaults that individual organizations can then customize

**Key Needs:**
- Global Move Ideas library with full create/edit/delete capability
- Organization management (create, view, manage all client orgs)
- In-app feedback inbox (bug reports, feature requests, questions from all users)
- Ability to act as any organization's admin for support purposes [TBD — confirm capability]

**Pain Points Solved:**
- No longer needs to manually configure Airtable per client
- Centralized visibility across all client organizations

**Technical Comfort:** High — comfortable with SaaS tools, API concepts, and data management

---

#### Persona 2: The Organization Admin — "The Fundraising Director"
**Representative User:** Development Director or Operations Manager at a nonprofit client

**Who They Are:** The primary administrator for a single client organization on the platform. Manages their organization's settings, data, and users. Reports to executive leadership. May or may not have a technical background.

**Goals:**
- Configure the scoring engine to reflect their organization's specific donor characteristics
- Manage solicitor team access and assignments
- View all organizational data including all solicitors' progress
- Ensure accurate donor records and donation history in the platform

**Key Needs:**
- Organization settings panel (scoring field configuration, tier thresholds, moves-needed rules)
- Full visibility into all donors, moves, and solicitor statistics
- Ability to invite solicitors via email and manage their access
- Bloomerang API key entry and on-demand re-sync
- Dashboard with aggregate organization metrics

**Pain Points Solved:**
- No longer spends hours configuring Airtable per year
- Has real-time visibility into solicitor performance without manually building reports

**Technical Comfort:** Low to medium — needs an intuitive UI; should not need to understand APIs or formulas

---

#### Persona 3: The Solicitor — "The Relationship Manager"
**Representative User:** A major gifts officer, rabbi, or development associate assigned to manage a portfolio of donor relationships

**Who They Are:** A frontline fundraiser responsible for cultivating and stewarding a specific set of donors. Executes Moves (outreach activities) and tracks progress toward cultivation goals. Uses the platform via desktop browser in Phase 1; mobile browser support is a Phase 1 target for responsiveness.

**Goals:**
- Know which donors need attention and what moves are due
- Quickly log completed moves and create follow-up actions
- View their assigned donors' scores and donation history
- Stay organized without using email or spreadsheets

**Key Needs:**
- Personal dashboard showing only their assigned donors and moves (by default)
- Simple move creation flow: pick a donor, pick a move idea, set a due date
- Move completion flow: log notes, create follow-up move in one step
- Calendar view of scheduled moves
- Desktop-optimized interface with clean, low-training-required UX

**Pain Points Solved:**
- Clear task list replaces informal Airtable rows or email reminders
- Move completion workflow creates accountability and institutional memory

**Technical Comfort:** Low — must be intuitive; minimal training required

---

#### Persona 4: The Consulting Client (Org Admin at External Client Organization)
**Representative User:** Development Director at a yeshiva or small nonprofit that engages YCNP as a consultant

**Who They Are:** Similar to Persona 2 but without a pre-existing relationship with the platform. Being onboarded as an external client. May have limited technology experience and limited staff bandwidth.

**Goals:**
- Get up and running quickly with minimal friction
- Import their existing donor list and start tracking moves immediately
- Understand the methodology through intuitive software without needing Airtable training

**Key Needs:**
- Guided import flow (CSV upload with field mapping)
- Pre-configured global Move Ideas library to start with immediately
- Clear onboarding experience [TBD — formal onboarding flow not in Phase 1 scope]

**Pain Points Solved:**
- No longer needs Airtable expertise to use the methodology
- Reduces time from "engaged YCNP" to "actively tracking moves"

---

## 5. Desired Future State

### 5.1 Ideal Process — After the Product Is Built

**Organization Onboarding (New Client):**
1. Yaacov Cohen creates a new organization in the platform as Super Admin (< 5 minutes)
2. Organization Admin receives access credentials and logs in
3. Admin enters their Bloomerang API key in Settings → Integrations; system auto-syncs donor records and donation history at the individual constituent level
4. Admin configures the scoring engine: enables/disables checkbox fields, sets point values, defines donor tiers, sets moves-needed thresholds by score band
5. Admin invites solicitors via email; solicitors receive invite, complete signup, and see their assigned donors immediately
6. Admin optionally uploads a CSV of additional donor data (for organizations not yet on Bloomerang, or to supplement Bloomerang data)

**Daily Solicitor Workflow:**
1. Solicitor logs in via desktop browser and sees their dashboard: assigned donors ranked by score, pending moves, and moves due
2. Solicitor clicks a donor to view their profile: score breakdown, donation history, characteristics, and move history
3. Solicitor creates a move: selects a donor, picks from a Move Ideas library, sets a due date
4. Solicitor completes a move: logs completion notes and optionally creates a follow-up move in a single guided flow
5. Calendar view shows all upcoming moves in a timeline

**Admin Oversight:**
1. Admin views the dashboard: total donors, moves completed, pending moves, top solicitors leaderboard
2. Admin reviews solicitor performance via the top solicitors widget (ranked by average donor score)
3. Admin adjusts scoring or tier settings in real time; scores recalculate automatically
4. Admin triggers a Bloomerang re-sync to pull the latest donation data

**Super Admin Oversight:**
1. Yaacov Cohen logs in as Super Admin and manages the global Move Ideas library — adding, editing, and organizing ideas available to all organizations
2. Yaacov reviews in-app feedback submissions from all users across all organizations
3. Yaacov creates and manages client organization accounts

### 5.2 Key Data the System Must Capture and Provide

| Data Domain | Fields / Data Points Required |
|---|---|
| **Donor Records** | First name, last name, donor phone, donor email; capacity; score; tier; assigned solicitor; boolean characteristic fields (Parent, Grandparent, Alumni, Board Member, Community Builder, Program Attendee, Volunteer, Donor Advised Fund, Foundation/Trustee); all additional fields from Bloomerang/CSV import. *Note: Spouse/partner fields and household grouping fields are deferred to Phase 2.* |
| **Donor Scoring** | Total Score (calculated); individual field point contributions; tier assignment based on score |
| **Moves** | Move title; associated donor; associated solicitor (inherited from donor); due date; status (pending/completed); completion notes; follow-up move linkage; move idea reference; creation date |
| **Move Ideas** | Title; category; scope (global/organization-level); created by; created date |
| **Donations** | Transaction amount; date; constituent ID (from Bloomerang); total giving history per individual donor record |
| **Solicitors** | Name; email; assigned donors; invitation status; active/inactive |
| **Organization Settings** | Scoring field configurations (enabled/disabled, point values per field); donor tier definitions (name, score range); moves-needed thresholds by score band; Bloomerang API key. *Note: Data storage type selection (individual vs. household) is deferred to Phase 2.* |
| **Feedback Submissions** | Category (bug/feature request/question); title; description; attachment; submission date; submitting user |
| **Dashboard Metrics** | Number of donors; moves needed; total moves; moves completed; pending moves; top solicitors (by average donor score) |

---

## 6. Hypothesis

### 6.1 Pain Points Addressed

| Pain Point | How the Platform Addresses It |
|---|---|
| Manual, per-client Airtable setup taking 4–8 hours | Super Admin creates an org in minutes; scoring defaults are pre-configured; CSV import with field mapping replaces manual data entry |
| Fragile Zapier-based Bloomerang sync | Native Bloomerang API integration with on-demand re-sync built into Settings |
| No accountability for solicitor activity | Moves workflow with completion prompts, notes logging, and a solicitor leaderboard on the dashboard |
| Non-technical clients struggling with Airtable formulas | Intuitive UI with no formula knowledge required; scoring configured via UI sliders/inputs, not formulas |
| No centralized visibility for the consultant | Super Admin role with cross-organization access and a global feedback inbox |
| Household scoring complexity with Bloomerang's constituent/household ID split | Addressed in Phase 2; Phase 1 imports and manages all donors as individual constituent records only |

### 6.2 Goals Achieved

If the platform works as designed, within 90 days of Phase 1 launch:
- YCNP can onboard a new consulting client to the platform in under 30 minutes (vs. 4–8 hours today)
- TA solicitors will log moves digitally with full history and accountability, replacing informal Airtable rows
- Donation data will sync from Bloomerang automatically at the individual donor level, enabling real-time scoring without manual exports
- Yaacov Cohen will have a revenue-generating SaaS product to offer as an add-on to his consulting engagement

### 6.3 Potential Solutions Considered

| Alternative Considered | Why Rejected / Deferred |
|---|---|
| Continue using Airtable with better templates | Does not scale; requires Airtable expertise from clients; no native CRM integration; no structured user experience |
| Build on top of an existing nonprofit CRM | CRMs are donor record systems, not methodology execution tools; would require same custom development but with additional constraints |
| No-code platform (Bubble, Glide, etc.) | Insufficient control over data model and performance; cannot support multi-tenant architecture cleanly; AI enrichment Phase 2 requires full code control |
| Native mobile app (iOS/Android) | Higher cost and complexity; deferred to Phase 2+; desktop web browser covers the primary use cases for Phase 1 |
| Zapier/Make.com as the primary integration layer (all CRMs) | Adds dependency and per-client configuration burden; Bloomerang native integration provides better UX; Zapier/Make connector for other CRMs deferred to Phase 2 |
| Household-level data model in Phase 1 | Requires significant additional data modeling, UI, and Bloomerang API complexity (constituent ID vs. household ID mismatch); deferred to Phase 2 to avoid scope creep and ensure timely Phase 1 delivery |

---

## 7. Functional Requirements — Epics & User Stories

> **Conventions:**
> - Each Epic represents a major functional domain
> - User Stories follow the format: *"As a [role], I want to [action] so that [benefit]"*
> - Acceptance criteria are listed per story
> - Priority: **P1** = Must Have (Phase 1), **P2** = Should Have (Phase 1 if time allows), **P3** = Deferred to Phase 2+

---

### EPIC 1: User Authentication & Role Management

**Epic Goal:** Enable secure, role-based access to the platform for Super Admins, Organization Admins, and