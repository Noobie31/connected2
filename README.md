
# ConnectED 📱

> **A WhatsApp-style messaging PWA for universities** — pre-configured one-on-one communication between students and teachers, authenticated via institutional email.

---

## What is ConnectED?

ConnectED is a **Progressive Web App (PWA)** that brings direct, real-time messaging between students and their teachers — without the noise of group chats, social media, or external platforms. Every conversation is pre-authorized: students only see teachers from their enrolled courses, and teachers only see their own students. No account creation. No password setup friction. Just email → magic link → chat.

---

## Live Demo

> Deployed on **Vercel** · Backend on **Supabase**

---

## Key Features

- 🔐 **Email-based magic link authentication** — no passwords required on first login
- 💬 **Real-time one-on-one messaging** — WhatsApp-style UI with live updates via Supabase Realtime
- 🎓 **Role-aware routing** — students and teachers land on separate dashboards automatically
- 📋 **Coordinator panel** — admins manage student-course and teacher-course mappings through a built-in UI
- 📱 **PWA-ready** — installable on iOS and Android, works offline-first
- 🔒 **Pre-authorized contacts** — users can only message people within their course scope

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Next.js 15)               │
│                                                     │
│  /login  →  /auth/callback  →  /student or /teacher │
│                    ↓                                │
│           /dm/[conversation_id]                     │
│                    ↓                                │
│           /coordinator  (admin panel)               │
└────────────────────┬────────────────────────────────┘
                     │ Supabase JS Client
                     │ (REST + Realtime WebSocket)
┌────────────────────▼────────────────────────────────┐
│                  SUPABASE (Backend)                  │
│                                                     │
│  Auth         →  magic link + password              │
│  Database     →  PostgreSQL (4 tables)              │
│  Realtime     →  WebSocket subscriptions            │
│  RLS          →  Row-Level Security policies        │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema

```
student_course                  course_teacher
──────────────────────          ──────────────────────────
id          UUID  PK            id            UUID  PK
roll_no     TEXT                course_code   TEXT
name        TEXT                teacher_name  TEXT
email       TEXT                teacher_email TEXT
course_code TEXT
       │                               │
       └──────────────┬────────────────┘
                      │  matched by course_code
                      ▼
              conversations
              ──────────────────────
              id            UUID  PK
              participant1  TEXT  (email)
              participant2  TEXT  (email)
              created_at    TIMESTAMPTZ

                      │
                      ▼
              messages
              ──────────────────────
              id               UUID  PK
              conversation_id  UUID  FK → conversations
              sender           TEXT  (email)
              content          TEXT
              created_at       TIMESTAMPTZ
```

---

## Authentication Flow

```
User enters email
      │
      ├─ Not in DB? ──────────────────→ /error  (Access Denied)
      │
      ├─ In DB, first login? ─────────→ Magic Link Email
      │                                      │
      │                               /auth/callback
      │                                      │
      │                               Set password → role metadata saved
      │
      └─ In DB, returning? ───────────→ /password (enter password)
                                              │
                                        role check
                                        │         │
                                   /teacher   /student
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Backend / Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Magic Link + Password) |
| Real-time | Supabase Realtime (WebSocket) |
| Deployment | Vercel |
| PWA | next-pwa |
| Icons | Lucide React |

---

## Project Structure

```
connectedpwa/
├── app/
│   ├── page.js                  # Redirects to /login
│   ├── login/page.js            # Email entry + auth flow
│   ├── password/page.js         # Password login for returning users
│   ├── passrst/page.js          # First-time password setup
│   ├── auth/callback/page.js    # Post-magic-link handler + role router
│   ├── student/page.js          # Student dashboard (teacher list)
│   ├── teacher/page.js          # Teacher dashboard (student list)
│   ├── dm/[conversation_id]/    # Real-time chat page
│   │   └── page.js
│   ├── coordinator/page.js      # Admin panel (manage DB mappings)
│   ├── check-email/page.js      # "Check your inbox" screen
│   └── error/page.js            # Access denied page
├── lib/
│   └── supabase.js              # Supabase client singleton
├── context/
│   └── AuthContext.js           # Global auth state
├── components/
│   └── BackButtonHandler.js     # PWA back navigation
├── public/
│   ├── manifest.json            # PWA manifest
│   └── icons/                   # App icons (192, 512, apple-touch)
└── .env.local                   # Supabase keys (not committed)
```

---

## How Conversations Work

1. Student opens their dashboard — sees only teachers from their enrolled courses
2. Student taps a teacher → app checks if a conversation already exists
3. If yes → opens existing thread. If no → creates new `conversations` row
4. Both users land on the same `/dm/[id]` page
5. Messages insert into `messages` table → Supabase Realtime pushes to the other participant instantly via WebSocket
6. UI is optimistic — your message appears immediately, then confirms once DB write succeeds

---

## Coordinator Panel

The `/coordinator` route is an internal admin tool. It provides a spreadsheet-style UI to:

- Add / edit / delete student → course mappings
- Add / edit / delete teacher → course mappings
- All changes sync directly to Supabase via upsert

This is how the coordinator pre-configures who can talk to whom before the semester begins.

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Dev mode (bypasses magic link, uses password auth directly)
NEXT_PUBLIC_DUMMY_AUTH=false
NEXT_PUBLIC_DEV_PASSWORD=devpass
```

---

## Getting Started

```bash
# Clone
git clone https://github.com/Noobie31/connected2.git
cd connectedpwa

# Install
npm install

# Add environment variables
cp .env.example .env.local
# fill in your Supabase keys

# Run
npm run dev
```

---

## Design Philosophy

ConnectED is intentionally minimal. Unlike platforms that try to do everything, it solves one problem: **a student should be able to reach their teacher, and a teacher should be able to reach their student — instantly, on any device, with zero friction.**

The coordinator pre-loads all relationships before the semester. Users just enter their institutional email and they're in.

---

## Built by

**Noobie31** · [github.com/Noobie31/connected2](https://github.com/Noobie31/connected2)