import React from 'react';
import { Text as RNText, TextProps, TextInput as RNTextInput, TextInputProps, Pressable, Switch as RNSwitch, SwitchProps, View, ViewProps, StyleSheet } from 'react-native';
import { c, font, radius, shadow } from './theme';

// Custom fonts need an explicit family per weight, so map fontWeight -> Manrope/Inter.
function pickFamily(weight: unknown): string {
  const w = String(weight ?? '400');
  if (w === '800' || w === '900') return font.display;
  if (w === 'bold' || w === '700') return font.displayBold;
  if (w === '600') return font.bodySemi;
  if (w === '500') return font.bodyMed;
  return font.body;
}
export function Text({ style, ...p }: TextProps) {
  const s = StyleSheet.flatten(style) ?? {};
  return <RNText {...p} style={[{ color: c.ink[800] }, s, { fontFamily: s.fontFamily ?? pickFamily(s.fontWeight), fontWeight: 'normal' }]} />;
}

export const Card = ({ style, ...p }: ViewProps) => (
  <View {...p} style={[{ backgroundColor: '#fff', borderRadius: radius.xl2, padding: 16, gap: 10, ...shadow.soft }, style]} />
);
export const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: c.ink[400] }}>{children}</Text>
);

const tones = { sage: c.sage[600], sky: c.sky[600], clay: c.clay[500], amber: c.amber[500] };
export function Button({ title, onPress, tone = 'sage', color, disabled }: { title: string; onPress?: () => void; tone?: keyof typeof tones | 'ghost'; color?: string; disabled?: boolean }) {
  const t = color ? 'clay' : tone; const ghost = t === 'ghost';
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => ({
      backgroundColor: ghost ? c.sage[50] : tones[t as keyof typeof tones], borderWidth: 1.5, borderColor: ghost ? c.sage[100] : 'transparent',
      borderRadius: radius.xl2, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
    })}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: ghost ? c.sage[700] : '#fff' }}>{title}</Text>
    </Pressable>
  );
}

export function TextInput({ style, ...p }: TextInputProps) {
  return <RNTextInput placeholderTextColor={c.ink[300]} {...p}
    style={[{ backgroundColor: '#fff', borderWidth: 1, borderColor: c.ink[100], borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: c.ink[800], fontFamily: font.body }, style]} />;
}
export const Switch = (p: SwitchProps) => <RNSwitch trackColor={{ false: c.ink[200], true: c.sage[400] }} thumbColor="#fff" {...p} />;

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: on ? c.sage[500] : c.sage[100], backgroundColor: on ? c.sage[500] : c.sage[50] }}>
      <Text style={{ fontWeight: '600', color: on ? '#fff' : c.sage[700] }}>{label}</Text>
    </Pressable>
  );
}

// four little pills showing how much of an item is left
export function MiniQuarters({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[0, 1, 2, 3].map(i => <View key={i} style={{ width: 12, height: 6, borderRadius: 3, backgroundColor: i < n ? c.sage[400] : c.ink[100] }} />)}
    </View>
  );
}

export function OpenedTag() {
  return (
    <View style={{ backgroundColor: c.amber[50], borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: c.amber[200] }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.amber[700] }}>Opened</Text>
    </View>
  );
}

// pill-style switcher, e.g. Location | Food type | Oldest first
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.sage[50], borderRadius: 14, padding: 4, borderWidth: 1, borderColor: c.sage[100] }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, backgroundColor: on ? c.sage[600] : 'transparent' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: on ? '#fff' : c.sage[700] }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
