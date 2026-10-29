import React, { useCallback, useRef, useState } from 'react';
import { SectionList, View, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { canonCategory, categorizeMissing, fetchLocations, fmtUnits, FOOD_CATEGORIES, stockTotals } from '../src/lib/data';
import { FRESH_COLORS } from '../src/lib/freshness';
import { Text, TextInput, Label, MiniQuarters, Button, OpenedTag, Segmented } from '../src/ui';
import { c, shadow } from '../src/theme';

type Row = { id: string; product_id: string; age_date: string; name: string; quarters_left: number; freshness: 'green' | 'amber' | 'red'; location_id: string | null; category: string | null; subcategory: string | null };
const fmtAge = (iso: string) => {
  const d = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
  if (d < 14) return `${d} day${d === 1 ? '' : 's'}`;
  if (d < 60) return `${Math.round(d / 7)} weeks`;
  const m = d / 30.44;
  return m < 24 ? `${Math.round(m)} months` : `${(m / 12).toFixed(1)} years`;
};
type Mode = 'location' | 'type' | 'age';
const AGE_LABEL = { red: 'Over 6 months', amber: '2–6 months', green: 'Under 2 months' } as const;
const AGE_ORDER = ['Over 6 months', '2–6 months', 'Under 2 months'];
const order = (t: string) => { const i = FOOD_CATEGORIES.indexOf(t); return i === -1 ? (t === 'Uncategorised' ? 999 : 500) : i; };

export default function Inventory() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]); const [locs, setLocs] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<Mode>('location'); const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false); const [catMsg, setCatMsg] = useState(''); const tried = useRef(false);

  const loadRows = useCallback(async (): Promise<Row[]> => {
    const [{ data }, l] = await Promise.all([supabase.from('inventory_view').select('*'), fetchLocations()]);
    const r = (data as Row[]) ?? [];
    setRows(r); setLocs(Object.fromEntries(l.map(x => [x.id, x.name])));
    return r;
  }, []);

  // AI sorts anything without a food type, then reloads
  const runCat = useCallback(async () => {
    setBusy(true); setCatMsg('');
    const res = await categorizeMissing();
    setBusy(false);
    if (res.error) setCatMsg(`Could not sort these (${res.error})`);
    await loadRows();
  }, [loadRows]);

  useFocusEffect(useCallback(() => {
    loadRows().then(r => { if (!tried.current && r.some(x => !x.category)) { tried.current = true; runCat(); } });
    const ch = supabase.channel('inv').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, loadRows).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadRows, runCat]));

  const cat = (r: Row) => canonCategory(r.category, r.subcategory);
  const place = (r: Row) => (r.location_id ? locs[r.location_id] ?? '?' : 'No Location');
  const tot = stockTotals(rows);
  const subline = (r: Row) => {
    const t = tot[r.product_id];
    const total = t && (t.count > 1 || t.units % 1 !== 0) ? `${fmtUnits(t.units)} in stock` : '';
    if (mode === 'age') return [`${fmtAge(r.age_date)} old`, place(r), r.subcategory, total].filter(Boolean).join(' · ');
    if (mode === 'type') return [r.subcategory, place(r), total].filter(Boolean).join(' · ');
    return [[r.category ? cat(r) : '', r.subcategory].filter(Boolean).join(' › '), total].filter(Boolean).join(' · ');
  };

  const needle = q.toLowerCase();
  const missing = rows.filter(r => !r.category).length;
  const groups: Record<string, Row[]> = {};
  rows.filter(r => [r.name, r.category ? cat(r) : '', r.subcategory].filter(Boolean).join(' ').toLowerCase().includes(needle)).forEach(r => {
    (groups[mode === 'type' ? cat(r) : mode === 'age' ? AGE_LABEL[r.freshness] : place(r)] ??= []).push(r);
  });
  const oldestFirst = (x: Row, y: Row) => +new Date(x.age_date) - +new Date(y.age_date);
  const sections = Object.entries(groups)
    .sort(([a], [b]) => mode === 'type' ? order(a) - order(b) || a.localeCompare(b) : mode === 'age' ? AGE_ORDER.indexOf(a) - AGE_ORDER.indexOf(b) : a.localeCompare(b))
    .map(([title, data]) => ({
      title,
      data: mode === 'type' ? [...data].sort((x, y) => (x.subcategory ?? '').localeCompare(y.subcategory ?? '') || x.name.localeCompare(y.name)) : mode === 'age' ? [...data].sort(oldestFirst) : data,
    }));

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      <TextInput placeholder="Search name, food type or group (e.g. meat)…" value={q} onChangeText={setQ} />
      <View style={{ marginVertical: 10 }}>
        <Segmented<Mode> value={mode} onChange={setMode} options={[{ value: 'location', label: 'Location' }, { value: 'type', label: 'Food type' }, { value: 'age', label: 'Oldest first' }]} />
      </View>
      {missing > 0 && (
        <View style={{ marginBottom: 8, gap: 6 }}>
          <Button tone="ghost" disabled={busy} title={busy ? 'Sorting with AI…' : `Sort ${missing} uncategorised item${missing > 1 ? 's' : ''} with AI`} onPress={runCat} />
          {catMsg ? <Text style={{ color: c.clay[600], fontSize: 13 }}>{catMsg}</Text> : null}
        </View>
      )}
      <SectionList sections={sections} keyExtractor={r => r.id} stickySectionHeadersEnabled={false} contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={{ padding: 16, color: c.ink[400] }}>Nothing here yet.</Text>}
        renderSectionHeader={({ section }) => <View style={{ paddingTop: 16, paddingBottom: 8 }}><Label>{section.title} · {section.data.length}</Label></View>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/item', params: { id: item.id } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8, ...shadow.soft }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: FRESH_COLORS[item.freshness] }} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', flexShrink: 1 }}>{item.name}</Text>
                {item.quarters_left < 4 && <OpenedTag />}
              </View>
              <Text style={{ fontSize: 12, color: c.ink[400] }}>{subline(item)}</Text>
            </View>
            <MiniQuarters n={item.quarters_left} />
          </Pressable>
        )} />
    </View>
  );
}
