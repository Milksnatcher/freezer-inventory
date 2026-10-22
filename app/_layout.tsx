import React from 'react';
import { View } from 'react-native';
import { Stack, Redirect, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { AppProvider, useApp } from '../src/lib/session';
import BottomNav from '../src/components/BottomNav';
import { c, font } from '../src/theme';
import '../src/lib/outbox'; // starts connectivity listener

const titles: Record<string, string> = {
  add: 'Add', use: 'Use', inventory: 'Full inventory', shopping: 'Shopping list', item: 'Item', dinner: "What's for dinner?",
  stats: 'Stats', staples: 'Staples', settings: 'Settings', label: 'Make a label',
};

function Gate() {
  const { session, householdId, loading } = useApp();
  const seg = useSegments()[0];
  if (loading) return null;
  if (!session && seg !== 'login') return <Redirect href="/login" />;
  if (session && !householdId && seg !== 'household') return <Redirect href="/household" />;
  const ready = !!session && !!householdId;
  return (
    <View style={{ flex: 1, backgroundColor: c.ink[50] }}>
      <Stack screenOptions={{
        headerStyle: { backgroundColor: c.ink[50] }, headerShadowVisible: false, headerTintColor: c.sage[700],
        headerTitleStyle: { fontFamily: font.display, color: c.ink[800] }, contentStyle: { backgroundColor: c.ink[50] },
      }}>
        {['index', 'login', 'household'].map(n => <Stack.Screen key={n} name={n} options={{ headerShown: false }} />)}
        {Object.entries(titles).map(([n, t]) => <Stack.Screen key={n} name={n} options={{ title: t }} />)}
      </Stack>
      {ready && <BottomNav />}
    </View>
  );
}

export default function Root() {
  const [loaded] = useFonts({ Manrope_700Bold, Manrope_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  if (!loaded) return null;
  return <AppProvider><Gate /></AppProvider>;
}
