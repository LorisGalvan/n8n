// Compone la mail con le frasi della scheda TESTI e la frase della regola trovata.
const l = $json;
const testi = caricaTesti('Leggi TESTI');
const valori = {
  nome_attivita: l.nome,
  categoria: l.categoria,
  citta: l.citta,
  sito: l.sito.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
  problema: l.problema,
  prova: l.prova_testo,
  mittente: l.nome_mittente,
  azienda: CFG.azienda,
  sito_azienda: CFG.sito_azienda,
};
valori.frase_problema = riempi(l.frase_email || '{prova}', valori);

const parti = [
  testo(testi, 'saluto'),
  testo(testi, 'apertura', false),
  '{frase_problema}',
  testo(testi, 'proposta'),
  testo(testi, 'chiusura'),
  testo(testi, 'firma'),
  testo(testi, 'opt_out', false),
].filter(Boolean);

const corpo = riempi(parti.join('\n\n'), valori);
const oggetto = riempi(testo(testi, 'oggetto'), valori);

return {
  json: {
    ...l,
    oggetto,
    testo: corpo,
    // dati per il workflow 00
    azione: 'invia',
    da: l.casella,
    a: CFG.modalita_test ? CFG.email_test : l.email,
    list_unsubscribe: l.casella,
    rif: l.lead_id,
  },
};
