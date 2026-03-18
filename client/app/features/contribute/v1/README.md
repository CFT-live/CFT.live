text
# CFT.live Contribution System - Complete Design Document

## 📋 Project Overview

This document captures the complete design process and final specification for **CFT.live's open-source contribution system** - a decentralized, token-incentivized platform for rewarding all types of project contributions (technical development, marketing, community building, etc.).

---

## 🎯 Initial Requirements

**Goal**: Design a contribution system where:
- All project tasks are handled through the system (development, marketing, planning)
- Contributors earn points (CFT tokens) for their work
- Points are concentrated and valuable
- System ensures fairness and transparency
- Only actual contributions are rewarded
- All rewards are transparent

---

## 💬 Design Discovery Process

### Question 1: Primary Goal
**Q**: What is the primary goal of the contribution system?

**A**: 
- **Grow the platform** → gain more users and revenue
- Points = **native CFT token** (actual tokenized rewards)
- **DAO-like structure** to decentralize development, build community, and bootstrap costs
- Accept all contributor types (freelancers, long-term team, one-time contributors)

### Question 2: Anti-Gaming Mechanisms
**Q**: Do you want review/approval mechanism or automatic rewards?

**A**: 
- **Review/approval required** for each task
- **Single approval sufficient** (v1.0)
- **Any core team member** can approve

### Question 3: Task Creation
**Q**: Who can create tasks?

**A**: 
- **Only core team members** can create tasks initially
- Open to better approaches if suggested

### Question 4: Point Scaling
**Q**: Fixed or flexible pricing per task?

**A**: 
- **Flexible per-ticket pricing** based on task complexity

### Question 5: Transparency Tracking
**Q**: How to track and display contribution history?

**A**: 
- **All visible** (contributions, CP amounts, approvers, dates)
- **Main logic off-chain** (in-app database)
- **Only transaction hashes on-chain** as receipts

### Question 6: Blockchain & Timeline
**Q**: What blockchain and launch timeline?

**A**: 
- **Arbitrum network** for CFT token
- **Launch ASAP** after completion

### Question 7: Reward Distribution Method
**Q**: Automatic, manual, or batched token transfers?

**A**: 
- **Manually initiated by approver** (core team member)

### Question 8: Contribution Limits
**Q**: Any limits on tasks per contributor?

**A**: 
- **No limits** on contributions

### Question 9: Dispute Resolution
**Q**: How to handle disputes on rejections or point values?

**A**: 
- **Feature-based reward model proposed**:
  - Features have fixed CFT budgets (e.g., 10,000 CFT)
  - Contributors earn **Contribution Points (CP)** per task
  - When feature completes: tokens distributed proportionally by CP%
  - Example: 100 CP out of 1,000 total = 10% of feature tokens

### Question 10: CP Assignment
**Q**: How to assign and track CP for different work types?

**A**: 
- **Admins grant CP** based on best-effort fairness
- **Transparent written guidelines** for CP awards

### Question 11: Real-time CP Visibility
**Q**: Should CP be visible in real-time or only after feature completion?

**A**: 
- **Everything open by default** - real-time visibility

### Question 12: Abandoned Work
**Q**: What if contributor stops mid-feature?

**A**: 
- **CP is kept** once earned
- **Revocation only for malicious code** (extremely rare exception)

### Question 13: Vesting Period
**Q**: Immediate distribution or vesting?

**A**: 
- **Immediate distribution** initially
- Vesting can be added later if needed (for retention/stability)

### Question 14: Token Supply & Allocation
**Q**: How many CFT tokens and what allocation?

**A**: 
- **Unlimited supply** (or absurdly large)
- **Tokens minted on-demand** when features complete
- **100% to contributors** - no treasury/team allocation

### Question 15: Minimum CP Threshold
**Q**: Should there be a minimum CP to claim rewards?

**A**: 
- **No minimum** - all contributions rewarded

### Question 16: Multi-person Reviews
**Q**: How to handle multiple reviewers?

**A**: 
- **Final approval grants CP** (e.g., when PR is reviewed and merged)

### Question 17: Non-technical Contributions
**Q**: How to handle marketing/community tasks?

**A**: 
- **Same CP system** - should work with proper feature planning

### Question 18: Platform/Interface
**Q**: Where will the system be built?

**A**: 
- **Separate subpage in CFT.live** application
- Own backend system with API and database
- **GitHub integration**

### Question 19: Community Proposals
**Q**: Can contributors propose tasks?

**A**: 
- **v1.0: Core team only** creates features/tasks
- Can enable proposals via meta-tasks (e.g., "Make a proposal for new smart contract logic")

### Question 20: Transparency Metrics
**Q**: What data should be publicly tracked?

**A**: 
- CP is **task-specific only** (no need for aggregate tracking)
- Store to **compare CP between similar tasks** for fairness
- **Total tokens per feature** is public and locked at creation

### Question 21: Approval Attribution
**Q**: Should approver identity be tracked?

**A**: 
- **Yes, everything transparent** by default

### Question 22: Contributor Profile
**Q**: How are contributors identified?

**A**: 
- **Web3 wallet authentication**
- Profile fetched from backend database by wallet address

---

## 🏗️ Final System Design

### Core Architecture

**Entity Hierarchy**:
Contributors (wallet-based identity)
↓
Features (fixed CFT token budgets)
↓
Tasks (within features)
↓
Contributions (CP awards)
↓
FeatureDistribution (final token payouts)

text

### User Roles

| Role | Permissions |
|------|-------------|
| **Contributors** | View all, claim tasks, submit work, see real-time CP |
| **Core Team** | Create features/tasks, approve contributions, assign CP, distribute tokens |

### Data Flow

Core Team creates FEATURE
└─ Sets fixed CFT token budget (e.g., 10,000 CFT)

Core Team creates TASKS within feature
└─ Each task has clear acceptance criteria

Contributor claims task → submits work
└─ Links GitHub PR or uploads deliverable

Core Team reviews → approves → assigns CP
└─ CP visible to all contributors on that feature

Feature marked complete
└─ Total CP calculated across all contributions

Token distribution (proportional)
└─ (Contributor CP ÷ Total CP) × Feature Token Pool
└─ Manual transfer to Arbitrum wallet
└─ Transaction hash stored as receipt

text

### Database Schema (Simplified)

Contributors
├── wallet_address (unique identifier)
├── username, email, github_username, profile_image
├── is_core_team, core_team_role
├── total_tokens_earned, total_tasks_completed
└── created_date, last_active_date

Features
├── name, description, category
├── total_tokens_reward (fixed, locked at creation)
├── status (Open → In Progress → Completed)
├── created_by_id, discussion_url
└── [has many Tasks]

Tasks
├── feature_id, name, description, task_type
├── acceptance_criteria, status
├── claimed_by_id, created_by_id
└── [has many Contributions]

Contributions
├── task_id, contributor_id
├── submitted_work_url, submission_notes
├── cp_awarded, approver_id, approval_date
└── status (Submitted, Approved, Rejected)

FeatureDistribution
├── feature_id, contributor_id
├── cp_amount, token_amount
├── arbitrum_tx_hash, distribution_date
└── approver_id

text

### CP Award Guidelines

**Published transparency standards**:

| Contribution Type | CP Range | Examples |
|-------------------|----------|----------|
| Code Implementation | 50-200 | Smart contracts, features |
| Code Review/Testing | 30-100 | PR reviews, QA |
| Documentation/Blog | 30-80 | Guides, articles |
| Discussion/Proposals | 5-30 | Ideas, feedback |
| Marketing/Community | 20-60 | Social media, moderation |

**Core Rule**: Similar tasks receive similar CP amounts.

### Web3 Authentication Flow

User connects Arbitrum wallet (MetaMask/WalletConnect)

AppKit starts a SIWE sign-in flow for the connected wallet (no gas cost)

Next.js issues a short-lived nonce cookie and verifies the signed SIWE message

Next.js stores an authenticated session cookie containing the verified wallet address and chain id

Protected Next.js Edge `/api/**` routes read the session cookie and derive the actor wallet address

Edge routes proxy to the backend API (API Gateway) using a server-side API key

Contributor profile is created/fetched using the authenticated wallet address

text

### Token Distribution Example

Feature: "Smart Contract Audit" → 10,000 CFT budget

Contributions:
├── Alice: 400 CP (reviewed 8 contracts, submitted fixes)
├── Bob: 350 CP (implemented tests, documentation)
└── Charlie: 250 CP (discussions, minor fixes)

Total CP: 1,000

Distribution:
├── Alice: (400/1000) × 10,000 = 4,000 CFT
├── Bob: (350/1000) × 10,000 = 3,500 CFT
└── Charlie: (250/1000) × 10,000 = 2,500 CFT

Each receives Arbitrum transaction → hash stored publicly

text

---

## 🎯 Key Design Principles

### ✅ What This Enables

- **Fair reward distribution** through CP-based proportional allocation
- **Collaboration encouraged** - multiple contributors per feature pool
- **Quality over quantity** - higher CP for meaningful work
- **Full transparency** - all approvals, CP, transactions public
- **Decentralized development** - community can contribute to growth
- **No gaming** - fixed feature budgets prevent task inflation

### ❌ What This Prevents

- **Task gaming** - can't create unlimited small tasks
- **Free-riding** - all work tracked and rewarded proportionally
- **Sybil attacks** - core team approval required
- **Hidden decisions** - approver identity always public
- **Unfair distributions** - CP guidelines ensure consistency

---

## 🚀 Implementation Phases

### v1.0 MVP (Launch ASAP)
- Core team task creation only
- Single approval per contribution
- Proportional CP-based distribution
- Real-time transparency dashboard
- GitHub integration for code tasks
- Arbitrum token transfers
- Immediate distribution (no vesting)

### v2.0 Future Enhancements
- Community task proposals
- Multi-signature approvals
- Contributor reputation system
- Optional vesting periods
- DAO governance voting
- Automated task assignment

---

## 📊 Success Metrics

**Track to measure system health**:
✓ Contributors per month (growth)
✓ Feature completion velocity
✓ CP consistency across similar tasks (fairness indicator)
✓ Token distribution per contributor
✓ Dispute/appeal rate (<5% target)
✓ Return contributor rate (retention)

text

---

## 🌐 Public Transparency Requirements

**Everything visible by default**:

**Feature Dashboard**:
Feature: "Marketing Campaign Q1" | 15,000 CFT | Status: 60% complete
Contributors: Alice (250 CP) | Bob (180 CP) | Charlie (100 CP)
Tasks: 8/12 completed

text

**Contribution History**:
Task: "Write Spanish blog post"
Contributor: Alice
CP Awarded: 80 CP
Approved by: Bob
Date: 2026-01-26
GitHub PR: #456
Notes: "Excellent content, SEO optimized"

text

**Distribution Record**:
Feature: "Marketing Campaign Q1" | Completed: 2026-02-20
Total CP: 1,500 | Total Tokens: 15,000 CFT

Alice: 250 CP (16.7%) → 2,505 CFT | Tx: 0xabc123...
Bob: 180 CP (12.0%) → 1,800 CFT | Tx: 0xdef456...
Charlie: 100 CP (6.7%) → 1,005 CFT | Tx: 0xghi789...

text

---

## 🔧 Technical Integration

### API Endpoints (High-level)
POST /api/features # List all features
POST /api/features/create # Create feature (core team)
POST /api/features/update # Update feature status (core team)

POST /api/tasks # List tasks
POST /api/tasks/claim # Claim/unclaim a task (signed)
POST /api/contributions/submit # Submit work (signed)
POST /api/contributions/approve # Approve + award CP (core team)

POST /api/distributions # List payout ledger rows
POST /api/distributions/create # Create payout ledger row (core team)
POST /api/distributions/update # Update tx hash/status on ledger row (core team)

text

### Frontend Requirements
- Wallet connection (MetaMask/WalletConnect)
- Real-time CP leaderboards per feature
- Public contribution history
- Token distribution records with Arbitrum tx links
- Core team admin UI (create, approve, distribute)
- Mobile-responsive design

### Smart Contract Integration
- CFT token on Arbitrum
- Mint function (unlimited supply)
- Transfer function for distributions
- Event logs for transparency

---

## ⚖️ Edge Cases & Rules

| Scenario | Policy |
|----------|--------|
| Contributor abandons task mid-feature | Keeps earned CP, task reassigned |
| Minimum CP to receive tokens | None - all CP rewarded |
| Maximum tasks per contributor | None - unlimited |
| CP revocation | Only for proven malicious code (rare) |
| Dispute resolution | Core team discussion, appeal process |
| Similar task different CP | Should match within guidelines |
| Failed Arbitrum transaction | Retry until confirmed |

---

## 📄 Required Documentation

1. **CP Guidelines** - Transparent standards for fair awards
2. **Code of Conduct** - Expected contributor behavior
3. **Dispute Resolution Process** - Appeal mechanism
4. **Task Creation Guide** - How to write good acceptance criteria
5. **Contributor Onboarding** - Wallet setup, first task walkthrough

---

## 💰 Tokenomics Summary

✓ Unlimited CFT supply (mint on-demand)
✓ 100% tokens → contributors (no team/treasury allocation)
✓ Fixed budgets per feature (locked at creation)
✓ Proportional distribution by CP%
✓ Immediate distribution (no vesting v1.0)
✓ Arbitrum network (low gas fees)

text

---

## 🎉 Design Outcome

**This conversation produced**:
- Complete system architecture
- User role definitions
- Data flow and database schema
- CP award guidelines
- Transparency requirements
- Token distribution model
- Edge case handling
- Implementation roadmap

**Key Innovation**: **Feature-based proportional rewards** naturally prevent gaming while encouraging collaboration and ensuring fairness.

---

**Status**: ✅ Design Complete | Ready for Implementation  
**Target Network**: Arbitrum  
**Built for**: CFT.live Prediction Markets Platform

---

*This document captures the complete iterative design process from initial requirements through 22 clarifying questions to final comprehensive system specification.*