/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  Search,
  Download,
  Zap,
  AlertTriangle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  XCircle,
  WifiOff,
  List,
} from "lucide-react";

import type { ApiResponse, FilterState } from "../types";
import { StatCard } from "../components/StatCard";
import { ChartsSection } from "../components/ChartsSection";
import { MapSection } from "../components/MapSection";

declare const window: any;

interface DashboardProps {
  data: ApiResponse | null;
  loading: boolean;
  error: string;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onSearch: (override?: Partial<FilterState>) => void;
}

const formatDate = (iso: string | undefined) => {
  if (!iso) return "-";
  const [date, time] = iso.split(" ");
  const [y, m, d] = date.split("-");
  return time ? `${d}/${m}/${y} ${time}` : `${d}/${m}/${y}`;
};

const getFormattedDate = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString("pt-BR");
};

export default function Dashboard({
  data,
  loading,
  error,
  filters,
  setFilters,
  onSearch,
}: DashboardProps) {
  const [localFilter, setLocalFilter] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  const [serverStatus, setServerStatus] = useState<
    "online" | "offline" | "checking"
  >("checking");

  useEffect(() => {
    const checkServer = async () => {
      try {
        await axios.get("http://localhost:5000/health", { timeout: 2000 });
        setServerStatus("online");
      } catch {
        setServerStatus("offline");
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSearch();
  };

  const filteredResults = useMemo(() => {
    if (!data?.data) return [];
    let results = data.data;

    if (localFilter) {
      const term = localFilter.toLowerCase();
      results = results.filter((item) => {
        return (
          item.NumOrdemInterrupcao.toLowerCase().includes(term) ||
          item.dia.includes(term) ||
          (item.NomAgenteRegulado &&
            item.NomAgenteRegulado.toLowerCase().includes(term)) ||
          (item.NumUnidadeConsumidora &&
            item.NumUnidadeConsumidora.includes(term)) ||
          item.DscFatoGeradorInterrupcao.toLowerCase().includes(term) ||
          (item.DscConjuntoUnidadeConsumidora &&
            item.DscConjuntoUnidadeConsumidora.toLowerCase().includes(term))
        );
      });
    }

    if (severityFilter) {
      results = results.filter((item) => {
        if (!item.DatInicioInterrupcao || !item.DatFimInterrupcao) return false;
        const start = new Date(item.DatInicioInterrupcao.replace(" ", "T"));
        const end = new Date(item.DatFimInterrupcao.replace(" ", "T"));
        const diffMinutes = (end.getTime() - start.getTime()) / 1000 / 60;

        if (severityFilter === "short") return diffMinutes < 3;
        if (severityFilter === "medium")
          return diffMinutes >= 3 && diffMinutes < 60;
        if (severityFilter === "long")
          return diffMinutes >= 60 && diffMinutes < 240;
        if (severityFilter === "critical") return diffMinutes >= 240;
        return true;
      });
    }
    return results;
  }, [data, localFilter, severityFilter]);

  const stats = useMemo(() => {
    const sourceData =
      localFilter || severityFilter ? filteredResults : data?.data || [];
    const totalCount =
      localFilter || severityFilter ? filteredResults.length : data?.total || 0;
    const mainCause = sourceData.length
      ? [...sourceData]
          .sort(
            (a, b) =>
              sourceData.filter(
                (v) =>
                  v.DscFatoGeradorInterrupcao === a.DscFatoGeradorInterrupcao
              ).length -
              sourceData.filter(
                (v) =>
                  v.DscFatoGeradorInterrupcao === b.DscFatoGeradorInterrupcao
              ).length
          )
          .pop()?.DscFatoGeradorInterrupcao
      : "-";

    return {
      total: totalCount,
      mainCause: mainCause,
      lastUpdate: new Date().toLocaleTimeString(),
    };
  }, [data, filteredResults, localFilter, severityFilter]);

  const applyPreset = (type: "today" | "yesterday" | "week" | "month") => {
    let di = "",
      df = getFormattedDate(0);
    switch (type) {
      case "today":
        di = getFormattedDate(0);
        break;
      case "yesterday":
        di = getFormattedDate(1);
        df = getFormattedDate(1);
        break;
      case "week":
        di = getFormattedDate(7);
        break;
      case "month":
        di = getFormattedDate(30);
        break;
    }
    setFilters((prev) => ({ ...prev, di, df }));
  };

  const handleExport = (fmt: "xlsx" | "csv") => {
    if (!filters.di || !filters.df)
      return (window as any).alert("Preencha as datas.");
    const params = new URLSearchParams({
      di: filters.di.split("/").reverse().join("-"),
      df: filters.df.split("/").reverse().join("-"),
      modo: filters.modo,
      unidade: filters.termo,
      fmt,
    });
    window.open(
      `http://localhost:5000/api/export?${params.toString()}`,
      "_blank"
    );
  };

  const severityLabels: Record<string, string> = {
    short: "Momentânea (< 3 min)",
    medium: "Curta (3 min - 1h)",
    long: "Média (1h - 4h)",
    critical: "Crítica (> 4h)",
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
          <p className="text-slate-500">
            Monitore as interrupções de energia em tempo real.
          </p>
        </div>

        <div
          className={`px-4 py-2 rounded-full text-sm font-bold border flex items-center gap-2 transition-colors ${
            serverStatus === "online"
              ? "bg-green-100 text-green-700 border-green-200"
              : "bg-red-100 text-red-700 border-red-200"
          }`}
        >
          {serverStatus === "online" ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Sistema Online
            </>
          ) : (
            <>
              <WifiOff size={16} />
              Servidor Offline
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
          <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
            <Search size={20} /> Parâmetros de Consulta
          </h2>
          <div className="flex gap-2 text-xs overflow-x-auto pb-1">
            <button
              onClick={() => applyPreset("today")}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-medium transition-colors whitespace-nowrap"
            >
              Hoje
            </button>
            <button
              onClick={() => applyPreset("yesterday")}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-medium transition-colors whitespace-nowrap"
            >
              Ontem
            </button>
            <button
              onClick={() => applyPreset("week")}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-medium transition-colors whitespace-nowrap"
            >
              7 Dias
            </button>
            <button
              onClick={() => applyPreset("month")}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-medium transition-colors whitespace-nowrap"
            >
              30 Dias
            </button>
          </div>
        </div>

        {/* GRID ALTERADO PARA 5 COLUNAS PARA CABER O NOVO FILTRO */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-1">
              <Calendar size={14} /> Data Inicial
            </label>
            <input
              type="text"
              placeholder="dd/mm/aaaa"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.di}
              onChange={(e: any) =>
                setFilters({ ...filters, di: e.target.value })
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-1">
              <Calendar size={14} /> Data Final
            </label>
            <input
              type="text"
              placeholder="dd/mm/aaaa"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.df}
              onChange={(e: any) =>
                setFilters({ ...filters, df: e.target.value })
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Modo</label>
            <select
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
              value={filters.modo}
              onChange={(e: any) =>
                setFilters({ ...filters, modo: e.target.value })
              }
              onKeyDown={handleKeyDown}
            >
              <option value="cia">Por Companhia (CIA)</option>
              <option value="uc">Por Unidade (UC)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">
              Filtro (Nome/UC)
            </label>
            <input
              type="text"
              placeholder="Ex: COPEL..."
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.termo}
              onChange={(e: any) =>
                setFilters({ ...filters, termo: e.target.value })
              }
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* NOVO FILTRO: Itens por Página */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-1">
              <List size={14} /> Itens por Pág.
            </label>
            <select
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
              value={filters.pageSize}
              // Garante que atualiza o filtro e limita visualmente a 100
              onChange={(e: any) =>
                setFilters({ ...filters, pageSize: parseInt(e.target.value) })
              }
              onKeyDown={handleKeyDown}
            >
              <option value="10">10 itens</option>
              <option value="20">20 itens</option>
              <option value="50">50 itens</option>
              <option value="100">100 itens (Máx)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center border-t pt-4 border-slate-100">
          <div className="text-sm text-slate-500">
            {error && (
              <span className="text-red-500 font-medium flex items-center gap-1">
                <AlertTriangle size={16} /> {error}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleExport("xlsx")}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
              <Download size={18} /> Excel
            </button>
            <button
              onClick={() => onSearch()}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md shadow-blue-200 transition-all disabled:opacity-70"
            >
              {loading ? "Buscando..." : "Buscar Dados"}
            </button>
          </div>
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title={
                localFilter || severityFilter
                  ? "Registros Filtrados"
                  : "Total (API)"
              }
              value={stats.total.toLocaleString()}
              icon={Zap}
              colorClass="bg-blue-100 text-blue-600"
            />
            <StatCard
              title="Causa Principal (Seleção)"
              value={stats.mainCause || "-"}
              icon={AlertTriangle}
              colorClass="bg-orange-100 text-orange-600"
            />
            <StatCard
              title="Tempo de Resposta"
              value={`${data.meta.timing_ms} ms`}
              icon={Clock}
              colorClass="bg-green-100 text-green-600"
            />
          </div>

          {filteredResults.length > 0 && (
            <ChartsSection
              data={data.data}
              onSeverityClick={setSeverityFilter}
            />
          )}
          {filteredResults.length > 0 && <MapSection data={filteredResults} />}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              Resultados Detalhados
              {severityFilter && (
                <span
                  className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer hover:bg-orange-200"
                  onClick={() => setSeverityFilter(null)}
                >
                  Filtro: {severityLabels[severityFilter]} <XCircle size={12} />
                </span>
              )}
            </h3>
            <span className="text-xs font-mono text-slate-400">
              ID Req: {data?.meta.request_id || "---"}
            </span>
          </div>
          {data && (
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Filtrar nesta página..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={localFilter}
                onChange={(e: any) => setLocalFilter(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse table-fixed">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-12 px-4 py-3"></th>
                <th className="w-32 px-6 py-3 font-medium">Data</th>
                <th className="w-32 px-6 py-3 font-medium">Registro</th>
                <th className="px-6 py-3 font-medium">
                  {filters.modo === "cia" ? "Companhia" : "Unidade"}
                </th>
                <th className="px-6 py-3 font-medium">Fato Gerador</th>
                <th className="w-40 px-6 py-3 font-medium">Início</th>
                <th className="w-40 px-6 py-3 font-medium">Fim</th>
              </tr>
            </thead>

            {loading ? (
              <tbody>
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Carregando dados...
                  </td>
                </tr>
              </tbody>
            ) : !filteredResults.length ? (
              <tbody>
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-slate-400"
                  >
                    {data?.data.length && (localFilter || severityFilter)
                      ? "Nenhum resultado com este filtro."
                      : "Nenhum dado para exibir."}
                  </td>
                </tr>
              </tbody>
            ) : (
              filteredResults.map((item, idx) => {
                const isExpanded = expandedRow === idx;
                return (
                  <tbody key={idx} className="border-b border-slate-100 group">
                    <tr
                      className={`transition-colors cursor-pointer ${
                        isExpanded ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}
                      onClick={() => setExpandedRow(isExpanded ? null : idx)}
                    >
                      <td className="px-4 py-3 text-slate-400 align-middle">
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-700 align-middle">
                        {item.dia}
                      </td>
                      <td className="px-6 py-3 text-slate-600 align-middle">
                        {item.NumOrdemInterrupcao}
                      </td>
                      <td className="px-6 py-3 text-slate-600 font-medium align-middle">
                        {filters.modo === "cia"
                          ? item.NomAgenteRegulado
                          : item.NumUnidadeConsumidora}
                      </td>
                      <td
                        className="px-6 py-3 text-slate-600 truncate max-w-[250px] align-middle"
                        title={item.DscFatoGeradorInterrupcao}
                      >
                        {item.DscFatoGeradorInterrupcao}
                      </td>
                      <td className="px-6 py-3 text-slate-500 whitespace-nowrap align-middle">
                        {formatDate(item.DatInicioInterrupcao)}
                      </td>
                      <td className="px-6 py-3 text-slate-500 whitespace-nowrap align-middle">
                        {formatDate(item.DatFimInterrupcao)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm animate-fade-in">
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                              <span className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                                Tipo
                              </span>
                              <span className="text-slate-800">
                                {item.DscTipoInterrupcao}
                              </span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                              <span className="text-xs font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                <MapPin size={12} /> Conjunto / UC
                              </span>
                              <span className="text-slate-800 font-medium">
                                {item.DscConjuntoUnidadeConsumidora}
                              </span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                              <span className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                                Sigla
                              </span>
                              <span className="text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">
                                {item.SigAgente || "N/A"}
                              </span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg col-span-1 md:col-span-2 lg:col-span-3">
                              <span className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                                Fato Gerador Completo
                              </span>
                              <span className="text-slate-800">
                                {item.DscFatoGeradorInterrupcao}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })
            )}
          </table>
        </div>

        {data && data.total > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {localFilter || severityFilter ? (
                <span>
                  Exibindo <b>{filteredResults.length}</b> filtrados.
                </span>
              ) : (
                <span>
                  Mostrando{" "}
                  <span className="font-medium">
                    {(data.page - 1) * data.page_size + 1}
                  </span>{" "}
                  a{" "}
                  <span className="font-medium">
                    {Math.min(data.page * data.page_size, data.total)}
                  </span>{" "}
                  de <span className="font-medium">{data.total}</span>
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-500"
                disabled
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-500"
                disabled
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
