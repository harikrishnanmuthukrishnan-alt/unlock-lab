# GitHub + hosting deployment

## Account selection

The requested GitHub sign-in address is **harikrishnan.muthukrishnan@gmail.com**, but an email address alone is not account authentication. The account owner must authorise the GitHub connection through its official consent flow. Do not share passwords, verification codes, cookies or personal access tokens in a chat.

## Publish source to GitHub

The GitHub connection was verified for account `harikrishnanmuthukrishnan-alt`. The available GitHub actions do not support creating new repositories. Create a dedicated repository called `unlock-lab` from https://github.com/new (while signed into this account); once it exists, the connected GitHub actions can write source files to it. Use the content of this folder, excluding `data/db.json`, `.env`, server logs, and personal/private files. The included `.gitignore` handles those. The connected GitHub account's identity must be checked before publication.

If pushing manually from a machine already authenticated with the desired account:

```bash
cd unlock-lab
git init
git add .
git commit -m "Build UNLOCK Lab judge demo"
git branch -M main
git remote add origin https://github.com/YOUR_VERIFIED_USERNAME/unlock-lab.git
git push -u origin main
```

Replace `YOUR_VERIFIED_USERNAME` only with the confirmed account username. Do not claim an invented repository URL.

## Run on a Node-compatible host

This app is a single Node server (no build step):

- **Start command:** `npm start`
- **Runtime:** Node.js 20+
- **Port:** Provided `PORT` environment variable, or default 3000.
- **Health check:** `/healthz`
- **Optional secrets:** `OPENAI_API_KEY`, `OPENAI_MODEL`
- **Working data:** `data/db.json` is automatically created on first launch; hosting without durable disk resets records on redeploy/restart.

Railway, Render, a VM or another Node-compatible platform can run the server. Connect the GitHub repo only after verifying the account and project identity. Make any deployment environment variables private.

## Judge accessibility

The final live URL must be opened in a signed-out browser and validated end to end. Test mobile and desktop sizes, complete a booking without explanations from the team, confirm the return and check audit history. Keep the app online for the judging period.

**Important:** This demo contains intentionally open role switching, no production security and no institutional SSO. Only fictional data should be used if deployed to a publicly accessible URL. A real institution must not use this deployment to control facility or equipment access.

## Hackathon rule

The provided rules require the final submitted product to be built during the official 48-hour hackathon window. If this preparatory package predates that window, **do not submit it as though written during the window**. Use planning and reference material only where allowed, build compliant source during the official window, and disclose prior AI assistance, templates, components and reused code.

## Docker Compose with persistent demo storage

Run `docker compose up --build -d` and open `http://localhost:3000`. The included `unlock_lab_demo` volume persists fictional JSON between container restarts.

This **does not** make demo identity switching safe for real data or physical equipment. A public demo should stay fictional and short-lived.

## Railway deployment (if connected and authorised)

- Connect Railway explicitly through ChatGPT (connection and any applicable billing are controlled by the user).
- Select the dedicated GitHub repository only after it exists; deploy this Node app with `npm start`, Node 22 and health check `/healthz`.
- Mount a persistent storage volume if the chosen host supports it; set `DATA_FILE` to its mounted location. Without persistent storage, demo data resets after redeployment.
- Keep AI secrets server-side; they are optional.
- Verify the final public URL and an entire test journey; do not invent a URL or claim launch success prematurely.
