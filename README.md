# ops-agent

Core delgado de trabajo: **biblioteca + playbooks** para operar productos con **Cursor (u otro cliente MCP)** como canal.

Tú = PM / senior. El agente = IC que busca trabajo, propone, ejecuta lo acotado y escala decisiones.

## Qué es / qué no es

| Es | No es |
|----|--------|
| Manifiesto de workspaces + inbox de jobs | Una UI / web app |
| Skills Cursor (`ops-triage`, `ops-job`, …) | Un producto de negocio concreto |
| Canal: Cursor (chat / Agent) + MCP opcional | Sustituto de mensajería remota (fase 2) |
| Pack SkillHub documentado (skills genéricas) | Catálogo de 100k skills a ciegas |

## Arranque rápido

1. Abre esta carpeta en Cursor (ruta local de tu máquina).
2. Copia el manifiesto de workspaces:

```bash
cp workspaces.example.yaml workspaces.yaml
# edita paths absolutos a tus repos
```

3. Pide: **ops-triage** o *“qué trabajamos esta semana”*
4. Aprueba un job: **arre** / *“ejecuta el #2”* → skill `ops-job`
5. Si hay duda de producto: el agente usa `ops-escalate` (una pregunta)

## Loop

```text
scan → propose (3 jobs) → arre → do → Needs review
                 ↘ escalate (1 pregunta) ↗
```

## Workspaces

Plantilla: [`workspaces.example.yaml`](workspaces.example.yaml).  
Copia a `workspaces.yaml` (gitignored: paths locales). Los productos **no** viven dentro de este repo.

Añadir uno:

```yaml
  - id: mi-producto
    path: /absolute/path/to/repo
    role: product   # o library
    tags: [tag1]
    notes: Una línea.
```

## Inbox y decisiones

- Jobs: [`docs/ops/inbox/`](docs/ops/inbox/) — ver formato en su README
- Decisiones: [`docs/ops/decisions/`](docs/ops/decisions/) — skill `ops-decision-log`

## Skills del proyecto

En [`.cursor/skills/`](.cursor/skills/):

| Skill | Uso |
|-------|-----|
| `ops-triage` | Proponer exactamente 3 jobs |
| `ops-job` | Ejecutar un job aprobado |
| `ops-escalate` | Una pregunta + opciones |
| `ops-decision-log` | Registrar decisión |
| `ops-scope-guard` | Límites (no store publish, no force-push, no ads bots, no auto-bid) |
| `ops-legal` | Borradores Privacy / Terms / Copyright (no es consejo legal) |

## Pack SkillHub (opcional)

Lista curada: [`docs/ops/skillhub-pack.md`](docs/ops/skillhub-pack.md)

```bash
./scripts/install-skillhub-pack.sh
```

Requiere red. Si un slug falla, el script continúa.

## MCP RAG (conocimiento por búsqueda)

Servidor MCP stdio: [`mcp-rag/`](mcp-rag/). Indexa Markdown en **Qdrant** con embeddings **Ollama** (`nomic-embed-text`, 768d).

### Flujo de recuperación

> El conocimiento del proyecto se recupera **primero** vía Qdrant (`search_knowledge_base`); luego el agente **opcionalmente** abre solo los `.md` / paths recomendados por los hits — **no** el árbol completo.

El ahorro de tokens solo cuenta si el agente usa `search_knowledge_base` en lugar de leer Markdown a mansalva. Ejemplo de mediciones y patrón reutilizable: [`docs/ops/mcp-rag-pattern.md`](docs/ops/mcp-rag-pattern.md).

### Requisitos de backends

- Servidor **Qdrant** + servidor **Ollama** con `nomic-embed-text`
- Greenfield: [`mcp-rag/docker-compose.example.yml`](mcp-rag/docker-compose.example.yml) (puertos `11434` / `6333`)
- Luego: `cd mcp-rag && npm install && npm run build`

Compatible en principio con otros clientes agentic que hablen **MCP stdio** (Cursor; Claude Code / Codex-style si soportan MCP). Cablea el servidor vía la **config MCP de cada cliente**.

### Cursor (local)

1. Build: `cd mcp-rag && npm install && npm run build`
2. Config **global** del usuario (no va en el repo): `~/.cursor/mcp.json` — servidor `ops-rag` apuntando a `mcp-rag/dist/index.js` (snippet en [`mcp-rag/README.md`](mcp-rag/README.md)).
3. Reinicia MCP / Cursor y verifica en **Customize → MCPs** (o Settings → MCP): `ops-rag` en verde con **2 tools enabled**.
4. Regla del repo: [`.cursor/rules/prefer-indexed-knowledge.mdc`](.cursor/rules/prefer-indexed-knowledge.mdc) — busca con `search_knowledge_base` antes de leer docs a mansalva. Pasa `project_id` según el producto (`ops-agent`, `autobot`, `whats-api`, `omnicast`, …).

![ops-rag en Cursor: estado verde, 2 tools enabled](docs/ops/images/cursor-mcp-ops-rag.png)

*UI esperada: `ops-rag` en verde con 2 tools enabled (`search_knowledge_base` + `sync_project_docs`). GitKraken u otros MCPs disabled son opcionales.*

## Fase 2 (fuera de este scaffold)

- Skills de producto / launch / freelance scan (con OK humano)
- Cursor Automations / SDK cron
- Mensajería remota solo para *Needs decision* / digests — no para editar repos

## Relación con otros repos

Los productos (apps, bots, APIs) son **peers** listados en `workspaces.yaml` local. No mezclar sus stacks ni roadmaps dentro de este core.
