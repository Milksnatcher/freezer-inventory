import React, { useCallback, useState } from 'react';
import { SectionList, View, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { fetchLocations } from '../src/lib/data';
import { FRESH_COLORS } from '../src/lib/freshness';
import { Text, TextInput, Switch, Label, MiniQuarters } from '../src/ui';
import { c, shadow } from '../src/theme';

type Row = { id: string; name: string; quarters_left: number; freshness: 'green' | 'amber' | 'red'; location_id: string | null; category: string | null; subcategory: string | null };

export default function Inventory() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]); const [locs, setLocs] = useState<Record<string, string>>({});
  const [byType, setByType] = useState(false); const [q, setQ] = useState('');
  const load = useCallback(async () => {
    const [{ data }, l] = await Promise.all([supabase.from('inventory_view').select('*'), fetchLocations()]);
    setRows((data as Row[]) ?? []); setLocs(Object.fromEntries(l.map(x => [x.id, x.name])));
  }, []);
  useFocusEffect(useCallback(() => {
    load();
    const ch = supabase.channel('inv').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]));

  const groups: Record<string, Row[]> = {};
  rows.filter(r => r.name.toLowerCase().includes(q.toLowerCase())).forEach(r => {
    const k = byType ? [r.category ?? 'Uncategorised', r.subcategory].filter(Boolean).join(' › ') : r.location_id ? locs[r.location_id] ?? '?' : 'No Location';
    (groups[k] ??= []).push(r);
  });
  const sections = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([title, data]) => ({ title, data }));
  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      <TextInput placeholder="Search stock…" value={q} onChangeText={setQ} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 }}>
        <Switch value={byType} onValueChange={setByType} /><Text style={{ color: c.ink[500] }}>Group by food type</Text>
      </View>
      <SectionList sections={sections} keyExtractor={r => r.id} stickySectionHeadersEnabled={false} contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={{ padding: 16, color: c.ink[400] }}>Nothing here yet.</Text>}
        renderSectionHeader={({ section }) => <View style={{ paddingTop: 16, paddingBottom: 8 }}><Label>{section.title} · {section.data.length}</Label></View>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/item', params: { id: item.id } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8, ...shadow.soft }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: FRESH_COLORS[item.freshness] }} />
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '500' }}>{item.name}{q && byType && item.location_id ? `  (${locs[item.location_id]})` : ''}</Text>
            <MiniQuarters n={item.quarters_left} />
          </Pressable>
        )} />
    </View>
  );
}
