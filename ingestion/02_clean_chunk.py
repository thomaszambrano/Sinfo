import json
import os
import re
from langchain_text_splitters import RecursiveCharacterTextSplitter

INPUT_FILE = "data/raw/sentencias_raw.json"
OUTPUT_FILE = "data/chunks.jsonl"


def clean_text(text: str) -> str:
    # Eliminar líneas vacías excesivas
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Eliminar espacios múltiples
    text = re.sub(r' {3,}', ' ', text)
    # Eliminar caracteres de control raros
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    return text.strip()


def main():
    print("Cargando sentencias...")
    with open(INPUT_FILE, encoding="utf-8") as f:
        sentencias = json.load(f)
    print(f"  {len(sentencias)} sentencias cargadas")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    os.makedirs("data", exist_ok=True)
    total_chunks = 0

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        for sent in sentencias:
            text = clean_text(sent.get("full_text", ""))
            if not text or len(text) < 300:
                continue

            chunks = splitter.split_text(text)

            for i, chunk in enumerate(chunks):
                if len(chunk.strip()) < 100:
                    continue
                record = {
                    "sentencia_numero": sent["numero"],
                    "sentencia_fecha": sent.get("fecha_sentencia", ""),
                    "sentencia_magistrado": sent.get("magistrado", ""),
                    "sentencia_tipo": sent.get("tipo", ""),
                    "sentencia_tema": sent.get("tema", ""),
                    "sentencia_url": sent.get("url", ""),
                    "chunk_index": i,
                    "content": chunk.strip(),
                }
                out.write(json.dumps(record, ensure_ascii=False) + "\n")
                total_chunks += 1

    print(f"  {total_chunks} chunks generados en {OUTPUT_FILE}")


if __name__ == "__main__":
    main()