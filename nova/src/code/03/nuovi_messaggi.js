// Tiene solo i messaggi non ancora registrati nella scheda RISPOSTE e li fa leggere.
const giaVisti = new Set(righe('Leggi RISPOSTE', 'id_gmail').map((r) => pulisci(r.id_gmail)));
const out = [];
for (const { json: r } of $input.all()) {
  if (r.azione !== 'cerca' || !r.ok) continue;
  for (const m of r.messaggi || []) {
    if (giaVisti.has(m.id_gmail)) continue;
    giaVisti.add(m.id_gmail);
    out.push({ json: { azione: 'leggi', slot: r.slot, id_gmail: m.id_gmail, rif: r.rif } });
  }
}
return out.slice(0, 200);
