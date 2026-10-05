// Controlla la coda: se ci sono abbastanza lead NUOVO non fa nulla, altrimenti sceglie le prossime ricerche.
const coda = righe('Leggi CODA', 'lead_id');
const nuovi = coda.filter((r) => pulisci(r.stato).toUpperCase() === 'NUOVO').length;
if (nuovi >= CFG.soglia_coda_minima) return [];

const recenti = new Set(
  righe('Leggi RICERCHE', 'citta')
    .filter((r) => {
      const g = giorniDa(r.data);
      return g === null || g < CFG.giorni_prima_di_ripetere;
    })
    .map((r) => `${pulisci(r.citta).toLowerCase()}|${pulisci(r.categoria).toLowerCase()}`),
);

const disponibili = [];
for (const citta of CFG.citta) {
  for (const categoria of CFG.categorie) {
    if (!recenti.has(`${citta.toLowerCase()}|${categoria.toLowerCase()}`)) disponibili.push({ citta, categoria });
  }
}

const out = disponibili.slice(0, CFG.ricerche_per_giorno).map((r) => ({ json: { _dest: 'ricerca', ...r } }));

// Avviso se le combinazioni stanno finendo
const restanti = disponibili.length - out.length;
if (restanti <= CFG.ricerche_per_giorno) {
  out.push({
    json: {
      _dest: 'avviso',
      azione: 'invia',
      slot: CFG.slot_avvisi,
      a: CFG.email_avvisi,
      oggetto: 'NOVA: contatti in esaurimento',
      testo:
        `Ciao,\n\nnella CODA ci sono ${nuovi} lead da contattare e restano solo ${restanti} ricerche nuove ` +
        `(città × categoria) da fare.\n\nPer non restare senza contatti apri il workflow "01 - NOVA - Trova Nuovi Lead" ` +
        `e nel nodo IMPOSTAZIONI aggiungi nuove città o categorie, oppure aumenta "risultati_per_ricerca".\n\nNOVA`,
      rif: 'avviso_coda',
    },
  });
}
return out;
