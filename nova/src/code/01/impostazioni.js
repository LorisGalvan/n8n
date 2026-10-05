// ===== IMPOSTAZIONI — modifica solo i valori a destra =====
return [
  {
    json: {
      // ID del Google Sheet "NOVA - Database" (la parte dell'URL tra /d/ e /edit)
      id_foglio: 'INCOLLA_QUI_ID_GOOGLE_SHEET',
      // ID del workflow "00 - NOVA - Gmail (caselle)" (lo trovi nell'URL del workflow)
      id_workflow_gmail: 'INCOLLA_QUI_ID_WORKFLOW_00',

      // Dove e cosa cercare su Google Maps: il sistema prova le combinazioni città × categoria, una alla volta
      citta: ['Milano, Italia', 'Monza, Italia', 'Bergamo, Italia'],
      categorie: ['ristoranti', 'parrucchieri', 'centri estetici'],

      // Cerca nuovi lead solo se nella CODA ci sono meno di questi lead "NUOVO"
      soglia_coda_minima: 80,
      // Quante ricerche (città × categoria) fare al massimo ogni mattina
      ricerche_per_giorno: 2,
      // Risultati massimi per ricerca su Google Maps (più alto = più crediti Apify)
      risultati_per_ricerca: 40,
      // Dopo quanti giorni una combinazione città × categoria può essere ripetuta
      giorni_prima_di_ripetere: 90,

      // Actor Apify per Google Maps
      apify_actor: 'compass~crawler-google-places',

      // Avvisi (es. "contatti in esaurimento")
      email_avvisi: 'tua.email@esempio.it',
      slot_avvisi: 1, // da quale casella del workflow 00 partono gli avvisi
    },
  },
];
