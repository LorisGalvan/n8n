# NOVA — Lead Finder + Cold Email con n8n e Claude

NOVA trova attività locali su Google Maps e analizza il loro sito. A ognuna scrive una mail su misura, ma solo quando Claude trova un problema e lo dimostra con una citazione presa dal sito. Poi segue le risposte e i solleciti.

```
01 riempie la coda ─▶ 05 scalda le caselle (14 giorni) ─▶ 02 analizza e spedisce
                                                          │
          06 · 07 seguono la demo ◀── 03 ascolta le risposte ◀── 04 insiste con chi tace
                         (tutte le mail passano da 00)
```

## Cosa c'è nella cartella

| Percorso | Contenuto |
|---|---|
| `workflows/` | I 6 workflow principali da importare in n8n (`00` … `05`) |
| `workflows/opzionali/` | `06` e `07`, solo se mandi un link demo a chi risponde |
| `foglio/NOVA - Database.xlsx` | Il modello del Google Sheet: CASELLE, CODA, REGOLE, TESTI, RISPOSTE, REGISTRO, BLACKLIST, RICERCHE |
| `src/` | Il sorgente da cui si generano i JSON e i test (`npm test`). Serve solo a chi modifica i workflow |

| # | Workflow | Quando | Cosa fa |
|---|---|---|---|
| 00 | Gmail (caselle) | richiamato dagli altri | Fa passare tutte le mail. Ha 10 slot ed è **l'unico punto con le credenziali Gmail** |
| 01 | Trova Nuovi Lead | ogni giorno alle 7:00 | Cerca su Google Maps (Apify) solo se la coda sta finendo. Tiene chi ha un sito e un'email con dominio valido (MX) |
| 02 | Cold Email | lun-ven, ogni ora 9-17 | Apre il sito e Claude cerca un problema della scheda REGOLE con una citazione. Se la citazione è davvero nel sito, spedisce. Altrimenti segna il lead DA GUARDARE |
| 03 | Rilevamento Risposte | ogni 2 ore, 8-20 | Segna risposte, bounce e richieste di non essere contattati, e ti avvisa via email |
| 04 | Follow-up | lun-ven alle 14:30 | Manda un sollecito al giorno 4 e uno al giorno 9, nella stessa conversazione. Si ferma se il lead risponde |
| 05 | Email Warm-up | ogni 2 ore, 8-20 | 14 giorni di scambi tra le caselle (da 5 a 40 mail al giorno per casella), poi dà il via libera |
| 06 | Rileva Demo Inviata (opz.) | lun-ven alle 15:00 | Si accorge che hai mandato a mano il link della demo e lo segna nel REGISTRO |
| 07 | Solleciti Demo (opz.) | lun-ven alle 15:30 | Promemoria al giorno 3 e al giorno 7. Se il lead risponde si ferma e ti avvisa |

I workflow arrivano **spenti** e il workflow 02 parte in **modalità test**.

---

## Installazione passo passo

### 0. Cosa ti serve
- Almeno 2 caselle Gmail: una per spedire (ruolo `INVIO`) e una che aiuta il warm-up (ruolo `WARMUP`). Meglio se su domini diversi.
- Un'istanza n8n (Cloud o self-hosted). Gli workflow da tenere attivi sono 4 (01-05, escluso 00) più 2 se usi gli opzionali.
- Un account Apify (token API) e una chiave API Anthropic (`sk-ant-…`).

### 1. Il Google Sheet
1. Carica `foglio/NOVA - Database.xlsx` su Google Drive, aprilo e scegli **File → Salva come Fogli Google**.
2. Copia l'ID del foglio: è la parte dell'URL tra `/d/` e `/edit`.
3. Scheda **CASELLE**: scrivi le tue caselle. `slot` è il numero (da 1 a 10) del nodo "Casella N" del workflow 00. Le colonne da `inizio_warmup` in poi le compila il sistema.
4. Schede **REGOLE** e **TESTI**: ci sono degli esempi da sostituire con le tue regole e i tuoi testi (vedi più sotto).

> Non rinominare le schede né le intestazioni delle colonne: i workflow le cercano per nome.

### 2. Le credenziali in n8n (Credentials → Add Credential)
| Credenziale | Tipo | Note |
|---|---|---|
| Gmail casella 1, 2, … | **Gmail OAuth2** | Una per casella, accedi con l'account Google giusto |
| Google Sheets | **Google Sheets OAuth2** | Con l'account che possiede il foglio |
| Anthropic | **Header Auth** | Name `x-api-key`, Value `sk-ant-…` |
| Apify | **Header Auth** | Name `Authorization`, Value `Bearer IL_TUO_TOKEN_APIFY` |

### 3. Importa i workflow
Importa i file **in quest'ordine**: Workflows → Add workflow → ⋯ → Import from File.

1. **00 - NOVA - Gmail (caselle)**
   - Apri i nodi "Casella 1", "Casella 2"… e in *Credential for Gmail OAuth2* scegli la casella giusta.
   - Salva e copia l'**ID del workflow**: è nell'URL, dopo `/workflow/`.
   - Non va attivato.
2. **01 … 05** (e 06, 07 se ti servono). In ogni workflow:
   - Nel nodo giallo **IMPOSTAZIONI** incolla `id_foglio` e `id_workflow_gmail`, poi cambia i valori di esempio (nome, azienda, email per gli avvisi, città, categorie…).
   - Nei nodi Google Sheets scegli la credenziale Google Sheets. Basta farlo su un nodo: n8n propone di applicarla a tutti.
   - Nel workflow 01, nodo "Cerca su Google Maps (Apify)": credenziale Apify.
   - Nel workflow 02, nodo "Claude: cerca il problema": credenziale Anthropic.
   - Salva.

### 4. Warm-up (14 giorni)
Attiva **05 - NOVA - Email Warm-up** e non toccarlo per 14 giorni.
- Nella scheda CASELLE vedrai crescere `giorno_warmup` e `inviate_oggi`.
- Al giorno 15 `stato_warmup` diventa **COMPLETATO**: è il via libera per il workflow 02.
- Puoi attivare anche **03** (non spedisce nulla, ascolta soltanto).

### 5. Prova in modalità test (mentre il warm-up gira)
1. Attiva **01**, oppure eseguilo a mano con *Execute workflow*, per riempire la CODA.
2. Esegui a mano **02**. In modalità test le mail arrivano a `email_test` e il lead viene segnato `TEST`. In test il workflow usa le caselle INVIO anche prima della fine del warm-up.
3. Leggi le mail di prova. Controlla anche i lead in **DA GUARDARE**: la colonna `motivo` spiega perché non è partito niente.
4. Sistema REGOLE e TESTI finché il risultato ti convince.

### 6. Partenza (dopo il giorno 14)
1. Nei workflow 02, 04 e 07 metti `modalita_test: false` nelle IMPOSTAZIONI.
2. Rimetti `NUOVO` nella colonna `stato` dei lead segnati `TEST`, se vuoi contattarli davvero.
3. Attiva **02** e **04** (e **06**, **07** se li usi).

---

## Le REGOLE: cosa vendi e a chi
Ogni riga della scheda REGOLE è un problema che sai risolvere. Claude ne cerca **una** nel sito del lead. Deve copiare parola per parola una citazione dal sito, e il workflow controlla che quella citazione ci sia davvero. Se manca, o se la confidenza è sotto `confidenza_minima`, non parte niente.

| Colonna | Cosa scrivere |
|---|---|
| `id` | Un codice breve, es. `R1` |
| `attiva` | `SI` / `NO` |
| `priorita` | 1 = la prima da cercare |
| `problema` | Il problema in una riga |
| `cosa_cercare` | Come riconoscerlo. Puoi usare i SEGNALI TECNICI che NOVA estrae dal sito: `https`, `meta_description`, `meta_viewport_mobile`, `anni_copyright`, `modulo_contatto`, `prenotazione_online`, `whatsapp`, `google_analytics_o_tag_manager`, `pixel_meta`, `banner_cookie`, `privacy_policy`, `h1`… |
| `prova_richiesta` | Che citazione deve portare Claude |
| `frase_email` | La frase che entra nella mail. `{prova}` è la frase scritta da Claude |

## I TESTI della mail
La mail è composta così: `saluto` + `apertura` + frase della regola + `proposta` + `chiusura` + `firma` + `opt_out`.
- Più righe con la stessa chiave sono varianti, scelte a caso a ogni invio.
- Le chiavi obbligatorie sono `oggetto`, `saluto`, `proposta`, `chiusura`, `firma`, `followup_1`, `followup_2`. Se usi gli opzionali servono anche `demo_sollecito_1` e `demo_sollecito_2`. Senza queste chiavi i workflow si fermano con un errore che dice quale manca.
- Segnaposto disponibili: `{nome_attivita} {categoria} {citta} {sito} {problema} {prova} {mittente} {azienda} {sito_azienda} {link_demo}`.

## Stati della CODA
`NUOVO` → `INVIATA` → `FOLLOWUP 1` → `FOLLOWUP 2` → `NESSUNA RISPOSTA`

Altri stati:
- `DA GUARDARE`: la prova non regge
- `RISPOSTO`
- `BOUNCE`
- `ESCLUSO`
- `ERRORE INVIO`
- `TEST`
- `DEMO INVIATA`

Per riprovare un lead scrivi `NUOVO` nella colonna `stato`.

## Scalare
1. Aggiungi la casella in CASELLE con un nuovo `slot` e lascia `inizio_warmup` vuoto.
2. Collega la sua credenziale al nodo "Casella N" del workflow 00.
3. Il warm-up della nuova casella parte da solo. Il workflow 02 inizierà a usarla quando il suo `stato_warmup` sarà COMPLETATO, ruotando automaticamente tra le caselle pronte.

Il limite di invii al giorno per casella è in `limite_cold_giorno`, nella scheda CASELLE.

## Regole d'oro e attenzione legale
- In Italia e nell'UE le email commerciali non richieste sono regolate da GDPR e Codice Privacy (art. 130), anche verso le aziende. Fatti consigliare da un consulente prima di partire.
- NOVA aiuta a restare nel corretto, ma non sostituisce il parere del consulente:
  - ogni mail ha l'header `List-Unsubscribe` e il P.S. `opt_out`;
  - chi risponde "no grazie" o "cancellatemi", e chi va in bounce, finisce in BLACKLIST e non viene più contattato;
  - si scrive solo a indirizzi pubblicati sul sito dell'attività.
- Volumi bassi e costanti, sempre dopo il warm-up. Non superare 20-30 cold email al giorno per casella Gmail.

## Costi indicativi
| Strumento | Costo |
|---|---|
| Gmail | gratuito |
| n8n | dipende dal piano |
| Apify | a consumo secondo il listino dell'actor Google Maps (piano gratuito: 5 $/mese di crediti) |
| Anthropic | con `claude-opus-5-5` e `effort: medium`, circa 3-6 centesimi per sito analizzato. Per spendere meno metti `modello: 'claude-sonnet-5-5'` nelle IMPOSTAZIONI del workflow 02 |

## Per chi modifica i workflow
I JSON in `workflows/` sono generati: il codice dei nodi Code sta in `src/code/`.

```bash
cd nova
npm install
npm run build   # rigenera workflows/*.json e foglio/NOVA - Database.xlsx (serve python3 + openpyxl)
npm test        # prova la logica dei nodi Code senza n8n
```
