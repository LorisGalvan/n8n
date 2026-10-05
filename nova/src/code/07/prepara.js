// Se il lead ha scritto dopo la demo: si ferma e ti avvisa. Altrimenti manda il promemoria nella stessa conversazione.
const out = [];
const indirizzo = (s) => ((String(s).match(/[^<\s"]+@[^>\s"]+/) || [''])[0] || '').toLowerCase();
const testi = caricaTesti('Leggi TESTI');

for (const { json: t, pairedItem } of $input.all()) {
  const l = $('Scegli').all()[pairedItem?.item ?? 0].json;
  if (!t.ok) continue;
  const messaggi = t.messaggi || [];
  const inizioDemo = DateTime.fromISO(l.data_demo, { zone: $now.zoneName }).toMillis();
  const risposta = messaggi.find((m) => indirizzo(m.da) !== l.casella && m.data_ms >= inizioDemo);
  if (risposta) {
    out.push({ json: { _dest: 'registro', lead_id: l.lead_id, stato: 'RISPOSTO' } });
    out.push({
      json: {
        _dest: 'avviso',
        azione: 'invia',
        slot: CFG.slot_avvisi,
        a: CFG.email_avvisi,
        oggetto: `NOVA: ${l.nome} ha risposto dopo la demo`,
        testo: `Ciao,\n\n${l.nome} <${l.email}> ha risposto dopo aver ricevuto la demo:\n\n"${String(risposta.snippet).slice(0, 300)}"\n\nI promemoria automatici per questo lead sono fermi: ora tocca a te.\n\nNOVA`,
        rif: l.lead_id,
      },
    });
    continue;
  }

  const ultimo = messaggi[messaggi.length - 1] || {};
  const valori = { nome_attivita: l.nome, link_demo: l.link_demo, mittente: l.nome_mittente, azienda: CFG.azienda, sito_azienda: CFG.sito_azienda };
  out.push({
    json: {
      _dest: 'invia',
      numero: l.numero,
      lead_id: l.lead_id,
      azione: 'rispondi',
      slot: t.slot,
      da: l.casella,
      nome_mittente: l.nome_mittente,
      a: CFG.modalita_test ? CFG.email_test : l.email,
      oggetto: `Re: ${String(ultimo.oggetto || 'la demo').replace(/^(re:\s*)+/i, '')}`,
      testo: riempi(testo(testi, `demo_sollecito_${l.numero}`), valori),
      thread_id: l.thread_id,
      in_reply_to: ultimo.message_id || '',
      references: messaggi.map((m) => m.message_id).filter(Boolean).join(' '),
      rif: l.lead_id,
    },
  });
}
return out;
