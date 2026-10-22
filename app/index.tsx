import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Plus, Minus, Snowflake, ShoppingCart, ArrowRight, ChefHat, BarChart3, Settings as Cog } from 'lucide-react-native';
import { Text, Card } from '../src/ui';
import { c, radius, shadow } from '../src/theme';

function Tile({ href, bg, Icon, title, sub }: { href: string; bg: string; Icon: any; title: string; sub: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: bg, borderRadius: radius.xl2, padding: 22, ...shadow.card, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}><Icon size={24} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>{title}</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{sub}</Text>
        </View>
        <ArrowRight size={20} color="rgba(255,255,255,0.7)" />
      </Pressable>
    </Link>
  );
}
function LinkRow({ href, Icon, title, sub }: { href: string; Icon: any; title: string; sub: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.xl2, borderWidth: 1, borderColor: c.ink[100], padding: 16, ...shadow.soft }}>
        <Icon size={20} color={c.sage[600]} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: c.ink[800] }}>{title}</Text>
          <Text style={{ fontSize: 13, color: c.ink[400] }}>{sub}</Text>
        </View>
        <ArrowRight size={18} color={c.ink[300]} />
      </Pressable>
    </Link>
  );
}

export default function Home() {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 48, gap: 16 }}>
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: c.sage[600] }}>Welcome back</Text>
        <Text style={{ fontSize: 32, fontWeight: '800', marginTop: 2 }}>Pantry</Text>
        <Text style={{ fontSize: 14, color: c.ink[500], marginTop: 6 }}>What's in the freezers and pantry, shared between you both.</Text>
      </View>
      <Tile href="/add" bg={c.sage[600]} Icon={Plus} title="Add" sub="Scan, snap a label, or type it in" />
      <Tile href="/use" bg={c.sky[600]} Icon={Minus} title="Use" sub="Scan or search, then mark what's left" />
      <Tile href="/inventory" bg={c.amber[500]} Icon={Snowflake} title="Full Inventory" sub="By location or by food type" />
      <Tile href="/shopping" bg={c.clay[500]} Icon={ShoppingCart} title="Shopping List" sub="Low stock lands here automatically" />
      <View style={{ gap: 10, marginTop: 8 }}>
        <LinkRow href="/dinner" Icon={ChefHat} title="What's for dinner?" sub="Ideas from what you have, oldest first" />
        <LinkRow href="/stats" Icon={BarChart3} title="Stats" sub="What you use, and what lingers" />
        <LinkRow href="/settings" Icon={Cog} title="Settings" sub="Locations, logs, labels, staples" />
      </View>
    </ScrollView>
  );
}
