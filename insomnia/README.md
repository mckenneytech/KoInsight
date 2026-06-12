# Insomnia collection

`koinsight.insomnia.json` is an [Insomnia](https://insomnia.rest/) collection (export format v4)
for exercising the KoInsight backend locally.

## Import

Insomnia → **Create / Import** → **File** → select `koinsight.insomnia.json`.

## Environment variables

Edit the **Base Environment** after import:

| Var        | Default       | Notes |
|------------|---------------|-------|
| `host`     | `localhost`   | |
| `port`     | `3001`        | Standalone server (`cd apps/server && npm run dev`). Use `3000` if you run the full stack with `npm run dev` from the root. |
| `username` | `reader1`     | Seeded KoSync test user. |
| `password` | `password123` | Seeded password for all test users. |
| `book_md5` | sample md5    | Replace with a real md5 from `GET /api/books`. |
| `book_id`  | `1`           | Replace with a real id from `GET /api/books`. |

## Folders

- **Goals (new feature)** — `/api/goals` requests for the reading-goals feature.
  These 404 until the `goals-router` is implemented and mounted in `app.ts`.
- **Stats**, **Books**, **Devices**, **KoSync**, **AI**, **Open Library**, **KoPlugin**,
  **Upload** — existing API surface, mirrors the `bruno/` collection.

## Quick start

```bash
# from repo root
npm install
npm run -w server knex migrate:latest
npm run seed
cd apps/server && npm run dev   # serves on :3001
```

Then run **Books → Get all books** to confirm connectivity and grab a real `book_id` / `book_md5`.
