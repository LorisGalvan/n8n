// Genera i file JSON dei workflow NOVA a partire dal codice in src/code.
// Uso: node nova/src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(SRC, '..', 'workflows');
const COMUNE = fs.readFileSync(path.join(SRC, 'code', 'lib', 'comune.js'), 'utf8');

const leggi = (file) => fs.readFileSync(path.join(SRC, 'code', file), 'utf8');
const conComune = (file) => `${COMUNE}\n// ---- Logica del nodo ----\n${leggi(file)}`;
const uuid = (seed) => {
  const h = crypto.createHash('sha1').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const CFG = (k) => `$('IMPOSTAZIONI').first().json.${k}`;
const FOGLIO = { __rl: true, mode: 'id', value: `={{ ${CFG('id_foglio')} }}` };
const SCHEDA = (nome) => ({ __rl: true, mode: 'name', value: nome });

class Workflow {
  constructor(nome) {
    this.nome = nome;
    this.nodes = [];
    this.connections = {};
  }

  add(name, type, typeVersion, parameters, position, extra = {}) {
    this.nodes.push({ parameters, id: uuid(`${this.nome}/${name}`), name, type, typeVersion, position, ...extra });
    return name;
  }

  link(da, a, uscita = 0, ingresso = 0) {
    const c = (this.connections[da] ??= { main: [] });
    while (c.main.length <= uscita) c.main.push([]);
    c.main[uscita].push({ node: a, type: 'main', index: ingresso });
  }

  catena(...nomi) {
    for (let i = 0; i < nomi.length - 1; i++) this.link(nomi[i], nomi[i + 1]);
  }

  // ---- tipi di nodo ----
  orario(name, cron, pos) {
    return this.add(name, 'n8n-nodes-base.scheduleTrigger', 1.2, { rule: { interval: [{ field: 'cronExpression', expression: cron }] } }, pos);
  }

  impostazioni(file, pos) {
    return this.add('IMPOSTAZIONI', 'n8n-nodes-base.code', 2, { jsCode: leggi(file) }, pos, {
      notes: 'Modifica qui i tuoi dati',
      notesInFlow: true,
      color: 6,
    });
  }

  codice(name, file, pos, { perOgniElemento = false, comune = true } = {}) {
    const parameters = { jsCode: comune ? conComune(file) : leggi(file) };
    if (perOgniElemento) parameters.mode = 'runOnceForEachItem';
    return this.add(name, 'n8n-nodes-base.code', 2, parameters, pos);
  }

  leggiScheda(name, scheda, pos) {
    return this.add(
      name,
      'n8n-nodes-base.googleSheets',
      4.5,
      { operation: 'read', documentId: FOGLIO, sheetName: SCHEDA(scheda), filtersUI: {}, options: {} },
      pos,
      { executeOnce: true, alwaysOutputData: true },
    );
  }

  aggiornaScheda(name, scheda, chiave, pos) {
    return this.add(
      name,
      'n8n-nodes-base.googleSheets',
      4.5,
      {
        operation: 'update',
        documentId: FOGLIO,
        sheetName: SCHEDA(scheda),
        columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [chiave], schema: [] },
        options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' },
      },
      pos,
    );
  }

  aggiungiScheda(name, scheda, pos) {
    return this.add(
      name,
      'n8n-nodes-base.googleSheets',
      4.5,
      {
        operation: 'append',
        documentId: FOGLIO,
        sheetName: SCHEDA(scheda),
        columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [] },
        options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' },
      },
      pos,
    );
  }

  gmail(name, pos) {
    return this.add(
      name,
      'n8n-nodes-base.executeWorkflow',
      1.1,
      {
        source: 'database',
        workflowId: { __rl: true, mode: 'id', value: `={{ ${CFG('id_workflow_gmail')} }}` },
        mode: 'each',
        options: { waitForSubWorkflow: true },
      },
      pos,
      { notes: 'Chiama il workflow 00 (Gmail)', notesInFlow: true },
    );
  }

  smista(name, uscite, espressione, pos) {
    return this.add(name, 'n8n-nodes-base.switch', 3.2, { mode: 'expression', numberOutputs: uscite, output: espressione, options: {} }, pos);
  }

  perDest(name, destinazioni, pos) {
    const lista = JSON.stringify(destinazioni).replace(/"/g, "'");
    return this.smista(name, destinazioni.length, `={{ ${lista}.indexOf($json._dest) }}`, pos);
  }

  unoAllaVolta(pos) {
    return this.add('Uno alla volta', 'n8n-nodes-base.splitInBatches', 3, { batchSize: 1, options: {} }, pos);
  }

  pausa(minKey, maxKey, pos) {
    return this.add(
      'Pausa',
      'n8n-nodes-base.wait',
      1.1,
      {
        amount: `={{ Math.floor(${CFG(minKey)} + Math.random() * (${CFG(maxKey)} - ${CFG(minKey)} + 1)) }}`,
        unit: 'seconds',
      },
      pos,
      { webhookId: uuid(`${this.nome}/Pausa/webhook`) },
    );
  }

  http(name, parameters, pos, extra = {}) {
    return this.add(name, 'n8n-nodes-base.httpRequest', 4.2, parameters, pos, extra);
  }

  nota(testo, pos, larghezza = 420, altezza = 260, colore = 7) {
    const n = this.nodes.filter((x) => x.type === 'n8n-nodes-base.stickyNote').length + 1;
    return this.add(`Nota ${n}`, 'n8n-nodes-base.stickyNote', 1, { content: testo, width: larghezza, height: altezza, color: colore }, pos);
  }

  json() {
    return {
      name: this.nome,
      nodes: this.nodes,
      connections: this.connections,
      active: false,
      settings: { executionOrder: 'v1', timezone: 'Europe/Rome', saveManualExecutions: true, callerPolicy: 'workflowsFromSameOwner' },
      pinData: {},
      meta: { templateCredsSetupCompleted: false },
      tags: [],
    };
  }
}

const X = (i) => 220 * i;

// =====================================================================
// 00 - Gmail (caselle)
// =====================================================================
function wf00() {
  const w = new Workflow('00 - NOVA - Gmail (caselle)');
  w.nota(
    '## 00 · Gmail (caselle)\nIl centralino: tutte le mail di NOVA passano da qui.\n\n**Unico punto in cui colleghi Gmail.**\nApri i nodi "Casella 1…10" e scegli la credenziale Gmail (OAuth2) della casella giusta. Lo slot deve corrispondere alla colonna `slot` della scheda CASELLE.\n\nLe caselle che non usi possono restare senza credenziale.\n\nNon va attivato: lo chiamano gli altri workflow.',
    [-60, -420],
    520,
    300,
    4,
  );
  w.add('Chiamato dagli altri workflow', 'n8n-nodes-base.executeWorkflowTrigger', 1, {}, [0, 0]);
  w.codice('Prepara richiesta', '00/prepara_richiesta.js', [X(1), 0], { perOgniElemento: true, comune: false });
  w.smista('Scegli casella', 10, '={{ $json.slot - 1 }}', [X(2), 0]);
  w.codice('Risultato', '00/risultato.js', [X(4), 0], { perOgniElemento: true, comune: false });
  w.catena('Chiamato dagli altri workflow', 'Prepara richiesta', 'Scegli casella');
  for (let s = 1; s <= 10; s++) {
    const nome = `Casella ${s}`;
    w.http(
      nome,
      {
        method: '={{ $json.metodo }}',
        url: '={{ $json.url }}',
        authentication: 'predefinedCredentialType',
        nodeCredentialType: 'gmailOAuth2',
        sendBody: "={{ $json.metodo === 'POST' }}",
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify($json.corpo) }}',
        options: { response: { response: { fullResponse: true, neverError: true } }, timeout: 60000 },
      },
      [X(3), (s - 5.5) * 130],
      { onError: 'continueRegularOutput', retryOnFail: true, maxTries: 2, waitBetweenTries: 3000 },
    );
    w.link('Scegli casella', nome, s - 1);
    w.link(nome, 'Risultato');
  }
  return w;
}

// =====================================================================
// 01 - Trova Nuovi Lead
// =====================================================================
function wf01() {
  const w = new Workflow('01 - NOVA - Trova Nuovi Lead');
  w.nota(
    '## 01 · Trova Nuovi Lead\nOgni giorno alle 7:00 riempie la scheda CODA.\n\n1. Se in CODA ci sono abbastanza lead NUOVO, si ferma.\n2. Altrimenti cerca su Google Maps (Apify) le prossime città × categorie.\n3. Tiene solo chi ha un sito e un\'email con dominio che riceve posta (MX).\n\nCredenziali: Google Sheets + Apify (Header Auth: `Authorization` = `Bearer IL_TUO_TOKEN`).',
    [-60, -420],
    560,
    300,
    4,
  );
  w.orario('Ogni giorno alle 7', '0 7 * * *', [0, 0]);
  w.impostazioni('01/impostazioni.js', [X(1), 0]);
  w.leggiScheda('Leggi CODA', 'CODA', [X(2), 0]);
  w.leggiScheda('Leggi RICERCHE', 'RICERCHE', [X(3), 0]);
  w.leggiScheda('Leggi BLACKLIST', 'BLACKLIST', [X(4), 0]);
  w.codice('Serve cercare?', '01/serve_cercare.js', [X(5), 0]);
  w.perDest('Ricerca o avviso', ['ricerca', 'avviso'], [X(6), 0]);
  w.http(
    'Cerca su Google Maps (Apify)',
    {
      method: 'POST',
      url: `=https://api.apify.com/v2/acts/{{ ${CFG('apify_actor')} }}/run-sync-get-dataset-items?timeout=280`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({ searchStringsArray: [$json.categoria], locationQuery: $json.citta, maxCrawledPlacesPerSearch: ${CFG('risultati_per_ricerca')}, language: 'it', skipClosedPlaces: true }) }}`,
      options: { timeout: 300000 },
    },
    [X(7), -100],
    { onError: 'continueRegularOutput' },
  );
  w.codice('Registra ricerca', '01/registra_ricerca.js', [X(7), 100]);
  w.aggiungiScheda('Aggiungi a RICERCHE', 'RICERCHE', [X(8), 100]);
  w.gmail('Avvisa: contatti in esaurimento', [X(7), 280]);
  w.codice('Prepara siti', '01/prepara_siti.js', [X(8), -100]);
  const scarica = (name, url, pos) =>
    w.http(
      name,
      {
        url,
        sendHeaders: true,
        headerParameters: { parameters: [{ name: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' }] },
        options: {
          batching: { batch: { batchSize: 5, batchInterval: 500 } },
          response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'data' } },
          timeout: 15000,
        },
      },
      pos,
      { onError: 'continueRegularOutput', alwaysOutputData: false },
    );
  scarica('Scarica home', '={{ $json.sito }}', [X(9), -100]);
  scarica('Scarica pagina contatti', "={{ $('Prepara siti').item.json.pagina_contatti }}", [X(10), -100]);
  w.codice('Estrai email', '01/estrai_email.js', [X(11), -100]);
  w.http(
    'Verifica dominio (MX)',
    {
      url: '=https://dns.google/resolve?name={{ $json.dominio_email }}&type=MX',
      options: { batching: { batch: { batchSize: 10, batchInterval: 300 } }, timeout: 10000 },
    },
    [X(12), -100],
    { onError: 'continueRegularOutput' },
  );
  w.codice('Lead validi', '01/lead_validi.js', [X(13), -100]);
  w.aggiungiScheda('Aggiungi alla CODA', 'CODA', [X(14), -100]);

  w.catena('Ogni giorno alle 7', 'IMPOSTAZIONI', 'Leggi CODA', 'Leggi RICERCHE', 'Leggi BLACKLIST', 'Serve cercare?', 'Ricerca o avviso');
  w.link('Ricerca o avviso', 'Cerca su Google Maps (Apify)', 0);
  w.link('Ricerca o avviso', 'Registra ricerca', 0);
  w.link('Ricerca o avviso', 'Avvisa: contatti in esaurimento', 1);
  w.link('Registra ricerca', 'Aggiungi a RICERCHE');
  w.catena('Cerca su Google Maps (Apify)', 'Prepara siti', 'Scarica home', 'Scarica pagina contatti', 'Estrai email', 'Verifica dominio (MX)', 'Lead validi', 'Aggiungi alla CODA');
  return w;
}

// =====================================================================
// 02 - Cold Email
// =====================================================================
function wf02() {
  const w = new Workflow('02 - NOVA - Cold Email');
  w.nota(
    '## 02 · Cold Email\nLun-ven, ogni ora dalle 9 alle 17.\n\n1. Prende i lead NUOVO dalla CODA e assegna una casella a turno (solo caselle con warm-up COMPLETATO).\n2. Apre il sito, Claude cerca uno dei problemi della scheda REGOLE e porta una citazione.\n3. Se la citazione si trova davvero nel sito → compone la mail con le frasi di TESTI e la spedisce.\n4. Se la prova non regge → il lead va in DA GUARDARE e non parte niente.\n\n**Parte in MODALITÀ TEST** (vedi IMPOSTAZIONI).\nCredenziali: Google Sheets + Anthropic (Header Auth: `x-api-key` = la tua chiave sk-ant-…).',
    [-60, -480],
    600,
    360,
    4,
  );
  w.orario('Lun-ven ogni ora 9-17', '0 9-17 * * 1-5', [0, 0]);
  w.impostazioni('02/impostazioni.js', [X(1), 0]);
  w.leggiScheda('Leggi CASELLE', 'CASELLE', [X(2), 0]);
  w.leggiScheda('Leggi CODA', 'CODA', [X(3), 0]);
  w.leggiScheda('Leggi REGOLE', 'REGOLE', [X(4), 0]);
  w.leggiScheda('Leggi TESTI', 'TESTI', [X(5), 0]);
  w.leggiScheda('Leggi BLACKLIST', 'BLACKLIST', [X(6), 0]);
  w.codice('Pianifica invii', '02/pianifica.js', [X(7), 0]);
  w.unoAllaVolta([X(8), 0]);
  w.http(
    'Scarica sito',
    {
      url: '={{ $json.sito }}',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' }] },
      options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } }, timeout: 20000 },
    },
    [X(9), 100],
    { onError: 'continueRegularOutput' },
  );
  w.codice('Prepara analisi', '02/prepara_analisi.js', [X(10), 100], { perOgniElemento: true });
  w.smista('Sito raggiungibile?', 2, '={{ $json.sito_ok ? 0 : 1 }}', [X(11), 100]);
  w.http(
    'Claude: cerca il problema',
    {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'anthropic-version', value: '2023-06-01' },
          { name: 'anthropic-beta', value: 'server-side-fallback-2026-07-01' },
        ],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json.richiesta_claude) }}',
      options: { timeout: 240000 },
    },
    [X(12), 0],
    { onError: 'continueRegularOutput', retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 },
  );
  w.codice('Verifica prova', '02/verifica_prova.js', [X(13), 0], { perOgniElemento: true });
  w.smista('La prova regge?', 2, '={{ $json.valida ? 0 : 1 }}', [X(14), 0]);
  w.codice('Componi email', '02/componi_email.js', [X(15), -100], { perOgniElemento: true });
  w.gmail('Invia (00)', [X(16), -100]);
  w.codice('Esito invio', '02/esito_invio.js', [X(17), -100], { perOgniElemento: true });
  w.aggiornaScheda('Aggiorna CODA (inviata)', 'CODA', 'lead_id', [X(18), -100]);
  w.pausa('pausa_min_secondi', 'pausa_max_secondi', [X(19), -100]);
  w.codice('Segna DA GUARDARE', '02/segna_da_guardare.js', [X(15), 250], { perOgniElemento: true });
  w.aggiornaScheda('Aggiorna CODA (da guardare)', 'CODA', 'lead_id', [X(16), 250]);

  w.catena('Lun-ven ogni ora 9-17', 'IMPOSTAZIONI', 'Leggi CASELLE', 'Leggi CODA', 'Leggi REGOLE', 'Leggi TESTI', 'Leggi BLACKLIST', 'Pianifica invii', 'Uno alla volta');
  w.link('Uno alla volta', 'Scarica sito', 1);
  w.catena('Scarica sito', 'Prepara analisi', 'Sito raggiungibile?');
  w.link('Sito raggiungibile?', 'Claude: cerca il problema', 0);
  w.link('Sito raggiungibile?', 'Segna DA GUARDARE', 1);
  w.catena('Claude: cerca il problema', 'Verifica prova', 'La prova regge?');
  w.link('La prova regge?', 'Componi email', 0);
  w.link('La prova regge?', 'Segna DA GUARDARE', 1);
  w.catena('Componi email', 'Invia (00)', 'Esito invio', 'Aggiorna CODA (inviata)', 'Pausa', 'Uno alla volta');
  w.catena('Segna DA GUARDARE', 'Aggiorna CODA (da guardare)', 'Uno alla volta');
  return w;
}

// =====================================================================
// 03 - Rilevamento Risposte
// =====================================================================
function wf03() {
  const w = new Workflow('03 - NOVA - Rilevamento Risposte');
  w.nota(
    '## 03 · Rilevamento Risposte\nOgni 2 ore dalle 8 alle 20 ascolta le caselle di invio.\n\n- Risposte → lead RISPOSTO + riga in RISPOSTE + avviso via email.\n- Mail tornate indietro → lead BOUNCE + BLACKLIST.\n- "Non mi interessa / cancellatemi…" → BLACKLIST (non verrà più contattato).',
    [-60, -400],
    540,
    260,
    4,
  );
  w.orario('Ogni 2 ore 8-20', '0 8-20/2 * * *', [0, 0]);
  w.impostazioni('03/impostazioni.js', [X(1), 0]);
  w.leggiScheda('Leggi CASELLE', 'CASELLE', [X(2), 0]);
  w.leggiScheda('Leggi CODA', 'CODA', [X(3), 0]);
  w.leggiScheda('Leggi RISPOSTE', 'RISPOSTE', [X(4), 0]);
  w.leggiScheda('Leggi REGISTRO', 'REGISTRO', [X(5), 0]);
  w.codice('Prepara ricerche', '03/prepara_ricerche.js', [X(6), 0]);
  w.gmail('Cerca nelle caselle (00)', [X(7), 0]);
  w.codice('Nuovi messaggi', '03/nuovi_messaggi.js', [X(8), 0]);
  w.gmail('Leggi messaggi (00)', [X(9), 0]);
  w.codice('Classifica', '03/classifica.js', [X(10), 0]);
  w.perDest('Smista', ['risposte', 'coda', 'registro', 'blacklist', 'avviso'], [X(11), 0]);
  w.aggiungiScheda('Aggiungi a RISPOSTE', 'RISPOSTE', [X(12), -300]);
  w.aggiornaScheda('Aggiorna CODA', 'CODA', 'lead_id', [X(12), -150]);
  w.aggiornaScheda('Aggiorna REGISTRO', 'REGISTRO', 'lead_id', [X(12), 0]);
  w.aggiungiScheda('Aggiungi a BLACKLIST', 'BLACKLIST', [X(12), 150]);
  w.gmail('Avvisami (00)', [X(12), 300]);
  w.catena('Ogni 2 ore 8-20', 'IMPOSTAZIONI', 'Leggi CASELLE', 'Leggi CODA', 'Leggi RISPOSTE', 'Leggi REGISTRO', 'Prepara ricerche', 'Cerca nelle caselle (00)', 'Nuovi messaggi', 'Leggi messaggi (00)', 'Classifica', 'Smista');
  ['Aggiungi a RISPOSTE', 'Aggiorna CODA', 'Aggiorna REGISTRO', 'Aggiungi a BLACKLIST', 'Avvisami (00)'].forEach((n, i) => w.link('Smista', n, i));
  return w;
}

// =====================================================================
// 04 - Follow-up
// =====================================================================
function wf04() {
  const w = new Workflow('04 - NOVA - Follow-up Cold Email');
  w.nota(
    '## 04 · Follow-up\nLun-ven alle 14:30.\n\nSollecito al giorno 4 e al giorno 9, nella stessa conversazione e dalla stessa casella della prima mail.\nPrima di ogni sollecito rilegge la conversazione: se il lead ha risposto si ferma.\nTesti: chiavi `followup_1` e `followup_2` della scheda TESTI.',
    [-60, -400],
    540,
    260,
    4,
  );
  w.orario('Lun-ven alle 14:30', '30 14 * * 1-5', [0, 0]);
  w.impostazioni('04/impostazioni.js', [X(1), 0]);
  w.leggiScheda('Leggi CASELLE', 'CASELLE', [X(2), 0]);
  w.leggiScheda('Leggi CODA', 'CODA', [X(3), 0]);
  w.leggiScheda('Leggi TESTI', 'TESTI', [X(4), 0]);
  w.leggiScheda('Leggi BLACKLIST', 'BLACKLIST', [X(5), 0]);
  w.codice('Scegli lead', '04/scegli_lead.js', [X(6), 0]);
  w.perDest('Da controllare?', ['controlla', 'aggiorna'], [X(7), 0]);
  w.gmail('Leggi conversazione (00)', [X(8), -100]);
  w.codice('Prepara sollecito', '04/prepara_sollecito.js', [X(9), -100], { perOgniElemento: true });
  w.perDest('Inviare?', ['invia', 'aggiorna'], [X(10), -100]);
  w.unoAllaVolta([X(11), -200]);
  w.gmail('Invia sollecito (00)', [X(12), -300]);
  w.codice('Esito sollecito', '04/esito_sollecito.js', [X(13), -300], { perOgniElemento: true });
  w.aggiornaScheda('Aggiorna CODA (sollecito)', 'CODA', 'lead_id', [X(14), -300]);
  w.pausa('pausa_min_secondi', 'pausa_max_secondi', [X(15), -300]);
  w.aggiornaScheda('Aggiorna CODA', 'CODA', 'lead_id', [X(11), 150]);

  w.catena('Lun-ven alle 14:30', 'IMPOSTAZIONI', 'Leggi CASELLE', 'Leggi CODA', 'Leggi TESTI', 'Leggi BLACKLIST', 'Scegli lead', 'Da controllare?');
  w.link('Da controllare?', 'Leggi conversazione (00)', 0);
  w.link('Da controllare?', 'Aggiorna CODA', 1);
  w.catena('Leggi conversazione (00)', 'Prepara sollecito', 'Inviare?');
  w.link('Inviare?', 'Uno alla volta', 0);
  w.link('Inviare?', 'Aggiorna CODA', 1);
  w.link('Uno alla volta', 'Invia sollecito (00)', 1);
  w.catena('Invia sollecito (00)', 'Esito sollecito', 'Aggiorna CODA (sollecito)', 'Pausa', 'Uno alla volta');
  return w;
}

// =====================================================================
// 05 - Email Warm-up
// =====================================================================
function wf05() {
  const w = new Workflow('05 - NOVA - Email Warm-up');
  w.nota(
    '## 05 · Email Warm-up\nOgni 2 ore dalle 8 alle 20, sempre acceso.\n\nPer 14 giorni le caselle della scheda CASELLE si scambiano mail normali (da 5 a 40 al giorno per casella), le tirano fuori dallo spam, le aprono e rispondono ad alcune.\nAl giorno 15 la colonna `stato_warmup` diventa COMPLETATO: è il via libera per il workflow 02.\nDopo resta acceso a basso volume per mantenere la reputazione.\n\n**Attivalo per primo e non toccarlo per 14 giorni.**',
    [-60, -440],
    560,
    300,
    4,
  );
  w.orario('Ogni 2 ore 8-20', '0 8-20/2 * * *', [0, 0]);
  w.impostazioni('05/impostazioni.js', [X(1), 0]);
  w.leggiScheda('Leggi CASELLE', 'CASELLE', [X(2), 0]);
  w.codice('Pianifica warm-up', '05/pianifica.js', [X(3), 0]);
  w.perDest('Mail o foglio?', ['gmail', 'foglio'], [X(4), 0]);
  w.gmail('Invia e cerca (00)', [X(5), -100]);
  w.codice('Spam, lette, risposte', '05/smista.js', [X(6), -100]);
  w.gmail('Sistema e leggi (00)', [X(7), -100]);
  w.codice('Prepara risposte', '05/prepara_risposte.js', [X(8), -100]);
  w.gmail('Rispondi (00)', [X(9), -100]);
  w.aggiornaScheda('Aggiorna CASELLE', 'CASELLE', 'email', [X(5), 150]);
  w.catena('Ogni 2 ore 8-20', 'IMPOSTAZIONI', 'Leggi CASELLE', 'Pianifica warm-up', 'Mail o foglio?');
  w.link('Mail o foglio?', 'Invia e cerca (00)', 0);
  w.link('Mail o foglio?', 'Aggiorna CASELLE', 1);
  w.catena('Invia e cerca (00)', 'Spam, lette, risposte', 'Sistema e leggi (00)', 'Prepara risposte', 'Rispondi (00)');
  return w;
}

// =====================================================================
// 06 - Rileva Demo Inviata (opzionale)
// =====================================================================
function wf06() {
  const w = new Workflow('06 - NOVA - Rileva Demo Inviata (opzionale)');
  w.nota(
    '## 06 · Rileva Demo Inviata (opzionale)\nLun-ven alle 15:00.\n\nGuarda la posta inviata: se hai mandato a mano a un lead il link della demo (dominio in IMPOSTAZIONI), lo scrive nel REGISTRO e mette il lead in DEMO INVIATA.',
    [-60, -380],
    520,
    240,
    4,
  );
  w.orario('Lun-ven alle 15', '0 15 * * 1-5', [0, 0]);
  w.impostazioni('06/impostazioni.js', [X(1), 0]);
  w.leggiScheda('Leggi CASELLE', 'CASELLE', [X(2), 0]);
  w.leggiScheda('Leggi CODA', 'CODA', [X(3), 0]);
  w.leggiScheda('Leggi REGISTRO', 'REGISTRO', [X(4), 0]);
  w.codice('Prepara ricerche', '06/prepara_ricerche.js', [X(5), 0]);
  w.gmail('Cerca nella posta inviata (00)', [X(6), 0]);
  w.codice('Da leggere', '06/da_leggere.js', [X(7), 0]);
  w.gmail('Leggi messaggi (00)', [X(8), 0]);
  w.codice('Abbina al lead', '06/abbina.js', [X(9), 0]);
  w.perDest('Smista', ['registro', 'coda'], [X(10), 0]);
  w.aggiungiScheda('Aggiungi al REGISTRO', 'REGISTRO', [X(11), -100]);
  w.aggiornaScheda('Aggiorna CODA', 'CODA', 'lead_id', [X(11), 100]);
  w.catena('Lun-ven alle 15', 'IMPOSTAZIONI', 'Leggi CASELLE', 'Leggi CODA', 'Leggi REGISTRO', 'Prepara ricerche', 'Cerca nella posta inviata (00)', 'Da leggere', 'Leggi messaggi (00)', 'Abbina al lead', 'Smista');
  w.link('Smista', 'Aggiungi al REGISTRO', 0);
  w.link('Smista', 'Aggiorna CODA', 1);
  return w;
}

// =====================================================================
// 07 - Solleciti Demo (opzionale)
// =====================================================================
function wf07() {
  const w = new Workflow('07 - NOVA - Solleciti Demo (opzionale)');
  w.nota(
    '## 07 · Solleciti Demo (opzionale)\nLun-ven alle 15:30.\n\nPromemoria al giorno 3 e al giorno 7 a chi ha ricevuto la demo e non ha più scritto (chiavi `demo_sollecito_1` e `demo_sollecito_2` in TESTI).\nSe il lead ha risposto si ferma e ti avvisa: la palla passa a te.',
    [-60, -380],
    520,
    240,
    4,
  );
  w.orario('Lun-ven alle 15:30', '30 15 * * 1-5', [0, 0]);
  w.impostazioni('07/impostazioni.js', [X(1), 0]);
  w.leggiScheda('Leggi CASELLE', 'CASELLE', [X(2), 0]);
  w.leggiScheda('Leggi REGISTRO', 'REGISTRO', [X(3), 0]);
  w.leggiScheda('Leggi TESTI', 'TESTI', [X(4), 0]);
  w.leggiScheda('Leggi BLACKLIST', 'BLACKLIST', [X(5), 0]);
  w.codice('Scegli', '07/scegli.js', [X(6), 0]);
  w.gmail('Leggi conversazione (00)', [X(7), 0]);
  w.codice('Prepara promemoria', '07/prepara.js', [X(8), 0]);
  w.perDest('Smista', ['invia', 'registro', 'avviso'], [X(9), 0]);
  w.gmail('Invia promemoria (00)', [X(10), -150]);
  w.codice('Esito', '07/esito.js', [X(11), -150], { perOgniElemento: true });
  w.aggiornaScheda('Aggiorna REGISTRO (promemoria)', 'REGISTRO', 'lead_id', [X(12), -150]);
  w.aggiornaScheda('Aggiorna REGISTRO', 'REGISTRO', 'lead_id', [X(10), 50]);
  w.gmail('Avvisami (00)', [X(10), 220]);
  w.catena('Lun-ven alle 15:30', 'IMPOSTAZIONI', 'Leggi CASELLE', 'Leggi REGISTRO', 'Leggi TESTI', 'Leggi BLACKLIST', 'Scegli', 'Leggi conversazione (00)', 'Prepara promemoria', 'Smista');
  w.link('Smista', 'Invia promemoria (00)', 0);
  w.link('Smista', 'Aggiorna REGISTRO', 1);
  w.link('Smista', 'Avvisami (00)', 2);
  w.catena('Invia promemoria (00)', 'Esito', 'Aggiorna REGISTRO (promemoria)');
  return w;
}

const tutti = [
  [wf00, ''],
  [wf01, ''],
  [wf02, ''],
  [wf03, ''],
  [wf04, ''],
  [wf05, ''],
  [wf06, 'opzionali'],
  [wf07, 'opzionali'],
];
for (const [fn, cartella] of tutti) {
  const w = fn();
  const dir = path.join(OUT, cartella);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${w.nome}.json`);
  fs.writeFileSync(file, `${JSON.stringify(w.json(), null, 2)}\n`);
  console.log(`✔ ${path.relative(path.join(SRC, '..'), file)} (${w.nodes.length} nodi)`);
}
