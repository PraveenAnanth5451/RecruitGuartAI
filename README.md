# RecruitGuard AI

RecruitGuard AI is a full-stack web app for job-scam detection, application tracking, and interview preparation.

## Project Structure

```text
Grok-Recruit-Guard/
├── client/                 # Frontend (React + Vite)
│   └── src/
├── server/                 # Backend API (Express + TypeScript)
├── shared/                 # Shared route + schema contracts
├── docs/
│   └── requirements.md     # Product and feature requirements
├── script/                 # Utility scripts (build, llm checks, pdf extraction helper)
├── docker-compose.yml      # Local Postgres service
├── package.json
└── README.md
```

## Prerequisites

- Node.js 20+
- npm
- Optional: Docker Desktop (for PostgreSQL)
- Optional for advanced PDF extraction helper: Python 3 + pip packages

## Setup From Zip (Start to End)

1. Extract the zip file.
2. Open terminal in project root:
   `Grok-Recruit-Guard`
3. Install dependencies:
   `npm install`
4. Create environment file:
   copy `.env.example` to `.env`
5. Add required values in `.env`:
   `DATABASE_URL=...`
   `SESSION_SECRET=...`
   `GROQ_API_KEY=...`
   `GEMINI_API_KEY=...`
   `GROK_API_KEY=...`
6. Start PostgreSQL (optional but recommended):
   `docker compose up -d`
7. Push DB schema:
   `npm run db:push`
8. Start app:
   `npm run dev`
9. Open:
   `http://localhost:5000`

## Optional Python PDF Helper

If you want to run the standalone PDF extractor helper in `script/extract_pdf_text.py`:

1. Install Python dependencies:
   `pip install pypdf pillow pdf2image pytesseract`
2. Run:
   `python script/extract_pdf_text.py --file path/to/file.pdf`

## Health Checks

- Type check: `npm run check`
- LLM connectivity check: `npm run check:llm`
