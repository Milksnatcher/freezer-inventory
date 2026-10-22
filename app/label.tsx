import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, Platform } from 'react-native';
import { Text, TextInput, Button, Chip } from '../src/ui';
import ViewShot, { captureRef } from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { useApp } from '../src/lib/session';
import { enqueue } from '../src/lib/outbox';
import { categorize, createProduct, fetchLocations, findProductByName, Loc } from '../src/lib/data';
import { notify } from '../src/lib/notify';

const LABEL_W = 400, LABEL_H = 240;   // px; adjust to suit your label printer
type Made = { name: string; code: string; date: string };

export default function Label() {
  const { session, householdId } = useApp();
  const [locs, setLocs] = useState<Loc[]>([]); const [locId, setLocId] = useState<string | null>(null);
  const [name, setName] = useState(''); const [made, setMade] = useState<Made | null>(null);
  const shot = useRef<View>(null);
  useEffect(() => { fetchLocations().then(l => { setLocs(l); setLocId(l[0]?.id ?? null); }); }, []);

  // Creates the inventory item (with a unique label code) and shows the label
  const create = async () => {
    if (!name.trim() || !householdId || !session) return notify('Enter what it is');
    const clean = name.trim();
    const product = (await findProductByName(clean)) ?? (await createProduct({ householdId, name: clean, source: 'label' }));
    const itemId = Crypto.randomUUID();
    const code = 'PM-' + Crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    await enqueue({ table: 'inventory_items', kind: 'insert', data: { id: itemId, household_id: householdId, product_id: product.id, location_id: locId, label_code: code } });
    await enqueue({ table: 'logs', kind: 'insert', data: { id: Crypto.randomUUID(), household_id: householdId, user_id: session.user.id, action: 'add', product_id: product.id, payload: { item_ids: [itemId] } } });
    if (!product.category) categorize(product.id, clean).catch(() => {});
    setMade({ name: clean, code, date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) });
  };

  const capture = (result: 'tmpfile' | 'data-uri') => captureRef(shot, { format: 'png', quality: 1, result });

  const save = async () => {
    try {
      if (Platform.OS === 'web') {
        const uri = await capture('data-uri');
        const a = document.createElement('a'); a.href = uri; a.download = `label-${made!.name.replace(/\W+/g, '-')}-${made!.code}.png`; a.click();
        return;
      }
      const perm = await MediaLibrary.requestPermissionsAsync(); if (!perm.granted) return notify('Photos permission is needed to save the label');
      const asset = await MediaLibrary.createAssetAsync(await capture('tmpfile'));
      await MediaLibrary.createAlbumAsync('PantryLabels', asset, false);   // fixed folder for MacroDroid to watch
      notify('Saved', 'Label saved in the "PantryLabels" album.');
    } catch (e: any) { notify('Could not save', String(e?.message ?? e)); }
  };
  const share = async () => {
    try { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(await capture('tmpfile')); else notify('Sharing is not available here', 'Use Save instead.'); }
    catch (e: any) { notify('Could not share', String(e?.message ?? e)); }
  };

  if (made) return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, alignItems: 'center' }}>
      <ViewShot ref={shot as any} style={{ width: LABEL_W, height: LABEL_H, backgroundColor: '#fff', borderWidth: 3, borderColor: '#000', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#000' }} numberOfLines={3}>{made.name}</Text>
          <Text style={{ fontSize: 18, marginTop: 8, color: '#000' }}>Stored: {made.date}</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <QRCode value={made.code} size={140} backgroundColor="#fff" color="#000" />
          <Text style={{ fontSize: 12, color: '#000' }}>{made.code}</Text>
        </View>
      </ViewShot>
      <Text style={{ color: '#4E8267' }}>Added to inventory. Scan the QR on the Use screen when you open it.</Text>
      <Button title={Platform.OS === 'web' ? 'Download PNG' : 'Save PNG to PantryLabels'} onPress={save} />
      {Platform.OS !== 'web' && <Button title="Share" onPress={share} />}
      <Button title="Make another" onPress={() => { setMade(null); setName(''); }} />
    </ScrollView>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontWeight: '700' }}>Where is it going?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {locs.map(l => <Chip key={l.id} label={l.name} on={locId === l.id} onPress={() => setLocId(l.id)} />)}
        <Chip label="No Location" on={locId === null} onPress={() => setLocId(null)} />
      </View>
      <TextInput placeholder="What is it? (e.g. Chilli con carne)" value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 12, borderRadius: 8, fontSize: 18 }} />
      <Button title="Create label" onPress={create} />
    </ScrollView>
  );
}
