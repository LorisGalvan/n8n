// ===== IMPOSTAZIONI — modifica solo i valori a destra =====
return [
  {
    json: {
      // ID del Google Sheet "NOVA - Database" (la parte dell'URL tra /d/ e /edit)
      id_foglio: 'INCOLLA_QUI_ID_GOOGLE_SHEET',
      // ID del workflow "00 - NOVA - Gmail (caselle)" (lo trovi nell'URL del workflow)
      id_workflow_gmail: 'INCOLLA_QUI_ID_WORKFLOW_00',

      // true = i promemoria vanno a email_test invece che al lead
      modalita_test: true,
      email_test: 'tua.email@esempio.it',

      nome_mittente: 'Mario Rossi',
      azienda: 'La Tua Azienda',
      sito_azienda: 'www.tuaazienda.it',

      // Giorni dall'invio della demo
      giorno_sollecito_1: 3,
      giorno_sollecito_2: 7,

      // Dove ricevere l'avviso quando un lead risponde dopo la demo
      email_avvisi: 'tua.email@esempio.it',
      slot_avvisi: 1,
    },
  },
];
