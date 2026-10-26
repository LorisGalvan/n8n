// Capisce cosa è arrivato da Telegram: vocale, testo o pulsante premuto.
const u = $('Telegram').first().json;
if (u.callback_query) {
  const q = u.callback_query;
  const [scelta, id] = String(q.data || '').split(':');
  return [{ json: { _dest: 'pulsante', chat_id: String(q.message.chat.id), query_id: q.id, comando_id: id, conferma: scelta === 'ok' } }];
}
const m = u.message;
if (!m) return [];
const chat_id = String(m.chat.id);
const vocale = m.voice || m.audio;
if (vocale) return [{ json: { _dest: 'vocale', chat_id, file_id: vocale.file_id } }];
if (m.text) {
  if (m.text.startsWith('/start')) {
    return [{ json: { _dest: 'testo', chat_id, testo_utente: '', saluto: true } }];
  }
  return [{ json: { _dest: 'testo', chat_id, testo_utente: m.text.trim() } }];
}
return [];
