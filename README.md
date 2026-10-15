# MyCampus — Your Event Journey

AI-powered campus event management app for HackShift 2026 (PS4).

## Features
- Extract event details and deadlines from announcements.
- Track milestones, deadlines, and event status.
- Sync updates across teammates using a six-character code.
- Dark UI with responsive layouts and subtle 3D effects.
- Open `index.html` directly for offline use.

## Run
Open `index.html`, or use Node.js:
```bash
npm install
npm start
```
Visit `http://localhost:3000`.

Run tests:
```bash
npm test
```

## Structure
- `index.html`, `styles.css` — interface and styling
- `app.js`, `parser.js` — app logic and event extraction
- `server.js` — API and WebSocket sync
- `test/smoke-test.js` — smoke tests

## API
`POST /api/parse` accepts `{ "text": "..." }` and returns structured event details and deadlines.

## Security
Validates registration URLs, escapes rendered text, limits server input to 50 KB, and supports client-side fallback.

## License
MIT. Built for HackShift 2026.
