export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Configure OPENAI_API_KEY no ambiente da hospedagem.' });
  const { briefing, quantidade } = req.body || {};
  const n = Math.max(1, Math.min(20, Number(quantidade) || 5));
  if (!briefing || typeof briefing !== 'string' || briefing.length > 12000) return res.status(400).json({ error: 'Briefing inválido.' });
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', temperature: 0.7,
        messages: [{ role: 'system', content: `Você é diretor criativo brasileiro especializado em conteúdo de pequenos negócios. Gere exatamente ${n} roteiros diferentes e filmáveis. Não invente promoções, preços, depoimentos ou atributos. Responda SOMENTE JSON válido: {"scripts":[{"title":"...","hook":"...","speech":"...","shots":"...","cta":"...","status":"Planejado"}]}. Falas curtas e takes concretos.` }, { role: 'user', content: briefing }] })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data.error?.message || 'Falha ao gerar roteiros.' });
    let raw = data.choices?.[0]?.message?.content || '';
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.scripts)) throw new Error('Formato inválido');
    return res.status(200).json({ scripts: parsed.scripts.slice(0,n).map(s=>({title:String(s.title||''),hook:String(s.hook||''),speech:String(s.speech||''),shots:String(s.shots||''),cta:String(s.cta||''),status:'Planejado'})) });
  } catch(e) { return res.status(502).json({ error: 'Não foi possível gerar os roteiros. Tente novamente.' }); }
}
