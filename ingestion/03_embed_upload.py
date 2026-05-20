import json
import os
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
GEMINI_KEY = os.environ["GEMINI_API_KEY"]
CHUNKS_FILE = "data/chunks.jsonl"
BATCH_SIZE = 5  # Google embedding API: máx 100 por request, usamos 20 para ser conservadores

EMBED_MODEL = "models/gemini-embedding-2"
EMBED_URL_BASE = f"https://generativelanguage.googleapis.com/v1beta/{EMBED_MODEL}:batchEmbedContents?key={GEMINI_KEY}"


def embed_batch(texts: list[str]) -> list[list[float]]:
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
    resp = requests.post(EMBED_URL_BASE, json=body, timeout=30)
    resp.raise_for_status()
    return [e["values"] for e in resp.json()["embeddings"]]


def embed_query_single(text: str) -> list[float]:
    url = f"https://generativelanguage.googleapis.com/v1beta/{EMBED_MODEL}:embedContent?key={GEMINI_KEY}"
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

    # Insertar sentencias primero
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
        batch = sent_list[i:i+50]
        sb.table("sentencias").upsert(batch, on_conflict="numero").execute()
    print("  Sentencias insertadas OK")

    # Obtener IDs
    rows = sb.table("sentencias").select("id, numero").execute().data
    sent_id_map = {r["numero"]: r["id"] for r in rows}

    # Embeddings y carga
    total = len(chunks)
    subidos = 0
    errores = 0

    # Verificar dimensión del embedding de prueba
    print("  Verificando dimensión de embeddings Google...")
    test_emb = embed_query_single("prueba")
    print(f"  Dimensión: {len(test_emb)}")

    for i in range(0, total, BATCH_SIZE):
        batch = chunks[i:i+BATCH_SIZE]
        texts = [c["content"] for c in batch]

        try:
            embeddings = embed_batch(texts)
        except Exception as e:
            print(f"\n  ERROR batch {i}: {e}")
            errores += 1
            time.sleep(3)
            continue

        records = []
        for c, emb in zip(batch, embeddings):
            sid = sent_id_map.get(c["sentencia_numero"])
            if not sid:
                continue
            records.append({
                "sentencia_id": sid,
                "content": c["content"],
                "chunk_index": c["chunk_index"],
                "embedding": emb,
            })

        if records:
            sb.table("chunks").insert(records).execute()
            subidos += len(records)

        print(f"  [{min(i+BATCH_SIZE, total)}/{total}] {subidos} subidos, {errores} errores", end="\r", flush=True)
        time.sleep(3)

    print(f"\nFinalizado: {subidos} chunks en Supabase, {errores} errores")


if __name__ == "__main__":
    main()