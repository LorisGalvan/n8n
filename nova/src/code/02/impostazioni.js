// ===== IMPOSTAZIONI — modifica solo i valori a destra =====
return [
  {
    json: {
      // ID del Google Sheet "NOVA - Database" (la parte dell'URL tra /d/ e /edit)
      id_foglio: 'INCOLLA_QUI_ID_GOOGLE_SHEET',
      // ID del workflow "00 - NOVA - Gmail (caselle)" (lo trovi nell'URL del workflow)
      id_workflow_gmail: 'INCOLLA_QUI_ID_WORKFLOW_00',

      // MODALITÀ TEST: true = tutte le mail vanno a email_test (non ai lead) e il lead viene segnato "TEST".
      // Metti false solo quando REGOLE e TESTI sono pronti e il warm-up è finito.
      modalita_test: true,
      email_test: 'tua.email@esempio.it',

      // Chi firma le mail (se nella scheda CASELLE c'è nome_mittente, vince quello)
      nome_mittente: 'Mario Rossi',
      azienda: 'La Tua Azienda',
      sito_azienda: 'www.tuaazienda.it',

      // Volumi
      limite_giornaliero_default: 20, // mail a freddo al giorno per casella (se in CASELLE manca limite_cold_giorno)
      lead_per_esecuzione: 8, // lead analizzati al massimo a ogni giro (il workflow gira ogni ora 9-17)
      ora_ultimo_giro: 17,
      pausa_min_secondi: 40, // pausa casuale tra un invio e l'altro
      pausa_max_secondi: 120,

      // Analisi del sito con Claude
      modello: 'claude-opus-5-5',
      effort: 'medium',
      confidenza_minima: 0.7, // sotto questa soglia la prova non regge e il lead va in DA GUARDARE
      caratteri_massimi_pagina: 15000,
    },
  },
];
