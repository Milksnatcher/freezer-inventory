// Edge Function keeps the Anthropic key server-side.
// Deploy: supabase functions deploy rapid-action ; supabase secrets set ANTHROPIC_API_KEY=...
import Anthropic from 'npm:@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
const MODEL = 'claude-sonnet-4-6';

Deno.serve(async (req) => {
  const { task, imageBase64, items, preferOld, candidates, others } = await req.json();
  let content: any[]; let system: string;

  if (task === 'label') {
    system = 'Read the food package. Reply ONLY JSON: {"name":string,"brand":string|null,"category":string,"subcategory":string,"match":string|null}. Use a short plain product name (e.g. "Garden peas"), not marketing text.';
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
  const text = r.content.map((b: any) => b.text ?? '').join('').replace(/```json|```/g, '').trim();
  return new Response(text, { headers: { 'Content-Type': 'application/json' } });
});
