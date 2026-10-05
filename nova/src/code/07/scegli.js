// Chi ha ricevuto la demo da 3 o 7 giorni e non ha ancora ricevuto il promemoria.
const testi = caricaTesti('Leggi TESTI');
testo(testi, 'demo_sollecito_1');
testo(testi, 'demo_sollecito_2');
const box = Object.fromEntries(caselle('Leggi CASELLE').map((c) => [c.email, c]));
const blacklist = caricaBlacklist('Leggi BLACKLIST');
const out = [];

for (const r of righe('Leggi REGISTRO', 'lead_id')) {
  const stato = pulisci(r.stato).toUpperCase();
  const giorni = giorniDa(r.data_demo);
  if (giorni === null || !pulisci(r.thread_id)) continue;
  let numero = 0;
  if (stato === 'IN ATTESA' && giorni >= CFG.giorno_sollecito_1) numero = 1;
  else if (stato === 'SOLLECITO 1' && giorni >= CFG.giorno_sollecito_2) numero = 2;
  if (!numero || blacklist.contiene(r.email)) continue;
  const casella = box[normEmail(r.casella)];
  if (!casella) continue;
  out.push({
    json: {
      azione: 'thread',
      slot: casella.slot,
      thread_id: pulisci(r.thread_id),
      rif: pulisci(r.lead_id),
      numero,
      lead_id: pulisci(r.lead_id),
      nome: pulisci(r.nome),
      email: normEmail(r.email),
      casella: casella.email,
      nome_mittente: pulisci(casella.nome_mittente) || CFG.nome_mittente,
      link_demo: pulisci(r.link_demo),
      data_demo: leggiData(r.data_demo)?.toFormat('yyyy-MM-dd'),
    },
  });
}
return out;
