// ===== IMPOSTAZIONI — modifica solo i valori a destra =====
return [
  {
    json: {
      // ID del Google Sheet "NOVA - Database" (la parte dell'URL tra /d/ e /edit)
      id_foglio: 'INCOLLA_QUI_ID_GOOGLE_SHEET',
      // ID del workflow "00 - NOVA - Gmail (caselle)" (lo trovi nell'URL del workflow)
      id_workflow_gmail: 'INCOLLA_QUI_ID_WORKFLOW_00',

      // Stessa modalità test del workflow 02: true = i solleciti vanno a email_test
      modalita_test: true,
      email_test: 'tua.email@esempio.it',

      nome_mittente: 'Mario Rossi',
      azienda: 'La Tua Azienda',
      sito_azienda: 'www.tuaazienda.it',

      // Giorni dalla prima mail
      giorno_followup_1: 4,
      giorno_followup_2: 9,
      giorno_chiusura: 16, // dopo questo giorno senza risposta il lead passa a "NESSUNA RISPOSTA"

      solleciti_per_esecuzione: 40,
      pausa_min_secondi: 30,
      pausa_max_secondi: 90,
    },
  },
];
