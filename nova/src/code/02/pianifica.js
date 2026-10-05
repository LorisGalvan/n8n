// Sceglie quali lead lavorare in questo giro e da quale casella scrivere (a turno).
const tutte = caselle('Leggi CASELLE').filter((c) => c.ruolo === 'INVIO');
let pronte = tutte.filter((c) => c.pronta);
if (!pronte.length && CFG.modalita_test) pronte = tutte; // in test si può provare anche durante il warm-up
if (!pronte.length) return []; // warm-up non ancora finito: non parte niente

// Regole e testi devono esserci, altrimenti il workflow si ferma
const regoleAttive = righe('Leggi REGOLE', 'id').filter((r) => si(r.attiva));
if (!regoleAttive.length) throw new Error('Nella scheda REGOLE non c\'è nessuna regola con attiva = SI.');
const testi = caricaTesti('Leggi TESTI');
for (const k of ['oggetto', 'saluto', 'proposta', 'chiusura', 'firma']) testo(testi, k);

const coda = righe('Leggi CODA', 'lead_id');
const blacklist = caricaBlacklist('Leggi BLACKLIST');

// Invii già fatti oggi per casella
const inviateOggi = {};
for (const r of coda) {
  if (leggiData(r.data_invio)?.toFormat('yyyy-MM-dd') === oggi()) {
    const k = normEmail(r.casella);
    inviateOggi[k] = (inviateOggi[k] || 0) + 1;
  }
}

// Capacità di questo giro: quota rimasta divisa per i giri rimasti oggi
const giriRestanti = Math.max(1, CFG.ora_ultimo_giro - $now.hour + 1);
const capacita = pronte.map((c) => {
  const limite = parseInt(c.limite_cold_giorno, 10) || CFG.limite_giornaliero_default;
  const restanti = Math.max(0, limite - (inviateOggi[c.email] || 0));
  return { casella: c, posti: Math.ceil(restanti / giriRestanti) };
});

// Email già contattate (in qualunque riga non NUOVO)
const contattate = new Set(
  coda.filter((r) => pulisci(r.stato).toUpperCase() !== 'NUOVO').map((r) => normEmail(r.email)),
);
const candidati = coda
  .filter((r) => pulisci(r.stato).toUpperCase() === 'NUOVO' && pulisci(r.email) && pulisci(r.sito))
  .filter((r) => !blacklist.contiene(r.email) && !contattate.has(normEmail(r.email)));

const out = [];
let giro = 0;
for (const lead of candidati) {
  if (out.length >= CFG.lead_per_esecuzione) break;
  if (contattate.has(normEmail(lead.email))) continue; // stessa email già scelta in questo giro
  // prossima casella con posti liberi, a turno
  let scelta = null;
  for (let t = 0; t < capacita.length; t++) {
    const c = capacita[(giro + t) % capacita.length];
    if (c.posti > 0) {
      scelta = c;
      giro = (giro + t + 1) % capacita.length;
      break;
    }
  }
  if (!scelta) break;
  scelta.posti--;
  contattate.add(normEmail(lead.email));
  out.push({
    json: {
      lead_id: pulisci(lead.lead_id),
      nome: pulisci(lead.nome),
      categoria: pulisci(lead.categoria),
      citta: pulisci(lead.citta),
      sito: pulisci(lead.sito),
      email: normEmail(lead.email),
      slot: scelta.casella.slot,
      casella: scelta.casella.email,
      nome_mittente: pulisci(scelta.casella.nome_mittente) || CFG.nome_mittente,
    },
  });
}
return out;
