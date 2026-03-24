# GearShift Backend

> Vehicle diagnostics and service marketplace REST API built with Node.js, Express, and Supabase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (custom) + Supabase Auth (token exchange) |
| Validation | express-validator |
| Password Hashing | bcryptjs |

---

## Project Structure

```
backend/
├── server.js          # Entry point
├── config/            # App configuration (DB, passport, etc.)
├── models/            # Data models
├── routes/
│   ├── auth.js        # Login/register + Supabase token exchange
│   ├── users.js       # User profile endpoints
│   └── admin.js       # Admin-only endpoints
└── supabase/          # SQL schema/migrations + ERD
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- A [Supabase](https://supabase.com) project
- (Recommended) Supabase Service Role key for admin-only operations

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/naumaniqbal2005/GearShift-Backend.git
cd GearShift-Backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your values in .env

# 4. Start the dev server
npm run dev
```

The API will be available at **http://localhost:5000**.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the following:

```env
PORT=5000

SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

JWT_SECRET=your_jwt_secret_here

GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

FRONTEND_URL=http://localhost:3000
```

---

## Notes on keys

- `SUPABASE_ANON_KEY`: Required.
- `SUPABASE_SERVICE_ROLE_KEY`: Strongly recommended. Required for:
  - `POST /api/auth/supabase/exchange` (verifies Supabase access tokens server-side)
  - `POST /api/admin/users` (creates Supabase Auth users)
- `JWT_SECRET`: Used to sign backend JWTs returned by `/api/auth/login` and `/api/auth/supabase/exchange`.
- `GOOGLE_*`: Present for an optional Passport Google strategy, but **Google OAuth routes are not currently wired up in `server.js`** in this repo. If you need Google login, wire routes/middleware first (or rely on Supabase OAuth from the frontend).

---

## Database Setup (Supabase)

This backend expects a `users` table in Supabase. The repo includes SQL you can run in the Supabase SQL Editor:

- `supabase/0001_initial.sql`: creates the `users` table + indexes + RLS policies
- `supabase/0002_add_mechanic_role.sql`: ensures `mechanic` is allowed in the role constraint

### Apply schema

1. Open your Supabase project → **SQL Editor**
2. Run `backend/supabase/0001_initial.sql`
3. Run `backend/supabase/0002_add_mechanic_role.sql`

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Healthcheck |
| POST | `/api/auth/register` | Register a new user (email/password stored in `users` table) |
| POST | `/api/auth/login` | Login with email/password and receive backend JWT |
| POST | `/api/auth/supabase/exchange` | Exchange a Supabase access token for a backend JWT |
| GET | `/api/users/profile` | Get current user profile (Bearer token) |
| PUT | `/api/users/profile` | Update current user profile (Bearer token) |
| GET | `/api/admin/users` | List users (admin Bearer token) |
| PUT | `/api/admin/users/:userId/suspend` | Suspend user (admin) |
| PUT | `/api/admin/users/:userId/reactivate` | Reactivate user (admin) |
| PUT | `/api/admin/users/:userId/role` | Update role: `user|mechanic|admin` (admin) |
| DELETE | `/api/admin/users/:userId` | Delete user (admin) |
| POST | `/api/admin/users` | Create user (admin; creates Supabase Auth user too) |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server with nodemon (hot reload) |
| `npm start` | Start server in production mode |
| `npm test` | Run Jest tests |

---

## Auth Flow (important)

This codebase supports **two** ways to authenticate:

- **Email/password (backend-managed)**: `POST /api/auth/register` then `POST /api/auth/login` returns a backend JWT.
- **Supabase Auth (frontend-managed)**: frontend signs in with Supabase, then calls `POST /api/auth/supabase/exchange` with an `access_token` to receive a backend JWT used for `/api/users/*` and `/api/admin/*`.

---

## License

MIT — GearShift Team
