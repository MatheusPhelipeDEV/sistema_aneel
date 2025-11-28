import { useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./api";

import { Menu } from "./components/Menu";
import Dashboard from "./pages/Dashboard";
import Ranking from "./pages/Ranking";

import type { ApiResponse, FilterState } from "./types";

function App() {
  // --- ESTADOS GLOBAIS ---
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

  // --- FUNÇÃO DE BUSCA ---
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
      console.error(err);
      setError("Erro ao buscar dados. Verifique se o servidor está online.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-slate-50">
        {/* Menu Lateral sem props de login */}
        <Menu />

        {/* Área Principal */}
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

            {/* Se o seu Ranking.tsx esperar props, adicione: data={data} loading={loading} */}
            <Route path="/ranking" element={<Ranking />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
}

export default App;
