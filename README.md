# Gita Sarthi – Shri Krishna Vani

```
gita-sarthi/
├── frontend/     the app pages (index.html, gita.html, aarti.html, ...)
├── backend/      Spring Boot API (replaces n8n): /api/chat for text + voice
├── Dockerfile    builds backend + frontend into ONE server
└── render.yaml   one-click deploy settings for Render
```
The backend serves the frontend as the website, so one deployment runs everything
and the app calls `/api/chat` on its own address. Nothing to configure except your Gemini key.

## Deploy (about 10 minutes)
1. Get a Gemini API key: https://aistudio.google.com/apikey (keep it private).
2. Create an empty repo on github.com and upload everything from this folder.
3. On https://render.com: New + -> Blueprint -> pick your repo.
4. Paste your key when Render asks for GEMINI_API_KEY, then deploy.
5. Open the URL Render gives you. The app is live.

Free plan: the server sleeps after ~15 min idle, so the first message can take 30-60 s.

## Run on your computer
    cd backend
    export GEMINI_API_KEY="your-key"
    mvn spring-boot:run
    open http://localhost:8080

## Optional settings (Render -> Environment)
GEMINI_TTS_MODEL (voice model, if Google retires the default), GEMINI_TTS_VOICE (default Charon),
RATE_LIMIT_PER_MINUTE (default 20), GEMINI_CHAT_MODEL.

## Notes
- Where things are: frontend/index.html sets WEBHOOK_URL = "/api/chat" and FREE_LIMIT (paywall off).
  Backend code is in backend/src/main/java/com/krishnavani/gita, the Shri Krishna prompt in
  backend/src/main/resources/system-prompt.txt.
- Payment/subscribe is switched off; subscribe.html is unused.
- Never commit your API key. .gitignore already excludes .env.
