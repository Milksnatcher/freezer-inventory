# Deploy Pantry: step by step (no prior setup assumed)

You will end up with a web app at `https://YOUR-GITHUB-NAME.github.io/freezer-inventory/` that you and your partner install on your phones.
Time: about an hour. Cost: Supabase and GitHub free; Anthropic API is pay-as-you-go (pence per scan).

## Part 1: Supabase (database + login)

1. Go to supabase.com, sign in, click **New project**. Name it `pantry`, choose a database password (save it somewhere), pick the closest region, plan **Free**. Wait about 2 minutes.
2. **Project Settings -> API** (or "API Keys"). Copy two things into a notes file:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon / public key** (long text starting `eyJ...`). Do NOT use the `service_role` key.
   Also note your **project ref** (the `abcdxyz` part of the URL).
3. **SQL Editor -> New query**. Open `supabase/schema.sql` from this repo, paste the whole file, click **Run**. It should say "Success".
4. New query again. Paste `supabase/bootstrap.sql`, click **Run**.
   (Never run the files in `supabase/migrations/`: they are only for older installs.)
5. **Authentication -> Sign In / Providers -> Email**: turn **off** "Confirm email", save.

## Part 2: The AI function (label reading, categories, dinner ideas)

6. Get an Anthropic API key: console.anthropic.com -> sign in -> **Billing**: add a small credit (e.g. $5) -> **API Keys -> Create key**. Copy it (starts `sk-ant-`).
7. In Supabase: **Edge Functions -> Deploy a new function -> Via Editor**. Name it exactly `ai`. Delete the sample code, paste all of `supabase/functions/ai/index.ts`, click **Deploy**.
8. **Edge Functions -> Secrets** (or "Manage secrets"): add `ANTHROPIC_API_KEY` = your key.

(Without steps 6-8 the app still works for manual add/use; scanning photos, food types and dinner ideas will not.)

## Part 3: GitHub (all from your phone, using MGit)

The app is already configured for a repo named `freezer-inventory`.

9. On github.com (phone browser, "Desktop site" helps): **New repository**. Name it exactly `freezer-inventory`, **Public**, and tick **Add a README file** (this makes the `main` branch). Create it.
10. Create a login token for MGit (GitHub no longer accepts your password): **Profile picture -> Settings -> Developer settings -> Personal access tokens -> Tokens (classic) -> Generate new token (classic)**. Tick the scopes **repo** and **workflow** (workflow is needed to push the `.github` folder). Set expiry (e.g. 90 days), generate, and **copy the token now**; save it in a notes app.
11. Add the build secrets: in the repo go to **Settings -> Secrets and variables -> Actions -> New repository secret**. Add two:
    - `EXPO_PUBLIC_SUPABASE_URL` = Project URL from step 2
    - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = anon key from step 2
12. Turn on Pages: **Settings -> Pages -> Build and deployment -> Source: GitHub Actions**. (Do this BEFORE pushing so the first build can deploy.)
13. In **MGit**: tap **+ -> Clone**. Remote URL: `https://github.com/YOUR-GITHUB-NAME/freezer-inventory.git`. Tick the private/credentials option if shown and enter your GitHub username and the **token as the password**. Clone.
14. Put the app files in the cloned folder:
    - Download `freezer-inventory.zip` from this chat, and extract it with your phone's file manager **directly into the MGit repo folder**. The files must sit at the top level (you should see `package.json`, `app.json`, `app` and `src` folders right inside the repo folder, NOT inside another folder).
    - Turn on "show hidden files" in your file manager and check the `.github` and `.gitignore` items came across. In MGit's Files tab you should also see `.github`.
15. In MGit open the repo: **Status** tab -> stage everything (add all) -> **Commit** with message "Add app" -> **Push**. If it asks for credentials, use your username and the token. (Exact button names differ slightly between MGit versions.)
16. Open the repo's **Actions** tab on github.com. "Deploy web to GitHub Pages" starts by itself and takes about 5 minutes. If it was run before steps 11-12 were done, tap **Re-run all jobs**. Wait for green ticks. (A failing "CI" run does not block the deploy.)

## Part 4: Use it

17. Open `https://YOUR-GITHUB-NAME.github.io/freezer-inventory/` on your phone.
18. Tap **Create account**, enter email + password, then **Sign in**, then **Create household**.
19. Install it: iPhone Safari: Share -> **Add to Home Screen**. Android Chrome: menu -> **Install app / Add to Home screen**. Allow camera access when asked (needed for scanning).
20. Settings shows your **invite code**. Your wife opens the same URL, creates her own account, taps **Join household** and enters the code. You now share one inventory.
21. Once you both have accounts: Supabase **Authentication -> Sign In / Providers -> User Signups -> turn off "Allow new users to sign up"** so strangers cannot register.
22. Smoke test: Add an item by hand -> check it on the other phone -> Use it and shade a quarter -> scan a barcode -> make a label.

## Updating later
Replace the changed files in the MGit repo folder, then Status -> stage -> Commit -> Push. The site redeploys itself. If a release changes the database, run the new SQL in the Supabase SQL Editor; if it changes the AI function, paste the new `index.ts` over `ai` and Deploy.

## If something goes wrong
- **Actions build fails:** open the failed run, copy the red error and send it to Claude.
- **Blank page / missing styles:** the repo name and `baseUrl` in `app.json` must match (`freezer-inventory`).
- **Push rejected / authentication failed:** the token needs the `repo` and `workflow` scopes, and must be pasted as the password.
- **`.github` folder missing on GitHub:** hidden files were not copied; copy it across and push again.
- **"Invalid API key" / cannot sign in:** a secret has a typo or you used the wrong key. Fix it, then re-run the workflow (secrets are baked in at build time).
- **Scanning or dinner ideas fail:** check the function is named `ai`, the `ANTHROPIC_API_KEY` secret is set, and your Anthropic account has credit.
- **Supabase project paused** (free plan, a week of no use): open the dashboard and click Restore.
