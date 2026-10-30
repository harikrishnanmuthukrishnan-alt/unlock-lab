# Test report — 30 October 2026

**Command:** `npm test` (Node.js v22)

**Result:** 13 passed / 0 failed (locally)

Test categories:
- Complete booking request → approval → check-in → return → confirmation → audit
- Mandatory eligibility for restricted equipment
- Waitlist and promotion on cancellation
- Explainable FairQueue and manager override requirements
- Role-based authorisation for borrower/owner/manager actions
- Damage incident creation and human review
- Resource creation and scheduling constraints
- Human-reviewed Skill Passport verification, duplicate protection and evidence validation
- Owner-reviewed booking extension, conflicts and session limits
- Overdue notification exactly once without automatic penalty
- **Live HTTP endpoint integration:** end-to-end flow, actual request header guard, private handover code visibility, persisted JSON

`curl http://localhost:3000/healthz` returns `{"status":"ok"}` on a running server. A local server smoke test returned HTTP 200. A deliberately missing `X-Unlock-Client` header received HTTP 403.

This test report is not a production security or accessibility certification. The application still uses intentionally passwordless fictional judge accounts and a single-instance JSON store.
