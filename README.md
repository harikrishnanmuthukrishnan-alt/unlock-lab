# UNLOCK Lab ✦

**Access what moves you forward.** A visually expressive, end-to-end campus resource-sharing demo with owner approvals, transparent allocation, condition tracking, and an auditable lifecycle.

> **Important hackathon compliance notice:** The event rules say submitted development must happen **during the official 48-hour build window**. This source package was created on request on **30 October 2026**. Do **not** falsely claim it was written during the event if that date is outside the official window. Verify the organiser's start time; use this as a disclosed preparation/reference artifact or rebuild the submitted implementation within the authorised period. Disclose any reused code, AI assistance, and pre-existing components.

## Start in 2 commands

Requires Node.js 20 or later. **No npm installation, API keys or database setup needed.**

```bash
cd unlock-lab
npm start
```

Open **http://localhost:3000**. Change the port with `PORT=4000 npm start` on macOS/Linux, or `set PORT=4000 && npm start` in Windows Command Prompt.

## Judge walkthrough — approximately 4–6 minutes

1. App starts as **Aarav Mehta** (student). Open **Explore resources** → **Prusa MK4 3D Printer** → **Request this resource**. Pick tomorrow, 10:00–12:00, and enter your use case.
2. Use the top-right profile switcher → **Mira Kapoor** (owner). Open **Owner command**. The new request appears in **FairQueue** with an explainable priority score. Click **Review** → **Approve**.
3. Switch back to **Aarav** → **My bookings**. Click **Check in**, enter the handover code **MK4-2048**, and record the starting condition, optionally uploading a photo.
4. Click **Submit return**, record final condition, optional photo and notes. For the damage demo choose **Damaged**.
5. Switch back to **Mira** → **Owner command** → **Confirm return**. If damage was recorded, an incident appears for separate human resolution.
6. Open **Audit activity** or the booking detail to inspect the history, decision reasons and before/after details.
7. To demonstrate competing requests, have **Diya Nair** reserve the same time and equipment while another booking is approved. Her request goes to **waitlisted**. Cancel the approved booking to promote the waiting request to **pending owner review**, never bypassing staff approval.
8. Switch to **Dr. Kiran Shah** (manager) → **Owner command** → **Reset demo data** to restore the fictional workspace for the next judge.

### Demo accounts (no passwords, explicitly for judging)

| Account | Role | Training |
|---|---|---|
| Aarav Mehta | Student | 3D print, camera, workspace |
| Diya Nair | Student | 3D print, workspace |
| Ishaan Rao | Student | Workspace only |
| Mira Kapoor | Owner | Lab coordinator; controls listed resources |
| Dr. Kiran Shah | Manager | Institution-wide reviews and demo reset |

Use the top-right **profile menu** to switch accounts. **Demo login is intentionally open and is not secure authentication.** All names are fictional.

## What works

- **Skill Passport review lifecycle:** students request training badges and authorised managers explicitly approve or reject with documented evidence and reasons.
- **Extension review:** approved borrowers request extra time; the owner records a human decision while scheduling conflicts and fair-use caps remain enforced.
- **Overdue alerts:** idempotent overdue check creates owner/student notifications and an auditable event without assigning automatic penalties. Campus time offset is configurable.
- **API hardening:** same-origin check (when Origin supplied), custom write-request header, JSON-only writes, security headers, SameSite cookies, atomic local data writes, and narrower handover code visibility; still a fictional open-role demo, **not secure authentication**.

- Resource catalogue, category filters, search, description, location, rules and training requirements
- Skill Passport eligibility gates enforced by server-side business rules
- Requests, owner decisions and review notes, with conflict detection
- FairQueue explanation based on previous 30-day resource usage and overall usage
- User fair-use limits: two outstanding requests per resource and six booked hours per rolling week
- Waitlist promotion to **pending review** after an approved booking is cancelled
- Code-validated check-in, optional before photo, condition report and custody record
- Check-out with optional after photo; owner confirms final return
- Automatic incident record on damage, manual incident filing and human resolutions
- In-app notifications and timestamped activity history
- Demo role switcher and API role checks, with privacy scoping of booking records
- Context-aware LabMate assistance: offline rules-based answers by default, optional OpenAI Responses API support
- Responsive interface, perspective effects, 3D CSS object/camera-like illustrations, tilt, orbit and motion; reduced-motion accessibility

## Project structure

```
unlock-lab/
├── server.js              # HTTP API, sessions, optional AI connection, file serving
├── logic.js               # Eligibility, scheduling, fairness and lifecycle rules
├── public/
│   ├── index.html         # Application shell
│   ├── styles.css         # UI system, responsive design, CSS 3D motion
│   ├── app.js             # Navigation, workflow screens and interactive forms
│   └── favicon.svg
├── data/                  # Auto-generated runtime JSON database (gitignored)
├── tests/
│   ├── journey.test.js    # Core lifecycle, fairness and access checks
│   └── advanced.test.js   # Training, extensions, overdue checks
├── docs/
│   ├── PROJECT_DOCUMENT.md
│   └── DEPLOYMENT.md
├── .env.example
└── package.json
```

## Test

```bash
npm test
```

The tests exercise the lifecycle, eligibility, priority overrides, waitlist recovery, permissions, damage resolution, resource creation, schedule limits, Skill Passport review, owner-approved time extensions and overdue notifications. For UI testing, follow the judge walkthrough above.

## Optional: connect LabMate to a real language model

The offline assistant works immediately, but is **not** a language model. To enable an optional model-backed assistant, set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` as **server-side environment variables**. Example:

```bash
OPENAI_API_KEY=your_key_here OPENAI_MODEL=gpt-4.1-mini npm start
```

**Never** commit a real API key to GitHub or expose it in front-end JavaScript. The server sends only the user's question, basic demo role/training flags and a simplified resource catalogue to the model. No uploaded condition photos are sent. The model can advise and explain, **but cannot approve, reject, verify or alter bookings**. All access decisions use deterministic server logic and human review. Without a key or if the provider is unavailable, a clear offline guide remains available.

## Security and deployment limitations

This is a **hackathon judge-demo prototype**, not an institution-ready access-control system. Judge accounts are deliberately passwordless and a user may freely switch identities. JSON storage is an atomically written local single-instance data store, not a production database. The audit log is recorded but not immutable or cryptographically signed. The handover code is visible to demo users and does not physically scan a QR code. Notifications are in-app, not email or SMS. Photos are stored inline in local JSON. Time-slot comparisons use the supplied date and 24-hour clock and lack full timezone/location scheduling. No real qualification documents are verified. No payment, deposits, staff calendar integration or actual facility unlock is performed.

**Before any real adoption:** implement approved institutional SSO/OAuth, server-side role provisioning, immutable or access-controlled audit logs, PostgreSQL transactions/constraints, secure object storage, signed time-limited QR codes, upload malware validation, actual privacy notices/retention policies, organisation-level tenancy, anti-spam controls, notification delivery, backups and accessibility evaluation. Use a durable disk/database on hosting; ephemeral containers reset demo changes.

## Credits and disclosure

- **Source:** Original prototype created with assistance from ChatGPT (AI-assisted design, JavaScript/CSS, server rules, documentation and tests).
- **Libraries:** No runtime npm libraries or external templates. Standard Node.js APIs. Optional Google Fonts (DM Sans, Space Grotesk) are loaded through a public stylesheet; system fonts remain usable offline.
- **AI integration:** Optional server-side OpenAI Responses API when a separately supplied secret key is configured. Otherwise LabMate uses deterministic answer rules and is disclosed as an offline guide.
- **Assets:** Custom CSS illustrations and inline SVG icons, no downloaded stock photos, no proprietary assets.
- **Data:** 100% fictional demo accounts, resources, transactions and conditions.

See `docs/PROJECT_DOCUMENT.md`, `docs/JUDGE_GUIDE.md`, `docs/SECURITY_AND_PRIVACY.md`, `docs/PRODUCTION_ARCHITECTURE.md`, `docs/TEAM_AND_DISCLOSURE.md`, and `docs/SUBMISSION_CHECKLIST.md` for the full judging package. GitHub Actions and Docker Compose files are included.

## Railway signup blocked? Publish to GitHub and deploy on Render

New Railway sign-ups were paused as of 30 October 2026 during incident recovery. The repository owner can use the included Windows helper `PUBLISH-TO-GITHUB-WINDOWS.bat` to push the source to the verified GitHub repository `harikrishnanmuthukrishnan-alt/unlock-lab`, then follow `docs/RENDER_DEPLOY.md` to deploy on Render. `render.yaml` provides an optional one-service Render Blueprint. The free hosting tier is **demo-only** and its ephemeral storage can discard booking records.
