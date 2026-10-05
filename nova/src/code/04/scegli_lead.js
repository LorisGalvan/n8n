// Trova chi deve ricevere il sollecito del giorno 4 o del giorno 9 (e chiude chi non ha mai risposto).
const testi = caricaTesti('Leggi TESTI');
testo(testi, 'followup_1');
testo(testi, 'followup_2');

const box = Object.fromEntries(caselle('Leggi CASELLE').map((c) => [c.email, c]));
const blacklist = caricaBlacklist('Leggi BLACKLIST');
const out = [];
let solleciti = 0;

for (const r of righe('Leggi CODA', 'lead_id')) {
  const stato = pulisci(r.stato).toUpperCase();
  const giorni = giorniDa(r.data_invio);
  if (giorni === null || !pulisci(r.thread_id)) continue;

  if (stato === 'FOLLOWUP 2' && giorni >= CFG.giorno_chiusura) {
    out.push({ json: { _dest: 'aggiorna', lead_id: pulisci(r.lead_id), stato: 'NESSUNA RISPOSTA' } });
    continue;
  }

  let numero = 0;
  if (stato === 'INVIATA' && giorni >= CFG.giorno_followup_1) numero = 1;
  else if (stato === 'FOLLOWUP 1' && giorni >= CFG.giorno_followup_2) numero = 2;
  if (!numero) continue;

  if (blacklist.contiene(r.email)) {
    out.push({ json: { _dest: 'aggiorna', lead_id: pulisci(r.lead_id), stato: 'ESCLUSO', motivo: 'in blacklist' } });
    continue;
  }
  const casella = box[normEmail(r.casella)];
  if (!casella) {
    out.push({ json: { _dest: 'aggiorna', lead_id: pulisci(r.lead_id), motivo: `Casella ${r.casella} non attiva: sollecito non inviato` } });
    continue;
  }
  if (solleciti >= CFG.solleciti_per_esecuzione) continue;
  solleciti++;

  out.push({
    json: {
      _dest: 'controlla',
      // dati per il workflow 00 (azione thread: legge la conversazione prima di sollecitare)
      azione: 'thread',
      slot: casella.slot,
      thread_id: pulisci(r.thread_id),
      rif: pulisci(r.lead_id),
      // dati del lead
      numero,
      lead_id: pulisci(r.lead_id),
      nome: pulisci(r.nome),
      categoria: pulisci(r.categoria),
      citta: pulisci(r.citta),
      sito: pulisci(r.sito),
      email: normEmail(r.email),
      casella: casella.email,
      nome_mittente: pulisci(casella.nome_mittente) || CFG.nome_mittente,
      oggetto_originale: pulisci(r.oggetto),
    },
  });
}
return out;
