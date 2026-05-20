import { NextRequest, NextResponse } from 'next/server'
import { embedQuery } from '@/lib/embeddings'
import { matchChunks } from '@/lib/supabase'
import { generateAnswer } from '@/lib/llm'

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        { error: 'La consulta debe tener al menos 3 caracteres' },
        { status: 400 }
      )
    }

    // 1. Generar embedding de la query
    const queryEmbedding = await embedQuery(query.trim())

    // 2. Buscar chunks relevantes en Supabase
    const chunks = await matchChunks(queryEmbedding, 5)

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        answer: 'No encontré sentencias relevantes para tu consulta.',
        sources: [],
      })
    }

    // 3. Generar respuesta con Gemini
    const answer = await generateAnswer(query, chunks)

    // 4. Formatear fuentes únicas
    const seen = new Set<string>()
    const sources = chunks
      .filter((c: { numero: string }) => {
        if (seen.has(c.numero)) return false
        seen.add(c.numero)
        return true
      })
      .map((c: {
        numero: string
        fecha: string
        magistrado: string
        tema: string
        url: string
        content: string
        similarity: number
      }) => ({
        numero: c.numero,
        fecha: c.fecha,
        magistrado: c.magistrado,
        tema: c.tema,
        url: c.url,
        extracto: c.content.slice(0, 300) + '...',
        similarity: Math.round(c.similarity * 100),
      }))

    return NextResponse.json({ answer, sources })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor. Intentá de nuevo.' },
      { status: 500 }
    )
  }
}