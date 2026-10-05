// Se nella conversazione c'è già una risposta del lead, si ferma. Altrimenti prepara il sollecito
// nella stessa conversazione e dalla stessa casella della prima mail.
const l = $('Scegli lead').item.json;
const t = $json;
if (!t.ok) {
  return { json: { _dest: 'aggiorna', lead_id: l.lead_id, motivo: `Conversazione non leggibile: ${t.errore}` } };
}
const indirizzo = (s) => ((String(s).match(/[^<\s"]+@[^>\s"]+/) || [''])[0] || '').toLowerCase();
const messaggi = t.messaggi || [];
const haRisposto = messaggi.some((m) => {
  const da = indirizzo(m.da);
  return da && da !== l.casella;
});
if (haRisposto) {
  return { json: { _dest: 'aggiorna', lead_id: l.lead_id, stato: 'RISPOSTO', data_risposta: oggi() } };
}

const testi = caricaTesti('Leggi TESTI');
const valori = {
  nome_attivita: l.nome,
  categoria: l.categoria,
  citta: l.citta,
  sito: l.sito.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
  mittente: l.nome_mittente,
  azienda: CFG.azienda,
  sito_azienda: CFG.sito_azienda,
};
const corpo = [testo(testi, `followup_${l.numero}`), testo(testi, 'opt_out', false)].filter(Boolean).join('\n\n');
const ultimo = messaggi[messaggi.length - 1] || {};
const ids = messaggi.map((m) => m.message_id).filter(Boolean);
const oggettoBase = (ultimo.oggetto || l.oggetto_originale).replace(/^(re:\s*)+/i, '');

return {
  json: {
    _dest: 'invia',
    numero: l.numero,
    lead_id: l.lead_id,
    azione: 'rispondi',
    slot: t.slot,
    da: l.casella,
    nome_mittente: l.nome_mittente,
    a: CFG.modalita_test ? CFG.email_test : l.email,
    oggetto: `Re: ${oggettoBase}`,
    testo: riempi(corpo, valori),
    thread_id: l.thread_id,
    in_reply_to: ultimo.message_id || '',
    references: ids.join(' '),
    list_unsubscribe: l.casella,
    rif: l.lead_id,
  },
};
