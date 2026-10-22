// Offline-first write queue. Ops are stored locally and flushed to Supabase in order.
// Inserts carry client_op_id, so a retry never creates duplicates.
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

type Op = { id: string; table: string; kind: 'insert' | 'update' | 'delete'; data?: any; match?: any };
const KEY = 'outbox:v1';
const load = async (): Promise<Op[]> => JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]');
const save = (q: Op[]) => AsyncStorage.setItem(KEY, JSON.stringify(q));

// serialise all queue mutations so enqueue and flush never overwrite each other
let chain: Promise<unknown> = Promise.resolve();
const locked = <T>(fn: () => Promise<T>): Promise<T> => { const r = chain.then(fn); chain = r.catch(() => {}); return r; };

export async function enqueue(op: Omit<Op, 'id'>) {
  await locked(async () => { const q = await load(); q.push({ ...op, id: Crypto.randomUUID() }); await save(q); });
  flush();
}

let flushing = false;
export async function flush() {
  if (flushing || !(await NetInfo.fetch()).isConnected) return;
  flushing = true; let failed = false;
  try {
    for (;;) {
      const [op] = await load();
      if (!op) break;
      const t = supabase.from(op.table);
      const { error } =
        op.kind === 'insert' ? await t.upsert({ ...op.data, client_op_id: op.id }, { onConflict: 'client_op_id', ignoreDuplicates: true })
        : op.kind === 'update' ? await t.update(op.data).match(op.match)
        : await t.delete().match(op.match);
      if (error) {
        // data/constraint errors (SQLSTATE 22xxx/23xxx) will never succeed: drop the op so it can't block the queue
        if (/^2[23]/.test(error.code ?? '')) { console.warn('outbox dropped', error.message); }
        else { failed = true; console.warn('outbox', error.message); break; }
      }
      await locked(async () => save((await load()).filter(o => o.id !== op.id)));
    }
  } finally { flushing = false; }
  if (!failed && (await load()).length) flush();
}
NetInfo.addEventListener(s => { if (s.isConnected) flush(); });
