'use client'

import { useState } from 'react'
import { Search, Scale, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface Source {
  numero: string
  fecha: string
  magistrado: string
  tema: string
  url: string
  extracto: string
  similarity: number
}

interface SearchResult {
  answer: string
  sources: Source[]
}

const EXAMPLE_QUERIES = [
  'Despido de mujer embarazada',
  'Negación de tratamiento médico por EPS',
  'Derecho a la educación de niños con discapacidad',
  'Tutela contra banco por deuda',
]

export default function Home() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    if (!query.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error del servidor')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Jurisprudencia CO</span>
          </div>
          <a href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Acerca de
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Buscá jurisprudencia de la<br />
            <span className="text-primary">Corte Constitucional</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Describí tu situación en lenguaje natural y encontrá sentencias relevantes con extractos y citas.
          </p>
        </div>

        {/* Search box */}
        <div className="flex flex-col gap-3 mb-6">
          <Textarea
            placeholder="Ej: Me despidieron estando embarazada, ¿qué dice la Corte sobre esto?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSearch()
              }
            }}
            className="min-h-[100px] text-base resize-none"
          />
          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            size="lg"
            className="w-full"
          >
            <Search className="h-4 w-4 mr-2" />
            {loading ? 'Buscando sentencias...' : 'Buscar sentencias'}
          </Button>
        </div>

        {/* Ejemplos */}
        {!result && !loading && (
          <div className="mb-10">
            <p className="text-sm text-muted-foreground mb-2 text-center">Ejemplos de consulta:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="text-sm px-3 py-1.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="border-destructive mb-6">
            <CardContent className="pt-6 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        )}

        {/* Resultados */}
        {result && (
          <div className="space-y-6">
            {/* Respuesta del LLM */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  Análisis jurídico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>
              </CardContent>
            </Card>

            {/* Sentencias fuente */}
            {result.sources.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                  Sentencias relevantes ({result.sources.length})
                </h2>
                <div className="space-y-3">
                  {result.sources.map((source) => (
                    <Card key={source.numero} className="hover:border-primary/50 transition-colors">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-primary">{source.numero}</span>
                            <Badge variant="secondary">{source.similarity}% relevante</Badge>
                            {source.tema && (
                              <Badge variant="outline">{source.tema}</Badge>
                            )}
                          </div>
                          {source.url && (
                            <a
                            
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {source.fecha} · {source.magistrado}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {source.extracto}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          Esta herramienta no reemplaza asesoría jurídica profesional. · Datos: Corte Constitucional de Colombia ·{' '}
          <a href="https://github.com/JBaronOsorio/jurisprudencia-co" className="hover:text-foreground transition-colors">
            GitHub
          </a>
        </div>
      </footer>
    </main>
  )
}
