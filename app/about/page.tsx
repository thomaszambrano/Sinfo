import { Scale, Database, Code, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function About() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <a href="/" className="font-semibold text-lg hover:text-primary transition-colors">
              Jurisprudencia CO
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Acerca del proyecto</h1>
          <p className="text-muted-foreground">
            Buscador semántico de jurisprudencia de la Corte Constitucional colombiana, construido con RAG.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Dataset
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>Sentencias tipo T (tutelas) de la Corte Constitucional de Colombia, descargadas del portal oficial de la Relatoría.</p>
            <p>Cobertura: 2020–2024. Aproximadamente 500 sentencias indexadas con sus metadatos (número, fecha, magistrado ponente, tema).</p>
            <p>Los textos se dividen en fragmentos de ~800 tokens con solapamiento de 100 tokens para preservar contexto.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Arquitectura</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p><strong className="text-foreground">Embeddings:</strong> Voyage AI voyage-multilingual-2 — modelo multilingüe optimizado para español jurídico.</p>
            <p><strong className="text-foreground">Vector store:</strong> Supabase con pgvector — búsqueda por similitud coseno sobre los chunks indexados.</p>
            <p><strong className="text-foreground">LLM:</strong> Google Gemini 2.0 Flash — genera la respuesta usando solo los fragmentos recuperados, sin inventar información.</p>
            <p><strong className="text-foreground">Frontend:</strong> Next.js 14 + shadcn/ui desplegado en Vercel.</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              Limitaciones importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>Esta herramienta <strong className="text-foreground">no reemplaza asesoría jurídica profesional</strong>. Es un buscador académico.</p>
            <p>El sistema puede cometer errores. Siempre verificá las sentencias en el sitio oficial de la Corte Constitucional.</p>
            <p>La cobertura es parcial — no están todas las sentencias emitidas.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code className="h-4 w-4" />
              Equipo y código
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Proyecto académico — Universidad EAFIT, Tópicos de Sistemas de Información, Mayo 2026.</p>
            <p className="mt-2">
              <a  
              
                href="https://github.com/JBaronOsorio/jurisprudencia-co"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver código en GitHub →
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}