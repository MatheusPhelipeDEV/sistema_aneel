import sys
import io
import csv
import time
import uuid
import asyncio
import aiohttp
from datetime import datetime, date
from typing import List, Tuple, Dict, Any, Optional
from time import time as now_ts

# Framework Web
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# Cliente HTTP Assíncrono
from aiohttp_retry import RetryClient, ExponentialRetry

# --- CONFIGURAÇÃO INICIAL ---
app = Flask(__name__)
CORS(app) 

if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# --- CONSTANTES ANEEL ---
RESOURCE_IDS = {
    2017: "246e926b-a686-42fc-b55f-32e4046834de",
    2018: "8fcce0f2-4ea2-42ea-b7ac-00fd8feab03c",
    2019: "965d2abb-91fe-4fab-b463-8c84f2e02188",
    2020: "58201617-8364-4e7f-975d-21f8b8c7436f",
    2021: "42d778de-4a10-4b54-a00a-87c8ff35db6f",
    2022: "7d081751-3f4c-4ede-96b5-1bf2e46b61ca",
    2023: "cce72c2b-a4cb-4b98-818f-3ac56bbf2a78",
    2024: "cc091bb8-b308-46b2-98ec-c2fd58e7194b",
    2025: "1aa6ad85-05b8-4471-9ca4-316566214ba9",
}

BASE_SQL = "https://dadosabertos.aneel.gov.br/api/3/action/datastore_search_sql"
BASE_DS = "https://dadosabertos.aneel.gov.br/api/3/action/datastore_search"
SESSION_HEADERS = {"User-Agent": "Estalk-PowerMap/5.1 (+https://estalk.example)"}

TIMEOUT_SQL = 180 
TIMEOUT_DS = 300 
MAX_FALLBACK_ATTEMPTS = 8
_CACHE: Dict[str, Tuple[float, List[Dict[str, Any]], List[Dict[str, Any]]]] = {}
CACHE_TTL_SECONDS = 20 * 60

# --- HELPERS ---
def _clip_to_year(d: date, y: int) -> date:
    lo = date(y, 1, 1)
    hi = date(y, 12, 31)
    return min(max(d, lo), hi)

def _fmt_dt(d: date, end: bool = False) -> str:
    return f"{d} {'23:59:59' if end else '00:00:00'}"

def _fmt_br(iso_dt: str) -> str:
    if not iso_dt: return ""
    try:
        d = datetime.strptime(iso_dt[:10], "%Y-%m-%d").date()
        return d.strftime("%d/%m/%Y")
    except Exception:
        return iso_dt[:10]

def _cache_key(modo: str, termo: Optional[str], di: str, df: str) -> str:
    return f"{modo}|{(termo or '').strip().lower()}|{di}|{df}"

def _months_between(di: date, df: date) -> List[tuple]:
    out = []
    y, m = di.year, di.month
    while (y < df.year) or (y == df.year and m <= df.month):
        out.append((y, m))
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out

# --- LÓGICA DE BUSCA ---
async def _fallback_fetch_month(client: RetryClient, rid: str, ano: int, mes: int, termo: Optional[str]) -> List[Dict[str, Any]]:
    base_q = f"{ano}-{mes:02d}"
    if termo:
        base_q = f"{base_q} {termo}"

    limit = 1000
    offset = 0
    all_rows: List[Dict[str, Any]] = []
    attempts = 0

    while True:
        attempts += 1
        if attempts > MAX_FALLBACK_ATTEMPTS:
            print(f"❌ Falha persistente no fallback (mês {ano}/{mes:02d}).")
            break
            
        params = {"resource_id": rid, "q": base_q, "include_total": "false", "limit": limit, "offset": offset}
        try:
            async with client.get(BASE_DS, params=params, timeout=TIMEOUT_DS) as resp:
                resp.raise_for_status()
                payload = await resp.json()
                rows = payload.get("result", {}).get("records", []) if payload.get("success") else []
            attempts = 0 
        except (aiohttp.ClientConnectorError, asyncio.TimeoutError):
            if limit > 250:
                limit = max(250, limit // 2)
                continue
            else:
                continue

        if not rows: break
        all_rows.extend(rows)
        if len(rows) < limit: break
        offset += limit
    
    return all_rows

async def _fallback_year_datastore_search_months(client: RetryClient, rid: str, di: date, df: date, termo: Optional[str], modo: str) -> List[Dict[str, Any]]:
    months = _months_between(di, df)
    out: List[Dict[str, Any]] = []
    
    tasks = [_fallback_fetch_month(client, rid, y, m, termo) for y, m in months]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for rows in results:
        if isinstance(rows, Exception): continue
        for r in rows:
            iso = (r.get("DatInicioInterrupcao") or "")[:10]
            if not iso: continue
            try: d = datetime.strptime(iso, "%Y-%m-%d").date()
            except: continue
            if not (di <= d <= df): continue
            if termo:
                s = termo.lower()
                if modo == "cia":
                    if s not in (r.get("NomAgenteRegulado") or "").lower() and s not in (r.get("SigAgente") or "").lower(): continue
                else:
                    if s not in str(r.get("NumUnidadeConsumidora") or "").lower(): continue

            item = {
                "dia": _fmt_br(r.get("DatInicioInterrupcao") or ""),
                "DatInicioInterrupcao": r.get("DatInicioInterrupcao") or "",
                "DatFimInterrupcao": r.get("DatFimInterrupcao") or "",
                "DscFatoGeradorInterrupcao": r.get("DscFatoGeradorInterrupcao") or "",
                "DscTipoInterrupcao": r.get("DscTipoInterrupcao") or "",
                "NumOrdemInterrupcao": r.get("NumOrdemInterrupcao"),
                "DscConjuntoUnidadeConsumidora": r.get("DscConjuntoUnidadeConsumidora"),
            }
            if modo == "cia":
                item["NomAgenteRegulado"] = r.get("NomAgenteRegulado")
                item["SigAgente"] = r.get("SigAgente")
            else:
                item["NumUnidadeConsumidora"] = r.get("NumUnidadeConsumidora")
            out.append(item)
    return out

async def _query_year_async(client: RetryClient, ano: int, di: date, df: date, termo: Optional[str], modo: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    rid = RESOURCE_IDS.get(ano)
    if not rid: return [], {"ano": ano, "total_ano": 0}

    where = [f"\"DatInicioInterrupcao\" >= '{_fmt_dt(di, end=False)}'", f"\"DatInicioInterrupcao\" <= '{_fmt_dt(df, end=True)}'"]
    if termo:
        s = termo.strip().replace("'", "''")
        if modo == "cia": where.append(f"(LOWER(COALESCE(\"NomAgenteRegulado\", '')) LIKE LOWER('%{s}%') OR LOWER(COALESCE(\"SigAgente\", '')) LIKE LOWER('%{s}%'))")
        else: where.append(f"CAST(\"NumUnidadeConsumidora\" AS TEXT) LIKE '%{s}%'")

    fields = "\"DatInicioInterrupcao\", \"DatFimInterrupcao\", \"DscFatoGeradorInterrupcao\", \"DscTipoInterrupcao\", \"NumOrdemInterrupcao\", \"DscConjuntoUnidadeConsumidora\""
    if modo == "cia": fields += ", \"NomAgenteRegulado\", \"SigAgente\""
    else: fields += ", \"NumUnidadeConsumidora\""

    out: List[Dict[str, Any]] = []
    total_ano = 0
    offset = 0
    page_size = 10000

    try:
        while True:
            sql = f"SELECT {fields} FROM \"{rid}\" WHERE {' AND '.join(where)} ORDER BY \"DatInicioInterrupcao\" ASC LIMIT {page_size} OFFSET {offset}"
            async with client.get(BASE_SQL, params={"sql": sql}, timeout=TIMEOUT_SQL) as resp:
                resp.raise_for_status()
                payload = await resp.json()

            if not payload.get("success"):
                if "error" in payload and "forbidden" in payload["error"].get("message", "").lower():
                    print(f"↩️ Fallback SQL proibido ano {ano}")
                    out = await _fallback_year_datastore_search_months(client, rid, di, df, termo, modo)
                    total_ano = len(out)
                    break
                else:
                    raise Exception(payload.get("error"))

            rows = payload["result"]["records"]
            if not rows: break

            for r in rows:
                item = {
                    "dia": _fmt_br(r.get("DatInicioInterrupcao") or ""),
                    "DatInicioInterrupcao": r.get("DatInicioInterrupcao") or "",
                    "DatFimInterrupcao": r.get("DatFimInterrupcao") or "",
                    "DscFatoGeradorInterrupcao": r.get("DscFatoGeradorInterrupcao") or "",
                    "DscTipoInterrupcao": r.get("DscTipoInterrupcao") or "",
                    "NumOrdemInterrupcao": r.get("NumOrdemInterrupcao"),
                    "DscConjuntoUnidadeConsumidora": r.get("DscConjuntoUnidadeConsumidora")
                }
                if modo == "cia":
                    item["NomAgenteRegulado"] = r.get("NomAgenteRegulado")
                    item["SigAgente"] = r.get("SigAgente")
                else:
                    item["NumUnidadeConsumidora"] = r.get("NumUnidadeConsumidora")
                out.append(item)

            total_ano += len(rows)
            offset += page_size
            if len(rows) < page_size: break

    except Exception as e:
        if isinstance(e, aiohttp.ClientResponseError) and e.status == 403:
            out = await _fallback_year_datastore_search_months(client, rid, di, df, termo, modo)
            total_ano = len(out)
        else: raise

    return out, {"ano": ano, "total_ano": total_ano}

async def buscar_interrupcoes_async(di_str: str, df_str: str, termo: Optional[str], modo: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    di = datetime.strptime(di_str, "%Y-%m-%d").date()
    df = datetime.strptime(df_str, "%Y-%m-%d").date()
    anos = list(range(di.year, df.year + 1))
    resultados: List[Dict[str, Any]] = []
    anos_meta: List[Dict[str, Any]] = []

    timeout_config = aiohttp.ClientTimeout(total=TIMEOUT_DS, connect=60)
    retry_options = ExponentialRetry(attempts=5, start_timeout=1, statuses={429, 500, 502, 503, 504})
    
    async with RetryClient(retry_options=retry_options, headers=SESSION_HEADERS, timeout=timeout_config) as client:
        tasks = [_query_year_async(client, a, _clip_to_year(di, a), _clip_to_year(df, a), termo, modo) for a in anos]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for result in results:
            if isinstance(result, Exception): raise result
            rows, meta = result
            resultados.extend(rows)
            anos_meta.append(meta)

    resultados.sort(key=lambda r: datetime.strptime(r.get("dia", "01/01/1900"), "%d/%m/%Y"))
    return resultados, anos_meta

def buscar_interrupcoes_com_cache(di_str: str, df_str: str, termo: Optional[str], modo: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    key = _cache_key(modo, termo, di_str, df_str)
    ts_now = now_ts()
    if key in _CACHE:
        exp, rows, metas = _CACHE[key]
        if ts_now < exp:
            print("♻️ Cache HIT")
            return rows, metas
        else: _CACHE.pop(key, None)

    print(f"🆕 Cache MISS - Buscando na ANEEL... (Timeouts: SQL={TIMEOUT_SQL}s, DS={TIMEOUT_DS}s)")
    rows, metas = asyncio.run(buscar_interrupcoes_async(di_str, df_str, termo, modo))
    _CACHE[key] = (ts_now + CACHE_TTL_SECONDS, rows, metas)
    return rows, metas

# --- ROTAS DE API ---
@app.route("/health", methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

@app.route("/api/search_api")
def api_search_api():
    di = request.args.get("di")
    df = request.args.get("df")
    termo = request.args.get("unidade", "").strip() or None
    modo = request.args.get("modo", "cia")

    if not di or not df: return jsonify({"error": "Informe data inicial e final."}), 400

    try:
        page = int(request.args.get("page", 1))
        # Pega o page_size, usa 100 como padrão
        page_size = int(request.args.get("page_size", 100))
        
        # --- TRAVA DE SEGURANÇA PARA MÁXIMO 100 ---
        if page_size > 100:
            page_size = 100
        if page_size < 10:
            page_size = 10
        # ------------------------------------------

        req_id = uuid.uuid4().hex[:8]
        t0 = time.perf_counter()
        
        full, anos_meta = buscar_interrupcoes_com_cache(di, df, termo, modo)
        
        start = (page - 1) * page_size
        end = min(start + page_size, len(full))
        page_data = full[start:end]

        ms = int((time.perf_counter() - t0) * 1000)
        print(f"✅ [{req_id}] Retornando {len(page_data)} registros (Limite: {page_size})")

        return jsonify({
            "page": page,
            "page_size": page_size,
            "returned": len(page_data),
            "total": len(full),
            "data": page_data,
            "meta": {"request_id": req_id, "timing_ms": ms, "anos": anos_meta}
        })
    except Exception as e:
        print(f"🟥 Erro REAL: {repr(e)}")
        return jsonify({"error": str(e)}), 504 

@app.route("/")
def index():
    return jsonify({"status": "online", "message": "API Estalk PowerMap v5.1 Online"})

@app.route("/api/export")
def api_export():
    # ... (Manter igual, código de exportação)
    di = request.args.get("di")
    df = request.args.get("df")
    termo = request.args.get("unidade", "").strip() or None
    modo = request.args.get("modo", "cia")
    fmt = (request.args.get("fmt") or "xlsx").lower()

    if not di or not df: return jsonify({"error": "Datas obrigatórias."}), 400

    try:
        rows, _ = buscar_interrupcoes_com_cache(di, df, termo, modo)
        if modo == "cia":
            headers = ["Data", "Registro", "Companhia", "Sigla", "Fato Gerador", "Tipo", "Conjunto/UC"]
            keys = ["dia", "NumOrdemInterrupcao", "NomAgenteRegulado", "SigAgente", "DscFatoGeradorInterrupcao", "DscTipoInterrupcao", "DscConjuntoUnidadeConsumidora"]
        else:
            headers = ["Data", "Registro", "Unidade", "Fato Gerador", "Tipo", "Conjunto/UC"]
            keys = ["dia", "NumOrdemInterrupcao", "NumUnidadeConsumidora", "DscFatoGeradorInterrupcao", "DscTipoInterrupcao", "DscConjuntoUnidadeConsumidora"]

        if fmt == "xlsx":
            from openpyxl import Workbook
            wb = Workbook()
            ws = wb.active
            ws.append(headers)
            for r in rows: ws.append([r.get(k, "") for k in keys])
            buf = io.BytesIO()
            wb.save(buf)
            buf.seek(0)
            return send_file(buf, as_attachment=True, download_name=f"export_{di}_{df}.xlsx", mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        
        text_buf = io.StringIO()
        writer = csv.writer(text_buf, delimiter=";")
        writer.writerow(headers)
        for r in rows: writer.writerow([r.get(k, "") for k in keys])
        data = io.BytesIO(text_buf.getvalue().encode("utf-8-sig"))
        return send_file(data, as_attachment=True, download_name=f"export_{di}_{df}.csv", mimetype="text/csv")
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

if __name__ == "__main__":
    app.run(debug=True, port=5000)