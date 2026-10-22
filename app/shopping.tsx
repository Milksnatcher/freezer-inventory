import React, { useCallback, useRef, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { Text, Button, TextInput, Switch } from '../src/ui';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Crypto from 'expo-crypto';
import { supabase } from '../src/lib/supabase';
import { enqueue } from '../src/lib/outbox';
import { useApp } from '../src/lib/session';

type Item = { id: string; name: string };
const speakAsync = (text: string) => new Promise<void>(res => Speech.speak(text, { language: 'en-GB', rate: 0.9, onDone: () => res(), onStopped: () => res(), onError: () => res() }));
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const joinNames = (n: string[]) => n.length === 1 ? n[0] : `${n.slice(0, -1).join(', ')}, and ${n[n.length - 1]}`;

export default function Shopping() {
  const { householdId } = useApp();
  const [items, setItems] = useState<Item[]>([]); const [text, setText] = useState('');
  const [oneByOne, setOneByOne] = useState(false); const [speaking, setSpeaking] = useState(false); const stopped = useRef(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('shopping_list_items').select('id,name').order('created_at');
    setItems(data ?? []);
  }, []);
  useFocusEffect(useCallback(() => {
    load();
    const ch = supabase.channel('shop').on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_items' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]));

  const add = async () => {
    const name = text.trim(); if (!name || !householdId) return;
    const id = Crypto.randomUUID();
    setItems(i => [...i, { id, name }]); setText('');
    await enqueue({ table: 'shopping_list_items', kind: 'insert', data: { id, household_id: householdId, name } });
  };
  const remove = async (id: string) => {
    setItems(i => i.filter(x => x.id !== id));
    await enqueue({ table: 'shopping_list_items', kind: 'delete', match: { id } });
  };

  // Alexa batch upload: the phone "says" the command out loud next to the Echo
  const play = async () => {
    if (!items.length) return;
    stopped.current = false; setSpeaking(true);
    const names = items.map(i => i.name);
    if (oneByOne) {
      for (const n of names) { if (stopped.current) break; await speakAsync(`Alexa, add ${n} to my shopping list`); await sleep(4000); }
    } else {
      await speakAsync(`Alexa, add ${joinNames(names)} to my shopping list`);
    }
    setSpeaking(false);
  };
  const stop = () => { stopped.current = true; Speech.stop(); setSpeaking(false); };

  return (
    <View style={{ flex: 1, padding: 12, gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput placeholder="Add an item" value={text} onChangeText={setText} onSubmitEditing={add} style={{ flex: 1, borderWidth: 1, padding: 10, borderRadius: 8 }} />
        <Button title="Add" onPress={add} />
      </View>
      <FlatList data={items} keyExtractor={i => i.id}
        ListEmptyComponent={<Text style={{ padding: 16, color: '#57685E' }}>Nothing to buy. Items appear here when stock runs out.</Text>}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#E9EDEB' }}>
            <Text style={{ flex: 1, fontSize: 17 }}>{item.name}</Text>
            <Pressable onPress={() => remove(item.id)} style={{ padding: 8 }}><Text style={{ fontSize: 20, color: '#B45E4C' }}>✕</Text></Pressable>
          </View>
        )} />
      <View style={{ gap: 8, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Switch value={oneByOne} onValueChange={setOneByOne} /><Text style={{ flex: 1 }}>One item per command (use if Alexa lumps them into one entry)</Text>
        </View>
        {speaking ? <Button title="Stop" color="#d64545" onPress={stop} /> : <Button title="▶ Play to Alexa" onPress={play} disabled={!items.length} />}
        <Text style={{ color: '#57685E', fontSize: 12 }}>Hold the phone close to your Echo with the volume up, then press play.</Text>
      </View>
    </View>
  );
}
