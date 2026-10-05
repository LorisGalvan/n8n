// Decide quante mail di warm-up spedire ora da ogni casella e prepara il controllo spam/posta in arrivo.
const box = caselle('Leggi CASELLE');
if (box.length < 2) {
  throw new Error('Per il warm-up servono almeno 2 caselle attive nella scheda CASELLE (colonna attiva = SI).');
}

// Quante esecuzioni restano oggi (una ogni 2 ore tra ora_inizio e ora_fine)
const ora = $now.hour;
let esecuzioniRestanti;
if (ora < CFG.ora_inizio) esecuzioniRestanti = Math.floor((CFG.ora_fine - CFG.ora_inizio) / 2) + 1;
else if (ora > CFG.ora_fine) esecuzioniRestanti = 1;
else esecuzioniRestanti = Math.floor((CFG.ora_fine - ora) / 2) + 1;

const OGGETTI = [
  'Aggiornamento sulla settimana', 'Domanda veloce', 'Riunione di giovedì', 'Documenti per il progetto',
  'Ci sentiamo domani?', 'Proposta di calendario', 'Grazie per ieri', 'Appunti della call',
  'Preventivo da rivedere', 'Info sul fornitore', 'Programma del mese', 'Conferma appuntamento',
  'Due righe sul progetto', 'Idee per la presentazione', 'Feedback sulla bozza', 'Pianificazione attività',
  'Orari della prossima settimana', 'Report mensile', 'Nuovo contatto', 'Piccola novità',
];
const APERTURE = ['Ciao,', 'Buongiorno,', 'Ciao!', 'Buon pomeriggio,', 'Salve,', 'Ciao, come va?'];
const CORPI = [
  'ti scrivo per aggiornarti: abbiamo chiuso la prima parte del lavoro e la prossima settimana passiamo alla revisione.',
  'volevo chiederti se hai avuto modo di guardare il documento che ti ho girato. Fammi sapere se ci sono modifiche.',
  'ho sentito il fornitore e mi ha confermato le date. Ti mando i dettagli appena li ho tutti.',
  'per la riunione di giovedì possiamo spostarci alle 11? Alle 10 ho già un altro impegno.',
  'ti giro gli appunti della call di oggi, così abbiamo tutto in un posto solo.',
  'ho dato un\'occhiata alla bozza: nel complesso mi piace, ho solo un paio di osservazioni sulla parte finale.',
  'la settimana prossima sono in ufficio da martedì a venerdì, dimmi tu quando ti torna comodo sentirci.',
  'grazie ancora per la disponibilità di ieri, è stato utile confrontarci con calma.',
  'ho preparato una prima versione del calendario del mese. Se vedi sovrapposizioni dimmelo pure.',
  'ti confermo che il materiale è pronto. Se ti serve qualcos\'altro sono qui.',
  'stavo pensando a come organizzare meglio le attività di fine mese, magari ne parliamo a voce.',
  'mi hanno chiesto un aggiornamento sui tempi: secondo te riusciamo a chiudere entro fine mese?',
];
const CHIUSURE = ['A presto', 'Grazie', 'Buona giornata', 'Ciao', 'Un saluto', 'Ci sentiamo'];

function generaMail(nome) {
  const firma = nome ? `\n${nome}` : '';
  return {
    oggetto: scegli(OGGETTI),
    testo: `${scegli(APERTURE)}\n\n${scegli(CORPI)}\n\n${scegli(CHIUSURE)}${firma}\n\nRif. ${CFG.tag_warmup}`,
  };
}

const out = [];
for (const c of box) {
  const nuovoInizio = !leggiData(c.inizio_warmup);
  const giorno = nuovoInizio ? 1 : giorniDa(c.inizio_warmup) + 1;
  const completato = giorno > CFG.giorni_warmup;
  const quota = completato
    ? CFG.volume_mantenimento
    : Math.round(
        CFG.volume_iniziale +
          ((CFG.volume_finale - CFG.volume_iniziale) * (giorno - 1)) / Math.max(1, CFG.giorni_warmup - 1),
      );
  const dataConteggio = leggiData(c.data_conteggio);
  const giaInviate = dataConteggio && dataConteggio.toFormat('yyyy-MM-dd') === oggi() ? parseInt(c.inviate_oggi, 10) || 0 : 0;
  const restanti = Math.max(0, quota - giaInviate);
  let adesso = Math.ceil(restanti / esecuzioniRestanti);
  // Un po' di variabilità per non sembrare un robot
  if (adesso > 1 && esecuzioniRestanti > 1 && Math.random() < 0.3) adesso += Math.random() < 0.5 ? -1 : 1;
  adesso = Math.max(0, Math.min(adesso, restanti));

  const altri = box.filter((x) => x.email !== c.email);
  for (let i = 0; i < adesso; i++) {
    const m = generaMail(pulisci(c.nome_mittente));
    out.push({
      json: {
        _dest: 'gmail',
        azione: 'invia',
        slot: c.slot,
        da: c.email,
        nome_mittente: pulisci(c.nome_mittente),
        a: scegli(altri).email,
        oggetto: m.oggetto,
        testo: m.testo,
        rif: 'warmup',
      },
    });
  }

  // Recupera dallo spam le mail di warm-up e apri quelle arrivate
  out.push({ json: { _dest: 'gmail', azione: 'cerca', slot: c.slot, query: `in:spam ${CFG.tag_warmup} newer_than:7d`, max: 25, rif: 'spam' } });
  out.push({ json: { _dest: 'gmail', azione: 'cerca', slot: c.slot, query: `in:inbox is:unread ${CFG.tag_warmup} newer_than:3d`, max: 25, rif: 'inbox' } });

  const riga = {
    _dest: 'foglio',
    email: c.email_foglio,
    giorno_warmup: giorno,
    stato_warmup: completato ? 'COMPLETATO' : 'IN CORSO',
    inviate_oggi: giaInviate + adesso,
    data_conteggio: oggi(),
  };
  if (nuovoInizio) riga.inizio_warmup = oggi();
  out.push({ json: riga });
}
return out;
