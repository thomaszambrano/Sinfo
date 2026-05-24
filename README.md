# Jurisprudencia CO

Buscador semántico de sentencias de la Corte Constitucional colombiana. El usuario describe su situación en lenguaje natural y recibe sentencias relevantes con extractos y citas.

**Deploy:** https://jurisprudencia-co.vercel.app

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend + API | Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui |
| Vector store | Supabase + pgvector |
| Embeddings | Google `gemini-embedding-2` (3072 dims) |
| LLM | Google `gemini-2.0-flash` vía AI SDK |
| Ingestión (offline) | Python + LangChain text splitter |

---

## Arquitectura RAG

```
consulta usuario
      │
      ▼
embedQuery()          → gemini-embedding-2 (RETRIEVAL_QUERY)
      │
      ▼
matchChunks()         → Supabase RPC match_chunks (pgvector cosine)
      │  top-8 chunks
      ▼
filtro similitud      → umbral 0.55 (descarta ruido)
      │
      ▼
generateAnswer()      → gemini-2.0-flash con contexto estructurado
      │
      ▼
respuesta + fuentes   → UI con extractos y links a sentencias
```

### Chunking
- Tamaño: 800 tokens, overlap 100
- Separadores: `\n\n`, `\n`, `. ` (respeta párrafos jurídicos)
- Se descartan chunks < 100 caracteres

---

## Pipeline de ingestión (offline)

```bash
cd ingestion/
pip install -r requirements.txt

python 01_scrape.py        # Descarga PDFs de la Corte Constitucional
python 02_clean_chunk.py   # Limpia y parte en chunks
python 03_embed_upload.py  # Embeds con Gemini + carga a Supabase
```

`03_embed_upload.py` soporta rotación de múltiples API keys (`GEMINI_API_KEY`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`) para superar rate limits del plan gratuito. Detecta chunks ya subidos para evitar duplicados.

---

## Variables de entorno

```env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
GEMINI_API_KEY=
GEMINI_API_KEY_2=   # opcional, rotación anti-ratelimit
GEMINI_API_KEY_3=   # opcional
```

---

## Decisiones de IA

### Modelo de embeddings: `gemini-embedding-2`

Se eligió por:
- **Multilingüe nativo**: el corpus es jurídico colombiano con vocabulario técnico en español; modelos entrenados en inglés degradan la calidad semántica
- **3072 dimensiones**: mayor capacidad representacional que modelos más pequeños (text-embedding-004 = 768 dims)
- **Acceso gratuito**: permite ingestión sin costo inicial; limitación: rate limit bajo que obligó a implementar rotación de keys y pausa entre batches

**Consistencia crítica**: el mismo modelo (`gemini-embedding-2`) se usa tanto en ingestión (documentos) como en consulta (queries), con `taskType: RETRIEVAL_DOCUMENT` y `RETRIEVAL_QUERY` respectivamente. Mezclar modelos o task types rompe el espacio vectorial.

### LLM: `gemini-2.0-flash`

- Latencia baja (~1-2s) apropiada para una UI interactiva
- Contexto 1M tokens: permite pasar múltiples fragmentos largos sin truncar
- Costo bajo para MVP; escala a Gemini 1.5 Pro si se necesita mayor razonamiento jurídico

### Prompt design

El prompt usa tres principios:

1. **Grounding estricto**: "Solo cita sentencias del CONTEXTO proporcionado; nunca inventes". Crítico en dominio jurídico donde números de sentencia inventados son un riesgo real.

2. **Estructura de respuesta explícita**: el prompt pide `párrafo directo → citas → limitaciones`. Esto reduce respuestas vagas del tipo "según la Corte..." sin citar nada.

3. **Transparencia de relevancia**: el score de similitud (%) se incluye en el contexto para que el LLM pueda modular su confianza ("las sentencias más relacionadas tienen 67% de relevancia...").

### Umbral de similitud: 0.55

- Por debajo de 0.55 (cosine similarity) los fragmentos suelen ser semánticamente no relacionados con la query
- Elegido empíricamente sobre el corpus actual; puede ajustarse en `lib/llm.ts` → `SIMILARITY_THRESHOLD`
- Ante ausencia de chunks sobre el umbral, el sistema responde con mensaje estructurado en lugar de pasar al LLM con contexto vacío o irrelevante

### Limitaciones conocidas

- **Corpus limitado**: ~23 sentencias indexadas (rate limits en ingestión). Queries muy específicas sobre sentencias no indexadas responderán "no encontré".
- **Sin re-ranking**: se usa solo similitud coseno del embedding. Un segundo paso de re-ranking (cross-encoder) mejoraría precisión a costo de latencia.
- **Sin historial de conversación**: cada consulta es independiente. El LLM no recuerda el intercambio previo.

---

## Evaluación

El set de evaluación está en `eval/eval_set.json` (20 queries clasificadas como `hit`, `miss`, `edge`).

Métricas objetivo para el corpus actual:
- **Hit rate** (queries tipo `hit` que retornan ≥1 fuente): > 70%
- **Precision at 3**: fuentes retornadas que son genuinamente relevantes al tema
- **Miss rate** (queries tipo `miss` que responden sin inventar): 100% (hard requirement)

Para correr una evaluación manual:
```bash
# Con .env.local configurado
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Me negaron un medicamento que necesito para vivir"}'
```

---

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local  # completar con tus keys
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Estructura

```
/app
  page.tsx              # UI principal
  about/page.tsx        # Acerca de
  api/search/route.ts   # Endpoint RAG
/components             # UI components (shadcn/ui)
/lib
  embeddings.ts         # embedQuery() → gemini-embedding-2
  llm.ts                # generateAnswer() → gemini-2.0-flash
  supabase.ts           # matchChunks() → pgvector
/ingestion              # Scripts Python offline (no se despliegan)
/eval
  eval_set.json         # 20 queries de evaluación clasificadas
```
