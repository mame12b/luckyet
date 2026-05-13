# LuckyET 🎰

Quantum-randomized lottery platform for Ethiopian & Eritrean diaspora.

## Architecture

```
luckyet/
├── server/     # Express + MongoDB API
├── client/     # Player web app (React + Vite + Tailwind)
├── admin/      # Admin & Streamer dashboard (React + Vite + Tailwind)
└── docs/       # Architecture, API, security docs
```

## Tech Stack

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, Zod
**Frontend:** React 18, Vite, Tailwind CSS, React Router, Axios, Zustand
**Quantum RNG:** ANU Quantum Random Numbers API
**External:** Cloudinary (uploads), AfroMessage (SMS), Resend (email)

## Quick Start

```bash
# Backend
cd server
npm install
cp .env.example .env  # fill in values
npm run dev

# Player app (new terminal)
cd client
npm install
npm run dev

# Admin app (new terminal)
cd admin
npm install
npm run dev
```

- Server: http://localhost:5000
- Player app: http://localhost:5173
- Admin app: http://localhost:5174

## Phases

- ✅ Phase 1 — Foundation (auth, schemas, scaffold)
- ⏳ Phase 2 — Core lottery + affiliate codes
- ⏳ Phase 3 — Quantum RNG + winner selection
- ⏳ Phase 4 — Dashboards + hardening
- ⏳ Phase 5 — i18n + launch readiness

## Roles

- `player` — buys tickets
- `streamer` — has promo code, earns commission
- `admin` — verifies payments, manages draws
- `super_admin` — manages everything

## ⚠ Legal

Lottery operation requires NLA licensing. This codebase is the technical platform — legal compliance is your responsibility.