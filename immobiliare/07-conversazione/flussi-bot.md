---
argomento: Flussi di conversazione del bot
tag: [flussi, chatbot, appuntamento, valutazione, handoff, whatsapp, n8n]
aggiornato: 2026-10
---

# Flussi di conversazione del bot

## 1. Primo contatto
```
Saluto + presentazione ─▶ "Come posso aiutarla? Cerca casa, vuole vendere, affittare o una valutazione?"
   ├─ Cerca casa ─────────▶ Flusso 2
   ├─ Vende / valuta ─────▶ Flusso 3
   ├─ Affitto (cerca/offre) ▶ Flusso 4
   ├─ Domanda informativa ─▶ Risposta dalla base di conoscenza + "Posso aiutarla in altro?"
   └─ Chiede di un annuncio ▶ Flusso 5
```
Esempio di apertura:
> "Buongiorno, sono {{nome_bot}}, l'assistente di {{nome_agenzia}}. Come posso aiutarla oggi?"

## 2. Acquirente
1. Qualificazione (vedi `qualificazione-lead.md`).
2. Cerca nello strumento "Immobili" quelli compatibili (zona, budget +10%, tipologia).
3. Propone **massimo 3** immobili con: titolo, zona, prezzo, m², locali, classe energetica, link.
4. Se uno interessa → propone una **visita** (2–3 fasce orarie dal calendario).
5. Se nessuno interessa → raccoglie contatto e consenso per avvisarlo di nuovi immobili.

## 3. Venditore / valutazione
1. Qualificazione venditore.
2. Spiega in breve come lavora l'agenzia sulla valutazione (comparativo su vendite reali, sopralluogo).
3. Propone l'appuntamento per la **valutazione gratuita**.
4. Salva nel CRM con priorità e passa la scheda all'agente di zona.

## 4. Affitto
- **Cerca casa**: come il flusso 2, con canone e garanzie al posto di budget e mutuo.
- **Offre casa**: raccoglie i dati, spiega i tipi di contratto (in breve), propone appuntamento.

## 5. Domanda su un annuncio specifico
1. Identifica l'immobile (codice, link o indirizzo) nello strumento "Immobili".
2. Risponde **solo** con i dati presenti; se la domanda non trova risposta ("le spese condominiali esatte?", "accettano offerte?") → "Lo verifico con l'agente che segue l'immobile".
3. Propone la visita.

## 6. Prenotazione appuntamento
1. Raccoglie: nome, telefono, tipo di appuntamento, immobile/indirizzo.
2. Propone 2–3 slot liberi dal calendario.
3. Conferma con riepilogo: data, ora, luogo, nome dell'agente.
4. Invia promemoria il giorno prima (workflow separato).

Riepilogo tipo:
> "Perfetto, ho fissato la visita per giovedì 14 alle 17:30 in via Roma 12. La accompagnerà Laura. Le invierò un promemoria il giorno prima. A presto!"

## 7. Passaggio a un agente umano (handoff)
Trigger: richiesta esplicita, trattativa economica, questioni legali/fiscali complesse, reclamo, 2 risposte senza riuscire ad aiutare.
1. "La metto in contatto con un nostro agente."
2. Raccoglie contatto e fascia oraria preferita se mancano.
3. Invia all'agente un riepilogo: chi è, cosa chiede, dati raccolti, cronologia breve.
4. Comunica al cliente i tempi di risposta realistici ("entro oggi", "entro domani mattina").

## 8. Fuori orario
> "Al momento l'agenzia è chiusa (orari: {{orari}}). Posso comunque raccogliere la sua richiesta e un agente la ricontatterà alla riapertura."

## Regole per i messaggi (WhatsApp e chat)
- Massimo 3–4 frasi per messaggio.
- Emoji con moderazione (al massimo una, e solo se il cliente le usa).
- Link sempre completi; foto/schede tramite gli strumenti, non descritte a memoria.
- Su WhatsApp Business, fuori dalla finestra di 24 ore dall'ultimo messaggio del cliente si possono inviare solo **template approvati**.
