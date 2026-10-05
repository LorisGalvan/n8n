import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caricaWorkflow, eseguiCodice, impostazioni } from './runtime.mjs';

const wf00 = caricaWorkflow('00');
const wf05 = caricaWorkflow('05');

const decodifica = (raw) => Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

test('00: invia costruisce una mail MIME corretta con oggetto UTF-8 e risposta in thread', async () => {
  const [r] = await eseguiCodice(wf00, 'Prepara richiesta', {
    input: [{ azione: 'invia', slot: '2', a: 'lead@pizzeria.it', da: 'mario@gmail.com', nome_mittente: 'Mario Rossi', oggetto: 'Novità per la pizzeria è qui', testo: 'Riga 1\nRiga 2 àèì', thread_id: 't1', in_reply_to: '<abc@x>', list_unsubscribe: 'mario@gmail.com', rif: 'L-1' }],
  });
  assert.equal(r.metodo, 'POST');
  assert.equal(r.slot, 2);
  assert.match(r.url, /messages\/send$/);
  assert.equal(r.corpo.threadId, 't1');
  const mime = decodifica(r.corpo.raw);
  assert.match(mime, /^From: Mario Rossi <mario@gmail.com>\r\n/);
  assert.match(mime, /Subject: =\?UTF-8\?B\?/);
  assert.match(mime, /In-Reply-To: <abc@x>/);
  assert.match(mime, /List-Unsubscribe: <mailto:mario@gmail.com/);
  assert.match(mime, new RegExp(`Message-ID: ${r.message_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  const corpo = mime.split('\r\n\r\n')[1].replace(/\r\n/g, '');
  assert.equal(Buffer.from(corpo, 'base64').toString('utf8'), 'Riga 1\r\nRiga 2 àèì');
  const subj = mime.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1];
  assert.equal(Buffer.from(subj, 'base64').toString('utf8'), 'Novità per la pizzeria è qui');
});

test('00: slot non valido e azioni di lettura', async () => {
  await assert.rejects(eseguiCodice(wf00, 'Prepara richiesta', { input: [{ azione: 'cerca', slot: 11 }] }), /Slot casella non valido/);
  const [c] = await eseguiCodice(wf00, 'Prepara richiesta', { input: [{ azione: 'cerca', slot: 1, query: 'in:spam nvx7', max: 5 }] });
  assert.equal(c.metodo, 'GET');
  assert.match(c.url, /messages\?q=in%3Aspam%20nvx7&maxResults=5$/);
  const [t] = await eseguiCodice(wf00, 'Prepara richiesta', { input: [{ azione: 'thread', slot: 1, thread_id: 'abc' }] });
  assert.match(t.url, /threads\/abc\?format=metadata&metadataHeaders=From/);
});

test('00: Risultato uniforma risposte ed errori di Gmail', async () => {
  const req = { azione: 'leggi', slot: 3, rif: 'x' };
  const [ok] = await eseguiCodice(wf00, 'Risultato', {
    input: [{ statusCode: 200, body: { id: 'm1', threadId: 't1', snippet: 'ciao', labelIds: ['INBOX'], internalDate: '1700000000000', payload: { headers: [{ name: 'From', value: 'Lead <lead@x.it>' }, { name: 'Message-ID', value: '<id@x>' }, { name: 'Subject', value: 'Re: test' }] } } }],
    dati: { 'Prepara richiesta': [req] },
  });
  assert.deepEqual([ok.ok, ok.id_gmail, ok.da, ok.message_id, ok.oggetto, ok.rif], [true, 'm1', 'Lead <lead@x.it>', '<id@x>', 'Re: test', 'x']);
  const [ko] = await eseguiCodice(wf00, 'Risultato', {
    input: [{ statusCode: 403, body: { error: { message: 'Insufficient Permission' } } }],
    dati: { 'Prepara richiesta': [req] },
  });
  assert.equal(ko.ok, false);
  assert.equal(ko.errore, 'Insufficient Permission');
  const [rete] = await eseguiCodice(wf00, 'Risultato', { input: [{ error: { message: 'ETIMEDOUT' } }], dati: { 'Prepara richiesta': [req] } });
  assert.equal(rete.errore, 'ETIMEDOUT');
});

const CASELLE = [
  { slot: 1, email: 'A@gmail.com', ruolo: 'INVIO', attiva: 'SI', nome_mittente: 'Mario', inizio_warmup: '', inviate_oggi: '', data_conteggio: '' },
  { slot: 2, email: 'b@outlook.it', ruolo: 'WARMUP', attiva: 'SI', inizio_warmup: '2026-09-22', inviate_oggi: 10, data_conteggio: '2026-10-05' },
  { slot: 3, email: 'c@gmail.com', ruolo: 'INVIO', attiva: 'SI', inizio_warmup: '2026-09-01', inviate_oggi: 3, data_conteggio: '2026-10-04' },
  { slot: 4, email: 'spenta@gmail.com', ruolo: 'INVIO', attiva: 'NO' },
];

test('05: rampa del warm-up, via libera dopo 14 giorni e conteggi giornalieri', async () => {
  const cfg = await impostazioni(wf05);
  const out = await eseguiCodice(wf05, 'Pianifica warm-up', {
    dati: { IMPOSTAZIONI: [cfg], 'Leggi CASELLE': CASELLE },
    adesso: '2026-10-05T20:00:00',
  });
  const foglio = Object.fromEntries(out.filter((r) => r._dest === 'foglio').map((r) => [r.email, r]));
  const invii = (slot) => out.filter((r) => r.azione === 'invia' && r.slot === slot);

  // casella nuova: giorno 1 → 5 mail, ultima esecuzione della giornata → tutte ora
  assert.equal(foglio['A@gmail.com'].giorno_warmup, 1);
  assert.equal(foglio['A@gmail.com'].inizio_warmup, '2026-10-05');
  assert.equal(foglio['A@gmail.com'].stato_warmup, 'IN CORSO');
  assert.equal(invii(1).length, 5);
  // giorno 14 → 40 mail, 10 già inviate oggi
  assert.equal(foglio['b@outlook.it'].giorno_warmup, 14);
  assert.equal(invii(2).length, 30);
  assert.equal(foglio['b@outlook.it'].inviate_oggi, 40);
  assert.equal(foglio['b@outlook.it'].inizio_warmup, undefined);
  // oltre 14 giorni → COMPLETATO e mantenimento (10), il conteggio di ieri non vale
  assert.equal(foglio['c@gmail.com'].stato_warmup, 'COMPLETATO');
  assert.equal(invii(3).length, 10);
  // casella spenta ignorata, nessuno scrive a se stesso, tag presente
  assert.equal(foglio['spenta@gmail.com'], undefined);
  for (const m of out.filter((r) => r.azione === 'invia')) {
    assert.notEqual(m.a, m.da);
    assert.match(m.testo, /Rif\. nvx7$/);
  }
  assert.equal(out.filter((r) => r.azione === 'cerca').length, 6);
});

test('05: a metà giornata distribuisce le mail sulle esecuzioni rimaste', async () => {
  const cfg = await impostazioni(wf05);
  const out = await eseguiCodice(wf05, 'Pianifica warm-up', {
    dati: { IMPOSTAZIONI: [cfg], 'Leggi CASELLE': CASELLE.slice(1, 3) },
    adesso: '2026-10-05T08:00:00',
  });
  // casella 2: 30 restanti su 7 esecuzioni → 5 (±1)
  const n = out.filter((r) => r.azione === 'invia' && r.slot === 2).length;
  assert.ok(n >= 4 && n <= 6, `invii: ${n}`);
});

test('05: spam recuperato, mail aperte e risposte solo fino al secondo livello', async () => {
  const cfg = await impostazioni(wf05, { percentuale_risposte: 100 });
  const smistati = await eseguiCodice(wf05, 'Spam, lette, risposte', {
    input: [
      { azione: 'invia', ok: true },
      { azione: 'cerca', ok: true, rif: 'spam', slot: 1, messaggi: [{ id_gmail: 's1' }] },
      { azione: 'cerca', ok: true, rif: 'inbox', slot: 2, messaggi: [{ id_gmail: 'i1' }] },
    ],
    dati: { IMPOSTAZIONI: [cfg] },
  });
  assert.deepEqual(smistati.find((x) => x.id_gmail === 's1').rimuovi_etichette, ['SPAM']);
  assert.ok(smistati.some((x) => x.azione === 'leggi' && x.id_gmail === 'i1'));

  const risposte = await eseguiCodice(wf05, 'Prepara risposte', {
    input: [
      { azione: 'leggi', ok: true, slot: 2, da: 'Mario <a@gmail.com>', oggetto: 'Domanda veloce', thread_id: 't', message_id: '<m@x>' },
      { azione: 'leggi', ok: true, slot: 2, da: 'a@gmail.com', oggetto: 'Re: Re: Domanda veloce', thread_id: 't2', message_id: '<n@x>' },
    ],
    dati: { IMPOSTAZIONI: [cfg], 'Leggi CASELLE': CASELLE },
  });
  assert.equal(risposte.length, 1);
  assert.deepEqual([risposte[0].a, risposte[0].da, risposte[0].oggetto, risposte[0].in_reply_to], ['a@gmail.com', 'b@outlook.it', 'Re: Domanda veloce', '<m@x>']);
});
