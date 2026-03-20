# NextPlay Tasks

A modern Kanban-style todo app built with **Next.js (App Router)** and **Supabase**.

## Features

- Authenticated Kanban board (CRUD + drag & drop)
- Daily Tasks with a timer, coins rewards, and streaks
- Task comments (add + delete your own)
- Global activity history modal
- Tailwind CSS + shadcn/ui components

## Local setup


### 1 Copy `.env.example` to `.env` (or `.env.local`) and fill in:

//Link will be included in the pdf submission. I Do not want to expose the Url and the Key to the project on Github
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

### 2  Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` – start dev server
- `npm run lint` – ESLint
- `npm run typecheck` – TypeScript checks
- `npm run build` – production build

