# Duitnya — Personal Finance

Stack: Next.js App Router, shadcn/ui, Prisma, SQLite (dev)

## Setup
1. Salin `.env.example` → `.env` lalu sesuaikan.
2. Install: `npm i`
3. Prisma: `npx prisma migrate dev && npx prisma generate`
4. Run: `npm run dev`

## Scripts
- `npm run dev` — jalankan dev server
- `npx prisma studio` — UI DB

## Catatan
- Dev DB: `prisma/dev.db` (diabaikan dari git)
- Commit `prisma/schema.prisma` & `prisma/migrations/**`
