// Estrae dal sito i segnali tecnici e il testo, e prepara la richiesta per Claude.
const lead = $('Uno alla volta').item.json;
const res = $json;
const stato = Number(res.statusCode || 0);
const html = typeof res.body === 'string' ? res.body : '';

if (!(stato >= 200 && stato < 400) || html.length < 200) {
  return { json: { ...lead, sito_ok: false, motivo: `Sito non raggiungibile (${stato || res.error?.message || 'errore di rete'})` } };
}

const decodifica = (s) =>
  String(s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n));
const primo = (re) => decodifica((html.match(re) || [])[1] || '').replace(/\s+/g, ' ').trim();
const tutti = (re) => [...html.matchAll(re)].map((m) => decodifica(m[1]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
const presente = (re) => (re.test(html) ? 'sì' : 'no');

const titolo = primo(/<title[^>]*>([\s\S]*?)<\/title>/i);
const metaDescr = primo(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
  primo(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
const anni = [...new Set((html.match(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi) || []).map((s) => s.match(/(\d{4})(?!.*\d{4})/)[1]))];
const generatore = primo(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*)["']/i);

const testoPagina = decodifica(
  html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)
  .replace(/[ \t]+/g, ' ')
  .replace(/\n\s*\n+/g, '\n')
  .trim()
  .slice(0, CFG.caratteri_massimi_pagina);

const segnali = [
  `url: ${lead.sito}`,
  `https: ${/^https:/i.test(lead.sito) ? 'sì' : 'no'}`,
  `title: ${titolo || '(assente)'}`,
  `meta_description: ${metaDescr || '(assente)'}`,
  `meta_viewport_mobile: ${presente(/<meta[^>]+name=["']viewport["']/i)}`,
  `h1: ${tutti(/<h1[^>]*>([\s\S]*?)<\/h1>/gi).slice(0, 5).join(' | ') || '(assente)'}`,
  `h2: ${tutti(/<h2[^>]*>([\s\S]*?)<\/h2>/gi).slice(0, 8).join(' | ') || '(assente)'}`,
  `anni_copyright: ${anni.join(', ') || '(nessuno)'}`,
  `generatore: ${generatore || '(non indicato)'}`,
  `modulo_contatto: ${presente(/<form[\s>]/i)}`,
  `link_telefono: ${presente(/href=["']tel:/i)}`,
  `link_email: ${presente(/href=["']mailto:/i)}`,
  `whatsapp: ${presente(/wa\.me|api\.whatsapp|whatsapp/i)}`,
  `prenotazione_online: ${presente(/prenot|booking|book now|reserv|thefork|quandoo|calendly/i)}`,
  `facebook: ${presente(/facebook\.com\//i)}`,
  `instagram: ${presente(/instagram\.com\//i)}`,
  `google_analytics_o_tag_manager: ${presente(/gtag\(|googletagmanager|google-analytics|ga\(/i)}`,
  `pixel_meta: ${presente(/fbq\(|connect\.facebook\.net/i)}`,
  `banner_cookie: ${presente(/cookie(bot|yes|law|-law|consent|_notice|banner)|iubenda|cookiebot|complianz/i)}`,
  `privacy_policy: ${presente(/privacy/i)}`,
  `dimensione_html_kb: ${Math.round(html.length / 1024)}`,
].join('\n');

const documento = `SEGNALI TECNICI\n${segnali}\n\nTESTO DELLA PAGINA\n${testoPagina}`;

const regole = righe('Leggi REGOLE', 'id')
  .filter((r) => si(r.attiva))
  .sort((a, b) => (parseInt(a.priorita, 10) || 99) - (parseInt(b.priorita, 10) || 99))
  .map((r) => `- id: ${pulisci(r.id)}\n  problema: ${pulisci(r.problema)}\n  cosa cercare: ${pulisci(r.cosa_cercare)}\n  prova richiesta: ${pulisci(r.prova_richiesta)}`)
  .join('\n');

const sistema = `Sei un analista che controlla il sito web di un'attività locale italiana per conto di ${CFG.azienda}.
Ti viene dato il contenuto della home page (segnali tecnici estratti dal codice + testo visibile) e un elenco di REGOLE: ogni regola descrive un problema che ${CFG.azienda} sa risolvere.

Data di oggi: ${oggi()}.

Il tuo compito: capire se UNA delle regole si applica a questo sito e dimostrarlo con una prova.

Regole di lavoro:
- Scegli al massimo una regola: quella più evidente; a parità di evidenza, quella che compare prima nell'elenco.
- La "citazione" deve essere copiata PAROLA PER PAROLA dal documento che ricevi (dai SEGNALI TECNICI o dal TESTO DELLA PAGINA), massimo 200 caratteri, senza aggiungere né correggere nulla. Per i problemi di assenza cita la riga del segnale tecnico (es. "meta_description: (assente)").
- Non inventare nulla e non dedurre cose che il documento non mostra. Se nessuna regola è dimostrabile, rispondi trovato = false.
- "prova" è una frase breve in italiano (massimo 25 parole), cortese e neutra, che descrive al titolare cosa hai notato sul suo sito. Verrà inserita nella mail: non usare toni allarmistici, non citare dati tecnici incomprensibili.
- "confidenza" è un numero tra 0 e 1 su quanto la prova è solida.

REGOLE
${regole}`;

const schema = {
  type: 'object',
  properties: {
    trovato: { type: 'boolean' },
    regola_id: { type: 'string' },
    citazione: { type: 'string' },
    prova: { type: 'string' },
    confidenza: { type: 'number' },
    nota: { type: 'string' },
  },
  required: ['trovato', 'regola_id', 'citazione', 'prova', 'confidenza', 'nota'],
  additionalProperties: false,
};

const richiesta_claude = {
  model: CFG.modello,
  max_tokens: 8000,
  fallbacks: 'default',
  output_config: { effort: CFG.effort, format: { type: 'json_schema', schema } },
  system: sistema,
  messages: [
    {
      role: 'user',
      content: `Attività: ${lead.nome} (${lead.categoria}, ${lead.citta})\n\n<documento>\n${documento}\n</documento>`,
    },
  ],
};

return { json: { ...lead, sito_ok: true, documento, richiesta_claude } };
