// Native (iOS/Android). Web uses Scanner.web.tsx automatically.
import React, { useRef } from 'react';
import { View, Text, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { ScannerProps } from './scannerTypes';
import { beep } from '../lib/beep';

export default function Scanner({ onBarcode, onPhoto, onCancel, hint }: ScannerProps) {
  const [perm, ask] = useCameraPermissions();
  const cam = useRef<CameraView>(null); const done = useRef(false);
  if (!perm) return null;
  if (!perm.granted) return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text>Camera access is needed to scan.</Text><Button title="Allow camera" onPress={ask} /><Button title="Cancel" onPress={onCancel} />
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cam} style={{ flex: 1 }} facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }}
        onBarcodeScanned={({ data }) => { if (done.current) return; done.current = true; beep(); onBarcode(data); }} />
      <View style={{ padding: 12, gap: 8 }}>
        <Text style={{ textAlign: 'center' }}>{hint || 'Point at a barcode, or take a photo of the label'}</Text>
        <Button title="Take photo of label (AI)" onPress={async () => {
          const p = await cam.current?.takePictureAsync({ base64: true, quality: 0.4 }); if (p?.base64) onPhoto(p.base64);
        }} />
        <Button title="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}
