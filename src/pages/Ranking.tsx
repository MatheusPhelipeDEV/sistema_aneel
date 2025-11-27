import { useMemo } from "react";
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
import { Trophy, AlertTriangle, Zap, Search } from "lucide-react";
import type { ApiResponse } from "../types";

interface RankingProps {
  data: ApiResponse | null;
  loading: boolean;
}

export default function Ranking({ data, loading }: RankingProps) {
  // O Ranking agora é calculado instantaneamente com base nos dados que vieram do App.tsx
  const rankingData = useMemo(() => {
    if (!data?.data) return [];

    const countMap = data.data.reduce((acc, curr) => {
      const name = curr.NomAgenteRegulado || "Desconhecido";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(countMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl shadow-sm">
          <Trophy size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Ranking (Baseado na Busca Atual)
          </h2>
          <p className="text-slate-500 text-sm">
            Mostrando os principais ofensores com base no filtro da Visão Geral.
          </p>
        </div>
      </div>

      {!data && !loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4 bg-white rounded-2xl border border-slate-200">
          <div className="bg-slate-100 p-4 rounded-full">
            <Search size={32} className="text-slate-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-600">
              Nenhum dado carregado.
            </p>
            <p className="text-sm">
              Vá para a "Visão Geral" e faça uma busca primeiro.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-2xl border border-dashed border-slate-300">
          <p>Calculando ranking...</p>
        </div>
      ) : rankingData.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2 bg-white rounded-2xl border border-slate-200">
          <Zap size={32} className="text-slate-300" />
          <p>Nenhum dado encontrado para gerar ranking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-6">Top 10 Visual</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={rankingData}
                  margin={{ left: 40, right: 40 }}
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
                    width={150}
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

          <div className="bg-white p-0 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-700">
                Tabela de Líderes
              </h3>
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
                    <span className="font-medium text-slate-700 text-sm group-hover:text-blue-600 transition-colors">
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
