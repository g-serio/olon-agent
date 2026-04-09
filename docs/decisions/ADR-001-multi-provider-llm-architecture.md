# ADR-001: Adopt a first-class multi-provider LLM architecture

## Status
Accepted

## Date
2026-04-07

## Context
OlonAgent era accoppiato ad Anthropic in modo diretto:
- client dedicato `claude.ts`
- route dedicata `/api/claude`
- fix loop sandbox che chiamava Anthropic direttamente

Questo modello entrava in conflitto con l'obiettivo di prodotto:
- progetto open source
- nessun costo piattaforma proprietaria
- uso basato sulle API key dell'utente
- supporto ad almeno Anthropic, OpenAI e Gemini
- scelta provider/modello separata per i 2 agenti della pipeline

Inoltre il repository conteneva materiale legacy di una versione precedente, creando una differenza tra idea attuale, codice vivo e documentazione.

## Decision
Adottiamo un'architettura multi-provider first-class, limitata esplicitamente a 3 provider supportati:
- Anthropic
- OpenAI
- Gemini

La decisione include:
- un layer LLM condiviso con adapter per provider
- una route generica `/api/llm`
- l'uso dello stesso layer sia per Agente 1 sia per il fix loop di Agente 2
- una UX iniziale che espone provider, modelli e chiavi in modo esplicito

Non adottiamo un sistema "provider-agnostic" illimitato. Supportiamo pochi provider, bene.

## Alternatives Considered

### Continuare con Anthropic-only
- Pros: minima complessita tecnica
- Cons: lock-in diretto contro gli obiettivi open source e di prodotto
- Rejected: non coerente con la direzione del progetto

### Supporto multi-provider solo lato backend senza UI dedicata
- Pros: refactor tecnico piu rapido
- Cons: UX opaca, impossibile capire quale agente stia usando quale modello
- Rejected: la scelta provider/modello e parte del prodotto, non un dettaglio interno

### Plugin system per provider arbitrari
- Pros: massima estensibilita teorica
- Cons: complessita eccessiva, peggiore DX, nessun valore immediato
- Rejected: il progetto supporta 3 provider noti; una generalizzazione ulteriore sarebbe prematura

## Consequences
- Il backend ha piu codice di integrazione, ma la complessita resta confinata in adapter chiari
- Il frontend acquisisce un pannello LLM dedicato e una validazione piu rigorosa
- Le chiavi da env restano supportate
- Le chiavi di sessione dal frontend diventano possibili
- Il vecchio percorso Claude-only viene rimosso dal flusso primario
- La documentazione deve essere riallineata alla pipeline reale a 2 agenti

## References
- [Multi-provider spec](/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/docs/specs/multi-provider-open-source.md)
- [LLM route](/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/src/app/api/llm/route.ts)
- [Pipeline hook](/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/src/hooks/usePipeline.ts)
