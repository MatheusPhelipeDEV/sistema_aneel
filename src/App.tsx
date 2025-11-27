import { useState } from "react";
// Usando HashRouter para compatibilidade total com GitHub Pages
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
// Importando a configuração da API (que define se é localhost ou render)
import { api } from "./api";

import { Menu } from "./components/Menu";
import Dashboard from "./pages/Dashboard";
import Ranking from "./pages/Ranking";

import type { ApiResponse, FilterState } from "./types";

function App() {
  // Estados globais usados apenas pelo Dashboard
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<FilterState>({
    di: "",
    df: "",
    modo: "cia",
    termo: "",
    pageSize: 1000,
  });

  const handleSearch = async (overrideFilters?: Partial<FilterState>) => {
    const currentFilters = { ...filters, ...overrideFilters };

    if (!currentFilters.di || !currentFilters.df) {
      setError("Por favor, preencha as datas inicial e final.");
      return;
    }

    setError("");
    setData(null);
    setLoading(true);

    try {
      // Usa a instância 'api' que já tem a URL base correta
      const response = await api.get<ApiResponse>("/api/search_api", {
        params: {
          di: currentFilters.di.split("/").reverse().join("-"),
          df: currentFilters.df.split("/").reverse().join("-"),
          modo: currentFilters.modo,
          unidade: currentFilters.termo,
          page: 1,
          page_size: currentFilters.pageSize,
        },
      });
      setData(response.data);
    } catch (err) {
      setError("Erro ao buscar dados. Verifique se o servidor está rodando.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Menu />

        <div className="flex-1 ml-64 transition-all duration-300">
          <Routes>
            {/* O Dashboard continua recebendo os dados globais */}
            <Route
              path="/"
              element={
                <Dashboard
                  data={data}
                  loading={loading}
                  error={error}
                  filters={filters}
                  setFilters={setFilters}
                  onSearch={handleSearch}
                />
              }
            />

            {/* O Ranking agora é independente (busca seus próprios dados) */}
            <Route path="/ranking" element={<Ranking />} />

            {/* Qualquer rota desconhecida volta pro início */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
}

export default App;
