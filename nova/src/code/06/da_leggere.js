// Messaggi trovati da leggere (uno per conversazione).
const out = [];
const visti = new Set();
for (const { json: r } of $input.all()) {
  if (r.azione !== 'cerca' || !r.ok) continue;
  for (const m of r.messaggi || []) {
    if (visti.has(m.thread_id)) continue;
    visti.add(m.thread_id);
    out.push({ json: { azione: 'leggi', slot: r.slot, id_gmail: m.id_gmail, rif: 'demo' } });
  }
}
return out;
