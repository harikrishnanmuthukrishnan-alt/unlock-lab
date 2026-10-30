# UNLOCK Lab — Google Sign-In + NVIDIA LabMate Setup

The application code is deployed from the `production-platform` GitHub branch. These are **manual configuration steps**; no OAuth provider credentials or NVIDIA API keys are stored in GitHub.

## 1. Enable Google Login safely

1. Log in to Google Cloud Console with the Google account that **owns the OAuth project**. Configure the OAuth consent screen/branding. For a public product, publish the consent screen, set support/developer contacts, and complete any verification required by Google's policies.
2. In **Google Cloud → APIs & Services → Credentials**, create an **OAuth Client ID**, application type **Web application**.
3. Under **Authorized redirect URIs**, add exactly:

   `https://yurabztsfwpbtdsycjba.supabase.co/auth/v1/callback`

   This is **Supabase's callback**, not your Render URL. Do not add the `/auth/google/callback` app route to the Google Console callback list.
4. In the dedicated [UNLOCK Lab Supabase project](https://supabase.com/dashboard/project/yurabztsfwpbtdsycjba), open **Authentication → Sign In / Providers → Google**. Enable Google, supply the **Client ID** and **Client Secret** from Google Cloud, and save. Keep the secret in Supabase, not GitHub or the browser.
5. In Supabase **Authentication → URL Configuration**, set **Site URL** to `https://unlock-lab-platform.onrender.com`. Add `https://unlock-lab-platform.onrender.com/auth/google/callback**` to the permitted Redirect URLs. The suffix allows the short-lived PKCE state query string; avoid broad `https://**` patterns. If exact URL validation blocks a query string, inspect the allow-list settings and refine before proceeding.
6. In the [UNLOCK Lab Render environment settings](https://dashboard.render.com/web/srv-dbi82ljbc2fs73acb3ag), set `GOOGLE_AUTH_ENABLED=true`. Keep `PUBLIC_URL=https://unlock-lab-platform.onrender.com` and `COOKIE_SECURE=true`.
7. Test on two separate browser sessions. Click **Continue with Google**, sign in, confirm `/api/bootstrap` recognises only that account, sign out, and confirm protected routes reject access. Also test a rejected/cancelled login. Do not assume this is ready merely because the button appears.

The app initiates Supabase OAuth with PKCE, securely stores the code verifier in an HttpOnly, Secure, SameSite cookie, validates state on return, exchanges the one-time authorization code for a Supabase session, and uses the same server-only session cookies as email login. Existing email/password login remains available.

## 2. Connect your NVIDIA API key (do NOT send it in chat)

1. Get or verify your personal key in [NVIDIA API Catalog](https://build.nvidia.com/settings). The key may have rate limits, per-model access rules and charges.
2. In your **Render → unlock-lab-platform → Environment** page, add `NVIDIA_API_KEY` and paste the key into Render's **secret environment variable** value. Do not paste it in this chat, the repository, JavaScript, screenshots or documentation.
3. Set `NVIDIA_MODEL=meta/llama-3.3-70b-instruct` (default, documented in NVIDIA NIM). You can use another model **only if your NVIDIA account has access** to it.
4. Save the environment changes and let Render redeploy. The website's `/api/config` endpoint will show `aiEnabled:true`, never the key.
5. Sign in to UNLOCK Lab and click **Ask LabMate**. Test queries about booking eligibility, SafeQueue, training, and listed resources. Ensure the answers are helpful but never automatically approve a booking.

NVIDIA API: `POST https://integrate.api.nvidia.com/v1/chat/completions`. The server sends **only** the signed-in user's question, up to eight recent chat messages, and a bounded snapshot of publicly visible resource descriptions. No auth token, email address, private photo or user-uploaded identity document is sent to NVIDIA. The chat is ephemeral per browser session, with 12 queries per user per 15 minutes, a maximum 650 output tokens per reply, and a 22-second provider timeout. Global concurrent request limit is five per process (not a distributed global cap). If NVIDIA is not configured, the chat UI displays **AI configuration pending**, rather than pretending to be AI-powered.

## 3. Production acceptance requirements

- Verify Google accounts appear with proper `public.profiles` records created by the signup trigger.
- Verify default Supabase email confirmation and existing email/password login still work.
- Check that logout removes the user's chat transcript from the current UI.
- Confirm Google OAuth redirect handling works from the *deployed* URL with PKCE and state verification.
- Test NVIDIA inference with a real key. The automated tests only validate mocked NVIDIA responses; no real provider inference was executed without your key.
- Review NVIDIA's data-handling terms and publish an updated privacy notice, since chat messages are transmitted to NVIDIA.
- Set monitoring and limits with respect to your NVIDIA account's quotas and cost.

**Do not claim Google sign-in or NVIDIA AI is active until the credential/provider setup and live tests succeed.**
