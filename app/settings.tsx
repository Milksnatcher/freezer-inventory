import React, { useCallback, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useApp } from '../src/lib/session';
import { confirm, notify } from '../src/lib/notify';
import { fetchLocations, Loc } from '../src/lib/data';
import { Text, Button, TextInput, Card, Label } from '../src/ui';
import { c } from '../src/theme';

const describe = (l: any) => {
  const n = l.products?.name ?? 'item';
  if (l.action === 'add') return `Added ${l.payload?.item_ids?.length ?? 1} × ${n}`;
  if (l.action === 'use') return `Used ${n}`;
  if (l.action === 'move') return `Moved ${n}`;
  return `${l.action} ${n}`;
};

export default function Settings() {
  const { householdId } = useApp(); const router = useRouter();
  const [code, setCode] = useState('');
  const [locs, setLocs] = useState<Loc[]>([]); const [newLoc, setNewLoc] = useState(''); const [logs, setLogs] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [{ data: hh }, l, { data: lg }] = await Promise.all([
      supabase.from('households').select('invite_code').eq('id', householdId!).maybeSingle(),
      fetchLocations(),
      supabase.from('logs').select('id,action,payload,created_at,products(name)').order('created_at', { ascending: false }).limit(30),
    ]);
    setCode(hh?.invite_code ?? ''); setLocs(l); setLogs(lg ?? []);
  }, [householdId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addLoc = async () => {
    if (!newLoc.trim()) return;
    const { error } = await supabase.from('locations').insert({ household_id: householdId, name: newLoc.trim(), sort: locs.length + 1 });
    if (error) return notify('Error', error.message);
    setNewLoc(''); load();
  };
  const delLoc = async (l: Loc) => {
    const { count } = await supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('location_id', l.id).is('consumed_at', null);
    const msg = count ? `${count} item(s) here will move to "No Location".` : 'This location is empty.';
    if (!(await confirm(`Delete ${l.name}?`, msg))) return;
    const { error } = await supabase.from('locations').delete().eq('id', l.id);
    if (error) notify('Error', error.message); else load();
  };
  const undo = async (l: any) => {
    if (!(await confirm('Undo this action?', `${describe(l)}\nThis reverses it and removes the log entry.`))) return;
    const { error } = await supabase.rpc('undo_log', { p_log: l.id });
    if (error) notify('Error', error.message); else load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Card>
        <Label>Household</Label>
        <Text style={{ color: c.ink[500] }}>Invite code for your partner</Text>
        <View style={{ alignSelf: 'flex-start', backgroundColor: c.sage[50], borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: c.sage[700], letterSpacing: 2 }}>{code}</Text>
        </View>
      </Card>

      <Card>
        <Label>Storage locations</Label>
        {locs.map(l => (
          <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ fontSize: 16, flex: 1 }}>{l.name}</Text>
            <Button tone="clay" title="Delete" onPress={() => delLoc(l)} />
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput placeholder="New location (e.g. Shed fridge)" value={newLoc} onChangeText={setNewLoc} style={{ flex: 1 }} />
          <Button title="Add" onPress={addLoc} />
        </View>
      </Card>

      <Card>
        <Label>Shopping rules and labels</Label>
        <Button tone="ghost" title="Staples and minimum stock" onPress={() => router.push('/staples')} />
        <Button tone="ghost" title="Make a label for homemade food" onPress={() => router.push('/label')} />
      </Card>

      <Card>
        <Label>Recent logs</Label>
        {logs.length === 0 && <Text style={{ color: c.ink[400] }}>No activity yet.</Text>}
        {logs.map(l => (
          <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: c.ink[100], paddingBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text>{describe(l)}</Text>
              <Text style={{ color: c.ink[400], fontSize: 12 }}>{new Date(l.created_at).toLocaleString()}</Text>
            </View>
            <Button tone="ghost" title="Undo" onPress={() => undo(l)} />
          </View>
        ))}
      </Card>

      <Button tone="ghost" title="Sign out" onPress={() => supabase.auth.signOut()} />
    </ScrollView>
  );
}
