// Supermarket-checkout style scanner beep (short, bright, ~1.8 kHz). Web uses WebAudio; phones fall back to a short vibration.
import { Platform, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'beep:enabled';
let enabled = true;
AsyncStorage.getItem(KEY).then(v => { if (v === '0') enabled = false; }).catch(() => {});

export const isBeepEnabled = () => enabled;
export async function setBeepEnabled(v: boolean) { enabled = v; try { await AsyncStorage.setItem(KEY, v ? '1' : '0'); } catch {} }

let ctx: any = null;
const audio = () => {
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  ctx = ctx ?? new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

// Call from a tap (e.g. the Scan button): browsers only allow sound after a user gesture.
export function unlockBeep() {
  if (Platform.OS !== 'web') return;
  try {
    const a = audio(); if (!a) return;
    const s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, 22050); s.connect(a.destination); s.start(0);
  } catch {}
}

export function beep(force = false) {
  if (!enabled && !force) return;
  try {
    if (Platform.OS !== 'web') { Vibration.vibrate(60); return; }
    const a = audio(); if (!a) return;
    const t = a.currentTime; const osc = a.createOscillator(); const gain = a.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(1800, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
    gain.gain.setValueAtTime(0.25, t + 0.11);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(gain); gain.connect(a.destination); osc.start(t); osc.stop(t + 0.15);
  } catch {}
}
