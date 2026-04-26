# CloneMe

CloneMe is a full-stack AI video app where users upload a reference photo and a driving video, then receive an AI-animated output video using Moore-AnimateAnyone.

## Tech Stack

- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: Next.js API Routes
- Database/Auth/Storage: Supabase
- GPU Inference: Modal.com (Python, serverless GPU)
- AI Model: Moore-AnimateAnyone
- Deployment: Vercel + Modal

## Project Structure

```text
cloneme/
├── app/
│   ├── page.tsx
│   ├── generate/page.tsx
│   ├── dashboard/page.tsx
│   ├── api/
│   │   ├── generate/route.ts
│   │   ├── live-frame/route.ts
│   │   ├── live-reference/route.ts
│   │   ├── jobs/[jobId]/route.ts
│   │   └── webhook/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── FileUpload.tsx
│   ├── LiveWebcam.tsx
│   ├── ProgressBar.tsx
│   ├── VideoResult.tsx
│   └── JobTable.tsx
├── lib/
│   ├── supabase.ts
│   └── types.ts
├── modal_backend/
│   ├── app.py
│   └── .env
├── supabase/
│   └── schema.sql
├── .env.local
├── package.json
└── README.md
```

## Setup Instructions

1. Clone the repo and install dependencies.

```bash
npm install
```

2. Create a Supabase project.

3. Run SQL schema from `supabase/schema.sql` in Supabase SQL Editor.

4. Create Supabase Storage buckets:
- `uploads` (public: false)
- `results` (public: true)

5. Fill `.env.local` with values from Supabase and your deployed URLs:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MODAL_API_URL=your_modal_endpoint_url
NEXT_PUBLIC_APP_URL=https://your-vercel-url.vercel.app
```

6. Install and configure Modal locally.

```bash
pip install modal
modal setup
```

7. Add Modal secrets for Supabase service credentials.

```bash
modal secret create cloneme-secrets SUPABASE_URL=... SUPABASE_SERVICE_KEY=...
```

8. Deploy Modal backend.

```bash
modal deploy modal_backend/app.py
```

9. Copy the Modal endpoint URL and set it as `MODAL_API_URL` in `.env.local`.

10. Run app locally.

```bash
npm run dev
```

11. Deploy frontend on Vercel.
- Push repository to GitHub.
- Import project in Vercel.
- Add the same environment variables used in `.env.local`.
- Deploy.

## Supabase Table Details

`jobs` fields:
- `id` uuid primary key
- `user_id` references `auth.users(id)`
- `status` pending | processing | done | failed
- `photo_url` uploaded photo path
- `video_url` uploaded video path
- `result_url` public result video URL
- `created_at` timestamp
- `updated_at` timestamp

## API Endpoints

- `POST /api/generate`
  - Auth required via bearer token
  - Uploads photo/video to Supabase storage
  - Creates `jobs` row
  - Dispatches inference request to Modal
  - Returns `{ jobId }`

- `GET /api/jobs/[jobId]`
  - Auth required via bearer token
  - Returns `{ status, result_url, created_at }` for the owner

- `POST /api/live-reference`
  - Auth required via bearer token
  - Uploads one live reference photo to private storage
  - Returns a short-lived signed URL for live processing

- `POST /api/live-frame`
  - Receives one webcam frame + reference URL
  - Forwards frame to Modal `/live-frame`
  - Returns processed JPEG frame

- `POST /api/webhook`
  - Called by Modal
  - Updates job to `done` + `result_url` or to `failed`

## Notes

- `/generate` polls `GET /api/jobs/[jobId]` every 3 seconds until the job is done or failed.
- Live Webcam mode is near-real-time and does face swap only, with around 0.5-2s delay.
- Upload mode remains the high-quality full body reenactment path and takes around 2-5 minutes.
- `/dashboard` uses Supabase magic link auth and RLS-safe job history queries.
- The app uses a dark-only design system with Syne and DM Sans.
