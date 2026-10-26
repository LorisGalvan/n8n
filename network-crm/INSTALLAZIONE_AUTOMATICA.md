# Installazione automatica · istruzioni per Claude

Questo file serve a una nuova sessione di Claude Code per installare il Network CRM
al posto di Loris, usando i segreti salvati nelle impostazioni dell'ambiente cloud.
I segreti NON vanno mai scritti in chat, nei commit o nei log.

## Variabili d'ambiente attese
| Variabile | Contenuto |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Personal access token di supabase.com (Account → Access Tokens) |
| `TELEGRAM_BOT_TOKEN` | Token del bot creato con @BotFather |
| `CRM_ANTHROPIC_KEY` | Chiave API Anthropic `sk-ant-…` (nome diverso da ANTHROPIC_API_KEY apposta) |
| `CRM_OPENAI_KEY` | Chiave API OpenAI `sk-…` (solo trascrizione vocali) |
| `N8N_URL` | Indirizzo dell'istanza n8n, es. `https://nome.app.n8n.cloud` |
| `N8N_API_KEY` | Chiave dell'API pubblica di n8n (Settings → n8n API) |

## Passi
1. Controllare che le variabili esistano (solo presenza, mai stamparne il valore).
2. Supabase (Management API `https://api.supabase.com/v1`):
   - prendere l'organizzazione di Loris, creare il progetto `network-crm` in `eu-central-1`
     con una password generata (da comunicare a Loris come da conservare, non in chiaro nei log);
   - attendere lo stato `ACTIVE_HEALTHY`;
   - eseguire `supabase/schema.sql` con `POST /projects/{ref}/database/query`;
   - creare gli utenti `loris4386@gmail.com` ed `enrico.berte@gmail.com` (Auth admin API con la
     chiave service_role, `email_confirm: true`, password temporanee da far cambiare);
   - eseguire `supabase/primo_avvio.sql` e controllare che restituisca i due amministratori.
3. n8n (API pubblica, header `X-N8N-API-KEY`):
   - creare le credenziali `telegramApi`, `supabaseApi` (host + service_role), `openAiApi`,
     `httpHeaderAuth` (`x-api-key` = chiave Anthropic);
   - importare i due JSON di `n8n/workflows/`, inserendo nei nodi gli id delle credenziali
     e l'URL Supabase nel nodo IMPOSTAZIONI;
   - attivare i due workflow.
4. Chiedere a Loris di scrivere `/start` al bot e di comunicare il codice (non è un segreto),
   poi eseguire `select collega_telegram('loris4386@gmail.com', 'CODICE');`.
5. Provare con un messaggio di testo e controllare l'esecuzione in n8n.
6. Dire a Loris cosa è stato fatto, cosa non è riuscito e come collegare Enrico (`/collega`).
