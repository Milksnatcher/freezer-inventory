import React, { useCallback, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '../src/ui';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { c, shadow } from '../src/theme';

const DAY = 86400000;
const card = { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 4, ...shadow.soft } as const;
const nameOf = (r: any) => r.products?.name ?? 'Unknown';

export default function Stats() {
  const [s, setS] = useState<any>(null);
  const load = useCallback(async () => {
    const now = Date.now();
    const [{ data: uses }, { data: done }, { data: red }] = await Promise.all([
      supabase.from('logs').select('products(name)').eq('action', 'use').gte('created_at', new Date(now - 90 * DAY).toISOString()),
      supabase.from('inventory_items').select('added_at,age_override_at,consumed_at,products(name)').not('consumed_at', 'is', null),
      supabase.from('inventory_view').select('name,age_date').lt('age_date', new Date(now - 183 * DAY).toISOString()),
    ]);
    const counts: Record<string, number> = {};
    (uses ?? []).forEach((r: any) => { counts[nameOf(r)] = (counts[nameOf(r)] ?? 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const days: Record<string, number[]> = {};
    (done ?? []).forEach((r: any) => {
      const d = (new Date(r.consumed_at).getTime() - new Date(r.age_override_at ?? r.added_at).getTime()) / DAY;
      (days[nameOf(r)] ??= []).push(d);
    });
    const avg = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
    const all = Object.values(days).flat();
    const perProduct = Object.entries(days).sort((a, b) => b[1].length - a[1].length).slice(0, 5).map(([n, a]) => [n, avg(a)] as const);

    const redRows = (red ?? []).map((r: any) => ({ name: r.name, days: (now - new Date(r.age_date).getTime()) / DAY }));
    const newlyRed = redRows.filter(r => r.days < 183 + 30);
    setS({ top, overall: all.length ? avg(all) : null, perProduct, redNow: redRows, newlyRed });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (!s) return <View style={{ padding: 24 }}><Text>Loading…</Text></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={card}>
        <Text style={{ fontWeight: '800', fontSize: 18 }}>Most used (last 90 days)</Text>
        {s.top.length ? s.top.map(([n, c]: [string, number]) => <Text key={n}>{n}: {c} time{c > 1 ? 's' : ''}</Text>) : <Text style={{ color: '#57685E' }}>Nothing used yet.</Text>}
      </View>
      <View style={card}>
        <Text style={{ fontWeight: '800', fontSize: 18 }}>Average time in storage</Text>
        {s.overall !== null ? <Text>Overall: {s.overall} days</Text> : <Text style={{ color: '#57685E' }}>Appears once items have been used up.</Text>}
        {s.perProduct.map(([n, d]: [string, number]) => <Text key={n}>{n}: {d} days</Text>)}
      </View>
      <View style={[card, { borderWidth: 1.5, borderColor: c.clay[300] }]}>
        <Text style={{ fontWeight: '800', fontSize: 18 }}>Red zone (over 6 months)</Text>
        <Text>Entered the red zone this month: {s.newlyRed.length}</Text>
        {s.newlyRed.map((r: any, i: number) => <Text key={i}>  • {r.name}</Text>)}
        <Text style={{ marginTop: 6 }}>Currently in the red zone: {s.redNow.length}</Text>
        {s.redNow.length > s.newlyRed.length && <Text style={{ color: '#57685E' }}>Use these first, or buy less of them next time.</Text>}
      </View>
    </ScrollView>
  );
}
