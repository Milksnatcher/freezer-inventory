import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { enqueue } from './outbox';
import { AI_FUNCTION } from './config';

export type Product = { id: string; name: string; brand: string | null; category: string | null; subcategory: string | null; barcode: string | null };
const PCOLS = 'id,name,brand,category,subcategory,barcode';
export type Loc = { id: string; name: string };

export async function fetchLocations(): Promise<Loc[]> {
  const { data } = await supabase.from('locations').select('id,name').order('sort');
  return data ?? [];
}

// Autofill: products this household has added before
export async function searchProducts(q: string): Promise<Product[]> {
  if (!q.trim()) return [];
  const { data } = await supabase.from('products').select(PCOLS).ilike('name', `%${q.trim()}%`).limit(8);
  return data ?? [];
}

export async function addItems(o: { householdId: string; userId: string; locationId: string | null; name: string; product: Product | null; qty: number }) {
  const productId = o.product?.id ?? Crypto.randomUUID();
  if (!o.product) {
    await enqueue({ table: 'products', kind: 'insert', data: { id: productId, household_id: o.householdId, name: o.name.trim(), source: 'manual' } });
  }
  const ids = Array.from({ length: o.qty }, () => Crypto.randomUUID());
  for (const id of ids) {
    await enqueue({ table: 'inventory_items', kind: 'insert', data: { id, household_id: o.householdId, product_id: productId, location_id: o.locationId } });
  }
  await enqueue({ table: 'logs', kind: 'insert', data: { id: Crypto.randomUUID(), household_id: o.householdId, user_id: o.userId, action: 'add', product_id: productId, payload: { item_ids: ids } } });
  if (!o.product || !o.product.category) categorize(productId, o.name).catch(() => {});
}

// AI food type + subcategory (best effort, needs connection). The update is queued so it runs after the product insert.
export async function categorize(productId: string, name: string) {
  const { data, error } = await supabase.functions.invoke(AI_FUNCTION, { body: { task: 'categorize', items: [name] } });
  if (error || !data) return;
  const r: any = data[name] ?? Object.values(data)[0];
  if (r?.category) await enqueue({ table: 'products', kind: 'update', data: { category: r.category, subcategory: r.subcategory ?? null }, match: { id: productId } });
}

// ---------- Barcode + AI label lookup ----------
export async function offLookup(code: string): Promise<{ name: string; brand: string | null } | null> {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands`);
    const j = await r.json();
    if (j.status !== 1 || !j.product?.product_name) return null;
    return { name: String(j.product.product_name).trim(), brand: String(j.product.brands ?? '').split(',')[0].trim() || null };
  } catch { return null; }
}

export async function findProductByName(name: string): Promise<Product | null> {
  const { data } = await supabase.from('products').select(PCOLS).ilike('name', name.trim()).limit(1).maybeSingle();
  return data ?? null;
}

export async function createProduct(o: { householdId: string; name: string; brand?: string | null; barcode?: string | null; category?: string | null; subcategory?: string | null; source: 'openfoodfacts' | 'ai' | 'manual' | 'label' }): Promise<Product> {
  const p: Product = { id: Crypto.randomUUID(), name: o.name, brand: o.brand ?? null, category: o.category ?? null, subcategory: o.subcategory ?? null, barcode: o.barcode ?? null };
  await enqueue({ table: 'products', kind: 'insert', data: { ...p, household_id: o.householdId, source: o.source } });
  return p;
}

const attachBarcode = (p: Product, code?: string) => {
  if (code && !p.barcode) enqueue({ table: 'products', kind: 'update', data: { barcode: code }, match: { id: p.id } });
};

// 1) our own database  2) Open Food Facts. create=false (Use flow) only matches products we already have.
export async function resolveBarcode(code: string, householdId: string, create: boolean): Promise<Product | null> {
  const { data } = await supabase.from('products').select(PCOLS).eq('barcode', code).maybeSingle();
  if (data) return data;
  const off = await offLookup(code);
  if (!off) return null;
  const existing = await findProductByName(off.name);
  if (existing) { attachBarcode(existing, code); return existing; }
  if (!create) return null;
  return createProduct({ householdId, name: off.name, brand: off.brand, barcode: code, source: 'openfoodfacts' });
}

export const aiDebug = { error: '' };   // last AI problem, shown in the scanner hint
async function errText(error: any): Promise<string> {
  try { const b = await error.context.json(); return String(b.error ?? JSON.stringify(b)).slice(0, 160); }
  catch { return String(error?.message ?? error).slice(0, 160); }
}

// AI label reading. We pass known product names so the AI can match instead of creating duplicates.
export async function resolvePhoto(b64: string, householdId: string, barcode: string | undefined, create: boolean): Promise<Product | null> {
  const { data: names } = await supabase.from('products').select('name').limit(300);
  aiDebug.error = '';
  const { data: ai, error } = await supabase.functions.invoke(AI_FUNCTION, { body: { task: 'label', imageBase64: b64, candidates: (names ?? []).map(n => n.name) } });
  if (error) { aiDebug.error = await errText(error); return null; }
  if (!ai?.name) { aiDebug.error = ai?.error ?? 'The AI reply could not be understood'; return null; }
  const existing = await findProductByName(ai.match || ai.name);
  if (existing) { attachBarcode(existing, barcode); return existing; }
  if (!create) return null;
  return createProduct({ householdId, name: ai.name, brand: ai.brand, barcode: barcode ?? null, category: ai.category, subcategory: ai.subcategory, source: 'ai' });
}

// Homemade-label QR codes (PM-XXXXXXXX) point straight at one inventory unit
export async function findByLabel(code: string): Promise<{ id: string } | null> {
  const { data } = await supabase.from('inventory_view').select('id').eq('label_code', code).maybeSingle();
  return data ?? null;
}
