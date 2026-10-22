# Pantry app: structure

```
app/                      expo-router screens
  index.tsx               dashboard: Add / Use / Inventory / Shopping (big buttons)
  add.tsx                 pick location -> scan | photo | manual (+qty stepper)
  use.tsx                 scan | photo | search -> QuarterPie -> decrement
  inventory.tsx           group by location <-> food type toggle, search, freshness dots, edit age/location
  shopping.tsx            list, swipe-remove, "Alexa" TTS button (expo-speech)
  dinner.tsx              "What's for dinner?" + Prioritise older items toggle
  stats.tsx               top-used items, avg storage time, monthly red-zone summary
  settings.tsx            locations CRUD, logs (undo = rpc undo_log), notifications toggle, labels
src/lib/                  supabase.ts, outbox.ts (offline queue), freshness.ts, openfoodfacts.ts, ai.ts
src/components/           QuarterPie.tsx, FreshDot.tsx, LabelMaker.tsx
supabase/                 schema.sql, functions/ai (Anthropic proxy)
```

## Key flows
- **Barcode:** expo-camera -> products table (cached) -> Open Food Facts
  `https://world.openfoodfacts.org/api/v2/product/{code}.json` -> else photo -> `ai` function (task=label) -> insert into products with barcode so next scan is instant.
- **Add xN:** insert N inventory_items rows + one `logs` row (payload.item_ids).
- **Use:** set quarters_left; at 0 set consumed_at (trigger adds to shopping list if below threshold).
- **Delete location:** FK `on delete set null` => items show as "No Location".
- **Labels:** react-native-view-shot renders name + date + QR (react-native-qrcode-svg) -> PNG saved via expo-media-library to a fixed folder (MacroDroid watches it) / share sheet. QR value = inventory_items.label_code.
- **Alexa:** expo-speech: `Alexa, add A, B, and C to my shopping list` (one item per utterance is more reliable; offer "one at a time" mode).
- **Push:** expo-notifications token -> household_members.push_token; scheduled Supabase cron + Edge Function for low stock and weekly digest; respects push_enabled.
- **Realtime:** supabase.channel() on inventory_items, shopping_list_items, locations.

## Install
npx create-expo-app pantry -t default
npx expo install expo-camera expo-speech expo-notifications expo-media-library expo-crypto react-native-svg react-native-view-shot @react-native-async-storage/async-storage @react-native-community/netinfo
npm i @supabase/supabase-js react-native-url-polyfill react-native-qrcode-svg
