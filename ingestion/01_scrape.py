import requests
import json
import time
import os

BASE_URL = "https://www.corteconstitucional.gov.co"
API_URL = f"{BASE_URL}/relatoria/buscador_new/?accion=ver_modal_ultimas_providencias&cantidad=500&tipo=json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.corteconstitucional.gov.co/relatoria/buscador-jurisprudencia",
}

os.makedirs("data/raw", exist_ok=True)


def get_sentencia_list():
    print("Obteniendo lista via API JSON...")
    resp = requests.get(API_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    
    data = json.loads(resp.text)
    print(f"  Total registros: {len(data)}")
    
    sentencias = []
    for item in data:
        src = item.get("_source", {})
        tipo = src.get("prov_tipo", "")
        
        # Solo tutelas
        if "tutela" not in tipo.lower():
            continue
        
        ruta = src.get("rutahtml", "")
        url = f"{BASE_URL}/relatoria/{ruta}" if ruta else ""
        
        sentencias.append({
            "numero": src.get("prov_sentencia", "").replace("/", "-"),
            "url": url,
            "fecha_publicacion": src.get("prov_f_public", ""),
            "fecha_sentencia": src.get("prov_f_sentencia", ""),
            "tipo": tipo,
            "tema": src.get("prov_tema", ""),
            "expediente": src.get("prov_expediente", ""),
        })
    
    return sentencias


def get_sentencia_text(sent):
    try:
        from bs4 import BeautifulSoup
        resp = requests.get(sent["url"], headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        
        magistrado = ""
        text = ""
        
        for selector in ["#textosentencia", ".WordSection1", "article", ".field-items", "body"]:
            el = soup.select_one(selector)
            if el and len(el.get_text(strip=True)) > 200:
                text = el.get_text(separator="\n", strip=True)
                break
        
        if not text:
            text = soup.get_text(separator="\n", strip=True)
        
        for line in text.split("\n")[:80]:
            l = line.lower()
            if "magistrado" in l or "ponente" in l:
                magistrado = line.strip()[:150]
                break
        
        return text, magistrado
    except Exception as e:
        print(f"    ERROR: {e}")
        return "", ""


def main():
    sentencias = get_sentencia_list()
    
    if not sentencias:
        print("Sin tutelas encontradas.")
        return
    
    print(f"Tutelas encontradas: {len(sentencias)}")
    for s in sentencias[:3]:
        print(f"  {s['numero']} | {s['fecha_sentencia']} | {s['url']}")
    
    with open("data/raw/sentencias_lista.json", "w", encoding="utf-8") as f:
        json.dump(sentencias, f, ensure_ascii=False, indent=2)
    print(f"\nLista guardada. Descargando textos...")
    
    resultados = []
    limite = min(300, len(sentencias))
    
    for i, sent in enumerate(sentencias[:limite]):
        print(f"[{i+1}/{limite}] {sent['numero']}...", end=" ", flush=True)
        text, magistrado = get_sentencia_text(sent)
        
        if text and len(text) > 300:
            sent["full_text"] = text[:50000]
            sent["magistrado"] = magistrado
            resultados.append(sent)
            print(f"OK ({len(text):,} chars)")
        else:
            print("SKIP")
        
        if (i + 1) % 20 == 0:
            with open("data/raw/sentencias_raw.json", "w", encoding="utf-8") as f:
                json.dump(resultados, f, ensure_ascii=False, indent=2)
            print(f"  >> Guardado parcial: {len(resultados)} sentencias")
        
        time.sleep(1)
    
    with open("data/raw/sentencias_raw.json", "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)
    
    print(f"\nFinalizado: {len(resultados)} sentencias en data/raw/sentencias_raw.json")


if __name__ == "__main__":
    main()