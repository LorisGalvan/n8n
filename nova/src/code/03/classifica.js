// Abbina ogni messaggio a un lead: risposta, mail tornata indietro (bounce) o richiesta di non essere ricontattati.
const box = caselle('Leggi CASELLE');
const nostre = new Set(box.map((c) => c.email));
const emailSlot = Object.fromEntries(box.map((c) => [c.slot, c.email]));
const coda = righe('Leggi CODA', 'lead_id');
const perThread = new Map();
const perEmail = new Map();
for (const r of coda) {
  if (pulisci(r.thread_id)) perThread.set(pulisci(r.thread_id), r);
  if (pulisci(r.email)) perEmail.set(normEmail(r.email), r);
}
const registro = new Map(righe('Leggi REGISTRO', 'lead_id').map((r) => [pulisci(r.lead_id), r]));
const optOut = (CFG.frasi_opt_out || []).map((f) => new RegExp(`(^|[^a-zàèéìòù])${f}`, 'i'));
const indirizzo = (s) => ((String(s).match(/[^<\s"]+@[^>\s"]+/) || [''])[0] || '').toLowerCase();

const risposte = [];
const aggiornaCoda = new Map();
const aggiornaRegistro = new Map();
const blacklist = new Map();
const avvisi = [];

for (const { json: m } of $input.all()) {
  if (m.azione !== 'leggi' || !m.ok) continue;
  const da = indirizzo(m.da);
  if (!da || nostre.has(da)) continue;
  // Solo il testo scritto dal lead, non la nostra mail citata sotto
  const scritto = String(m.snippet).split(/\s(?:Il giorno |In data |On [^,]{3,40}[, ]|Da: |From: |-{3,}|_{3,})|ha scritto:|wrote:/i)[0];
  const testoMsg = `${String(m.oggetto).replace(/^(re|r|fwd?):\s*/i, '')} ${scritto}`;
  const bounce =
    m.rif === 'bounce' ||
    /mailer-daemon|postmaster/i.test(da) ||
    /delivery status notification|undeliver|non recapitat|mail delivery fail|returned mail|indirizzo non trovato|address not found/i.test(m.oggetto);

  let lead = perThread.get(pulisci(m.thread_id));
  if (!lead && !bounce) lead = perEmail.get(da);
  if (!lead && bounce) {
    const citate = (String(m.snippet).match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).map(normEmail);
    lead = citate.map((e) => perEmail.get(e)).find(Boolean);
  }
  if (!lead) continue; // mail normale, non riguarda NOVA

  const id = pulisci(lead.lead_id);
  const tipo = bounce ? 'BOUNCE' : optOut.some((re) => re.test(testoMsg)) ? 'OPT-OUT' : 'RISPOSTA';
  const quando = m.data_ms ? DateTime.fromMillis(m.data_ms).setZone($now.zoneName).toFormat('yyyy-MM-dd HH:mm') : oggi();

  risposte.push({
    _dest: 'risposte',
    data: quando,
    tipo,
    lead_id: id,
    nome: pulisci(lead.nome),
    email_da: da,
    casella: emailSlot[m.slot] || '',
    oggetto: m.oggetto,
    estratto: String(m.snippet).slice(0, 300),
    id_gmail: m.id_gmail,
    thread_id: m.thread_id,
  });

  const nuovoStato = tipo === 'BOUNCE' ? 'BOUNCE' : 'RISPOSTO';
  aggiornaCoda.set(id, { _dest: 'coda', lead_id: id, stato: nuovoStato, data_risposta: oggi() });
  if (registro.has(id) && tipo !== 'BOUNCE') {
    aggiornaRegistro.set(id, { _dest: 'registro', lead_id: id, stato: 'RISPOSTO' });
  }
  if (tipo !== 'RISPOSTA') {
    const email = normEmail(lead.email);
    blacklist.set(email, { _dest: 'blacklist', email, dominio: '', data: oggi(), motivo: tipo === 'BOUNCE' ? 'bounce' : 'ha chiesto di non essere contattato' });
  }
  avvisi.push(`• [${tipo}] ${lead.nome} <${da}>\n  Oggetto: ${m.oggetto}\n  "${String(m.snippet).slice(0, 200)}"`);
}

const out = [...risposte, ...aggiornaCoda.values(), ...aggiornaRegistro.values(), ...blacklist.values()];
if (avvisi.length) {
  const nRisposte = risposte.filter((r) => r.tipo !== 'BOUNCE').length;
  out.push({
    _dest: 'avviso',
    azione: 'invia',
    slot: CFG.slot_avvisi,
    a: CFG.email_avvisi,
    oggetto: `NOVA: ${nRisposte} nuove risposte, ${risposte.length - nRisposte} mail tornate indietro`,
    testo: `Ciao,\n\necco le novità nelle caselle:\n\n${avvisi.join('\n\n')}\n\nTrovi tutto nella scheda RISPOSTE del foglio.\n\nNOVA`,
    rif: 'avviso_risposte',
  });
}
return out.map((json) => ({ json }));
