import { VoyageAIClient } from 'voyageai'

const client = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! })

export async function embedQuery(text: string): Promise<number[]> {
  const response = await client.embed({
    input: text,
    model: 'voyage-multilingual-2',
  })
  return response.data![0].embedding!
}