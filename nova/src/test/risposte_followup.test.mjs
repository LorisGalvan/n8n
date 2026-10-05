import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caricaWorkflow, eseguiCodice, impostazioni } from './runtime.mjs';

const wf03 = caricaWorkflow('03');
const wf04 = caricaWorkflow('04');
const wf06 = caricaWorkflow('06');
const wf07 = caricaWorkflow('07');

const CASELLE = [
  { slot: 1, email: 'a@gmail.com', ruolo: 'INVIO', attiva: 'SI', nome_mittente: 'Mario' },
  { slot: 2, email: 'w@gmail.com', ruolo: 'WARMUP', attiva: 'SI' },
];
const CODA = [
  { lead_id: 'L1', nome: 'Bar Uno', email: 'uno@bar.it', thread_id: 'T1', stato: 'INVIATA', casella: 'a@gmail.com', data_invio: '2026-10-01', oggetto: 'Il sito di Bar Uno', sito: 'https://bar1.it' },
  { lead_id: 'L2', nome: 'Bar Due', email: 'due@bar.it', thread_id: 'T2', stato: 'FOLLOWUP 1', casella: 'a@gmail.com', data_invio: '2026-09-26', sito: 'https://bar2.it' },
  { lead_id: 'L3', nome: 'Bar Tre', email: 'tre@bar.it', thread_id: 'T3', stato: 'INVIATA', casella: 'a@gmail.com', data_invio: '2026-10-03' },
  { lead_id: 'L4', nome: 'Bar Quattro', email: 'quattro@bar.it', thread_id: 'T4', stato: 'FOLLOWUP 2', casella: 'a@gmail.com', data_invio: '2026-09-15' },
];
const TESTI = [
  { chiave: 'followup_1', testo: 'Le riscrivo per {nome_attivita} ({sito}).\\n{mittente}' },
  { chiave: 'followup_2', testo: 'Ultimo messaggio.' },
  { chiave: 'opt_out', testo: 'P.S. no grazie per non ricevere altro.' },
  { chiave: 'demo_sollecito_1', testo: 'Ha visto la demo? {link_demo}' },
  { chiave: 'demo_sollecito_2', testo: 'Ultimo promemoria: {link_demo}' },
];

test('03: cerca risposte e bounce solo nelle caselle di invio, escludendo il warm-up', async () => {
  const cfg = await impostazioni(wf03);
  const out = await eseguiCodice(wf03, 'Prepara ricerche', { dati: { IMPOSTAZIONI: [cfg], 'Leggi CASELLE': CASELLE } });
  assert.equal(out.length, 2);
  assert.match(out[0].query, /-from:me -nvx7/);
  assert.match(out[1].query, /mailer-daemon/);
  const nuovi = await eseguiCodice(wf03, 'Nuovi messaggi', {
    input: [{ azione: 'cerca', ok: true, slot: 1, rif: 'risposte', messaggi: [{ id_gmail: 'm1' }, { id_gmail: 'visto' }] }],
    dati: { IMPOSTAZIONI: [cfg], 'Leggi RISPOSTE': [{ id_gmail: 'visto' }] },
  });
  assert.deepEqual(nuovi.map((n) => n.id_gmail), ['m1']);
});

test('03: classifica risposte, opt-out e bounce senza farsi ingannare dal testo citato', async () => {
  const cfg = await impostazioni(wf03);
  const msg = (extra) => ({ azione: 'leggi', ok: true, slot: 1, rif: 'risposte', data_ms: Date.parse('2026-10-05T10:00:00+02:00'), ...extra });
  const out = await eseguiCodice(wf03, 'Classifica', {
    input: [
      // risposta positiva: cita la nostra mail con "no grazie" ma non è un opt-out
      msg({ id_gmail: 'r1', thread_id: 'T1', da: 'Bar Uno <uno@bar.it>', oggetto: 'Re: Il sito di Bar Uno', snippet: 'Sì, mi interessa! Chiamatemi. Il giorno lun 5 ott 2026 Mario ha scritto: ... rispondete "no grazie"' }),
      // opt-out da un altro indirizzo ma nello stesso thread
      msg({ id_gmail: 'r2', thread_id: 'T2', da: 'titolare@bar.it', oggetto: 'Re: ciao', snippet: 'No grazie, non mi interessa.' }),
      // bounce
      msg({ id_gmail: 'b1', thread_id: 'TX', rif: 'bounce', da: 'Mail Delivery Subsystem <mailer-daemon@googlemail.com>', oggetto: 'Delivery Status Notification (Failure)', snippet: "Address not found Your message wasn't delivered to tre@bar.it" }),
      // mail che non c'entra
      msg({ id_gmail: 'x1', thread_id: 'TZ', da: 'newsletter@shop.it', oggetto: 'Offerte', snippet: 'Sconti' }),
      // mail inviata da noi
      msg({ id_gmail: 'x2', thread_id: 'T1', da: 'a@gmail.com', oggetto: 'Re:', snippet: '' }),
    ],
    dati: { IMPOSTAZIONI: [cfg], 'Leggi CASELLE': CASELLE, 'Leggi CODA': CODA, 'Leggi REGISTRO': [{ lead_id: 'L1' }] },
  });
  const per = (d) => out.filter((o) => o._dest === d);
  assert.deepEqual(per('risposte').map((r) => [r.lead_id, r.tipo]), [['L1', 'RISPOSTA'], ['L2', 'OPT-OUT'], ['L3', 'BOUNCE']]);
  assert.deepEqual(per('coda').map((r) => [r.lead_id, r.stato]), [['L1', 'RISPOSTO'], ['L2', 'RISPOSTO'], ['L3', 'BOUNCE']]);
  assert.deepEqual(per('registro').map((r) => r.lead_id), ['L1']);
  assert.deepEqual(per('blacklist').map((r) => [r.email, r.motivo]), [['due@bar.it', 'ha chiesto di non essere contattato'], ['tre@bar.it', 'bounce']]);
  const [avviso] = per('avviso');
  assert.equal(avviso.oggetto, 'NOVA: 2 nuove risposte, 1 mail tornate indietro');
  assert.equal(avviso.a, cfg.email_avvisi);
});

test('04: sceglie i solleciti del giorno 4 e 9 e chiude chi non risponde', async () => {
  const cfg = await impostazioni(wf04, { modalita_test: false });
  const out = await eseguiCodice(wf04, 'Scegli lead', {
    dati: { IMPOSTAZIONI: [cfg], 'Leggi CASELLE': CASELLE, 'Leggi CODA': CODA, 'Leggi TESTI': TESTI, 'Leggi BLACKLIST': [{}] },
    adesso: '2026-10-05T14:30:00',
  });
  const controlla = out.filter((o) => o._dest === 'controlla');
  assert.deepEqual(controlla.map((o) => [o.lead_id, o.numero, o.azione, o.slot]), [['L1', 1, 'thread', 1], ['L2', 2, 'thread', 1]]);
  assert.deepEqual(out.filter((o) => o._dest === 'aggiorna').map((o) => [o.lead_id, o.stato]), [['L4', 'NESSUNA RISPOSTA']]);
});

test('04: non sollecita chi ha già risposto, altrimenti risponde nello stesso thread', async () => {
  const cfg = await impostazioni(wf04, { modalita_test: false });
  const scelto = { _dest: 'controlla', azione: 'thread', slot: 1, numero: 1, lead_id: 'L1', nome: 'Bar Uno', email: 'uno@bar.it', casella: 'a@gmail.com', nome_mittente: 'Mario', sito: 'https://bar1.it', thread_id: 'T1', oggetto_originale: 'Il sito di Bar Uno' };
  const nostro = { da: 'Mario <a@gmail.com>', message_id: '<m1@gmail.com>', oggetto: 'Il sito di Bar Uno' };
  const [sollecito] = await eseguiCodice(wf04, 'Prepara sollecito', {
    input: [{ ok: true, slot: 1, messaggi: [nostro] }],
    dati: { IMPOSTAZIONI: [cfg], 'Scegli lead': [scelto], 'Leggi TESTI': TESTI },
  });
  assert.equal(sollecito._dest, 'invia');
  assert.equal(sollecito.azione, 'rispondi');
  assert.equal(sollecito.a, 'uno@bar.it');
  assert.equal(sollecito.oggetto, 'Re: Il sito di Bar Uno');
  assert.equal(sollecito.in_reply_to, '<m1@gmail.com>');
  assert.equal(sollecito.thread_id, 'T1');
  assert.equal(sollecito.testo, 'Le riscrivo per Bar Uno (bar1.it).\nMario\n\nP.S. no grazie per non ricevere altro.');

  const [fermo] = await eseguiCodice(wf04, 'Prepara sollecito', {
    input: [{ ok: true, slot: 1, messaggi: [nostro, { da: 'uno@bar.it', message_id: '<r@bar>' }] }],
    dati: { IMPOSTAZIONI: [cfg], 'Scegli lead': [scelto], 'Leggi TESTI': TESTI },
  });
  assert.deepEqual([fermo._dest, fermo.stato], ['aggiorna', 'RISPOSTO']);

  const [esito] = await eseguiCodice(wf04, 'Esito sollecito', {
    input: [{ ok: true }],
    dati: { IMPOSTAZIONI: [cfg], 'Uno alla volta': [sollecito] },
    adesso: '2026-10-05T14:30:00',
  });
  assert.deepEqual(esito, { lead_id: 'L1', stato: 'FOLLOWUP 1', motivo: '', data_followup1: '2026-10-05' });
});

test('06 e 07: registra la demo inviata, manda i promemoria e si ferma se il lead risponde', async () => {
  const cfg6 = await impostazioni(wf06, { dominio_demo: 'demo.agenzia.it' });
  const reg = await eseguiCodice(wf06, 'Abbina al lead', {
    input: [{ azione: 'leggi', ok: true, slot: 1, thread_id: 'T1', a: 'Bar Uno <uno@bar.it>', snippet: 'Ecco la demo: https://demo.agenzia.it/bar-uno fammi sapere', data_ms: Date.parse('2026-10-01T12:00:00+02:00') }],
    dati: { IMPOSTAZIONI: [cfg6], 'Leggi CASELLE': CASELLE, 'Leggi CODA': CODA, 'Leggi REGISTRO': [{}] },
  });
  assert.equal(reg[0].link_demo, 'https://demo.agenzia.it/bar-uno');
  assert.equal(reg[0].data_demo, '2026-10-01');
  assert.deepEqual([reg[1].lead_id, reg[1].stato], ['L1', 'DEMO INVIATA']);

  const cfg7 = await impostazioni(wf07, { modalita_test: false });
  const registro = [{ ...reg[0], stato: 'IN ATTESA' }];
  const scelti = await eseguiCodice(wf07, 'Scegli', {
    dati: { IMPOSTAZIONI: [cfg7], 'Leggi CASELLE': CASELLE, 'Leggi REGISTRO': registro, 'Leggi TESTI': TESTI, 'Leggi BLACKLIST': [{}] },
    adesso: '2026-10-05T15:30:00',
  });
  assert.deepEqual(scelti.map((s) => [s.lead_id, s.numero]), [['L1', 1]]);

  const demo = { da: 'a@gmail.com', message_id: '<d@x>', oggetto: 'Re: Il sito', data_ms: Date.parse('2026-10-01T12:00:00+02:00') };
  const [promemoria] = await eseguiCodice(wf07, 'Prepara promemoria', {
    input: [{ json: { ok: true, slot: 1, messaggi: [demo] }, pairedItem: { item: 0 } }],
    dati: { IMPOSTAZIONI: [cfg7], Scegli: scelti, 'Leggi TESTI': TESTI },
  });
  assert.deepEqual([promemoria._dest, promemoria.testo, promemoria.oggetto], ['invia', 'Ha visto la demo? https://demo.agenzia.it/bar-uno', 'Re: Il sito']);

  const risposto = await eseguiCodice(wf07, 'Prepara promemoria', {
    input: [{ json: { ok: true, slot: 1, messaggi: [demo, { da: 'uno@bar.it', snippet: 'Bella!', data_ms: Date.parse('2026-10-02T09:00:00+02:00') }] }, pairedItem: { item: 0 } }],
    dati: { IMPOSTAZIONI: [cfg7], Scegli: scelti, 'Leggi TESTI': TESTI },
  });
  assert.deepEqual(risposto.map((r) => r._dest), ['registro', 'avviso']);
  assert.equal(risposto[0].stato, 'RISPOSTO');
});
