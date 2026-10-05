// Dai risultati delle ricerche: togli dallo spam, segna come lette/importanti, scegli a quali rispondere.
const out = [];
for (const { json: r } of $input.all()) {
  if (r.azione !== 'cerca' || !r.ok) continue;
  for (const m of r.messaggi || []) {
    if (r.rif === 'spam') {
      out.push({ json: { azione: 'modifica', slot: r.slot, id_gmail: m.id_gmail, aggiungi_etichette: ['INBOX', 'IMPORTANT'], rimuovi_etichette: ['SPAM'], rif: 'spam' } });
    } else if (r.rif === 'inbox') {
      const aggiungi = ['IMPORTANT'];
      if (Math.random() < 0.15) aggiungi.push('STARRED');
      out.push({ json: { azione: 'modifica', slot: r.slot, id_gmail: m.id_gmail, aggiungi_etichette: aggiungi, rimuovi_etichette: ['UNREAD'], rif: 'letta' } });
      if (Math.random() * 100 < CFG.percentuale_risposte) {
        out.push({ json: { azione: 'leggi', slot: r.slot, id_gmail: m.id_gmail, rif: 'da_rispondere' } });
      }
    }
  }
}
return out;
