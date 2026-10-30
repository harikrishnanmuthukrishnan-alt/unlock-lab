# Render deployment — Railway sign-up alternative

## Why this route

On 30 October 2026, Railway's status page reported temporary suspension of **new account registration** after its October 21 incident. This blocks first-time Railway signups even when GitHub authentication works. Use Render as an alternative; do not try to bypass Railway restrictions.

## Step A: publish the source

GitHub repo (verified as existing and empty before publication):

https://github.com/harikrishnanmuthukrishnan-alt/unlock-lab

The GitHub connection inside ChatGPT doesn't automatically sign in Git on your local Windows machine. Inside the extracted `unlock-lab` directory, double-click `PUBLISH-TO-GITHUB-WINDOWS.bat` after installing Git for Windows. The script checks its target, commits and pushes all source files, and refuses to push to an unrelated remote. Alternatively use a Git terminal, `git init`, `git add .`, `git commit -m "Initial UNLOCK Lab demo"`, `git branch -M main`, `git remote add origin https://github.com/harikrishnanmuthukrishnan-alt/unlock-lab.git`, `git push -u origin main`. Do not commit `.env`, `data/db.json`, passwords or real user information.

Verify that `server.js`, `logic.js`, `public/`, `docs/`, `tests/`, and `render.yaml` appear in the GitHub repo before proceeding. A GitHub repo containing only a README is not a runnable application.

## Step B: Render web service

1. Open https://dashboard.render.com/ and sign in using an account you control. If you connect GitHub, grant access to only the intended `unlock-lab` repository where possible.
2. Choose **New → Web Service** and select `harikrishnanmuthukrishnan-alt/unlock-lab`.
3. Choose **Language: Node**, **Branch: main**, **Instance Type: Free** (if available on your account), **Build Command: npm install --omit=dev**, **Start Command: npm start**. Set **Health Check Path: /healthz** where supported.
4. Set `NODE_ENV=production` and `CAMPUS_TZ_OFFSET=+05:30`. Render sets `PORT` automatically; don't hardcode it. Optional `OPENAI_API_KEY` is a server-side secret only — don't put it in GitHub or browser code.
5. Deploy. After Render shows Live, open the actual URL it provides and test the entire user → owner → return journey.

The included `render.yaml` allows using **New → Blueprint** instead, after the repository has source code. Review any proposed service charges before confirming.

## Important caveat: prototype hosting is not production hosting

Render Free web services have ephemeral storage; this app currently writes its demo DB to a local JSON file. **Bookings and condition reports may be reset after spin-down/redeploy/restart.** This is unacceptable for a real institutional service and can be disruptive during judging. For a reliable demonstration, use a plan with persistent disk or upgrade the app to a managed database (e.g., Postgres). Do not treat the free JSON-storage deployment as a secure multi-user or durable production platform.

The app intentionally allows switching between fictional judge accounts. **Never invite real students or institutions to enter personal information, real qualification documents or actual equipment access codes in a public demo.** It is a simulated campus workflow; a production service needs real SSO, server-side authorisation, storage and immutable audit logs.

## Validate before submission

- [ ] Public URL loads in incognito browser
- [ ] `/healthz` returns `{ "status": "ok" }`
- [ ] Search/eligibility/request/approval/waitlist/check-in/return/incident/audit screens function end-to-end
- [ ] Test booking records survive at least a restart; if not, use persistent storage or explain/reset demo limitations to judges
- [ ] GitHub repo is accessible; documented source matches deployed version
- [ ] Team details and contribution/disclosure docs completed
- [ ] Exact hackathon start/end times confirmed; code built in official window or declared as pre-existing/preparation only under organiser rules

## Official references

- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://status.railway.com/
