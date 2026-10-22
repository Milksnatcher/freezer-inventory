import React, { useState } from 'react';
import { View } from 'react-native';
import { TextInput, Button, Text } from '../src/ui';
import { notify } from '../src/lib/notify';
import { supabase } from '../src/lib/supabase';
import { useApp } from '../src/lib/session';

export default function Household() {
  const { refresh } = useApp(); const [code, setCode] = useState('');
  const run = async (fn: 'create_household' | 'join_household', args?: object) => {
    const { error } = await supabase.rpc(fn, args); if (error) notify('Error', error.message); else refresh();
  };
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>First phone: create the household</Text>
      <Button title="Create household" onPress={() => run('create_household')} />
      <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 24 }}>Second phone: join with invite code</Text>
      <TextInput placeholder="Invite code" autoCapitalize="none" value={code} onChangeText={setCode} style={{ borderWidth: 1, padding: 12, borderRadius: 8 }} />
      <Button title="Join" onPress={() => run('join_household', { p_code: code.trim() })} />
    </View>
  );
}
