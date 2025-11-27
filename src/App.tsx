import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// CORREÇÃO: Importando do caminho certo (mesma pasta)
import { api } from "./api";

import { Menu } from "./components/Menu";
import Dashboard from "./pages/Dashboard";
import Ranking from "./pages/Ranking";
import Validator from "./pages/Validator";

import type { ApiResponse, FilterState } from "./types";

function App() {
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
      // CORREÇÃO: Usando 'api' em vez de 'axios' e removendo a URL completa
      // O 'api' já sabe qual é a URL base (localhost ou render)
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
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Menu />

        <div className="flex-1 ml-64 transition-all duration-300">
          <Routes>
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

            <Route path="/validator" element={<Validator />} />

            <Route
              path="/ranking"
              element={<Ranking data={data} loading={loading} />}
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
