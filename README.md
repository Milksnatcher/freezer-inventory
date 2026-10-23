# Pantry: shared freezer & pantry inventory

**New here? Follow `DEPLOY.md` for the step-by-step setup.**

React Native (Expo) + Supabase. See `STRUCTURE.md` for the full architecture.

## Recommended build order
1. **Foundation (included):** login, household create/join, dashboard, live inventory list, offline queue, schema.
2. **Manual Add + Use:** typed entry with autofill from `products`, quantity stepper, QuarterPie partial use, log rows.
3. **Locations + Settings:** add/delete locations, move items, edit age date, logs with undo.
4. **Barcode scanning:** expo-camera -> Open Food Facts -> AI label fallback (needs the edge function).
5. **Shopping list:** view/remove items, Alexa playback (expo-speech).
6. **Labels:** QR label image saved to a folder for MacroDroid/PrintMaster.
7. **AI extras:** food-type categories, What's for Dinner (+ older items toggle), Stats.
8. **Push notifications:** low stock + weekly freshness digest, on/off toggle.

## 1. Supabase setup (free tier)
1. Create a project at supabase.com. Copy **Project URL** and **anon public key** (Settings -> API).
2. SQL Editor: run `supabase/schema.sql`, then `supabase/bootstrap.sql`.
3. Authentication -> Providers -> Email: for simple setup, turn **off** "Confirm email".
4. Database -> Replication: confirm the tables appear under `supabase_realtime` (the SQL already adds them).
5. Note: free projects pause after about 1 week of inactivity; opening the app or dashboard resumes them.

## 2. AI edge function (Anthropic)
```bash
npm i -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy ai
```
Anthropic API usage is billed separately from Claude chat plans (console.anthropic.com).
The function is protected by Supabase JWT verification by default, so only signed-in users can call it.

## 3. Run the app
```bash
cp .env.example .env     # fill in URL + anon key
npm install
npx expo install --fix   # aligns package versions with your Expo SDK
npx expo start
```
Scan the QR code with Expo Go on both phones. Push notifications and some native features need a development build (below).

## 4. Put it on GitHub
```bash
git init && git add . && git commit -m "Initial commit"
gh repo create pantry --private --source=. --push    # or create on github.com and git remote add/push
```
`.env` is git-ignored. Never commit keys. The Supabase anon key is safe to ship in the app because Row Level Security protects data; the Anthropic key lives only in Supabase secrets.

Optional repo secrets (Settings -> Secrets -> Actions) for auto-deploying the function: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.
CI (`ci.yml`) type-checks every push.

## 5. Install on both phones
```bash
npm i -g eas-cli && eas login && eas init
eas build -p android --profile preview     # APK you can sideload
eas build -p ios --profile preview         # needs Apple Developer account ($99/yr)
```
Change `bundleIdentifier` / `package` in `app.json` to your own first.
Pairing: first phone taps **Create household**; second signs up and enters the invite code (shown in Settings).

## Alternative: host as a web app on GitHub Pages (no app stores, no EAS)
The same code runs as a PWA. Open the URL on each phone, then "Add to Home Screen".
1. `baseUrl` in `app.json` and the paths in `app/+html.tsx` are already set to the repo name `freezer-inventory`; change them if you rename the repo.
2. Repo Settings -> Secrets -> Actions: add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Settings -> Pages -> Source: **GitHub Actions**. Push to `main`. Your app appears at `https://USERNAME.github.io/REPO/`.
4. Supabase -> Authentication -> URL Configuration: add that URL as Site URL.
5. **Once you and your partner have both signed up**, turn off Authentication -> "Allow new users to sign up" so strangers can't register at your public URL.

Notes: free GitHub accounts need a **public** repo for Pages (fine: no secrets are committed, and the anon key is public by design, with Row Level Security plus your login protecting the data). Web limits: barcode scanning and camera need HTTPS (Pages has it) and are weaker in browsers, iOS web push only works for the installed home-screen app, and label images are downloaded/shared rather than saved to a folder.

## Updates
- **Phase 2 (done):** manual Add (autofill, quantity), Use (quarter pie, oldest/opened first), item editor (location, age date), food-type grouping with sub-groups (Meat › Chicken).
  Already ran an older `schema.sql`? Run `supabase/migrations/003_phase2.sql` once. Fresh installs don't need it.
- Redeploy the AI function after pulling: `supabase functions deploy ai`.
- **Phase 3 (done):** Settings now has locations add/delete (items fall back to "No Location"), recent logs with Undo, and the notifications on/off switch (the switch is saved; the notifications themselves arrive in phase 8). Undoing a "use" now also removes the shopping entry it created. Already ran an older schema? Also run `supabase/migrations/004_phase3.sql`.
- **Phase 4 (done):** barcode scanning and AI label photos in both Add and Use. Lookup order: your own products -> Open Food Facts -> AI photo. Barcodes are saved against the product, so the next scan is instant. The AI is given your existing product names so it matches rather than duplicating.
  After pulling: `npm install` (adds ZXing for web scanning) and `supabase functions deploy ai`. Phones need camera permission; browsers need HTTPS (GitHub Pages has it).
- **Phase 5 (done):** shopping list (live-synced between phones, add manually, remove individually, low-stock items arrive automatically) and "Play to Alexa" voice upload. Nothing to deploy or migrate.
- **Phase 6 (done):** homemade-food labels. Settings or Add -> "Make a label": creates the inventory item with a unique code (PM-XXXXXXXX), draws a label (name, date, QR) and saves it as PNG. Scanning that QR on the Use screen opens the item.
  Android/iOS save to a photo album called **PantryLabels** (MacroDroid: trigger "new file in folder" on `Pictures/PantryLabels`, then send to your label printer app). On the web version the PNG downloads to your Downloads folder. Label size is `LABEL_W`/`LABEL_H` in `app/label.tsx`.
  After pulling: `npm install` (adds html2canvas for web and expo-sharing).
- **Phase 7 (done):** What's for Dinner (with the "Prioritise older items" toggle, which gives the AI only amber/red stock as its starting point), Stats (most used, average time in storage, red-zone summary), and Settings -> "Staples and minimum stock". Redeploy the AI function: `supabase functions deploy ai`. No migration.
- **Look and feel:** restyled to match the Gut Log app: sage/sky/amber/clay palette, Manrope + Inter fonts, rounded white cards, big coloured home tiles, bottom navigation bar, new quarter-ring widget and pantry icons. The notifications switch is hidden. After pulling: `npm install` then `npx expo install --fix`. Colours live in `src/theme.ts`; shared components in `src/ui.tsx`.
- Known gap: lists are read from Supabase live, so items added while offline appear after they sync (writes are queued safely).
