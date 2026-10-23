import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, Label } from '../src/ui';
import { notify } from '../src/lib/notify';
import { supabase } from '../src/lib/supabase';
import { useApp } from '../src/lib/session';
import { c } from '../src/theme';

export default function Household() {
  const { refresh } = useApp(); const [code, setCode] = useState('');
  const run = async (fn: 'create_household' | 'join_household', args?: object) => {
    const { error } = await supabase.rpc(fn, args); if (error) notify('Error', error.message); else refresh();
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 72, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 28, fontWeight: '800' }}>Set up your household</Text>
      <Card>
        <Label>First person</Label>
        <Text style={{ color: c.ink[500] }}>Create the household, then share the invite code from Settings.</Text>
        <Button title="Create household" onPress={() => run('create_household')} />
      </Card>
      <Card>
        <Label>Second person</Label>
        <Text style={{ color: c.ink[500] }}>Enter the invite code you were given.</Text>
        <TextInput placeholder="Invite code" autoCapitalize="none" value={code} onChangeText={setCode} />
        <Button tone="sky" title="Join household" onPress={() => run('join_household', { p_code: code.trim() })} />
      </Card>
    </ScrollView>
  );
}
