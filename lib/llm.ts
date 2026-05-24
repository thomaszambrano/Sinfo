import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

interface Chunk {
  numero: string
  fecha: string
  magistrado: string
  content: string
  similarity: number
  url: string
}

const SIMILARITY_THRESHOLD = 0.55

export { SIMILARITY_THRESHOLD }

export async function generateAnswer(query: string, chunks: Chunk[]) {
  const relevant = chunks.filter(c => c.similarity >= SIMILARITY_THRESHOLD)

  if (relevant.length === 0) {
    return 'No encontré sentencias suficientemente relevantes para tu consulta en el corpus actual. El buscador tiene indexadas sentencias de tutela de 2025-2026; intentá reformular tu consulta con términos más específicos sobre el derecho fundamental afectado.'
  }

  const context = relevant
    .map(
      (c, i) =>
        `[${i + 1}] Sentencia ${c.numero} (${c.fecha}) — Magistrado: ${c.magistrado} — Relevancia: ${Math.round(c.similarity * 100)}%\n${c.content}`
    )
    .join('\n\n---\n\n')

  const prompt = `Eres un asistente jurídico colombiano. Tu única función es ayudar a entender jurisprudencia de la Corte Constitucional.

REGLAS ESTRICTAS:
- Solo cita sentencias del CONTEXTO proporcionado; nunca inventes números, fechas ni magistrados
- Si el contexto no responde claramente la consulta, decilo explícitamente antes de dar la respuesta parcial
- Cita con el formato: (Sentencia T-XXX/YY) o (Sentencia C-XXX/YY) según corresponda
- Responde en español claro y accesible para un ciudadano sin formación jurídica
- Estructura: párrafo de respuesta directa → citas de respaldo → limitaciones si las hay

CONTEXTO (${relevant.length} fragmento${relevant.length !== 1 ? 's' : ''} recuperado${relevant.length !== 1 ? 's' : ''}):
${context}

CONSULTA:
${query}

RESPUESTA:`

  const { text } = await generateText({
    model: google('gemini-2.0-flash'),
    prompt,
    maxOutputTokens: 1200,
  })

  return text
}