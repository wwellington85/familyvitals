# FamilyVitals MVP

FamilyVitals is a full-stack health hub MVP built with:
- Next.js (TypeScript, App Router)
- Tailwind + shadcn-style UI components + Recharts
- Supabase (Postgres + Auth + Storage)
- FastAPI PDF extraction microservice

## Features Implemented

- Profile-centric data model with family access roles (`owner`, `editor`, `viewer`)
- Mobile-first responsive layout and PWA baseline (manifest + service worker)
- Private PDF upload to Supabase Storage (`health_docs`)
- Extraction workflow (`uploaded -> extracting -> extracted/reviewed/error`)
- Editable extracted observations with confidence indicators
- Manual vitals entry + charts
- Medication timeline with event history and active/inactive status
- Doctor Snapshot generation with:
  - expiring share token
  - private snapshot PDF stored in Supabase Storage
  - public read-only `/share/[token]` page with token+expiry validation
- AI insights endpoint (`/api/ai/insights`) that stores timeline cards
- Non-diagnostic disclaimer displayed anywhere AI appears:
  - `This is not medical advice and not a diagnosis.`

## Project Structure

- `app/` Next.js pages + API routes
- `components/` UI + feature components
- `lib/` Supabase clients, auth helpers, snapshot utilities
- `supabase/migrations/` SQL schema + RLS + storage policies
- `services/extractor/` FastAPI extraction service (`/extract`)

## Environment Variables

### Next.js (`.env.local`)

Use `.env.example` as reference:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FASTAPI_EXTRACTOR_URL` (default `http://localhost:8000`)
- `SNAPSHOT_LINK_TTL_HOURS` (default `168` = 7 days)

### FastAPI (`services/extractor/.env`)

Use `services/extractor/.env.example`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase Setup

1. Create a Supabase project.
2. Run the SQL migration in `supabase/migrations/202602250001_init_family_vitals.sql`.
3. Confirm bucket `health_docs` exists and is private.
4. In Auth settings, enable email/password sign-in.

## Local Development

### 1) Next.js app

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

PWA note:
- `public/sw.js` provides a simple offline cache strategy for shell routes.
- `app/manifest.ts` defines install metadata.
- Replace placeholder icons in `public/icons/` with real 192x192 and 512x512 brand icons.

### 2) FastAPI extractor

```bash
cd services/extractor
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Or Docker:

```bash
cd services/extractor
docker build -t familyvitals-extractor .
docker run --rm -p 8000:8000 --env-file .env familyvitals-extractor
```

## End-to-End Flow

1. Login at `/login`.
2. Create/select a profile in `/profiles`.
3. Upload labs at `/profiles/[id]/documents`.
4. Extraction service writes observations + confidence.
5. Review/edit at `/profiles/[id]/documents/[docId]/review` and approve.
6. Add manual vitals at `/profiles/[id]/vitals/add`.
7. View trend charts at `/profiles/[id]/vitals`.
8. Manage medication lifecycle at `/profiles/[id]/meds`.
9. Generate doctor snapshot at `/profiles/[id]/share`.
10. Share read-only token page at `/share/[token]`.

## Security Model

- RLS enabled on all app tables.
- Access to profile data requires membership in `profile_access`.
- `owner/editor`: can mutate documents, observations, meds, vitals, insights.
- `viewer`: read-only.
- `owner` only: manage `profile_access` and create snapshots.
- Storage bucket is private; file access via signed URLs only.
- Public share page only resolves a single tokenized snapshot and expiry.

## API Notes

- `POST /api/ai/insights` stores generated insight cards on timeline.
- Insights are non-diagnostic and do not modify observations.
- FastAPI endpoint: `POST /extract` payload:
  - `document_id`
  - `signed_pdf_url`

## Deployment Notes

- Set all env vars in hosting platform for Next.js.
- Deploy FastAPI service separately and point `FASTAPI_EXTRACTOR_URL` to it.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
