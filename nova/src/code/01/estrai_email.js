// Trova l'email migliore nella home e nella pagina contatti del sito.
const leads = $('Prepara siti').all();
const home = $('Scarica home').all();
const contatti = $input.all();
const blacklist = caricaBlacklist('Leggi BLACKLIST');
const emailInCoda = new Set(righe('Leggi CODA', 'lead_id').map((r) => normEmail(r.email)).filter(Boolean));

const SCARTA = /\.(png|jpe?g|gif|webp|svg|css|js|ico)$|example\.|esempio\.|dominio\.|domain\.|sentry|wixpress|wix\.com|godaddy|cloudflare|@2x|yourdomain|tuodominio|nome@|email@|user@|noreply|no-reply|privacy@|pec\.|@pec|legalmail|postacert/i;
const PREFERITI = ['info', 'contatti', 'contact', 'ciao', 'hello', 'prenotazioni', 'booking', 'amministrazione', 'segreteria', 'ufficio'];

function emailDa(html) {
  const testo = String(html || '')
    .replace(/&#64;|&commat;|\[at\]|\(at\)| at /gi, '@')
    .replace(/&#46;|\[dot\]|\(dot\)/gi, '.')
    .replace(/%40/g, '@');
  const trovate = testo.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  return trovate.map((e) => e.toLowerCase().replace(/^mailto:/, '').replace(/[.,;:]+$/, ''));
}

const out = [];
for (let i = 0; i < leads.length; i++) {
  const lead = leads[i].json;
  const tutte = [
    ...(lead.email_apify || []).map(normEmail),
    ...emailDa(home[i]?.json?.data),
    ...emailDa(contatti[i]?.json?.data),
  ];
  let host = '';
  try {
    host = new URL(lead.sito).hostname.replace(/^www\./, '');
  } catch (e) {}
  const valide = [...new Set(tutte)].filter((e) => !SCARTA.test(e) && e.length < 80);
  if (!valide.length) continue;

  const punteggio = (e) => {
    let p = 0;
    if (host && dominio(e) === host) p += 10;
    if (PREFERITI.includes(e.split('@')[0])) p += 5;
    return p;
  };
  valide.sort((a, b) => punteggio(b) - punteggio(a));
  const email = valide[0];
  if (blacklist.contiene(email) || emailInCoda.has(email)) continue;

  const { email_apify, pagina_contatti, ...resto } = lead;
  out.push({ json: { ...resto, email, dominio_email: dominio(email) } });
}
return out;
