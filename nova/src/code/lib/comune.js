// ---- Funzioni comuni NOVA (incluse automaticamente in ogni nodo Code) ----
const CFG = $('IMPOSTAZIONI').first().json;

// Righe lette da un nodo Google Sheets (scarta le righe vuote)
function righe(nodo, colonnaChiave) {
  return $(nodo)
    .all()
    .map((i) => i.json)
    .filter((r) => r && String(r[colonnaChiave] ?? '').trim() !== '');
}

function si(v) {
  return ['si', 'sì', 'yes', 'y', 'true', '1', 'x', 'ok'].includes(String(v ?? '').trim().toLowerCase());
}

function pulisci(v) {
  return String(v ?? '').trim();
}

function normEmail(v) {
  return pulisci(v).toLowerCase();
}

function dominio(email) {
  return normEmail(email).split('@')[1] || '';
}

// Data di oggi nel fuso del workflow (YYYY-MM-DD)
function oggi() {
  return $now.toFormat('yyyy-MM-dd');
}

// Interpreta le date scritte nel foglio: 2026-10-05, 05/10/2026, numero seriale di Sheets
function leggiData(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    return DateTime.fromISO('1899-12-30', { zone: $now.zoneName }).plus({ days: Math.floor(v) }).startOf('day');
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return DateTime.fromObject({ year: +m[1], month: +m[2], day: +m[3] }, { zone: $now.zoneName });
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (m) return DateTime.fromObject({ year: +m[3], month: +m[2], day: +m[1] }, { zone: $now.zoneName });
  return null;
}

// Giorni interi trascorsi da una data del foglio (null se la data manca)
function giorniDa(v) {
  const d = leggiData(v);
  if (!d) return null;
  return Math.floor($now.startOf('day').diff(d.startOf('day'), 'days').days);
}

function scegli(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

// Sostituisce {segnaposto} nel testo
function riempi(testo, valori) {
  return String(testo ?? '').replace(/\{([a-z_]+)\}/gi, (tutto, k) =>
    valori[k] !== undefined && valori[k] !== null ? String(valori[k]) : tutto,
  );
}

// Testi dalla scheda TESTI: { chiave: [varianti...] }
function caricaTesti(nodo) {
  const testi = {};
  for (const r of righe(nodo, 'chiave')) {
    const k = pulisci(r.chiave).toLowerCase();
    const t = String(r.testo ?? '').replace(/\\n/g, '\n').trim();
    if (!t) continue;
    (testi[k] = testi[k] || []).push(t);
  }
  return testi;
}

function testo(testi, chiave, obbligatorio = true) {
  const v = testi[chiave];
  if (!v || !v.length) {
    if (obbligatorio) {
      throw new Error(`Nella scheda TESTI manca la chiave "${chiave}". Aggiungila prima di attivare il workflow.`);
    }
    return '';
  }
  return scegli(v);
}

// Caselle collegate nel workflow 00 (scheda CASELLE)
function caselle(nodo) {
  return righe(nodo, 'email')
    .filter((c) => si(c.attiva))
    .map((c) => ({
      ...c,
      email_foglio: pulisci(c.email),
      slot: parseInt(c.slot, 10),
      email: normEmail(c.email),
      ruolo: pulisci(c.ruolo).toUpperCase() || 'INVIO',
      pronta: pulisci(c.stato_warmup).toUpperCase() === 'COMPLETATO',
    }))
    .filter((c) => c.slot >= 1 && c.slot <= 10);
}

// Elenco opt-out / bounce (scheda BLACKLIST)
function caricaBlacklist(nodo) {
  const email = new Set();
  const domini = new Set();
  for (const r of $(nodo).all().map((i) => i.json)) {
    if (pulisci(r.email)) email.add(normEmail(r.email));
    if (pulisci(r.dominio)) domini.add(pulisci(r.dominio).toLowerCase());
  }
  return { email, domini, contiene: (e) => email.has(normEmail(e)) || domini.has(dominio(e)) };
}
