# Project Charter: YC Nonprofit Consulting LLC – Move Your Donors Web Application

**Document Version:** 1.6
**Date Prepared:** June 2025
**Prepared By:** QuitCode Delivery Team
**Status:** Active – Phase 1 Development

---

## Executive Summary

YC Nonprofit Consulting LLC (YCNP), led by Yaacov Cohen, has engaged QuitCode to design and develop a purpose-built, web-based fundraising management platform tentatively referred to internally as **"Move Your Donors."** The platform is a greenfield (new build) SaaS application targeting nonprofit organizations — primarily yeshivas, day schools, and small-to-mid-size nonprofits — that currently manage major donor cultivation and moves management through manual tools such as Airtable and spreadsheets.

The application will centralize donor scoring, moves management, solicitor assignment, campaign tracking, and CRM integration (starting with Bloomerang) into a single, structured, and user-friendly platform. Yaacov Cohen, as Product Owner and the eventual platform operator, intends to offer this tool as a productized service to his consulting clients, with his own organization — Talmudical Academy of Baltimore (TA) — serving as the first pilot user.

The project is currently in active Phase 1 development, with internal beta testing targeted for the near term and external client rollout to follow upon validation.

---

## Project Sponsor & Stakeholders

| Role | Name | Organization | Contact / Notes |
|---|---|---|---|
| **Sponsor / Product Owner** | Yaacov Cohen | YC Nonprofit Consulting LLC / Talmudical Academy of Baltimore | ycnpconsulting@gmail.com / (443) 204-1822 (WhatsApp) |
| **Delivery Manager** | Roman Sydorak | QuitCode | Oversees delivery, client communication, and technical planning |
| **Project Manager** | Ivan Solomchak | QuitCode | Manages day-to-day execution, facilitates demos, and coordinates between client and development team |
| **Developer(s)** | [TBD] | QuitCode | Responsible for all technical implementation |
| **End Users – Pilot** | Yaacov Cohen's internal team (TA staff, solicitors, assistants) | Talmudical Academy of Baltimore | First beta cohort |
| **End Users – External** | YCNP consulting clients | Various nonprofits & yeshivas | Secondary rollout after pilot validation |
| **Super Admin** | Yaacov Cohen | YCNP | Controls global platform settings, move idea library, scoring defaults |

> **[TO BE CONFIRMED]:** Formal contractual sponsor entity (YCNP LLC vs. Talmudical Academy of Baltimore) and billing/invoicing point of contact.

---

## Business Case

### The Problem

Nonprofit fundraising professionals, particularly those managing major donor relationships, currently lack a dedicated, accessible tool for systematic donor cultivation. Yaacov Cohen's consulting methodology — Moves Management — involves scoring donors, assigning solicitors, tracking outreach "moves," and measuring progress toward fundraising goals. This process is currently delivered to clients via manually configured Airtable bases, which:

- Require significant setup time per client
- Demand Airtable familiarity that most clients lack
- Cannot be easily scaled or maintained across a growing client base
- Lack native CRM integrations, requiring fragile Zapier workarounds
- Provide no centralized visibility for administrators or cross-organization analytics

### The Opportunity

By productizing his methodology into a standalone SaaS platform, Yaacov Cohen can:

- Deliver a consistent, repeatable tool to his 100+ consulting client organizations
- Reduce onboarding friction and manual setup time per client
- Introduce a scalable, subscription-based revenue stream via the platform
- Differentiate YCNP's consulting offering with proprietary software
- Lay the groundwork for future AI-powered donor enrichment and intelligence features

### Supporting Evidence

YCNP's methodology has been validated internally at Talmudical Academy of Baltimore, yielding:
- **79% increase** in total annual fundraising
- **55% increase** in average gift size
- **149% increase** in major donor count
- **98% increase** in giving by major donors

These results — achieved with no additional staff — demonstrate strong product-market fit for a scalable toolset.

---

## Project Goals & Objectives

| # | Goal | Measurable Outcome |
|---|---|---|
| 1 | Build a functional Phase 1 MVP of the Move Your Donors platform | All Phase 1 scope items delivered, tested, and deployed |
| 2 | Successfully migrate Talmudical Academy pilot data into the platform | Donors, donations, and historical moves imported from Airtable and Bloomerang without data loss |
| 3 | Onboard and validate with internal TA team | At least the TA solicitor team actively using the platform within 1–2 weeks of release |
| 4 | Establish a stable, configurable scoring engine | Admins can configure scoring field point values and enable/disable fields per organization |
| 5 | Enable Bloomerang CRM integration | Donor records and donations sync via Bloomerang API; other CRMs addressed via Phase 2 Zapier/Make connector |
| 6 | Support household-level donor management | Platform correctly groups individual donors into households for scoring and reporting |
| 7 | Support multi-tenant, multi-organization architecture | Each consulting client operates in an isolated organizational environment with their own data and settings |

---

## Scope

### In Scope — Phase 1

**Donor Management**
- Donor record display with all key fields (name, relationships, capacity, characteristics)
- Import of donor data via CSV upload with field mapping
- All donor fields importable (not just manual entry); full field set sourced from CSV and Bloomerang import structures — **[TBD: complete field list to be confirmed with Product Owner based on Airtable schema and Bloomerang export headers]**
- Column visibility toggling and reordering by users
- Household support: grouping individual donor records into household units with toggle view for combined scoring and donations
- Household fields: spouse/partner first name, last name, phone, email
- Donor-level scoring view

**Scoring Engine**

The scoring engine calculates a **Total Score** per donor by combining points contributed from two distinct categories of input fields:

1. **Boolean (Yes/No) Checkbox Fields** — Each field represents a donor characteristic that, when marked as "Yes," contributes a configurable number of points to the donor's total score. These fields are admin-configurable per organization (enable/disable and point value).

   Checkbox scoring fields included in Phase 1:
   - Parent
   - Grandparent
   - Alumni
   - Board Member
   - Community Builder
   - Program Attendee
   - Volunteer
   - Donor Advised Fund
   - Foundation / Trustee

2. **Numeric Fields** — Certain donor fields are numeric in nature (e.g., donation amounts, giving history, capacity estimates) and contribute to the score through formula-based calculations rather than simple Yes/No logic. The specific numeric fields and their scoring formulas are **[TBD — to be confirmed with Product Owner and cross-referenced against the existing Airtable scoring formula].**

Additional scoring engine characteristics:
- Each organization's admin can configure point values for checkbox fields and enable/disable individual scoring fields
- **Custom label renaming of scoring fields: deferred to Phase 2**
- **Single score type in Phase 1: Total Score only**
- Monetary/Financial Capacity Score (separate calculated score): **deferred to Phase 2**
- Donor tier configuration (e.g., major donor thresholds) with customizable tier names and ranges
- Display of donor scores in sortable table

**Moves Management**
- Create, view, edit, and complete moves (outreach actions)
- Move creation from: Dashboard, Donor Profile page, Moves section
- Assign moves to donors; move inherits the donor's assigned solicitor
- Move ideas library (global, Super Admin managed; organization-level, admin/solicitor managed)
- On move completion: prompt to log completion notes and optionally create a follow-up move
- Calendar view of moves; click-to-open move detail from calendar
- Moves display order as specified by Product Owner

**Solicitor Management**
- Solicitor invitation via email (sign-up flow)
- Assign solicitors to donors during CSV import (field mapping)
- Solicitor-level data visibility rules: by default, solicitors see only their own assigned donors and moves
- Admin toggle: allow solicitors to view all organization-level data (peer visibility)
- Top solicitors leaderboard on dashboard (based on average donor score)

**Dashboard**
- Summary statistics: Number of Donors, Moves Needed, Total Moves, Moves Completed, Pending Moves
- Configurable dashboard stat labels
- Task/move timeline diagram
- Top solicitors widget

**CRM Integration — Bloomerang (Phase 1)**
- Connect via Bloomerang API key (stored in organization settings)
- Import/sync donor records and donation transaction history from Bloomerang
- Map Bloomerang fields to platform fields during import
- Support for both constituent-level and household-level Bloomerang data structures
- Refresh/re-sync capability from settings

**Organization Settings**
- Scoring field configuration (enable/disable, point values per checkbox field)
- Donor tier configuration
- Moves-needed thresholds by score band (e.g., score >60 = 8 moves/year)
- Data storage type selection: individual-based vs. household-based CRM structure

**User Roles & Permissions**
- Super Admin (Yaacov Cohen / YCNP): global platform settings, move idea library, organization management
- Organization Admin: organization-level settings, full data visibility, user management
- Solicitor: assigned donor and move access only (default); optionally expanded by admin

**Feedback & Support**
- In-app feedback submission (category: bug, feature request, question)
- Feedback inbox with title, description, attachment, and date for Super Admin

**Email & Notifications**
- Solicitor invitation emails sent from YCNP's no-reply domain email (`noreply@ycnpconsulting.com`)
- System notification emails via authorized YCNP Google Workspace account

**Data Migration (One-Time, Pilot)**
- One-time migration of existing moves and donor data from Talmudical Academy's Airtable base into the platform

**Mobile Responsiveness**
- UI optimized for mobile browser use (not a native app)

---

### Out of Scope — Phase 1 (Deferred to Phase 2 or Later)

| Item | Notes |
|---|---|
| Native mobile application (iOS/Android) | Web-responsive only in Phase 1 |
| CRM integrations beyond Bloomerang | Zapier/Make.com connector architecture to be explored in Phase 2 |
| AI-powered donor enrichment | Reading full donor records, notes, and interaction history for AI insights — Phase 2+ |
| Full Bloomerang record pull (notes, interaction history, all fields) | Currently ~20 fields; expanded pull deferred |
| Custom scoring field label renaming | Deferred to Phase 2; checkbox fields will use fixed default names in Phase 1 |
| Monetary / Financial Capacity Score (separate score) | Discussed and confirmed as Phase 2 item; only Total Score delivered in Phase 1 |
| Custom additional scoring fields (beyond default checkbox set) | Up to 5 custom fields discussed for Phase 2 |
| Capital campaign tracking module | Referenced on YCNP website; not in current build scope |
| Crowdfunding/campaign strategy tools | Referenced on YCNP website; not in current build scope |
| Maximum score display widget | Discussed and removed from scope by Product Owner |
| Automated Zapier/Make connector for third-party CRMs | Research in progress; implementation Phase 2 |
| Multi-language support | [TBD] |
| Billing / subscription management portal | [TBD — referenced but not scoped] |

---

## Key Deliverables

| # | Deliverable | Description |
|---|---|---|
| D1 | Deployed Phase 1 Web Application | Fully functional platform hosted and accessible to users |
| D2 | Bloomerang API Integration | Live sync of donor and donation data from Bloomerang |
| D3 | Scoring Engine with Admin Configuration | Configurable scoring system per organization — combining boolean checkbox fields and numeric donor fields into a single Total Score; admins can enable/disable individual checkbox fields and set point values per field |
| D4 | Moves Management Module | Full create/assign/complete/follow-up move workflow |
| D5 | Household Donor Support | Household grouping, toggle view, combined scoring |
| D6 | Solicitor Onboarding Flow | Invitation email, signup, role assignment |
| D7 | Data Migration — Talmudical Academy | Historical moves and donor data migrated from Airtable |
| D8 | Admin Settings Panel | Scoring checkbox field configuration, tiers, moves thresholds, visibility controls |
| D9 | Mobile-Responsive UI | Application usable on mobile browsers |
| D10 | In-App Feedback System | Users can submit feedback; Super Admin can review |
| D11 | Super Admin Move Ideas Library | Global move ideas manageable by YCNP Super Admin |

---

## High-Level Timeline

> **Note:** Dates below are reconstructed from call transcripts and are approximate. Exact dates should be confirmed with the project team.

| Milestone | Target Date | Status / Notes |
|---|---|---|
| Phase 1 Development Scope Finalized | Completed | Confirmed across demos #4–#6 |
| Scoring Engine Implemented | Completed | Confirmed in Demo #4 |
| Moves Management Core Features Built | Completed | Confirmed in Demo #4–#5 |
| Bloomerang API Integration (initial) | Completed | API key storage and import working |
| Solicitor Visibility Rules Implemented | Completed | Confirmed in Demo #5 |
| Remaining Phase 1 Bug Fixes & Features | ~1 week from Demo #5 | Estimated 10–15 bugs plus calendar subscription (~10–15 hrs) |
| Internal Beta Release — TA Team | ~April 15–16, 2025 (estimated) | Per Demo #4 discussion |
| Airtable → Platform Data Migration (TA) | Post-internal beta | One-time operation; access to Airtable confirmed |
| Solicitor Onboarding (TA Team) | Concurrent with beta | Invitation emails to be sent |
| External Client Beta (1–2 additional clients) | 1–2 weeks post internal beta | Yaacov to identify first external client |
| Household Feature Completion | [TBD] | Logic email to be sent to Yaacov mid-week; may add 1–2 days |
| Phase 2 Planning & Scope Definition | [TBD] | Post Phase 1 validation |
| Phase 2 Development Begins | [TBD] | Includes Zapier/Make connectors, scoring label customization, Monetary Score, AI enrichment |

> **[TO BE CONFIRMED]:** Formal go-live date for external client rollout; Phase 2 start date and scope commitment.

---

## Budget & Resources

### Team Composition

| Role | Name | Organization |
|---|---|---|
| Product Owner | Yaacov Cohen | YCNP / Talmudical Academy |
| Delivery Manager | Roman Sydorak | QuitCode |
| Project Manager | Ivan Solomchak | QuitCode |
| Developer(s) | [TBD] | QuitCode |
| QA / Testing | [TBD — appears informal/internal] | QuitCode |
| Pilot End Users | TA Development Team + Solicitors | Talmudical Academy of Baltimore |

### Budget

> **[TBD — TO BE CONFIRMED]:** No development cost figures were referenced in the provided source documents. The following are known and estimated infrastructure cost drivers:

| Cost Item | Amount | Frequency | Notes |
|---|---|---|---|
| Software development (QuitCode engagement) | [TBD] | [TBD] | Retainer or fixed-price; not referenced in source documents |
| **Supabase Pro Plan** | **$25.00** | **Monthly** | Database and backend infrastructure; confirmed by Product Owner |
| Google Workspace (noreply email) | Low / existing | Monthly | Used for solicitor invitation and system notification emails |
| Bloomerang API access | Existing client account | — | No additional licensing cost anticipated for Phase 1 |
| Zapier / Make.com connector | [TBD] | Monthly | Phase 2 