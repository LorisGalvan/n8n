// Segna nella CODA che il sollecito è partito.
const s = $('Uno alla volta').item.json;
const r = $json;
if (!r.ok) return { json: { lead_id: s.lead_id, motivo: `Sollecito ${s.numero} non inviato: ${r.errore}` } };
const riga = { lead_id: s.lead_id, stato: `FOLLOWUP ${s.numero}`, motivo: '' };
riga[`data_followup${s.numero}`] = oggi();
return { json: riga };
