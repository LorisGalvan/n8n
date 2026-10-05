// ===== IMPOSTAZIONI — modifica solo i valori a destra =====
return [
  {
    json: {
      // ID del Google Sheet "NOVA - Database" (la parte dell'URL tra /d/ e /edit)
      id_foglio: 'INCOLLA_QUI_ID_GOOGLE_SHEET',
      // ID del workflow "00 - NOVA - Gmail (caselle)" (lo trovi nell'URL del workflow)
      id_workflow_gmail: 'INCOLLA_QUI_ID_WORKFLOW_00',

      // Durata del warm-up e volumi giornalieri per casella
      giorni_warmup: 14,
      volume_iniziale: 5, // mail al giorno il giorno 1
      volume_finale: 40, // mail al giorno l'ultimo giorno di warm-up
      volume_mantenimento: 10, // mail al giorno dopo il warm-up (per mantenere la reputazione)

      // Fascia oraria in cui il warm-up lavora (deve combaciare con il trigger: ogni 2 ore dalle 8 alle 20)
      ora_inizio: 8,
      ora_fine: 20,

      // Percentuale di mail di warm-up ricevute a cui rispondere
      percentuale_risposte: 35,

      // Parola in codice inserita nelle mail di warm-up (serve per riconoscerle). Uguale nel workflow 03!
      tag_warmup: 'nvx7',
    },
  },
];
