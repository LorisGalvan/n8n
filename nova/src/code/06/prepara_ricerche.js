// Cerca nella posta inviata di ogni casella le mail che contengono il link della demo.
return caselle('Leggi CASELLE')
  .filter((c) => c.ruolo === 'INVIO')
  .map((c) => ({
    json: {
      azione: 'cerca',
      slot: c.slot,
      query: `in:sent newer_than:${CFG.giorni_da_controllare}d "${CFG.dominio_demo}"`,
      max: 50,
      rif: 'demo',
    },
  }));
