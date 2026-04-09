# Multi-Provider Open Source Spec

## Status
Accepted

## Date
2026-04-07

## Goal
Rendere OlonAgent un progetto open source utilizzabile senza costo di piattaforma proprietaria, dove ogni utente puo usare le proprie API key e scegliere provider/modello per ciascuno dei 2 agenti della pipeline.

## Product Requirements
- Il progetto deve funzionare con Anthropic, OpenAI e Gemini
- L'utente puo configurare provider e modello in modo separato per Agente 1 e Agente 2
- L'utente puo usare:
  - chiavi da server env
  - chiavi di sessione inserite dal frontend
- Il prodotto deve restare utilizzabile senza account centralizzato
- Fare un sito deve costare solo le API key e l'uso di E2B

## Non-Goals
- Non supportare provider arbitrari oltre i 3 dichiarati
- Non costruire un marketplace di modelli
- Non introdurre billing proprietario
- Non trasformare la UX in una console tecnica per configurazioni avanzate non necessarie

## Pipeline Model
### Agente 1
- Input:
  - design system JSON
  - SVG brand assets
  - dominio o contenuti forniti
  - provider/modello selezionato
- Output:
  - `src_tenant.sh`
- Modalita:
  - streaming

### Agente 2
- Input:
  - `src_tenant.sh`
  - tenant name
  - provider/modello selezionato
- Output:
  - `install_npm.jpcore.sh`
- Modalita:
  - esecuzione in E2B
  - build
  - fix loop TypeScript file-by-file

## UX Requirements
Il frontend deve rendere evidenti quattro cose:
- quali provider sono disponibili tramite env server
- quali chiavi sono state aggiunte per la sessione
- quale provider/modello usera Agente 1
- quale provider/modello usera Agente 2

### UX Rules
- Nessun termine tecnico inutile come payload, SSE o adapter nel flusso principale
- Se un provider non ha chiave disponibile, il sistema deve comunicarlo in modo chiaro
- La CTA di avanzamento deve essere bloccata se Agente 1 o Agente 2 non hanno un provider utilizzabile
- La configurazione LLM deve stare all'inizio della pipeline, non nascosta in un pannello secondario

## Technical Design
### Backend
Layer condiviso:
- `src/lib/llm/types.ts`
- `src/lib/llm/catalog.ts`
- `src/lib/llm/index.ts`
- `src/lib/llm/providers/anthropic.ts`
- `src/lib/llm/providers/openai.ts`
- `src/lib/llm/providers/gemini.ts`

API route:
- `GET /api/llm`
  - restituisce catalogo provider e disponibilita env
- `POST /api/llm`
  - esegue streaming testo verso il provider scelto
- `POST /api/sandbox`
  - riceve script + configurazione LLM dell'agente di fix

### Frontend
Stato da mantenere:
- provider availability da server
- session API keys
- config agente 1
- config agente 2
- validazione aggregata `llmReady`

Componenti:
- `LlmSetupPanel`
- integrazione nello step iniziale della pipeline

## Security Model
- Le chiavi da env restano server-side
- Le chiavi inserite dal frontend vengono trattate come chiavi di sessione lato client e inoltrate solo alle route necessarie
- Le chiavi non devono comparire nei log
- Le chiavi non devono essere persistite come default in repository o documentazione

## Error Handling
### Errori di configurazione
- provider non supportato
- modello mancante
- chiave mancante per provider scelto

### Errori runtime
- errore provider LLM
- errore sandbox E2B
- build fallita senza errori TypeScript parsabili

Il comportamento richiesto e:
- errore leggibile per l'utente
- nessun crash silenzioso
- nessuna ricaduta implicita su Claude-only

## Acceptance Criteria
- Agente 1 funziona con Anthropic, OpenAI e Gemini
- Agente 2 fix loop funziona con Anthropic, OpenAI e Gemini
- Il frontend permette di scegliere provider e modello per entrambi gli agenti
- Il frontend blocca la progressione se manca una chiave utilizzabile
- Il progetto non dipende piu dal vecchio path `/api/claude`
- La documentazione del repo descrive la pipeline reale a 2 agenti

## Future Work
- aggiornare i prompt estesi e i residui architetturali storici
- aggiungere preset UX come quality / balanced / low cost
- documentare le specifiche OlonJS che motivano il design del fix loop
