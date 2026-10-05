// Segna nel REGISTRO il promemoria inviato.
const s = $('Prepara promemoria').item.json;
const r = $json;
if (!r.ok) return { json: { lead_id: s.lead_id } };
const riga = { lead_id: s.lead_id, stato: `SOLLECITO ${s.numero}` };
riga[`data_sollecito${s.numero}`] = oggi();
return { json: riga };
