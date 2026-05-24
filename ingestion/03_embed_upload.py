import json
import os
import time
import itertools
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
CHUNKS_FILE = "data/chunks.jsonl"
BATCH_SIZE = 5

EMBED_MODEL = "models/gemini-embedding-2"

# Leer keys del .env, filtrar vacías
GEMINI_KEYS = [k for k in [
    os.environ.get("GEMINI_API_KEY", ""),
    os.environ.get("GEMINI_API_KEY_2", ""),
    os.environ.get("GEMINI_API_KEY_3", ""),
] if k]

print(f"Usando {len(GEMINI_KEYS)} API keys en rotación")
key_cycle = itertools.cycle(GEMINI_KEYS)


def embed_batch(texts: list[str]) -> list[list[float]]:
    key = next(key_cycle)
    url = f"https://generativelanguage.googleapis.com/v1beta/{EMBED_MODEL}:batchEmbedContents?key={key}"
    body = {
        "requests": [
            {
                "model": EMBED_MODEL,
                "content": {"parts": [{"text": t}]},
                "taskType": "RETRIEVAL_DOCUMENT",
            }
            for t in texts
        ]
    }
    resp = requests.post(url, json=body, timeout=30)
    resp.raise_for_status()
    return [e["values"] for e in resp.json()["embeddings"]]


def embed_query_single(text: str) -> list[float]:
    key = next(key_cycle)
    url = f"https://generativelanguage.googleapis.com/v1beta/{EMBED_MODEL}:embedContent?key={key}"
    body = {
        "model": EMBED_MODEL,
        "content": {"parts": [{"text": text}]},
        "taskType": "RETRIEVAL_QUERY",
    }
    resp = requests.post(url, json=body, timeout=30)
    resp.raise_for_status()
    return resp.json()["embedding"]["values"]


def main():
    print("Iniciando carga a Supabase con Google embeddings...")
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Cargar chunks
    chunks = []
    with open(CHUNKS_FILE, encoding="utf-8") as f:
        for line in f:
            chunks.append(json.loads(line))
    print(f"  {len(chunks)} chunks cargados")

    # Insertar sentencias
    sentencias_vistas = {}
    for c in chunks:
        num = c["sentencia_numero"]
        if num not in sentencias_vistas:
            sentencias_vistas[num] = {
                "numero": num,
                "fecha": c["sentencia_fecha"] or None,
                "magistrado": c["sentencia_magistrado"],
                "tipo": c["sentencia_tipo"],
                "tema": c["sentencia_tema"],
                "url": c["sentencia_url"],
                "full_text": "",
            }

    print(f"  Insertando {len(sentencias_vistas)} sentencias...")
    sent_list = list(sentencias_vistas.values())
    for i in range(0, len(sent_list), 50):
        sb.table("sentencias").upsert(sent_list[i:i+50], on_conflict="numero").execute()
    print("  Sentencias insertadas OK")

    # Obtener IDs
    rows = sb.table("sentencias").select("id, numero").execute().data
    sent_id_map = {r["numero"]: r["id"] for r in rows}

    # Verificar chunks ya subidos para no duplicar
    print("  Verificando chunks ya en Supabase...")
    existing_raw = sb.table("chunks").select("chunk_index, sentencia_id").execute().data
    existing_set = set((r["sentencia_id"], r["chunk_index"]) for r in existing_raw)
    print(f"  {len(existing_set)} chunks ya subidos, saltando...")

    # Verificar dimensión
    print("  Verificando dimensión de embeddings...")
    test_emb = embed_query_single("prueba")
    print(f"  Dimensión: {len(test_emb)}")

    total = len(chunks)
    subidos = 0
    saltados = 0
    errores = 0

    for i in range(0, total, BATCH_SIZE):
        batch = chunks[i:i+BATCH_SIZE]

        # Filtrar chunks ya subidos
        batch_filtrado = []
        for c in batch:
            sid = sent_id_map.get(c["sentencia_numero"])
            if not sid:
                continue
            if (sid, c["chunk_index"]) in existing_set:
                saltados += 1
                continue
            batch_filtrado.append((c, sid))

        if not batch_filtrado:
            continue

        texts = [c["content"] for c, _ in batch_filtrado]

        try:
            embeddings = embed_batch(texts)
        except Exception as e:
            print(f"\n  ERROR batch {i}: {e}")
            errores += 1
            time.sleep(5)
            continue

        records = []
        for (c, sid), emb in zip(batch_filtrado, embeddings):
            records.append({
                "sentencia_id": sid,
                "content": c["content"],
                "chunk_index": c["chunk_index"],
                "embedding": emb,
            })

        if records:
            sb.table("chunks").insert(records).execute()
            subidos += len(records)

        print(f"  [{min(i+BATCH_SIZE, total)}/{total}] {subidos} subidos, {saltados} saltados, {errores} errores", end="\r", flush=True)
        time.sleep(2)

    print(f"\nFinalizado: {subidos} nuevos chunks en Supabase, {saltados} saltados, {errores} errores")


if __name__ == "__main__":
    main()