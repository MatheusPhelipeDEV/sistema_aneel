/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import axios from "axios";
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Loader2,
  MapPin,
  Clock,
} from "lucide-react";
import type { ApiResponse } from "../types";

declare const window: any;

export default function Validator() {
  // Inputs do Analista
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  // REMOVIDO: const [company, setCompany]... (não era usado)
  const [companyName, setCompanyName] = useState("");
  const [keyword, setKeyword] = useState("");

  // Estados de Processamento
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(false);
    setCandidates([]);

    if (!companyName || !date || !time) {
      window.alert("Preencha Concessionária, Data e Hora.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get<ApiResponse>(
        "http://localhost:5000/api/search_api",
        {
          params: {
            di: date.split("/").reverse().join("-"),
            df: date.split("/").reverse().join("-"),
            modo: "cia",
            unidade: companyName,
            page_size: 5000,
          },
        }
      );

      const allRecords = response.data.data;
      const targetTime = parseInt(time.replace(":", ""));

      const matches = allRecords.filter((r: any) => {
        if (!r.DatInicioInterrupcao) return false;
        const recordTimeStr = r.DatInicioInterrupcao.split(" ")[1]
          .substring(0, 5)
          .replace(":", "");
        const recordTime = parseInt(recordTimeStr);

        // Filtro de Horário (Janela de +/- 2 horas)
        const timeMatch = Math.abs(recordTime - targetTime) < 200;

        // Filtro de Palavra-chave (Opcional)
        let keywordMatch = true;
        if (keyword && keyword.trim() !== "") {
          const textToSearch =
            (r.DscConjuntoUnidadeConsumidora || "") +
            " " +
            (r.DscFatoGeradorInterrupcao || "");
          keywordMatch = textToSearch
            .toLowerCase()
            .includes(keyword.toLowerCase());
        }

        return timeMatch && keywordMatch;
      });

      setCandidates(matches);
      setSearched(true);
    } catch (error) {
      console.error(error);
      window.alert(
        "Erro ao consultar API. Verifique se o servidor está rodando."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm">
          <FileText size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Validador de Nexo (Investigativo)
          </h2>
          <p className="text-slate-500 text-sm">
            Cruze Data, Hora e Concessionária para encontrar registros
            compatíveis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. Formulário de Entrada */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <FileText size={18} /> Dados do Relato/Fatura
            </h3>
            <form onSubmit={handleCheck} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Concessionária
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: COPEL, ENEL, CEMIG..."
                  value={companyName}
                  onChange={(e: any) => setCompanyName(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Digite a sigla ou nome (ex: COELBA).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Data do Dano
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="DD/MM/AAAA"
                    value={date}
                    onChange={(e: any) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Hora Aprox.
                  </label>
                  <input
                    type="time"
                    required
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={time}
                    onChange={(e: any) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Filtro Local (Opcional)
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Curitiba, Centro, Rural..."
                  value={keyword}
                  onChange={(e: any) => setKeyword(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Ajuda a refinar se a busca trouxer muitos resultados.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  "Buscar Evidências"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 2. Área de Resultado */}
        <div className="lg:col-span-2 space-y-4">
          {!searched && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-12 min-h-[400px]">
              <Zap size={48} className="mb-4 text-slate-300" />
              <p className="text-lg font-medium">Aguardando parâmetros</p>
              <p className="text-sm">
                O sistema buscará todas as quedas da concessionária na data e
                filtrará pelo horário.
              </p>
            </div>
          )}

          {/* Cenário C (Nada encontrado) */}
          {searched && candidates.length === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-full">
                  <XCircle size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-800">
                    Nenhuma Evidência Encontrada
                  </h3>
                  <p className="text-red-700 mt-1">
                    Não encontramos interrupções da{" "}
                    <strong>{companyName}</strong> no dia{" "}
                    <strong>{date}</strong> próximas às <strong>{time}</strong>{" "}
                    (+/- 2h)
                    {keyword && (
                      <span>
                        {" "}
                        contendo "<strong>{keyword}</strong>"
                      </span>
                    )}
                    .
                  </p>

                  <div className="mt-6 p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                    <p className="text-sm font-bold text-red-900 uppercase mb-1">
                      Análise de Risco
                    </p>
                    <p className="text-sm text-slate-600">
                      A chance de êxito judicial é <strong>BAIXA</strong>.
                      Ajuizar sem prova de nexo causal pode gerar custos de
                      sucumbência.
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs text-slate-500">
                        Economia Estimada (Custas):
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        R$ 1.500,00
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button className="px-4 py-2 bg-white text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-50 transition-colors w-full">
                      Gerar Relatório de Inviabilidade (PDF)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cenário A/B (Candidatos encontrados) */}
          {searched && candidates.length > 0 && (
            <div className="animate-fade-in space-y-4">
              {/* Uso do AlertTriangle aqui garante que ele não seja marcado como 'unused' */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="text-yellow-600" size={24} />
                <div>
                  <h3 className="font-bold text-yellow-800">
                    Indícios Encontrados!
                  </h3>
                  <p className="text-xs text-yellow-700">
                    Encontramos <strong>{candidates.length}</strong> registros
                    compatíveis. Verifique qual corresponde ao local.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {candidates.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase mb-1 inline-block">
                          {item.DscTipoInterrupcao}
                        </span>
                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                          <MapPin size={16} className="text-slate-400" />
                          {item.DscConjuntoUnidadeConsumidora ||
                            "Localização Genérica"}
                        </h4>
                      </div>
                      <button className="text-xs font-bold text-blue-600 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50 transition-colors">
                        Selecionar{" "}
                        <CheckCircle size={12} className="inline ml-1" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mt-3 bg-slate-50 p-3 rounded-lg">
                      <div>
                        <span className="text-xs text-slate-400 block uppercase">
                          Início
                        </span>
                        <span className="font-mono font-medium text-slate-800 flex items-center gap-1">
                          <Clock size={12} />{" "}
                          {item.DatInicioInterrupcao.split(" ")[1]}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block uppercase">
                          Duração
                        </span>
                        <span className="font-medium text-slate-800">
                          Indefinida
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-slate-400 block uppercase">
                          Causa Oficial
                        </span>
                        <span className="font-medium text-slate-800">
                          {item.DscFatoGeradorInterrupcao}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
