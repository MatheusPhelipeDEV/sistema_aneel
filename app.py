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

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from aiohttp_retry import RetryClient, ExponentialRetry

app = Flask(__name__)
CORS(app)

if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# ... (MANTENHA AS CONSTANTES: RESOURCE_IDS, BASE_SQL, ETC. IGUAIS AO ANTERIOR) ...
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
SESSION_HEADERS = {"User-Agent": "Estalk-PowerMap/5.2 (+https://estalk.example)"}
TIMEOUT_SQL = 180 
TIMEOUT_DS = 300 
MAX_FALLBACK_ATTEMPTS = 8
_CACHE = {}
CACHE_TTL_SECONDS = 20 * 60

# ... (MANTENHA AS FUNÇÕES HELPERS: _clip_to_year, _fmt_br, etc.) ...
def _clip_to_year(d: date, y: int) -> date:
    lo = date(y, 1, 1); hi = date(y, 12, 31)
    return min(max(d, lo), hi)
def _fmt_dt(d: date, end: bool = False) -> str: return f"{d} {'23:59:59' if end else '00:00:00'}"
def _fmt_br(iso_dt: str) -> str:
    if not iso_dt: return ""
    try: return datetime.strptime(iso_dt[:10], "%Y-%m-%d").date().strftime("%d/%m/%Y")
    except: return iso_dt[:10]
def _cache_key(modo: str, termo: Optional[str], di: str, df: str) -> str: return f"{modo}|{(termo or '').strip().lower()}|{di}|{df}"
def _months_between(di: date, df: date) -> List[tuple]:
    out = []; y, m = di.year, di.month
    while (y < df.year) or (y == df.year and m <= df.month):
        out.append((y, m)); m += 1
        if m > 12: m = 1; y += 1
    return out

# ... (MANTENHA A LÓGICA DE BUSCA: _fallback_fetch_month, _query_year_async, buscar_interrupcoes_async, buscar_interrupcoes_com_cache) ...
# (Para economizar espaço na resposta, assumo que você manterá essas funções idênticas. Se precisar delas coladas, me avise)
# VOU COLAR AS PRINCIPAIS PARA GARANTIR QUE FUNCIONE NO RENDER:

async def _fallback_fetch_month(client: RetryClient, rid: str, ano: int, mes: int, termo: Optional[str]) -> List[Dict[str, Any]]:
    base_q = f"{ano}-{mes:02d}"
    if termo: base_q = f"{base_q} {termo}"
    limit = 1000; offset = 0; all_rows = []; attempts = 0
    while True:
        attempts += 1
        if attempts > MAX_FALLBACK_ATTEMPTS: break
        try:
            async with client.get(BASE_DS, params={"resource_id": rid, "q": base_q, "include_total": "false", "limit": limit, "offset": offset}, timeout=TIMEOUT_DS) as resp:
                resp.raise_for_status(); payload = await resp.json()
                rows = payload.get("result", {}).get("records", []) if payload.get("success") else []
            attempts = 0 
        except: 
            if limit > 250: limit = max(250, limit // 2); continue
            else: continue
        if not rows: break
        all_rows.extend(rows)
        if len(rows) < limit: break
        offset += limit
    return all_rows

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

    out = []; total_ano = 0; offset = 0; page_size = 10000
    try:
        while True:
            sql = f"SELECT {fields} FROM \"{rid}\" WHERE {' AND '.join(where)} ORDER BY \"DatInicioInterrupcao\" ASC LIMIT {page_size} OFFSET {offset}"
            async with client.get(BASE_SQL, params={"sql": sql}, timeout=TIMEOUT_SQL) as resp:
                resp.raise_for_status(); payload = await resp.json()
            if not payload.get("success"): raise Exception(payload.get("error"))
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
                if modo == "cia": item["NomAgenteRegulado"] = r.get("NomAgenteRegulado"); item["SigAgente"] = r.get("SigAgente")
                else: item["NumUnidadeConsumidora"] = r.get("NumUnidadeConsumidora")
                out.append(item)
            total_ano += len(rows); offset += page_size
            if len(rows) < page_size: break
    except Exception:
        out_fallback = await _fallback_year_datastore_search_months(client, rid, di, df, termo, modo)
        # Adaptação do fallback para ter os campos certos
        # (O fallback já retorna formatado, então apenas usamos)
        out = out_fallback
        total_ano = len(out)

    return out, {"ano": ano, "total_ano": total_ano}

async def buscar_interrupcoes_async(di_str: str, df_str: str, termo: Optional[str], modo: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    di = datetime.strptime(di_str, "%Y-%m-%d").date()
    df = datetime.strptime(df_str, "%Y-%m-%d").date()
    anos = list(range(di.year, df.year + 1))
    resultados = []; anos_meta = []
    timeout_config = aiohttp.ClientTimeout(total=TIMEOUT_DS, connect=60)
    async with RetryClient(retry_options=ExponentialRetry(attempts=5), headers=SESSION_HEADERS, timeout=timeout_config) as client:
        tasks = [_query_year_async(client, a, _clip_to_year(di, a), _clip_to_year(df, a), termo, modo) for a in anos]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for result in results:
            if not isinstance(result, Exception):
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
        if ts_now < exp: return rows, metas
        else: _CACHE.pop(key, None)
    rows, metas = asyncio.run(buscar_interrupcoes_async(di_str, df_str, termo, modo))
    _CACHE[key] = (ts_now + CACHE_TTL_SECONDS, rows, metas)
    return rows, metas

# --- ROTAS ---
@app.route("/")
def index(): return jsonify({"status": "online", "message": "API Estalk PowerMap v5.2"})

@app.route("/health")
def health(): return "ok", 200

@app.route("/api/search_api")
def api_search_api():
    di = request.args.get("di"); df = request.args.get("df")
    termo = request.args.get("unidade", "").strip() or None
    modo = request.args.get("modo", "cia")
    if not di or not df: return jsonify({"error": "Datas invalidas"}), 400
    
    try:
        page = int(request.args.get("page", 1))
        page_size = min(int(request.args.get("page_size", 100)), 100)
        
        full, anos_meta = buscar_interrupcoes_com_cache(di, df, termo, modo)
        
        start = (page - 1) * page_size
        end = min(start + page_size, len(full))
        return jsonify({
            "page": page, "page_size": page_size, "returned": len(full[start:end]), "total": len(full),
            "data": full[start:end], "meta": {"anos": anos_meta}
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

# --- ROTA DE EXPORTAÇÃO ATUALIZADA COM FILTRO LOCAL ---
@app.route("/api/export")
def api_export():
    di = request.args.get("di")
    df = request.args.get("df")
    termo = request.args.get("unidade", "").strip() or None
    modo = request.args.get("modo", "cia")
    
    # NOVO: Recebe o filtro local que o usuário digitou na tela
    local_filter = (request.args.get("local_filter") or "").strip().lower()
    
    fmt = (request.args.get("fmt") or "xlsx").lower()

    if not di or not df: return jsonify({"error": "Datas obrigatórias."}), 400

    try:
        # 1. Pega todos os dados da API
        rows, _ = buscar_interrupcoes_com_cache(di, df, termo, modo)
        
        # 2. APLICA O FILTRO LOCAL NO PYTHON (Filtragem Extra)
        if local_filter:
            filtered_rows = []
            for r in rows:
                # Concatena todos os valores da linha para buscar o texto
                full_text = " ".join([str(v) for v in r.values()]).lower()
                if local_filter in full_text:
                    filtered_rows.append(r)
            rows = filtered_rows
            print(f"🔍 Exportação filtrada por '{local_filter}': {len(rows)} registros restantes.")

        # 3. Define colunas
        if modo == "cia":
            headers = ["Data", "Registro", "Companhia", "Sigla", "Fato Gerador", "Tipo", "Conjunto/UC"]
            keys = ["dia", "NumOrdemInterrupcao", "NomAgenteRegulado", "SigAgente", "DscFatoGeradorInterrupcao", "DscTipoInterrupcao", "DscConjuntoUnidadeConsumidora"]
        else:
            headers = ["Data", "Registro", "Unidade", "Fato Gerador", "Tipo", "Conjunto/UC"]
            keys = ["dia", "NumOrdemInterrupcao", "NumUnidadeConsumidora", "DscFatoGeradorInterrupcao", "DscTipoInterrupcao", "DscConjuntoUnidadeConsumidora"]

        # 4. Gera o arquivo
        if fmt == "xlsx":
            from openpyxl import Workbook
            wb = Workbook(); ws = wb.active; ws.append(headers)
            for r in rows: ws.append([r.get(k, "") for k in keys])
            buf = io.BytesIO(); wb.save(buf); buf.seek(0)
            return send_file(buf, as_attachment=True, download_name=f"export_filtrado.xlsx", mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        
        text_buf = io.StringIO(); writer = csv.writer(text_buf, delimiter=";")
        writer.writerow(headers)
        for r in rows: writer.writerow([r.get(k, "") for k in keys])
        data = io.BytesIO(text_buf.getvalue().encode("utf-8-sig"))
        return send_file(data, as_attachment=True, download_name=f"export_filtrado.csv", mimetype="text/csv")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)