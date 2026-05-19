# Jurisprudencia CO — Contexto para Claude Code

## Qué es este proyecto
Buscador semántico de sentencias de la Corte Constitucional colombiana usando RAG.
El usuario describe su situación en lenguaje natural y recibe sentencias relevantes con extractos y citas.

## Stack
- Frontend + API routes: Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- Vector store: Supabase con pgvector
- Embeddings: Voyage AI (voyage-multilingual-2)
- LLM: Groq con Llama 3.3 70B
- Ingestión (offline, no se despliega): Python en /ingestion/

## Estructura clave
- /app/page.tsx — página principal con buscador
- /app/api/search/route.ts — endpoint RAG principal
- /app/about/page.tsx — página acerca de
- /components/ — componentes UI
- /lib/ — lógica compartida (supabase.ts, embeddings.ts, llm.ts)
- /ingestion/ — scripts Python offline (no van a Vercel)
- /eval/ — set de evaluación y métricas

## Variables de entorno necesarias
SUPABASE_URL, SUPABASE_SERVICE_KEY, GROQ_API_KEY, VOYAGE_API_KEY

## Reglas importantes
- NUNCA inventar números de sentencias — solo citar lo que viene del retrieval
- Todos los componentes deben ser responsive (mobile-first)
- Los errores siempre deben tener UI visible, nunca silenciosos
- El pipeline de ingestión Python NO se despliega, corre offline

## Estado actual
Setup inicial completo. Siguiente paso: instalar shadcn/ui y crear schema en Supabase.