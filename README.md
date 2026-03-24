# GearShift Backend

> Vehicle diagnostics and service marketplace REST API built with Node.js, Express, and Supabase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + Passport.js (Local & Google OAuth2) |
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
│   ├── auth.js        # Login, register, Google OAuth
│   ├── users.js       # User profile endpoints
│   └── admin.js       # Admin-only endpoints
└── supabase/          # Supabase client setup
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- A [Supabase](https://supabase.com) project
- Google OAuth credentials (optional, for Google login)

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

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login with email & password |
| GET | `/auth/google` | Initiate Google OAuth login |
| GET | `/auth/google/callback` | Google OAuth callback |
| GET | `/users/profile` | Get current user profile |
| GET | `/admin/*` | Admin-only routes |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server with nodemon (hot reload) |
| `npm start` | Start server in production mode |
| `npm test` | Run Jest tests |

---

## License

MIT — GearShift Team
