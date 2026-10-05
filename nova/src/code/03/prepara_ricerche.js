// Per ogni casella di invio: cerca le risposte e le mail tornate indietro degli ultimi giorni.
const g = CFG.giorni_da_controllare;
const out = [];
for (const c of caselle('Leggi CASELLE').filter((x) => x.ruolo === 'INVIO')) {
  out.push({ json: { azione: 'cerca', slot: c.slot, query: `in:inbox newer_than:${g}d -from:me -${CFG.tag_warmup}`, max: 100, rif: 'risposte' } });
  out.push({ json: { azione: 'cerca', slot: c.slot, query: `newer_than:${g}d (from:mailer-daemon OR from:postmaster)`, max: 50, rif: 'bounce' } });
}
return out;
