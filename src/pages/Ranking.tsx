/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Trophy,
  AlertTriangle,
  Loader2,
  Search,
  Calendar,
  Zap,
  Download,
} from "lucide-react";
import { api } from "../api"; // Usando a configuração centralizada
import type { ApiResponse } from "../types";

// Força o TypeScript a aceitar window
declare const window: any;

const getFormattedDate = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString("pt-BR");
};

export default function Ranking() {
  const [loading, setLoading] = useState(false);
  const [rankingData, setRankingData] = useState<
    { name: string; value: number }[]
  >([]);

  // Filtros próprios da página de Ranking
  const [di, setDi] = useState(getFormattedDate(30)); // Padrão: Últimos 30 dias
  const [df, setDf] = useState(getFormattedDate(0));

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get<ApiResponse>("/api/search_api", {
        params: {
          di: di.split("/").reverse().join("-"),
          df: df.split("/").reverse().join("-"),
          modo: "cia",
          page_size: 9999, // Busca massiva para garantir precisão do ranking
        },
      });

      const data = response.data.data;

      // Agrupa os dados
      const countMap = data.reduce((acc, curr) => {
        const name = curr.NomAgenteRegulado || "Desconhecido";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Ordena e pega Top 10
      const sorted = Object.entries(countMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      setRankingData(sorted);
    } catch (error) {
      console.error("Erro ao carregar ranking", error);
      (window as any).alert("Erro ao buscar dados do ranking.");
    } finally {
      setLoading(false);
    }
  };

  // Carrega dados ao entrar na tela
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 p-8 pb-12 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl shadow-sm">
            <Trophy size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Ranking de Ofensores
            </h2>
            <p className="text-slate-500 text-sm">
              Identifique as distribuidoras com maior volume de interrupções.
            </p>
          </div>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-48 space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
            <Calendar size={12} /> Data Inicial
          </label>
          <input
            type="text"
            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={di}
            onChange={(e: any) => setDi(e.target.value)}
            placeholder="dd/mm/aaaa"
          />
        </div>
        <div className="w-full md:w-48 space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
            <Calendar size={12} /> Data Final
          </label>
          <input
            type="text"
            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={df}
            onChange={(e: any) => setDf(e.target.value)}
            placeholder="dd/mm/aaaa"
          />
        </div>
        <button
          onClick={() => fetchData()}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md shadow-blue-200 transition-all disabled:opacity-70 flex items-center gap-2"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Search size={18} />
          )}
          Atualizar Ranking
        </button>
      </div>

      {/* Conteúdo Visual */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-2xl border border-dashed border-slate-300">
          <Loader2 size={40} className="animate-spin text-blue-500" />
          <p>Analisando dados da ANEEL...</p>
        </div>
      ) : rankingData.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2 bg-white rounded-2xl border border-slate-200">
          <Zap size={32} className="text-slate-300" />
          <p>Nenhum dado encontrado neste período.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-6 flex items-center justify-between">
              <span>Top 10 Visual</span>
              <span className="text-xs font-normal bg-slate-100 text-slate-500 px-2 py-1 rounded">
                Volume Total
              </span>
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={rankingData}
                  margin={{ left: 10, right: 30 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 11, fontWeight: 600, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {rankingData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index < 3 ? "#ef4444" : "#3b82f6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lista Detalhada */}
          <div className="bg-white p-0 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-700">
                Tabela de Líderes
              </h3>
              <span className="text-xs text-slate-400">Top 10</span>
            </div>
            <div className="overflow-y-auto max-h-[460px] flex-1">
              {rankingData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shadow-sm ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-50"
                          : index === 1
                          ? "bg-slate-200 text-slate-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-white border border-slate-200 text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-medium text-slate-700 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 font-bold bg-slate-50 px-2 py-1 rounded">
                    {item.value}{" "}
                    <AlertTriangle
                      size={14}
                      className={index < 3 ? "text-red-400" : "text-slate-300"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
