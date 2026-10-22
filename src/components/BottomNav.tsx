import React from 'react';
import { View, Pressable } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Plus, Minus, Snowflake, ShoppingCart } from 'lucide-react-native';
import { Text } from '../ui';
import { c } from '../theme';

const items = [
  { href: '/', label: 'Home', Icon: Home }, { href: '/add', label: 'Add', Icon: Plus }, { href: '/use', label: 'Use', Icon: Minus },
  { href: '/inventory', label: 'Stock', Icon: Snowflake }, { href: '/shopping', label: 'List', Icon: ShoppingCart },
];

export default function BottomNav() {
  const path = usePathname(); const router = useRouter(); const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderColor: c.ink[100], paddingBottom: insets.bottom }}>
      {items.map(({ href, label, Icon }) => {
        const active = path === href;
        return (
          <Pressable key={href} onPress={() => router.navigate(href as any)} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10 }}>
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} color={active ? c.sage[600] : c.ink[400]} />
            <Text style={{ fontSize: 12, fontWeight: active ? '600' : '400', color: active ? c.sage[700] : c.ink[400] }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
