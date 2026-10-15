# 🚀 MyCampus — Your Event Journey
### AI-Powered Campus Event Management Web Application
**Built for HackShift Hackathon (Problem Statement 4)**

[![Smoke Tests](https://img.shields.io/badge/Smoke%20Tests-Passing-success)](file:///c:/Users/Sourang_official/OneDrive/Documents/My%20Campas/test/smoke-test.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero-Setup](https://img.shields.io/badge/Direct%20Open-index.html-indigo.svg)](index.html)

---

## 🌟 1. Overview & Vision

College students navigate a chaotic deluge of campus event notices: raw WhatsApp forwards, Instagram posters, club emails, and unformatted PDF announcements. Crucial submission deadlines, abstract dates, and registration links are constantly missed.

**MyCampus** solves this by turning messy, unstructured event announcements into **structured, real-time collaborative event timelines**:
1. **✨ Magic Add Bar:** Paste raw event text or drag an event notice directly into the top bar (`Paste event text or drag poster screenshot.`) and click **Analyze**.
2. **📊 Visual Milestone Tracks:** Horizontal progress bars for each event (`Reg` &rarr; `Idea` &rarr; `Sub`) with active progress filled in deep burgundy (`#8E162C`). Click any milestone tick to advance progress!
3. **👥 Team Sync:** Collaborate with teammates using a 6-character code (`AVATAR`). Changes synchronize across connected devices and browser windows in real time.
4. **🎨 Wireframe-Faithful Design:** Left sidebar with `Home`, `My Events`, and `Timelines` navigation, top search & profile badge (`UN`), and light/dark theme switch toggle in the bottom left.
5. **⚡ Zero Build / Direct Open:** Simply double-click [`index.html`](file:///c:/Users/Sourang_official/OneDrive/Documents/My%20Campas/index.html) to open directly in any browser!

---

## ⚡ 2. Quickstart & Local Setup (Under 2 Minutes)

You can run **MyCampus** in two ways:

### Option A: Direct Open in Browser (No Server Required!)
Simply double-click [`index.html`](file:///c:/Users/Sourang_official/OneDrive/Documents/My%20Campas/index.html) or open it in Google Chrome, Microsoft Edge, Firefox, or Safari:
- Works 100% offline and standalone.
- Client-side deterministic rule-based parser extracts event data immediately.
- Cross-tab/cross-window synchronization works in real-time via `BroadcastChannel` and `localStorage`!
- Ideal for **GitHub Pages** hosting or quick offline presentations.

---

### Option B: Node.js Server Mode (With WebSocket Relay & API)
For multi-device network synchronization and optional LLM API integration:

```bash
# 1. Install lightweight dependencies
npm install

# 2. Start the application
npm start
```

The application opens at:
👉 **`http://localhost:3000`**

To run the automated smoke tests:
```bash
npm test
```

---

## 🎯 3. How to Demonstrate the 4 Core Features

### Feature 1 — Magic Add (AI & Fallback Parsing)
1. In the dashboard, click the prominent **✨ Magic Add** button (or press `M`).
2. Click any of the one-click sample buttons at the top:
   - **WhatsApp Hackathon:** Extracts title, venue, registration URL, and 4 distinct milestones (Abstract, Shortlist, Submission, Start).
   - **Workshop Poster:** Extracts venue, Google Forms link, and RSVP deadline.
   - **Paper Notice:** Extracts symposium details and deadlines.
3. Click **Magic Extract**.
4. The structured preview appears immediately. You can review, edit fields, add/remove deadlines, and click **Save Event**.

### Feature 2 — Event Timeline & Status Workflow
1. The dashboard automatically calculates the **Next Upcoming Deadline** across all your events and displays it in the summary statistics.
2. Inside each event card:
   - The next deadline is prominently highlighted with an urgent badge (`⚡ [In X days]`).
   - Past deadlines are automatically struck through (`~~line-through~~`) and dimmed.
3. Click the status badge (`Upcoming`, `Registered`, `Submitted`, `Done`) to cycle through event lifecycle stages.
4. Toggle between **Grid View** (3D tilt cards) and **Timeline View** (chronological glowing spine).

### Feature 3 — Real-Time Team Synchronization
1. Open the application in Window 1 and click **Create New Team** (e.g. Code: `HACK99`).
2. Open an Incognito window or second browser tab in Window 2.
3. On the landing screen, enter `HACK99` in the 6-character code input and click **Join Team**.
4. Add an event or change a status in Window 1: **Window 2 updates in real time without refreshing!**
5. Both tabs display live peer connection indicators (`● Synced (2 online)`).

### Feature 4 — Landing & Team Access
- Zero password / authentication friction.
- Generates clean 6-character codes (excluding ambiguous letters like `0`, `O`, `1`, `I`).
- Automatically remembers your active team in `localStorage` for 1-click session resumption.

---

## 🎨 4. Design System & Palette Documentation

The interface uses a tailored dark canvas palette engineered for legibility, depth, and hackathon presentation impact:

| Token | Hex / Value | Purpose |
| :--- | :--- | :--- |
| `--bg-deep` | `#080C14` | Atmospheric deep canvas background |
| `--bg-main` | `#0E1626` | Workspace base |
| `--bg-surface` | `#172236` | Card backgrounds and modal dialogs |
| `--bg-surface-hover` | `#1E2C44` | Interactive hover elevation |
| `--brand-primary` | `#6366F1` | Electric Indigo (Primary brand actions) |
| `--brand-cyan` | `#06B6D4` | Cyan accent for highlights and active badges |
| `--brand-purple` | `#8B5CF6` | Secondary gradient accent |
| `--status-upcoming` | `#F59E0B` | Amber / Gold indicator |
| `--status-registered` | `#10B981` | Emerald Green (Confirmed registration) |
| `--status-submitted` | `#A855F7` | Purple (Project or abstract submitted) |
| `--status-done` | `#64748B` | Slate Gray (Completed milestones) |
| `--urgent-color` | `#F43F5E` | Rose / Crimson pulse for next upcoming deadline |

### 3D Touch & Interactions
- **Dynamic Pointer Tilt:** Event cards compute pointer offset relative to card center and apply perspective rotations up to `6deg` with responsive dynamic specular lighting (`--mouse-x`, `--mouse-y`).
- **Tactile Depression:** Buttons depress by `1px` to `2px` on click with scale `0.98`.
- **Reduced-Motion Compliant:** Strictly respects `@media (prefers-reduced-motion: reduce)` by disabling tilt and transitions.
- **Touch-Device Friendly:** Disables pointer tilt on mobile and touch devices while preserving fluid touch feedback.

---

## 🛠️ 5. Technical Architecture

```
My Campus/
├── index.html            # Standalone, zero-build client interface (Direct openable!)
├── styles.css            # Responsive layout, color tokens, 3D tilt, and timeline CSS
├── app.js                # Core frontend engine: sync, parser fallback, state & DOM
├── parser.js             # Shared deterministic parser (dates, venues, URLs, milestones)
├── server.js             # Node.js Express server + WebSocket synchronization relay
├── test/
│   └── smoke-test.js     # Automated tests for /api/parse & two-client real-time sync
├── package.json          # Dependency definitions and npm scripts
├── .env.example          # Environment configuration documentation
└── README.md             # Complete documentation and demonstration guide
```

### API Specification
- **`POST /api/parse`**
  - **Body:** `{ "text": "raw campus announcement..." }`
  - **Response:**
    ```json
    {
      "success": true,
      "event": {
        "title": "HACKSHIFT 2026",
        "description": "36-hour national campus hackathon...",
        "venue": "Campus Auditorium & Innovation Hub",
        "registrationUrl": "https://hackshift2026.dev/register",
        "deadlines": [
          {
            "label": "Abstract Submission",
            "date": "2026-10-18T23:59:00.000Z",
            "rawDate": "18 Oct 2026, 11:59 PM"
          }
        ]
      },
      "parserMode": "deterministic"
    }
    ```

---

## 🔒 6. Security & Reliability
- **Sanitized URLs:** All registration links are verified through `URL` constructor to only allow `http:` and `https:`, blocking `javascript:` XSS vectors.
- **Framework-Native Text Rendering:** Event titles and descriptions are injected via strict HTML entity escaping (`escapeHtml`).
- **Input Bounds:** Server enforces 50KB limits on incoming text to prevent payload overflow.
- **Graceful Offline Fallback:** If server or internet connectivity drops, the client-side parser takes over immediately with zero downtime.

---

## 🧪 7. Smoke Test Verification

Execute the automated test suite with:
```bash
npm test
```
**Test Results:**
- `[PASS]` Server boots on designated port.
- `[PASS]` `/api/parse` extracts structured milestones, venues, URLs, and titles.
- `[PASS]` Client 1 and Client 2 establish WebSocket connections, join team `SYNC99`, and broadcast event updates in real time.

---

## 📄 License
MIT License. Built for **HackShift 2026 (PS4)**.
