import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caricaWorkflow, eseguiCodice, impostazioni } from './runtime.mjs';

const wf01 = caricaWorkflow('01');
const wf02 = caricaWorkflow('02');

test('01: non cerca se la coda è piena, altrimenti sceglie combinazioni nuove e avvisa quando finiscono', async () => {
  const cfg = await impostazioni(wf01, { citta: ['Milano'], categorie: ['ristoranti', 'bar', 'pizzerie'], soglia_coda_minima: 2, ricerche_per_giorno: 1 });
  const piena = await eseguiCodice(wf01, 'Serve cercare?', {
    dati: { IMPOSTAZIONI: [cfg], 'Leggi CODA': [{ lead_id: 'a', stato: 'NUOVO' }, { lead_id: 'b', stato: 'NUOVO' }], 'Leggi RICERCHE': [{}] },
  });
  assert.deepEqual(piena, []);

  const out = await eseguiCodice(wf01, 'Serve cercare?', {
    dati: {
      IMPOSTAZIONI: [cfg],
      'Leggi CODA': [{ lead_id: 'a', stato: 'INVIATA' }],
      'Leggi RICERCHE': [{ data: '2026-10-01', citta: 'Milano', categoria: 'ristoranti' }],
    },
    adesso: '2026-10-05T07:00:00',
  });
  assert.deepEqual(out[0], { _dest: 'ricerca', citta: 'Milano', categoria: 'bar' });
  assert.equal(out[1]._dest, 'avviso'); // resta solo 1 combinazione
  assert.match(out[1].testo, /restano solo 1 ricerche/);
});

test('01: filtra i risultati di Google Maps, estrae l\'email migliore e verifica il dominio', async () => {
  const cfg = await impostazioni(wf01);
  const ricerche = [{ _dest: 'ricerca', citta: 'Milano', categoria: 'ristoranti' }];
  const posti = [
    { title: 'Trattoria Da Gino', placeId: 'p1', website: 'https://www.dagino.it/', address: 'Via Roma 1', city: 'Milano', categoryName: 'Ristorante', totalScore: 4.5, reviewsCount: 120 },
    { title: 'Senza sito', placeId: 'p2' },
    { title: 'Solo Facebook', placeId: 'p3', website: 'https://facebook.com/xyz' },
    { title: 'Chiuso', placeId: 'p4', website: 'https://chiuso.it', permanentlyClosed: true },
    { title: 'Già in coda', placeId: 'p5', website: 'gia.it' },
  ].map((json) => ({ json, pairedItem: { item: 0 } }));
  // calcola l'id del lead già presente
  const tmp = await eseguiCodice(wf01, 'Prepara siti', { input: [posti[4]], dati: { IMPOSTAZIONI: [cfg], 'Serve cercare?': ricerche, 'Leggi CODA': [{}] } });
  const siti = await eseguiCodice(wf01, 'Prepara siti', {
    input: posti,
    dati: { IMPOSTAZIONI: [cfg], 'Serve cercare?': ricerche, 'Leggi CODA': [{ lead_id: tmp[0].lead_id }] },
  });
  assert.equal(siti.length, 1);
  assert.equal(siti[0].nome, 'Trattoria Da Gino');
  assert.equal(siti[0].pagina_contatti, 'https://www.dagino.it/contatti');

  const email = await eseguiCodice(wf01, 'Estrai email', {
    input: [{ data: '<a href="mailto:Info@DaGino.it">scrivici</a> <img src="logo@2x.png"> mario.rossi@gmail.com' }],
    dati: {
      IMPOSTAZIONI: [cfg],
      'Prepara siti': siti,
      'Scarica home': [{ data: 'prenota@sentry.io' }],
      'Leggi CODA': [{}],
      'Leggi BLACKLIST': [{}],
    },
  });
  assert.equal(email.length, 1);
  assert.equal(email[0].email, 'info@dagino.it');
  assert.equal(email[0].dominio_email, 'dagino.it');

  const validi = await eseguiCodice(wf01, 'Lead validi', {
    input: [{ Status: 0, Answer: [{ type: 15, data: '10 mx.dagino.it.' }] }],
    dati: { IMPOSTAZIONI: [cfg], 'Estrai email': email },
    adesso: '2026-10-05T07:00:00',
  });
  assert.equal(validi[0].stato, 'NUOVO');
  assert.equal(validi[0].data_inserimento, '2026-10-05');
  assert.equal(validi[0].dominio_email, undefined);

  const senzaMx = await eseguiCodice(wf01, 'Lead validi', { input: [{ Status: 3 }], dati: { IMPOSTAZIONI: [cfg], 'Estrai email': email } });
  assert.deepEqual(senzaMx, []);
});

const CASELLE = [
  { slot: 1, email: 'a@gmail.com', ruolo: 'INVIO', attiva: 'SI', stato_warmup: 'COMPLETATO', limite_cold_giorno: 4 },
  { slot: 2, email: 'b@gmail.com', ruolo: 'INVIO', attiva: 'SI', stato_warmup: 'COMPLETATO', limite_cold_giorno: '' },
  { slot: 3, email: 'w@gmail.com', ruolo: 'WARMUP', attiva: 'SI', stato_warmup: 'COMPLETATO' },
];
const REGOLE = [
  { id: 'R1', attiva: 'SI', priorita: 1, problema: 'Non mobile', cosa_cercare: 'viewport no', prova_richiesta: 'riga', frase_email: 'Ho visto che {prova}' },
  { id: 'R9', attiva: 'NO', priorita: 2, problema: 'Spenta' },
];
const TESTI = [
  { chiave: 'oggetto', testo: 'Il sito di {nome_attivita}' },
  { chiave: 'saluto', testo: 'Buongiorno,' },
  { chiave: 'apertura', testo: 'sono {mittente} di {azienda}.' },
  { chiave: 'proposta', testo: 'Le va se ne parliamo?' },
  { chiave: 'chiusura', testo: 'Grazie.' },
  { chiave: 'firma', testo: '{mittente}\\n{azienda}' },
  { chiave: 'opt_out', testo: 'P.S. rispondete "no grazie" per non ricevere altro.' },
];
const lead = (id, extra = {}) => ({ lead_id: id, stato: 'NUOVO', nome: `Bar ${id}`, email: `${id}@bar.it`, sito: `https://${id}.it`, citta: 'Milano', categoria: 'Bar', ...extra });

test('02: niente invii se il warm-up non è finito (fuori dalla modalità test)', async () => {
  const cfg = await impostazioni(wf02, { modalita_test: false });
  const out = await eseguiCodice(wf02, 'Pianifica invii', {
    dati: { IMPOSTAZIONI: [cfg], 'Leggi CASELLE': CASELLE.map((c) => ({ ...c, stato_warmup: 'IN CORSO' })), 'Leggi CODA': [lead('x')], 'Leggi REGOLE': REGOLE, 'Leggi TESTI': TESTI, 'Leggi BLACKLIST': [{}] },
  });
  assert.deepEqual(out, []);
});

test('02: assegna le caselle a turno rispettando limiti, blacklist e duplicati', async () => {
  const cfg = await impostazioni(wf02, { modalita_test: false, lead_per_esecuzione: 10, limite_giornaliero_default: 20 });
  const coda = [
    lead('l1'), lead('l2'), lead('l3'), lead('l4'),
    lead('bl'), // in blacklist
    lead('dup', { email: 'l1@bar.it' }), // stessa email di l1
    lead('old', { stato: 'INVIATA', email: 'old@bar.it' }),
    lead('vecchio', { email: 'old@bar.it' }), // già contattato
    lead('s1', { stato: 'INVIATA', casella: 'a@gmail.com', data_invio: '2026-10-05' }),
    lead('s2', { stato: 'INVIATA', casella: 'a@gmail.com', data_invio: '2026-10-05' }),
    lead('s3', { stato: 'INVIATA', casella: 'a@gmail.com', data_invio: '2026-10-05' }),
  ];
  const out = await eseguiCodice(wf02, 'Pianifica invii', {
    dati: { IMPOSTAZIONI: [cfg], 'Leggi CASELLE': CASELLE, 'Leggi CODA': coda, 'Leggi REGOLE': REGOLE, 'Leggi TESTI': TESTI, 'Leggi BLACKLIST': [{ email: 'BL@bar.it' }] },
    adesso: '2026-10-05T17:00:00',
  });
  // ultima ora: casella a ha 1 posto (4-3), casella b ne ha 20
  assert.deepEqual(out.map((o) => o.lead_id), ['l1', 'l2', 'l3', 'l4']);
  assert.equal(out.filter((o) => o.casella === 'a@gmail.com').length, 1);
  assert.ok(out.every((o) => o.casella !== 'w@gmail.com'));
});

test('02: si ferma con un messaggio chiaro se mancano regole o testi', async () => {
  const cfg = await impostazioni(wf02);
  const base = { IMPOSTAZIONI: [cfg], 'Leggi CASELLE': CASELLE, 'Leggi CODA': [lead('x')], 'Leggi BLACKLIST': [{}] };
  await assert.rejects(eseguiCodice(wf02, 'Pianifica invii', { dati: { ...base, 'Leggi REGOLE': [{}], 'Leggi TESTI': TESTI } }), /REGOLE/);
  await assert.rejects(eseguiCodice(wf02, 'Pianifica invii', { dati: { ...base, 'Leggi REGOLE': REGOLE, 'Leggi TESTI': TESTI.slice(1) } }), /manca la chiave "oggetto"/);
});

const HTML = `<!doctype html><html><head><title>Bar Sport Milano</title></head><body>
<h1>Benvenuti al Bar Sport</h1><p>Colazioni &amp; aperitivi dal 1980.</p><script>var x=1;</script>
<footer>© 2015 Bar Sport - P.IVA 123</footer></body></html>`;

test('02: analisi del sito, verifica della citazione e composizione della mail', async () => {
  const cfg = await impostazioni(wf02, { modalita_test: true, email_test: 'io@test.it' });
  const elemento = { ...lead('l1'), slot: 2, casella: 'b@gmail.com', nome_mittente: 'Mario' };
  const [an] = await eseguiCodice(wf02, 'Prepara analisi', {
    input: [{ statusCode: 200, body: HTML }],
    dati: { IMPOSTAZIONI: [cfg], 'Uno alla volta': [elemento], 'Leggi REGOLE': REGOLE },
    adesso: '2026-10-05T10:00:00',
  });
  assert.equal(an.sito_ok, true);
  assert.match(an.documento, /meta_viewport_mobile: no/);
  assert.match(an.documento, /meta_description: \(assente\)/);
  assert.match(an.documento, /anni_copyright: 2015/);
  assert.match(an.documento, /Colazioni & aperitivi dal 1980/);
  assert.doesNotMatch(an.documento, /var x=1/);
  const rc = an.richiesta_claude;
  assert.equal(rc.model, 'claude-opus-5-5');
  assert.equal(rc.output_config.format.type, 'json_schema');
  assert.equal(rc.output_config.effort, 'medium');
  assert.match(rc.system, /id: R1/);
  assert.doesNotMatch(rc.system, /R9/);
  assert.match(rc.system, /Data di oggi: 2026-10-05/);

  const risposta = (esito) => ({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(esito) }] });
  const verifica = (res) => eseguiCodice(wf02, 'Verifica prova', { input: [res], dati: { IMPOSTAZIONI: [cfg], 'Prepara analisi': [an], 'Leggi REGOLE': REGOLE } });

  const [buona] = await verifica(risposta({ trovato: true, regola_id: 'R1', citazione: 'meta_viewport_mobile:  no', prova: 'il sito non si adatta allo schermo del telefono.', confidenza: 0.9, nota: '' }));
  assert.equal(buona.valida, true);
  assert.equal(buona.documento, undefined);

  const [inventata] = await verifica(risposta({ trovato: true, regola_id: 'R1', citazione: 'il sito è lentissimo', prova: 'x', confidenza: 0.95, nota: '' }));
  assert.equal(inventata.valida, false);
  assert.match(inventata.motivo, /citazione non si trova/);

  const [debole] = await verifica(risposta({ trovato: true, regola_id: 'R1', citazione: 'meta_viewport_mobile: no', prova: 'x', confidenza: 0.4, nota: '' }));
  assert.match(debole.motivo, /Prova debole/);
  const [spenta] = await verifica(risposta({ trovato: true, regola_id: 'R9', citazione: 'meta_viewport_mobile: no', prova: 'x', confidenza: 0.9, nota: '' }));
  assert.match(spenta.motivo, /non attiva/);
  const [nulla] = await verifica(risposta({ trovato: false, regola_id: '', citazione: '', prova: '', confidenza: 0, nota: 'sito ben fatto' }));
  assert.match(nulla.motivo, /Nessun problema dimostrabile: sito ben fatto/);
  const [rifiuto] = await verifica({ stop_reason: 'refusal', content: [] });
  assert.match(rifiuto.motivo, /rifiutato/);
  const [errore] = await verifica({ error: { message: '401 invalid x-api-key' } });
  assert.match(errore.motivo, /invalid x-api-key/);

  const [mail] = await eseguiCodice(wf02, 'Componi email', { input: [buona], dati: { IMPOSTAZIONI: [cfg], 'Leggi TESTI': TESTI } });
  assert.equal(mail.oggetto, 'Il sito di Bar l1');
  assert.equal(mail.a, 'io@test.it'); // modalità test
  assert.equal(mail.slot, 2);
  assert.equal(mail.da, 'b@gmail.com');
  assert.match(mail.testo, /^Buongiorno,\n\nsono Mario di La Tua Azienda\.\n\nHo visto che il sito non si adatta/);
  assert.match(mail.testo, /Mario\nLa Tua Azienda\n\nP\.S\./);
  assert.doesNotMatch(mail.testo, /\{[a-z_]+\}/);

  const [esito] = await eseguiCodice(wf02, 'Esito invio', {
    input: [{ ok: true, thread_id: 'T1', message_id: '<m@b>' }],
    dati: { IMPOSTAZIONI: [cfg], 'Componi email': [mail] },
    adesso: '2026-10-05T10:00:00',
  });
  assert.deepEqual([esito.stato, esito.thread_id, esito.data_invio, esito.casella], ['TEST', 'T1', '2026-10-05', 'b@gmail.com']);

  const [giu] = await eseguiCodice(wf02, 'Prepara analisi', {
    input: [{ statusCode: 404, body: 'not found' }],
    dati: { IMPOSTAZIONI: [cfg], 'Uno alla volta': [elemento], 'Leggi REGOLE': REGOLE },
  });
  assert.equal(giu.sito_ok, false);
  const [dg] = await eseguiCodice(wf02, 'Segna DA GUARDARE', { input: [giu], dati: { IMPOSTAZIONI: [cfg] } });
  assert.deepEqual([dg.stato, dg.motivo], ['DA GUARDARE', 'Sito non raggiungibile (404)']);
});
