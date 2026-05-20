import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function matchChunks(queryEmbedding: number[], matchCount = 5) {
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  })
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return data
}