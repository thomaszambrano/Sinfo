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

export async function generateAnswer(query: string, chunks: Chunk[]) {
  const context = chunks
    .map(
      (c, i) =>
        `[${i + 1}] Sentencia ${c.numero} (${c.fecha}) — Magistrado: ${c.magistrado}\n${c.content}`
    )
    .join('\n\n---\n\n')

  const prompt = `Eres un asistente jurídico colombiano. Tu única función es ayudar a entender jurisprudencia de la Corte Constitucional.

REGLAS ESTRICTAS:
- Solo cita sentencias que aparezcan en el CONTEXTO proporcionado
- Nunca inventes números de sentencias, fechas ni magistrados
- Si no hay sentencias relevantes, di exactamente: "No encontré sentencias relevantes para tu consulta"
- Cita siempre con el formato: (Sentencia T-XXX/XX)
- Responde en español, de forma clara y accesible para un ciudadano sin formación jurídica

CONTEXTO (sentencias recuperadas):
${context}

CONSULTA DEL USUARIO:
${query}

RESPUESTA:`

  const { text } = await generateText({
    model: google('gemini-2.0-flash'),
    prompt,
    maxOutputTokens: 1000,
  })

  return text
}