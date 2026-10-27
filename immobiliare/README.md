# Base di conoscenza — Agente esperto di immobiliare

Questa cartella contiene le informazioni di base che un BOT dell'agenzia immobiliare deve conoscere per rispondere a clienti, venditori, acquirenti, proprietari e inquilini. Il riferimento è il **mercato italiano**.

È pensata per due usi:

1. **System prompt**: il file `00-prompt/system-prompt-agente.md` si incolla così com'è nel nodo AI Agent / Claude di n8n.
2. **Knowledge base (RAG)**: tutti gli altri file si caricano in un vector store (Supabase, Pinecone, Qdrant, Google Drive + embeddings…). Ogni file ha un'intestazione YAML (`argomento`, `tag`, `aggiornato`) e sezioni brevi con titoli `##`, così si divide bene in chunk.

## Struttura

| Percorso | Contenuto |
|---|---|
| `00-prompt/system-prompt-agente.md` | Identità, tono, regole e limiti del bot. Da personalizzare con i dati dell'agenzia |
| `01-professione/agente-immobiliare.md` | Chi è il mediatore, requisiti, provvigione, incarico, responsabilità |
| `01-professione/obblighi-normativi.md` | Antiriciclaggio, privacy, APE negli annunci, registrazione dei preliminari |
| `02-compravendita/processo.md` | Le fasi della vendita: incarico → proposta → preliminare → rogito |
| `02-compravendita/documenti.md` | Checklist dei documenti per venditore e acquirente |
| `02-compravendita/imposte-e-costi.md` | Imposte di registro, IVA, agevolazione prima casa, notaio, plusvalenza |
| `03-locazione/contratti.md` | Tipi di contratto (4+4, 3+2, transitorio, studenti, brevi), cauzione, recesso |
| `03-locazione/fiscalita.md` | Registrazione, cedolare secca, imposta di registro, locazioni brevi e CIN |
| `04-valutazione/metodi.md` | Come si stima un immobile, OMI, coefficienti di merito, superficie commerciale |
| `05-mutui/mutui.md` | LTV, rapporto rata/reddito, tipi di tasso, costi, surroga, fondo Consap |
| `06-tecnico/catasto-urbanistica-condominio.md` | Catasto, conformità, agibilità, condominio, impianti |
| `07-conversazione/qualificazione-lead.md` | Domande per qualificare acquirenti, venditori e inquilini; dati da raccogliere |
| `07-conversazione/obiezioni-e-risposte.md` | Le obiezioni più frequenti e come rispondere |
| `07-conversazione/flussi-bot.md` | Flussi tipo del bot (primo contatto, appuntamento, valutazione, passaggio all'umano) |
| `glossario.md` | Termini del settore in ordine alfabetico |
| `faq.md` | Domande frequenti dei clienti con risposta breve |

## Regole per chi aggiorna i file

- **Le norme fiscali cambiano ogni anno** (Legge di Bilancio). Le cifre di questi file vanno ricontrollate almeno a gennaio. Ogni file ha il campo `aggiornato`: cambialo quando verifichi i contenuti.
- Le parti marcate **⚠️ Verificare** sono soggette a proroghe o modifiche frequenti (bonus, agevolazioni giovani, aliquote sugli affitti brevi).
- Il bot **informa, non consiglia** su questioni fiscali e legali: per casi specifici rimanda sempre a notaio, commercialista o avvocato. La regola è già nel system prompt.
- Una sezione `##` = un argomento. Se un paragrafo supera ~300 parole, dividilo: il RAG funziona meglio.
- I dati specifici dell'agenzia (zone, provvigioni, orari, immobili in portafoglio) **non vanno qui**: vanno nel Google Sheet o nel CRM che il bot legge, così si aggiornano senza toccare il repository.

## Come usarla in n8n (schema minimo)

```
Webhook / WhatsApp / Telegram ─▶ AI Agent (Claude)
                                   ├─ System prompt: 00-prompt/system-prompt-agente.md
                                   ├─ Tool "Base di conoscenza": vector store con le cartelle 01-07 + glossario + faq
                                   ├─ Tool "Immobili": Google Sheet / CRM con il portafoglio
                                   └─ Tool "Appuntamenti": Google Calendar
```

Per specializzare un bot (es. solo affitti, solo valutazioni, solo nuove costruzioni) si parte dallo stesso system prompt e si carica nel vector store solo il sottoinsieme di cartelle che serve.
