import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Button, Switch } from '../src/ui';
import { supabase } from '../src/lib/supabase';
import { notify } from '../src/lib/notify';
import { shadow } from '../src/theme';
import { AI_FUNCTION } from '../src/lib/config';

type Recipe = { title: string; minutes?: number; uses: string[]; steps: string[] };
const rank = { green: 0, amber: 1, red: 2 } as const;

export default function Dinner() {
  const [oldOnly, setOldOnly] = useState(false); const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null); const [msg, setMsg] = useState('');

  const go = async () => {
    setLoading(true); setRecipes(null); setMsg('');
    try {
      const { data } = await supabase.from('inventory_view').select('product_id,name,quarters_left,age_date,freshness');
      // one entry per product: total amount in units, oldest age, worst freshness
      const map = new Map<string, { name: string; units: number; days: number; f: 'green' | 'amber' | 'red' }>();
      (data ?? []).forEach((r: any) => {
        const days = (Date.now() - new Date(r.age_date).getTime()) / 86400000;
        const cur = map.get(r.product_id) ?? { name: r.name, units: 0, days: 0, f: 'green' as const };
        cur.units += r.quarters_left / 4; cur.days = Math.max(cur.days, days);
        if (rank[r.freshness as 'green' | 'amber' | 'red'] > rank[cur.f]) cur.f = r.freshness;
        map.set(r.product_id, cur);
      });
      const all = [...map.values()].map(x => ({ name: x.name, amount_units: Math.round(x.units * 4) / 4, oldest_days: Math.round(x.days), age_bracket: x.f }));
      if (!all.length) return setMsg('Your inventory is empty.');
      const old = all.filter(x => x.age_bracket !== 'green');
      if (oldOnly && !old.length) return setMsg('Nothing is in the amber or red zone yet. Turn the toggle off to use everything.');
      const { data: out, error } = await supabase.functions.invoke(AI_FUNCTION, {
        body: { task: 'recipes', preferOld: oldOnly, items: oldOnly ? old : all, others: oldOnly ? all.filter(x => x.age_bracket === 'green').map(x => x.name) : [] },
      });
      if (error) return notify('Could not get ideas', error.message);
      const parsed = typeof out === 'string' ? JSON.parse(out) : out;
      setRecipes(Array.isArray(parsed) ? parsed : []);
    } catch (e: any) { notify('Could not get ideas', String(e?.message ?? e)); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Switch value={oldOnly} onValueChange={setOldOnly} />
        <Text style={{ flex: 1 }}>Prioritise older items (amber and red) to avoid waste</Text>
      </View>
      <Button title="What's for dinner?" onPress={go} disabled={loading} />
      {loading && <ActivityIndicator />}
      {msg ? <Text style={{ color: '#57685E' }}>{msg}</Text> : null}
      {recipes?.map((r, i) => (
        <View key={i} style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 6, ...shadow.soft }}>
          <Text style={{ fontSize: 20, fontWeight: '800' }}>{r.title}{r.minutes ? `  ·  ${r.minutes} min` : ''}</Text>
          <Text style={{ color: '#4E8267' }}>Uses: {r.uses?.join(', ')}</Text>
          {r.steps?.map((s, j) => <Text key={j}>{j + 1}. {s}</Text>)}
        </View>
      ))}
    </ScrollView>
  );
}
