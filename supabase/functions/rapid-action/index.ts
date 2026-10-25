// Edge Function keeps the Anthropic key server-side. Paste into Supabase -> Edge Functions -> rapid-action -> Deploy updates.
// Secret needed: ANTHROPIC_API_KEY
import Anthropic from 'npm:@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
const MODEL = 'claude-sonnet-4-6';

// The web app calls this from github.io, so the browser needs CORS headers.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { task, imageBase64, items, preferOld, candidates, others } = await req.json();
    let content: any[]; let system: string;

    if (task === 'label') {
      system = 'Read the food package. Reply ONLY JSON: {"name":string,"brand":string|null,"category":string,"subcategory":string,"match":string|null}. Use a short plain product name (e.g. "Comté cheese"), not marketing text.';
      const known = candidates?.length
        ? ` Known product names: ${JSON.stringify(candidates)}. If this is the same product as one of them, set "match" to that exact name, otherwise null.`
        : ' Set "match" to null.';
      content = [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
                 { type: 'text', text: 'Identify this product.' + known }];
    } else if (task === 'categorize') {
      system = 'For each item give a broad category (Meat, Fish, Pasta, Dairy, Vegetables, ...) and a specific subcategory (e.g. Meat -> Chicken, Beef, Pork; Fish -> Salmon). Reply ONLY JSON: {"<item name>":{"category":string,"subcategory":string}}';
      content = [{ type: 'text', text: JSON.stringify(items) }];
    } else {
      system = 'You are a practical home cook. Suggest 3 quick, realistic recipes (under 45 minutes) from the household inventory. Amounts are in units (1 = a full pack; 0.5 = half used). ' +
        (preferOld
          ? 'The "priority" items are the oldest stock: build each recipe mainly around them to prevent waste. You may add items from "also_available". '
          : 'Use items from "available". ') +
        'Assume only basic cupboard staples (oil, salt, pepper, spices, stock cubes) beyond the list. Reply ONLY JSON array of {"title":string,"minutes":number,"uses":[string],"steps":[string]}.';
      content = [{ type: 'text', text: JSON.stringify(preferOld ? { priority: items, also_available: others ?? [] } : { available: items }) }];
    }
    const r = await client.messages.create({ model: MODEL, max_tokens: 1800, system, messages: [{ role: 'user', content }] });
    const text = r.content.map((b: any) => b.text ?? '').join('');
    // take the first JSON object/array in the reply, in case the model adds any extra words
    const m = text.match(/[\[{][\s\S]*[\]}]/);
    return json(JSON.parse(m ? m[0] : text));
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
