// Abbina la mail con la demo al lead e lo scrive nel REGISTRO (una volta sola per lead).
const box = caselle('Leggi CASELLE');
const emailSlot = Object.fromEntries(box.map((c) => [c.slot, c.email]));
const coda = righe('Leggi CODA', 'lead_id');
const perThread = new Map(coda.filter((r) => pulisci(r.thread_id)).map((r) => [pulisci(r.thread_id), r]));
const perEmail = new Map(coda.filter((r) => pulisci(r.email)).map((r) => [normEmail(r.email), r]));
const giaRegistrati = new Set(righe('Leggi REGISTRO', 'lead_id').map((r) => pulisci(r.lead_id)));
const indirizzi = (s) => (String(s).match(/[^<\s",]+@[^>\s",]+/g) || []).map((e) => e.toLowerCase());
const reLink = new RegExp(`(?:https?://)?[^\\s"<>]*${CFG.dominio_demo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s"<>]*`, 'i');

const out = [];
for (const { json: m } of $input.all()) {
  if (m.azione !== 'leggi' || !m.ok) continue;
  const lead = perThread.get(pulisci(m.thread_id)) || indirizzi(m.a).map((e) => perEmail.get(e)).find(Boolean);
  if (!lead) continue;
  const id = pulisci(lead.lead_id);
  if (giaRegistrati.has(id)) continue;
  giaRegistrati.add(id);
  const data = m.data_ms ? DateTime.fromMillis(m.data_ms).setZone($now.zoneName).toFormat('yyyy-MM-dd') : oggi();

  out.push({
    json: {
      _dest: 'registro',
      lead_id: id,
      nome: pulisci(lead.nome),
      email: normEmail(lead.email),
      casella: emailSlot[m.slot] || '',
      thread_id: m.thread_id,
      data_demo: data,
      link_demo: ((m.snippet || '').match(reLink) || [CFG.dominio_demo])[0],
      stato: 'IN ATTESA',
    },
  });
  out.push({ json: { _dest: 'coda', lead_id: id, stato: 'DEMO INVIATA', data_demo: data } });
}
return out;
