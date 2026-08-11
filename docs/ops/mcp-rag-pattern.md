# Patrón mcp-rag (ops-agent)

Servidor MCP **stdio** que indexa Markdown en **Qdrant** con embeddings de **Ollama**, para que el agente recupere conocimiento por query en lugar de leer árboles enteros de `.md`.

## Flujo de recuperación

1. El agente llama primero a `search_knowledge_base` (Qdrant + embedding).
2. Con los hits (ruta + fragmento + score), **opcionalmente** abre solo los `.md` / paths recomendados.
3. **No** debe volcar el árbol completo del repo en el contexto.

El ahorro de tokens solo aplica si el agente usa la tool de búsqueda en lugar de lecturas masivas de Markdown.

## Comparativa aproximada (WITH vs WITHOUT RAG)

Mediciones internas (tokens de contexto aproximados: sin RAG → con `search_knowledge_base`):

| Escenario | Sin RAG | Con RAG | Ahorro aprox. |
|-----------|---------|---------|---------------|
| Triage (ops) | ~1910 | ~502 | ~74% |
| Legal | ~1134 | ~571 | ~50% |
| whats-api knowledge | ~5035 | ~1058 | ~79% |
| autobot (ollama docs) | ~2232 | ~330 | ~85% |

Números orientativos: dependen del corpus indexado, del `limit` de búsqueda y de si el agente sigue abriendo archivos enteros después de los hits.

## Requisitos

- **Qdrant** (HTTP, p. ej. puerto `6333`)
- **Ollama** con modelo de embeddings `nomic-embed-text` (**768** dimensiones)

Greenfield: ver [`mcp-rag/docker-compose.example.yml`](../../mcp-rag/docker-compose.example.yml).

En una máquina que ya tenga esos servicios (p. ej. containers de otro producto), reutilízalos y apunta `OLLAMA_URL` / `QDRANT_URL`. Usa una colección dedicada (`ops_knowledge`) para no mezclar con otros índices.

## Otros clientes agentic

El patrón es **MCP stdio**: en principio es compatible con clientes que hablen MCP por stdio (Cursor; y setups tipo Claude Code / Codex **si** soportan MCP stdio).

No asumas un único archivo de config: **cablea el servidor vía la configuración MCP de cada cliente** (`command` + `args` + `env`).

Detalle de build, tools y `mcp.json`: [`mcp-rag/README.md`](../../mcp-rag/README.md).
