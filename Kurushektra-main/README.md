# Congnicode — Coding-First Adaptive Learning & Assessment Platform

> "Don't just write code. Prove you understand it."

Congnicode is a responsive developer-first coding assessment and adaptive learning platform. It implements a closed cognitive verification loop:

$$\text{Assess} \longrightarrow \text{Diagnose} \longrightarrow \text{Teach} \longrightarrow \text{Practise} \longrightarrow \text{Verify} \longrightarrow \text{Update Mastery}$$

---

## 🎨 Design System

Faithfully implemented from the finalized Stitch designs (`projects/2126851672512481585` — Congnicode Mobile Coding Platform). The design aesthetic is inspired by Visual Studio Code's dark theme:

- **Background & Canvas**: `#111111` / `#131313`
- **Main Surfaces**: `#1B1B1B` / `#181C24`
- **Elevated Panels**: `#242424` / `#20201F`
- **Borders & Dividers**: `#383838` / `#444748`
- **Primary Typography**: `#FFFFFF` / `#E5E2E1` (Geist / Plus Jakarta Sans)
- **Monospace Telemetry**: `#C4C7C8` (JetBrains Mono)
- **Accents**:
  - Success / Invariant Verified: `#6FDD78` / `#10B981`
  - Warning / Edge-Case Alert: `#F59E0B`
  - Error / Failed Assertion: `#EF4444`
  - Active Info: `#38BDF8`

---

## 🗺️ Complete Inventory of All 22 Routes

### Public and Authentication
1. **Landing Page** — `/`
2. **Sign In** — `/login`
3. **Sign Up** — `/signup`
4. **Password Recovery** — `/forgot-password`
5. **Learner Onboarding** — `/onboarding`

### Learner Workspace & Loop
6. **Learner Dashboard** — `/dashboard` (Bento layout, active session, metrics)
7. **Challenge Explorer** — `/challenges` (Data table, filter by tag & difficulty)
8. **Challenge Detail** — `/challenges/:id` (Problem statement, examples, constraints)
9. **Coding Workspace** — `/workspace/:challengeId` (Monaco Editor, test assertions, AST analysis, mobile tabs)
10. **Submission Results** — `/submissions/:id` (Test cases diff, AST findings, CTA to Understanding Assessment)
11. **Understanding Assessment** — `/assessment/:submissionId` ("Prove you understand it" conceptual validation)
12. **Learning Gap & Remediation** — `/learn/gap/:id` (Diagnostic root-cause walkthrough, resources)
13. **Practice & Verification** — `/practice/:activityId` (Targeted drills, immediate feedback, mastery upgrade)
14. **Mastery & Learning Path** — `/mastery` (Cognitive taxonomy tree, skill confidence levels)
15. **Submission History** — `/history` (Searchable/filterable table & responsive mobile cards)
16. **Learner Report** — `/reports/me` (Performance analytics, activity charts, growth areas)
17. **Profile & Settings** — `/settings` (User identity, editor preferences, persona switcher)

### Teacher Console
18. **Teacher Dashboard** — `/teacher/dashboard` (Cohort telemetry, submissions needing review, cohort gaps)
19. **Learner Assessment Review** — `/teacher/learners/:id` (Individual student dossier, review decision form)
20. **Assessment & Challenge Management** — `/teacher/assessments` (Author challenges, rubric constraints)

### Admin Console
21. **User & Role Management** — `/admin/users` (User list, role assignment, status toggling, invite modal)
22. **Platform Configuration & Health** — `/admin/settings` (Service health checks, runner parameters, quotas)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Linting
```bash
npm run lint
```

---

## 🎭 Persona Switcher (Testing & Review)

To effortlessly evaluate all 3 user roles (Learner, Teacher, Admin), open **`/settings`** in the application. An interactive persona switcher is built directly into the page:
- **Learner**: Alex Chen (`u1`) — Full access to the learning loop and challenges
- **Teacher**: Dr. Sarah Kim (`u2`) — Faculty dashboard, review controls, challenge authoring
- **Admin**: System Admin (`u3`) — Access control, user management, platform health

---

## 🔒 Trust & Execution Transparency

In accordance with Congnicode's assessment integrity guidelines:
- Every simulated local run clearly displays a **SIMULATED DEMO RESULT** badge.
- Live execution badges are strictly reserved for verified remote runner responses.
- AI telemetry findings and integrity flags are surfaced as neutral diagnostic indicators rather than definitive accusations.
