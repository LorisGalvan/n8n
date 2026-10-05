// Uniforma la risposta di Gmail per chi ha chiamato questo workflow.
const req = $('Prepara richiesta').item.json;
const res = $json;
let body = res.body ?? {};
if (typeof body === 'string') {
  try {
    body = JSON.parse(body);
  } catch (e) {
    body = { testo: body };
  }
}
const stato = Number(res.statusCode || 0);
const ok = stato >= 200 && stato < 300;
const out = { ok, azione: req.azione, slot: req.slot, rif: req.rif ?? null, stato_http: stato };

if (!ok) {
  out.errore =
    body?.error?.message ||
    res.error?.message ||
    (typeof res.error === 'string' ? res.error : '') ||
    `Errore HTTP ${stato || 'di rete'}`;
  return { json: out };
}

const intestazioni = (lista = []) =>
  Object.fromEntries(lista.map((x) => [String(x.name).toLowerCase(), x.value]));
const messaggio = (m = {}) => {
  const h = intestazioni(m.payload?.headers);
  return {
    id_gmail: m.id,
    thread_id: m.threadId,
    snippet: m.snippet || '',
    etichette: m.labelIds || [],
    data_ms: Number(m.internalDate || 0),
    da: h.from || '',
    a: h.to || '',
    oggetto: h.subject || '',
    message_id: h['message-id'] || '',
    in_reply_to: h['in-reply-to'] || '',
    references: h.references || '',
  };
};

switch (req.azione) {
  case 'invia':
  case 'rispondi':
    Object.assign(out, {
      id_gmail: body.id,
      thread_id: body.threadId,
      message_id: req.message_id,
      a: req.a,
      oggetto: req.oggetto,
    });
    break;
  case 'cerca':
    out.messaggi = (body.messages || []).map((m) => ({ id_gmail: m.id, thread_id: m.threadId }));
    break;
  case 'leggi':
    Object.assign(out, messaggio(body));
    break;
  case 'thread':
    out.thread_id = body.id;
    out.messaggi = (body.messages || []).map(messaggio);
    break;
  case 'modifica':
    out.id_gmail = body.id;
    out.etichette = body.labelIds || [];
    break;
}
return { json: out };
