// Risponde ad alcune mail di warm-up ricevute (massimo due livelli di "Re:").
const box = caselle('Leggi CASELLE');
const perSlot = Object.fromEntries(box.map((c) => [c.slot, c]));
const RISPOSTE = [
  'Ciao, grazie per l\'aggiornamento! Ci guardo e ti faccio sapere.',
  'Perfetto, grazie. Per me va bene così.',
  'Ricevuto, grazie mille. Ne parliamo nei prossimi giorni.',
  'Grazie! Ottimo lavoro, ci sentiamo presto.',
  'Ok, nessun problema. Teniamoci aggiornati.',
  'Grazie per avermi scritto, ti rispondo con calma domani.',
  'Benissimo, confermo. A presto!',
];

const out = [];
for (const { json: r } of $input.all()) {
  if (r.azione !== 'leggi' || !r.ok) continue;
  const livelli = (String(r.oggetto).match(/\bre:/gi) || []).length;
  if (livelli >= 2) continue;
  const casella = perSlot[r.slot];
  const mittente = (String(r.da).match(/[^<\s]+@[^>\s]+/) || [''])[0].toLowerCase();
  if (!casella || !mittente || mittente === casella.email) continue;
  const firma = pulisci(casella.nome_mittente) ? `\n${pulisci(casella.nome_mittente)}` : '';
  out.push({
    json: {
      azione: 'rispondi',
      slot: r.slot,
      da: casella.email,
      nome_mittente: pulisci(casella.nome_mittente),
      a: mittente,
      oggetto: /^re:/i.test(r.oggetto) ? r.oggetto : `Re: ${r.oggetto}`,
      testo: `${scegli(RISPOSTE)}${firma}\n\nRif. ${CFG.tag_warmup}`,
      thread_id: r.thread_id,
      in_reply_to: r.message_id,
      references: `${r.references || ''} ${r.message_id || ''}`.trim(),
      rif: 'risposta_warmup',
    },
  });
}
return out;
