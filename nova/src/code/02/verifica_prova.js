// Controlla che la prova di Claude regga davvero: regola attiva, confidenza sufficiente,
// citazione presente parola per parola nel sito. Se non regge, il lead va in DA GUARDARE.
const ctx = $('Prepara analisi').item.json;
const res = $json;
const { documento, richiesta_claude, ...lead } = ctx;
const scarta = (motivo, extra = {}) => ({ json: { ...lead, valida: false, motivo, ...extra } });

if (res.error) return scarta(`Errore Claude: ${res.error.message || JSON.stringify(res.error).slice(0, 200)}`);
const body = res;
if (body.stop_reason === 'refusal') return scarta('Claude ha rifiutato l\'analisi');
if (body.stop_reason === 'max_tokens') return scarta('Risposta di Claude troncata');

const blocco = (body.content || []).find((b) => b.type === 'text');
let esito;
try {
  esito = JSON.parse(blocco?.text || '');
} catch (e) {
  return scarta('Risposta di Claude non leggibile');
}

if (!esito.trovato) return scarta(`Nessun problema dimostrabile${esito.nota ? `: ${esito.nota}` : ''}`);

const regola = righe('Leggi REGOLE', 'id').find((r) => pulisci(r.id) === pulisci(esito.regola_id) && si(r.attiva));
if (!regola) return scarta(`Regola inesistente o non attiva: ${esito.regola_id}`);

const extra = { regola_id: pulisci(regola.id), prova: `${esito.prova} [citazione: "${esito.citazione}"]` };
if (!(Number(esito.confidenza) >= CFG.confidenza_minima)) {
  return scarta(`Prova debole (confidenza ${esito.confidenza})`, extra);
}

const norm = (s) => String(s || '').toLowerCase().replace(/[“”«»"']/g, '').replace(/\s+/g, ' ').trim();
const citazione = norm(esito.citazione);
if (citazione.length < 8 || !norm(documento).includes(citazione)) {
  return scarta('La citazione non si trova nel sito: prova non verificata', extra);
}

return {
  json: {
    ...lead,
    ...extra,
    valida: true,
    prova_testo: esito.prova.trim(),
    citazione: esito.citazione,
    frase_email: pulisci(regola.frase_email),
    problema: pulisci(regola.problema),
  },
};
