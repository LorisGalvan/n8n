// ===== IMPOSTAZIONI — modifica solo i valori a destra =====
return [
  {
    json: {
      // ID del Google Sheet "NOVA - Database" (la parte dell'URL tra /d/ e /edit)
      id_foglio: 'INCOLLA_QUI_ID_GOOGLE_SHEET',
      // ID del workflow "00 - NOVA - Gmail (caselle)" (lo trovi nell'URL del workflow)
      id_workflow_gmail: 'INCOLLA_QUI_ID_WORKFLOW_00',

      // Dove ricevere l'avviso quando qualcuno risponde
      email_avvisi: 'tua.email@esempio.it',
      slot_avvisi: 1,

      // Quanti giorni indietro guardare nelle caselle
      giorni_da_controllare: 3,

      // Parola in codice del warm-up (uguale al workflow 05): quelle mail vengono ignorate
      tag_warmup: 'nvx7',

      // Se una risposta contiene una di queste frasi, il contatto finisce nella BLACKLIST (non verrà più scritto)
      frasi_opt_out: [
        'cancellami', 'cancellatemi', 'rimuovimi', 'rimuovetemi', 'disiscriv', 'non scrivetemi', 'non scrivermi',
        'non contattarmi', 'non contattatemi', 'non mi interessa', 'non ci interessa', 'non siamo interessati',
        'no grazie', 'unsubscribe', 'stop',
      ],
    },
  },
];
