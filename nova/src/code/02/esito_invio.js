// Aggiorna la riga del lead nella CODA con l'esito dell'invio.
const l = $('Componi email').item.json;
const r = $json;
if (!r.ok) {
  return { json: { lead_id: l.lead_id, stato: 'ERRORE INVIO', motivo: r.errore, casella: l.casella } };
}
return {
  json: {
    lead_id: l.lead_id,
    stato: CFG.modalita_test ? 'TEST' : 'INVIATA',
    regola_id: l.regola_id,
    prova: l.prova,
    motivo: '',
    casella: l.casella,
    oggetto: l.oggetto,
    thread_id: r.thread_id,
    message_id: r.message_id,
    data_invio: oggi(),
  },
};
