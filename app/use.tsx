import React, { useEffect, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { aiDebug, fetchLocations, findByLabel, resolveBarcode, resolvePhoto, Product } from '../src/lib/data';
import { FRESH_COLORS } from '../src/lib/freshness';
import { useApp } from '../src/lib/session';
import { notify } from '../src/lib/notify';
import Scanner from '../src/components/Scanner';
import { Text, TextInput, Button, MiniQuarters } from '../src/ui';
import { c, shadow } from '../src/theme';

const oldestFirst = (a: any, b: any) => a.quarters_left - b.quarters_left || +new Date(a.age_date) - +new Date(b.age_date);

export default function Use() {
  const router = useRouter(); const { householdId } = useApp();
  const [q, setQ] = useState(''); const [rows, setRows] = useState<any[]>([]); const [locs, setLocs] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false); const [hint, setHint] = useState('');
  const load = React.useCallback(async () => {
    const term = q.replace(/[,()%*]/g, ' ').trim();   // search name, food type or group
    let qb = supabase.from('inventory_view').select('*');
    if (term) qb = qb.or(`name.ilike.%${term}%,category.ilike.%${term}%,subcategory.ilike.%${term}%`);
    const { data } = await qb.limit(60);
    setRows((data ?? []).sort(oldestFirst));
  }, [q]);
  useEffect(() => { fetchLocations().then(l => setLocs(Object.fromEntries(l.map(x => [x.id, x.name])))); }, []);
  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  // scanned/photographed product -> best matching unit in stock (opened, then oldest, first)
  const openStock = async (p: Product) => {
    const { data } = await supabase.from('inventory_view').select('id,quarters_left,age_date').eq('product_id', p.id);
    const best = (data ?? []).sort(oldestFirst)[0];
    setScanning(false); setHint('');
    if (!best) return notify('Not in stock', p.name);
    router.push({ pathname: '/item', params: { id: best.id } });
  };
  const onBarcode = async (code: string) => {
    if (code.startsWith('PM-')) {   // our own homemade label
      const it = await findByLabel(code); setScanning(false); setHint('');
      if (it) router.push({ pathname: '/item', params: { id: it.id } }); else notify('Label not in stock', 'Already used up, or not from your household.');
      return;
    }
    setHint('Looking up…');
    const p = await resolveBarcode(code, householdId!, false);
    if (p) openStock(p); else setHint('Barcode not recognised. Tap Take photo, or cancel and search by name.');
  };
  const onPhoto = async (b64: string) => {
    setHint('Reading label…');
    const p = await resolvePhoto(b64, householdId!, undefined, false);
    if (p) openStock(p); else setHint(aiDebug.error ? `Could not read that (${aiDebug.error}). Try again.` : 'No match in your inventory. Cancel and search by name.');
  };
  if (scanning) return <Scanner hint={hint} onBarcode={onBarcode} onPhoto={onPhoto} onCancel={() => { setScanning(false); setHint(''); }} />;

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, gap: 10 }}>
      <Button tone="sky" title="Scan barcode / photo of label" onPress={() => setScanning(true)} />
      <TextInput placeholder="…or search by name or type (e.g. meat)" value={q} onChangeText={setQ} style={{ fontSize: 17 }} />
      <FlatList data={rows} keyExtractor={r => r.id} contentContainerStyle={{ paddingBottom: 24 }} renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: '/item', params: { id: item.id } })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8, ...shadow.soft }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: FRESH_COLORS[item.freshness as 'green' | 'amber' | 'red'] }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>{item.name}</Text>
            <Text style={{ fontSize: 13, color: c.ink[400] }}>{item.location_id ? locs[item.location_id] : 'No Location'}</Text>
          </View>
          <MiniQuarters n={item.quarters_left} />
        </Pressable>
      )} ListEmptyComponent={<Text style={{ padding: 16, color: c.ink[400] }}>Nothing in stock matches.</Text>} />
    </View>
  );
}
