# ResumeIQ — AI Resume Analyzer

ResumeIQ is a full-stack web app where users upload their resume (PDF/DOCX), paste a job
description, and get back an AI-generated **match score**, **ATS compatibility score**,
**skill gap analysis**, **strengths/weaknesses**, **actionable recommendations**, and an
**improved professional summary**.

The AI layer runs on a **local Llama model via [Ollama](https://ollama.com)** — completely
free, no API key, and your resume data never leaves your machine. If Ollama isn't running,
the app automatically falls back to a built-in keyword-based analyzer so it never breaks.

---

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, Axios, React Router
**Backend:** Node.js, Express, JWT auth, Multer (file uploads)
**Database:** MongoDB (Mongoose)
**AI:** Local Llama model via Ollama (`/api/generate`), with rule-based fallback
**Resume parsing:** `pdf-parse`, `mammoth`

---

## Project Structure

```
resumeiq/
├── backend/
│   ├── config/db.js              # MongoDB connection
│   ├── models/                   # User, Resume, Analysis schemas
│   ├── middleware/                # JWT auth, file upload (multer)
│   ├── controllers/               # auth, resume, analysis logic
│   ├── routes/                    # /api/auth, /api/resumes, /api/analysis
│   ├── services/
│   │   ├── resumeParser.js        # extracts text from PDF/DOCX
│   │   └── aiService.js           # calls local Llama (Ollama) + fallback
│   ├── uploads/                   # uploaded resume files
│   ├── server.js
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api/axios.js            # axios instance with JWT interceptor
    │   ├── context/AuthContext.jsx # login/register/logout state
    │   ├── components/             # Navbar, StatCard
    │   ├── pages/
    │   │   ├── Landing.jsx
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── UploadResume.jsx
    │   │   └── AnalysisResult.jsx
    │   ├── App.jsx
    │   └── main.jsx
    └── .env.example
```

---

## Setup

### 1. Prerequisites

- Node.js 18+ (needed for built-in `fetch`)
- MongoDB running locally or a MongoDB Atlas connection string
- (Optional but recommended) [Ollama](https://ollama.com) for real AI analysis

### 2. Set up the AI model (Ollama + Llama)

```bash
# Install Ollama from https://ollama.com, then:
ollama pull llama3
ollama serve   # usually starts automatically as a background service
```

That's it — the backend talks to Ollama at `http://localhost:11434` by default.
If you skip this step, the app still works using a built-in keyword-matching fallback.

### 3. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set MONGO_URI, JWT_SECRET, and Ollama settings if different
npm install
npm run dev      # starts on http://localhost:5000
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev      # starts on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## API Endpoints

| Method | Endpoint              | Description                          | Auth |
|--------|-----------------------|---------------------------------------|------|
| POST   | `/api/auth/register`  | Register a new user                    | No   |
| POST   | `/api/auth/login`     | Login and receive JWT                  | No   |
| GET    | `/api/auth/me`        | Get current user profile               | Yes  |
| POST   | `/api/resumes`        | Upload resume (form field: `resume`)   | Yes  |
| GET    | `/api/resumes`        | List user's uploaded resumes           | Yes  |
| GET    | `/api/resumes/:id`    | Get a single resume                    | Yes  |
| POST   | `/api/analysis`       | Run AI analysis on a resume vs job desc| Yes  |
| GET    | `/api/analysis`       | List user's past analyses              | Yes  |
| GET    | `/api/analysis/stats` | Dashboard statistics                   | Yes  |
| GET    | `/api/analysis/:id`   | Get a single analysis result           | Yes  |

---

## Future Improvements

- Admin dashboard (user management, AI usage/cost tracking)
- Email verification & password reset
- "Improve My Resume" rewrite mode (regenerate full sections)
- Job description analyzer (required vs nice-to-have skills)
- Cloud storage (S3/Cloudinary) for uploaded files
- Swagger/OpenAPI documentation
- Docker Compose for one-command setup

## Additions in this branch

The recent updates include:

- Google Cloud Storage (optional) support for resume uploads (set `GCS_BUCKET_NAME` and credentials).
- OpenAI integration and AI usage tracking (set `OPENAI_API_KEY`).
- Email verification flow using SMTP or Ethereal for local testing.
- Admin dashboard and Resume History UI in the frontend.
- Dockerfiles and `docker-compose.yml` for local development.

See `.env.example` for required environment variables and the `docker-compose.yml` for a local start.

## Deploy on Railway

Create three Railway services from this GitHub repository:

1. MongoDB database service.
2. Backend service with root directory `backend`.
3. Frontend service with root directory `frontend`.

Backend variables:

```bash
MONGO_URI=${{MongoDB.MONGO_URL}}
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
BACKEND_URL=https://your-backend-service.up.railway.app
PORT=5000
```

Frontend variables:

```bash
VITE_API_URL=https://your-backend-service.up.railway.app/api
```

After Railway gives the backend a public domain, update `BACKEND_URL` and the frontend
`VITE_API_URL`, then redeploy the frontend.

---

## License

MIT — feel free to use this project as a portfolio piece, customize it, and deploy it.
