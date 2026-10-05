// Tiene solo le email il cui dominio può ricevere posta (record MX) e prepara le righe per la CODA.
const leads = $('Estrai email').all();
const mx = $input.all();
const out = [];

for (let i = 0; i < leads.length; i++) {
  const lead = leads[i].json;
  const r = mx[i]?.json || {};
  const haMx = r.Status === 0 && Array.isArray(r.Answer) && r.Answer.some((a) => a.type === 15);
  if (!haMx) continue;
  const { ricerca, dominio_email, ...dati } = lead;
  out.push({ json: { ...dati, stato: 'NUOVO', data_inserimento: oggi() } });
}

return out;
