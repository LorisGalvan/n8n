// Mini-ambiente che imita il nodo Code di n8n, per provare la logica dei workflow senza n8n.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DateTime, Settings } from 'luxon';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'workflows');
Settings.defaultZone = 'Europe/Rome';

export function caricaWorkflow(prefisso) {
  for (const sub of ['', 'opzionali']) {
    const d = path.join(DIR, sub);
    const f = fs.readdirSync(d).find((x) => x.startsWith(prefisso) && x.endsWith('.json'));
    if (f) return JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
  }
  throw new Error(`Workflow ${prefisso} non trovato`);
}

const avvolgi = (lista) => lista.map((j, i) => (j && j.json ? j : { json: j, pairedItem: { item: i } }));

/**
 * Esegue il codice di un nodo Code.
 * @param wf workflow JSON
 * @param nodo nome del nodo
 * @param opts.input elementi in ingresso (json o {json,pairedItem})
 * @param opts.dati { 'Nome nodo': [json...] } output degli altri nodi
 * @param opts.adesso data/ora ISO per $now
 */
export async function eseguiCodice(wf, nodo, { input = [], dati = {}, adesso } = {}) {
  const n = wf.nodes.find((x) => x.name === nodo);
  if (!n) throw new Error(`Nodo ${nodo} non trovato`);
  const perOgni = n.parameters.mode === 'runOnceForEachItem';
  const items = avvolgi(input);
  const now = adesso ? DateTime.fromISO(adesso, { zone: 'Europe/Rome' }) : DateTime.now().setZone('Europe/Rome');

  const datiNodi = Object.fromEntries(Object.entries(dati).map(([k, v]) => [k, avvolgi(v)]));
  const corpo = n.parameters.jsCode;
  const fn = new Function('$', '$input', '$json', '$now', 'DateTime', 'Buffer', '$itemIndex', `return (async () => {\n${corpo}\n})();`);

  const accesso = (idx) => (nome) => {
    const lista = datiNodi[nome];
    if (!lista) throw new Error(`Il test non ha fornito i dati del nodo "${nome}"`);
    return {
      all: () => lista,
      first: () => lista[0],
      item: lista[idx] ?? lista[0],
      itemMatching: (i) => lista[i],
    };
  };

  if (!perOgni) {
    const r = await fn(accesso(0), { all: () => items, first: () => items[0] }, items[0]?.json, now, DateTime, Buffer, 0);
    return (Array.isArray(r) ? r : [r]).map((x) => x.json);
  }
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const r = await fn(accesso(i), { all: () => items, first: () => items[0], item: items[i] }, items[i].json, now, DateTime, Buffer, i);
    out.push(r.json);
  }
  return out;
}

// Esegue il nodo IMPOSTAZIONI e restituisce la configurazione
export async function impostazioni(wf, modifiche = {}) {
  const [cfg] = await eseguiCodice(wf, 'IMPOSTAZIONI');
  return { ...cfg, id_foglio: 'FOGLIO', id_workflow_gmail: 'WF00', ...modifiche };
}
