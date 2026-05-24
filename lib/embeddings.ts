const EMBED_MODEL = 'models/gemini-embedding-2'

export async function embedQuery(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${EMBED_MODEL}:embedContent?key=${process.env.GEMINI_API_KEY}`

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBED_MODEL,
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
    }),
  })

  if (!resp.ok) throw new Error(`Embedding error: ${resp.status}`)
  const data = await resp.json()
  return data.embedding.values
}