import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Snowflake } from 'lucide-react-native';
import { Text, TextInput, Button, Card, Label } from '../src/ui';
import { notify } from '../src/lib/notify';
import { supabase } from '../src/lib/supabase';
import { c } from '../src/theme';

export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const go = async (signUp: boolean) => {
    const { error } = signUp ? await supabase.auth.signUp({ email: email.trim(), password }) : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) notify('Error', error.message);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 72, gap: 16 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.sage[600], alignItems: 'center', justifyContent: 'center' }}><Snowflake size={30} color="#fff" /></View>
        <Text style={{ fontSize: 32, fontWeight: '800' }}>Pantry</Text>
        <Text style={{ color: c.ink[500] }}>Sign in to your shared inventory</Text>
      </View>
      <Card>
        <Label>Email</Label>
        <TextInput placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Label>Password</Label>
        <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      </Card>
      <Button title="Sign in" onPress={() => go(false)} />
      <Button tone="ghost" title="Create account" onPress={() => go(true)} />
    </ScrollView>
  );
}
