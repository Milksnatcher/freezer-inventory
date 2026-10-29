import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { supabase } from '../src/lib/supabase';
import { enqueue } from '../src/lib/outbox';
import { canonCategory, fetchLocations, Loc } from '../src/lib/data';
import { QuarterPie } from '../src/components/QuarterPie';
import { useApp } from '../src/lib/session';
import { confirm, notify } from '../src/lib/notify';
import { FRESH_COLORS } from '../src/lib/freshness';
import { Text, Button, TextInput, Card, Label, Chip } from '../src/ui';
import { c } from '../src/theme';

const FRESH_LABEL = { green: 'Fresh', amber: 'Getting older', red: 'Use soon' } as const;

// Used for both "Use" (shade what's left) and editing location / age date.
export default function Item() {
  const { id } = useLocalSearchParams<{ id: string }>(); const router = useRouter(); const { session, householdId } = useApp();
  const [item, setItem] = useState<any>(null); const [locs, setLocs] = useState<Loc[]>([]);
  const [mask, setMask] = useState([true, true, true, true]); const [loc, setLoc] = useState<string | null>(null); const [age, setAge] = useState('');

  useEffect(() => { (async () => {
    const { data } = await supabase.from('inventory_view').select('*').eq('id', id).maybeSingle();
    if (!data) return;
    setItem(data); setMask([0, 1, 2, 3].map(i => i < data.quarters_left)); setLoc(data.location_id); setAge(String(data.age_date).slice(0, 10)); setLocs(await fetchLocations());
  })(); }, [id]);
  if (!item) return <View style={{ padding: 24 }}><Text>Loading…</Text></View>;

  const quarters = mask.filter(Boolean).length;
  const days = Math.round((Date.now() - new Date(item.age_date).getTime()) / 86400000);
  const del = async () => {
    if (!(await confirm('Delete this item?', `${item.name} will be removed from your inventory. This can't be undone.`))) return;
    await enqueue({ table: 'inventory_items', kind: 'delete', match: { id } });
    router.back();
  };
  const save = async () => {
    const data: Record<string, unknown> = {};
    if (quarters !== item.quarters_left) { data.quarters_left = quarters; data.consumed_at = quarters === 0 ? new Date().toISOString() : null; }
    if (loc !== item.location_id) data.location_id = loc;
    if (age !== String(item.age_date).slice(0, 10)) {
      const d = new Date(age); if (isNaN(d.getTime())) return notify('Date must look like 2026-03-15');
      data.age_override_at = d.toISOString();
    }
    if (!Object.keys(data).length) return router.back();
    const log = (action: string, payload: object) => enqueue({ table: 'logs', kind: 'insert', data: { id: Crypto.randomUUID(), household_id: householdId, user_id: session?.user.id, action, product_id: item.product_id, payload } });
    if (quarters !== item.quarters_left) await log('use', { item_id: id, from_q: item.quarters_left });
    if (loc !== item.location_id) await log('move', { item_ids: [id], from: item.location_id ?? '', to: loc ?? '' });
    await enqueue({ table: 'inventory_items', kind: 'update', data, match: { id } });
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} stickyHeaderIndices={[0]}>
      <View style={{ backgroundColor: c.ink[50], paddingBottom: 4 }}><Button title="Save" onPress={save} /></View>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: '800' }}>{item.name}</Text>
        {(item.category || item.subcategory) && <Text style={{ color: c.ink[500] }}>{[item.category ? canonCategory(item.category, item.subcategory) : '', item.subcategory].filter(Boolean).join(' › ')}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: FRESH_COLORS[item.freshness as 'green' | 'amber' | 'red'] }} />
          <Text style={{ color: c.ink[500] }}>{FRESH_LABEL[item.freshness as 'green' | 'amber' | 'red']} · {days} day{days === 1 ? '' : 's'} in storage</Text>
        </View>
      </Card>

      <Card style={{ alignItems: 'center' }}>
        <Label>What's left</Label>
        <QuarterPie mask={mask} onChange={setMask} />
        <Text style={{ fontSize: 13, color: c.ink[400] }}>Tap a quarter to mark it used or put it back</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
          <View style={{ flex: 1 }}><Button tone="ghost" title="Reset to full" onPress={() => setMask([true, true, true, true])} /></View>
          <View style={{ flex: 1 }}><Button tone="clay" title="Used it all" onPress={() => setMask([false, false, false, false])} /></View>
        </View>
      </Card>

      <Card>
        <Label>Location</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {locs.map(l => <Chip key={l.id} label={l.name} on={loc === l.id} onPress={() => setLoc(l.id)} />)}
          <Chip label="No Location" on={loc === null} onPress={() => setLoc(null)} />
        </View>
      </Card>

      <Card>
        <Label>Age date (YYYY-MM-DD)</Label>
        <TextInput value={age} onChangeText={setAge} />
      </Card>
      <Button title="Save" onPress={save} />
      <Button tone="clay" title="Delete this item" onPress={del} />
    </ScrollView>
  );
}
