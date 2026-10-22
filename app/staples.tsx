import React, { useCallback, useState } from 'react';
import { View, FlatList } from 'react-native';
import { Text, TextInput, Switch, Button } from '../src/ui';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { notify } from '../src/lib/notify';

type P = { id: string; name: string; is_staple: boolean; low_stock_threshold: number };

export default function Staples() {
  const [q, setQ] = useState(''); const [rows, setRows] = useState<P[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from('products').select('id,name,is_staple,low_stock_threshold').ilike('name', `%${q}%`).order('name').limit(200);
    setRows(data ?? []);
  }, [q]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patch = async (id: string, change: Partial<P>) => {
    setRows(r => r.map(x => (x.id === id ? { ...x, ...change } : x)));
    const { error } = await supabase.from('products').update(change).eq('id', id);
    if (error) { notify('Error', error.message); load(); }
  };
  return (
    <View style={{ flex: 1, padding: 12, gap: 8 }}>
      <Text style={{ color: '#57685E' }}>Staples never go on the shopping list. Minimum stock is the number of units that triggers a restock.</Text>
      <TextInput placeholder="Search products" value={q} onChangeText={setQ} style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <FlatList data={rows} keyExtractor={r => r.id} renderItem={({ item }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#E9EDEB' }}>
          <Text style={{ flex: 1, fontSize: 16 }}>{item.name}</Text>
          <Button title="−" onPress={() => patch(item.id, { low_stock_threshold: Math.max(1, item.low_stock_threshold - 1) })} />
          <Text>min {item.low_stock_threshold}</Text>
          <Button title="+" onPress={() => patch(item.id, { low_stock_threshold: item.low_stock_threshold + 1 })} />
          <Text>Staple</Text><Switch value={item.is_staple} onValueChange={v => patch(item.id, { is_staple: v })} />
        </View>
      )} />
    </View>
  );
}
