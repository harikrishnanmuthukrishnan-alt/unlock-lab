# Judges: UNLOCK Lab — hands-on walkthrough

> **Demo sandbox only.** All names and resources are fictional. No personal data, real devices or facilities are controlled. Passwordless role switching is intentional for demonstration, not a production account system.

## Prerequisites

- Open the deployed demo link supplied by the team, or run `npm start` in this folder with Node.js 20+ and open `http://localhost:3000`.
- All accounts are available via the top-right profile menu; **no password or signup needed**.
- If this is a previously used demo, select **Dr. Kiran Shah → Owner command → Reset demo data**.
- The app needs no payment account, API key or external API to complete the core lifecycle.

## Story A — full resource transaction (4–6 minutes)

1. **Aarav Mehta (student):** Explore resources → Prusa MK4 3D Printer → Request access. Select tomorrow (use a clear future slot), 10:00–12:00, and enter a reason such as `Capstone project enclosure prototype`.
2. **Mira Kapoor (owner):** Owner command → FairQueue → Review → Approve. Inspect the published priority explanation and the owner’s decision reason.
3. **Aarav:** My bookings → Check in. Enter the judge-demo handover code `MK4-2048`, choose starting condition, add notes and optionally a permitted photo.
4. **Aarav:** My bookings → Submit return. Record the final condition and details. Choosing **Damaged** automatically creates a human-review incident.
5. **Mira:** Owner command → Confirm return; review the condition record and sign off. The booking changes to **returned**.
6. **Either participant:** My bookings → details or Audit activity → view the transaction events, actor, timestamp, explanation, evidence and incident outcome.

## Story B — Skill Passport (2 minutes)

1. Switch to **Ishaan Rao** (student) → Skill Passport → request **3D printing** clearance, with fictional prior-training explanation.
2. Switch to **Dr. Kiran Shah** (manager) → Owner command → Skill Passport queue → Review → approve **only after fictitious training evidence has been verified for the demonstration**.
3. Switch back to Ishaan → Skill Passport: new badge should show verified; access to the 3D printer is now eligible for booking.
4. Note that unverified users **cannot grant themselves** badges or override manager review.

## Story C — competing requests and extensions (2 minutes)

1. Create and approve a booking for a specific time as Aarav/Mira.
2. As Diya, request the same printer and time: it becomes waitlisted, with human approval still required when the slot opens.
3. As Aarav, cancel the confirmed request; Diya's booking moves from waitlisted to **pending** rather than silently auto-approving.
4. Try an approved booking's **Extend time** action; an owner decides with a recorded reason, and extension into confirmed reservations is blocked.

## Story D — accountability (1 minute)

- Open **Audit activity**: see who took an action, when, what changed and why.
- In **Owner command**, resolve a damage incident through human review; no automatic penalty is assigned.
- Trigger notifications through approval, training review and return events; notifications are in-app, not actual email/SMS.

## Demo identities

| Identity | Role | Purpose |
|---|---|---|
| Aarav Mehta | Student | Main booking/check-in/return demo |
| Diya Nair | Student | Conflict/waitlist demo |
| Ishaan Rao | Student | Missing-skills/training review demo |
| Mira Kapoor | Owner | Resource listing, approvals, return confirmation |
| Dr. Kiran Shah | Manager | Training validation, incident review, reset |

## Known demo limitations

This is a functional demonstration, not a facility access product: no institutional authentication, payment, hardware lock control, real qualifications validation, cryptographically secure QR handover, real-time email or immutable audit store. Server stores data in a local JSON file (single instance). A host without persistent storage will lose state on restart. All demos should use fictional information only.
