# YZQ AI Interactive Learning Platform

AI-powered collaborative writing platform for language learning research (CUHK Language Processing Lab).

Students work through 3 rounds of AI-student collaborative story writing, with vocabulary annotation support and detailed interaction tracking.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env and add your OpenAI API key
```

## Configuration

Set `OPENAI_API_KEY` in `.env`:
```
OPENAI_API_KEY=sk-...
```

If the key is not set, the AI paragraph generation endpoint will return a friendly error message. Round 1 uses a hardcoded paragraph and works without an API key.

## Running

```bash
# Start the backend server (port 3001)
npm run server
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register` | Register student (class_name, name, student_id) |
| GET | `/api/session/:studentId` | Get or create learning session |
| GET | `/api/round/:sessionId/:round` | Get round data (AI paragraph, vocab, starter) |
| POST | `/api/generate-paragraph` | Generate AI paragraph via LLM |
| POST | `/api/writing/submit` | Submit student writing |
| POST | `/api/keystroke` | Log keystroke data |
| POST | `/api/hover` | Log word hover events |
| GET | `/api/export` | Export all research data as JSON |
| GET | `/health` | Server health check |

## Student Groups

Students are auto-assigned to 4 groups via round-robin:
1. Adaptive Repeating + L1 annotation
2. Adaptive Repeating + L2 annotation
3. No Repeating + L1 annotation
4. No Repeating + L2 annotation
