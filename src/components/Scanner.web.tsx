// Web/PWA: camera via getUserMedia + ZXing for barcodes (needs HTTPS, which GitHub Pages provides).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { ScannerProps } from './scannerTypes';

export default function Scanner({ onBarcode, onPhoto, onCancel, hint }: ScannerProps) {
  const video = useRef<HTMLVideoElement>(null); const done = useRef(false);
  const cb = useRef(onBarcode); cb.current = onBarcode;
  const [err, setErr] = useState('');

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(); let controls: { stop(): void } | undefined; let gone = false;
    reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current!, result => {
      if (result && !done.current) { done.current = true; cb.current(result.getText()); }
    }).then(c => { if (gone) c.stop(); else controls = c; }).catch(e => setErr(String(e?.message ?? e)));
    return () => { gone = true; controls?.stop(); };
  }, []);

  const snap = () => {
    const v = video.current!; if (!v.videoWidth) return;
    const s = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas'); c.width = v.videoWidth * s; c.height = v.videoHeight * s;
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    onPhoto(c.toDataURL('image/jpeg', 0.6).split(',')[1]);
  };

  return (
    <View style={{ flex: 1 }}>
      <video ref={video} playsInline muted autoPlay style={{ width: '100%', height: '60vh', objectFit: 'cover', background: '#000' }} />
      <View style={{ padding: 12, gap: 8 }}>
        <Text style={{ textAlign: 'center' }}>{err || hint || 'Point at a barcode, or take a photo of the label'}</Text>
        <Button title="Take photo of label (AI)" onPress={snap} />
        <Button title="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}
