import React, { useState } from 'react';
import { View } from 'react-native';
import { TextInput, Button, Text } from '../src/ui';
import { notify } from '../src/lib/notify';
import { supabase } from '../src/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const go = async (signUp: boolean) => {
    const { error } = signUp ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
    if (error) notify('Error', error.message);
  };
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Sign in</Text>
      <TextInput placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 12, borderRadius: 8 }} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={{ borderWidth: 1, padding: 12, borderRadius: 8 }} />
      <Button title="Sign in" onPress={() => go(false)} />
      <Button title="Create account" onPress={() => go(true)} />
    </View>
  );
}
