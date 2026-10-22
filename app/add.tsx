import React, { useEffect, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/lib/session';
import { addItems, fetchLocations, searchProducts, resolveBarcode, resolvePhoto, Loc, Product } from '../src/lib/data';
import { notify } from '../src/lib/notify';
import Scanner from '../src/components/Scanner';
import { Text, Button, TextInput, Card, Label, Chip } from '../src/ui';
import { c } from '../src/theme';

export default function Add() {
  const { session, householdId } = useApp(); const router = useRouter();
  const [locs, setLocs] = useState<Loc[]>([]); const [locId, setLocId] = useState<string | null>(null);
  const [name, setName] = useState(''); const [picked, setPicked] = useState<Product | null>(null);
  const [sugg, setSugg] = useState<Product[]>([]); const [qty, setQty] = useState(1); const [last, setLast] = useState('');
  const [scanning, setScanning] = useState(false); const [hint, setHint] = useState(''); const [bc, setBc] = useState<string | undefined>();

  useEffect(() => { fetchLocations().then(l => { setLocs(l); setLocId(l[0]?.id ?? null); }); }, []);
  useEffect(() => { if (picked) return; const t = setTimeout(() => searchProducts(name).then(setSugg), 200); return () => clearTimeout(t); }, [name, picked]);

  const fill = (p: Product) => { setPicked(p); setName(p.name); setSugg([]); setScanning(false); setHint(''); setBc(undefined); };
  const onBarcode = async (code: string) => {
    if (code.startsWith('PM-')) { setHint('That is one of your homemade labels. Scan it on the Use screen.'); return; }
    setHint('Looking up…');
    const p = await resolveBarcode(code, householdId!, true);
    if (p) fill(p); else { setBc(code); setHint('Barcode not found online. Point at the label and tap Take photo.'); }
  };
  const onPhoto = async (b64: string) => {
    setHint('Reading label…');
    const p = await resolvePhoto(b64, householdId!, bc, true);
    if (p) fill(p); else setHint('Could not read that. Cancel and type it in, or try another photo.');
  };
  if (scanning) return <Scanner hint={hint} onBarcode={onBarcode} onPhoto={onPhoto} onCancel={() => { setScanning(false); setHint(''); }} />;

  const submit = async () => {
    if (!name.trim() || !householdId || !session) return notify('Enter an item name');
    await addItems({ householdId, userId: session.user.id, locationId: locId, name, product: picked, qty });
    setLast(`Added ${qty} × ${name.trim()}`); setName(''); setPicked(null); setSugg([]); setQty(1);
  };
  const round = { width: 44, height: 44, borderRadius: 22, backgroundColor: c.sage[50], borderWidth: 1.5, borderColor: c.sage[100], alignItems: 'center' as const, justifyContent: 'center' as const };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Card>
        <Label>Where is it going?</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {locs.map(l => <Chip key={l.id} label={l.name} on={locId === l.id} onPress={() => setLocId(l.id)} />)}
          <Chip label="No Location" on={locId === null} onPress={() => setLocId(null)} />
        </View>
      </Card>
      <Button tone="sky" title="Scan barcode / photo of label" onPress={() => setScanning(true)} />
      <Card>
        <Label>Item</Label>
        <TextInput placeholder="e.g. Frozen peas" value={name} onChangeText={t => { setName(t); setPicked(null); }} style={{ fontSize: 18 }} />
        {sugg.map(p => (
          <Pressable key={p.id} onPress={() => { setPicked(p); setName(p.name); setSugg([]); }} style={{ padding: 10, backgroundColor: c.sky[50], borderRadius: 12 }}>
            <Text>{p.name}{p.subcategory ? `  ·  ${p.subcategory}` : ''}</Text>
          </Pressable>
        ))}
        <Label>How many?</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <Pressable style={round} onPress={() => setQty(Math.max(1, qty - 1))}><Text style={{ fontSize: 22, fontWeight: '700', color: c.sage[700] }}>−</Text></Pressable>
          <Text style={{ fontSize: 28, fontWeight: '800', minWidth: 32, textAlign: 'center' }}>{qty}</Text>
          <Pressable style={round} onPress={() => setQty(qty + 1)}><Text style={{ fontSize: 22, fontWeight: '700', color: c.sage[700] }}>+</Text></Pressable>
        </View>
      </Card>
      <Button title="Add to inventory" onPress={submit} />
      {last ? <Text style={{ color: c.sage[600], fontWeight: '600', textAlign: 'center' }}>{last}</Text> : null}
      <Button tone="ghost" title="Homemade / leftovers? Make a label" onPress={() => router.push('/label')} />
    </ScrollView>
  );
}
