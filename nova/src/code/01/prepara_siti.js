// Dai risultati di Google Maps tiene solo le attività con un sito, non già in CODA.
const ricerche = $('Serve cercare?').all();
const giaInCoda = new Set(righe('Leggi CODA', 'lead_id').map((r) => pulisci(r.lead_id)));
const giaVisti = new Set();
const out = [];

function idLead(p) {
  const base = p.placeId || p.cid || `${p.title}|${p.address}`;
  let h = 0;
  for (const ch of String(base)) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0;
  return `L-${(h >>> 0).toString(36)}`;
}

for (const item of $input.all()) {
  const p = item.json;
  if (!p || p.error || !p.title) continue;
  if (p.permanentlyClosed || p.temporarilyClosed) continue;
  let sito = pulisci(p.website);
  if (!sito) continue;
  if (!/^https?:\/\//i.test(sito)) sito = `http://${sito}`;
  // Scarta i "siti" che sono solo pagine social o di prenotazione
  if (/facebook\.com|instagram\.com|linktr\.ee|tripadvisor|thefork|booking\.com|wa\.me|google\.com/i.test(sito)) continue;

  const id = idLead(p);
  if (giaInCoda.has(id) || giaVisti.has(id)) continue;
  giaVisti.add(id);

  const origine = ricerche[item.pairedItem?.item ?? 0]?.json || {};
  const pagContatti = (() => {
    try {
      return new URL('/contatti', sito).href;
    } catch (e) {
      return sito;
    }
  })();

  out.push({
    json: {
      lead_id: id,
      nome: pulisci(p.title),
      categoria: pulisci(p.categoryName || origine.categoria),
      citta: pulisci(p.city || origine.citta),
      indirizzo: pulisci(p.address),
      telefono: pulisci(p.phone || p.phoneUnformatted),
      sito,
      pagina_contatti: pagContatti,
      rating: p.totalScore ?? '',
      recensioni: p.reviewsCount ?? '',
      email_apify: [].concat(p.emails || [], p.email || []).filter(Boolean),
      ricerca: `${origine.citta}|${origine.categoria}`,
    },
  });
}
return out;
