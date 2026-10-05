// Trasforma la richiesta degli altri workflow in una chiamata alle API Gmail.
// Campi in ingresso:
//   azione: invia | rispondi | cerca | leggi | thread | modifica
//   slot: 1-10 (la casella da usare)
//   rif: riferimento libero restituito tale e quale (es. lead_id)
//   invia/rispondi: a, oggetto, testo, da, nome_mittente, thread_id, in_reply_to, references, list_unsubscribe
//   cerca: query, max
//   leggi/modifica: id_gmail, aggiungi_etichette[], rimuovi_etichette[]
//   thread: thread_id
const r = $json;
const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const slot = parseInt(r.slot, 10);
if (!(slot >= 1 && slot <= 10)) {
  throw new Error(`Slot casella non valido: "${r.slot}" (deve essere un numero da 1 a 10)`);
}
const azione = String(r.azione || '').toLowerCase();

const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');
const b64url = (s) => b64(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const intestazione = (s) => (/^[\x20-\x7e]*$/.test(String(s)) ? String(s) : `=?UTF-8?B?${b64(s)}?=`);
const HEADERS = ['From', 'To', 'Subject', 'Date', 'Message-ID', 'In-Reply-To', 'References']
  .map((h) => `metadataHeaders=${encodeURIComponent(h)}`)
  .join('&');

let metodo = 'GET';
let url = '';
let corpo = {};
const extra = {};

switch (azione) {
  case 'invia':
  case 'rispondi': {
    if (!r.a) throw new Error('Manca il destinatario (campo "a")');
    const dom = String(r.da || '').split('@')[1] || 'mail.local';
    const messageId = `<${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 10)}@${dom}>`;
    const h = [];
    if (r.da) h.push(`From: ${r.nome_mittente ? `${intestazione(r.nome_mittente)} <${r.da}>` : r.da}`);
    h.push(`To: ${r.a}`);
    h.push(`Subject: ${intestazione(r.oggetto || '')}`);
    h.push(`Message-ID: ${messageId}`);
    if (r.in_reply_to) {
      h.push(`In-Reply-To: ${r.in_reply_to}`);
      h.push(`References: ${r.references || r.in_reply_to}`);
    }
    if (r.list_unsubscribe) {
      h.push(`List-Unsubscribe: <mailto:${r.list_unsubscribe}?subject=disiscrivimi>`);
    }
    h.push('MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64');
    const testo = String(r.testo || '').replace(/\r?\n/g, '\r\n');
    const body = b64(testo).replace(/.{76}/g, '$&\r\n');
    metodo = 'POST';
    url = `${BASE}/messages/send`;
    corpo = { raw: b64url(`${h.join('\r\n')}\r\n\r\n${body}`) };
    if (r.thread_id) corpo.threadId = String(r.thread_id);
    extra.message_id = messageId;
    break;
  }
  case 'cerca':
    url = `${BASE}/messages?q=${encodeURIComponent(r.query || '')}&maxResults=${parseInt(r.max, 10) || 50}`;
    break;
  case 'leggi':
    if (!r.id_gmail) throw new Error('Manca id_gmail');
    url = `${BASE}/messages/${r.id_gmail}?format=metadata&${HEADERS}`;
    break;
  case 'thread':
    if (!r.thread_id) throw new Error('Manca thread_id');
    url = `${BASE}/threads/${r.thread_id}?format=metadata&${HEADERS}`;
    break;
  case 'modifica':
    if (!r.id_gmail) throw new Error('Manca id_gmail');
    metodo = 'POST';
    url = `${BASE}/messages/${r.id_gmail}/modify`;
    corpo = { addLabelIds: r.aggiungi_etichette || [], removeLabelIds: r.rimuovi_etichette || [] };
    break;
  default:
    throw new Error(`Azione sconosciuta: "${r.azione}"`);
}

return { json: { ...r, slot, azione, metodo, url, corpo, ...extra } };
