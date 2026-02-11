# Swadesh AI Backend

This is the backend service for the Swadesh AI Customer Support Agent.

## Prerequisites

- **Node.js** (v18+)
- **PostgreSQL** (Active database server)
- **Groq API Key** (For LLM processing)

---

## 🚀 Setup Guide

### 1. Database Setup (PostgreSQL)

You need a running PostgreSQL instance. Choose ONE of the methods below:

#### Option A: Docker (Recommended)
If you have Docker installed, run this command to start a Postgres container:

```bash
docker run --name swadesh-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```
- **Port:** 5432
- **Username:** `postgres`
- **Password:** `postgres`
- **Database Name:** `postgres` (default)
- **Connection String:** `postgresql://postgres:postgres@localhost:5432/postgres`

#### Option B: Local Installation (pgAdmin / Postgres.app)
 2. Open pgAdmin or your terminal.
 3. Create a new database named `swadesh_db` (or whatever you prefer).
 4. Note down your username and password.

Example Connection String: `postgresql://your_user:your_password@localhost:5432/swadesh_db`

---

### 2. Environment Configuration

1. Copy the example environment file (or create `.env`):
   ```bash
   cp .env.example .env
   ```
   *(If `.env.example` doesn't exist, create a `.env` file manually)*

2. Edit `.env` and add the following keys:

   ```env
   # Database Connection (Adjust based on your setup above)
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

   # AI Gateway (Groq API Key)
   # Get a key from https://console.groq.com/keys
   AI_GATEWAY_API_KEY="gsk_..."
   ```

---

### 3. Install Dependencies & Push Schema

Install the required packages and set up the database schema.

```bash
npm install

# Push the Drizzle schema to your database
npm run db:push
```

---

### 4. Seed the Database

Populate the database with test data (Users, Orders, Payments).

```bash
npm run db:seed
```

**What this does:**
- Clears existing data.
- Creates test users (e.g., Default User ID: `00000000-0000-0000-0000-000000000000`).
- Creates sample orders and payments for testing.

---

### 5. Start the Server

Run the backend in development mode:

```bash
npm run dev
```

The server will start on **http://localhost:3000**.

---

## 🛠️ Common Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server |
| `npm run db:push` | Push schema changes to DB |
| `npm run db:seed` | Reset & seed database with test data |
| `npm run build` | Build for production |
| `npm start` | Start production server |

## 🧪 Testing the API

You can test the chat endpoint using `curl`:

```bash
curl -X POST http://localhost:3000/api/chat \
-H "Content-Type: application/json" \
-H "X-User-Id: 00000000-0000-0000-0000-000000000000" \
-d '{ "messages": [{ "role": "user", "content": "Where is my order?" }] }'
```
