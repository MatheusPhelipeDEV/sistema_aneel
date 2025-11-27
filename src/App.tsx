import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

// Componentes
import { Menu } from "./components/Menu";
import Dashboard from "./pages/Dashboard";
import Ranking from "./pages/Ranking";
import Validator from "./pages/Validator";

// Tipos
import type { ApiResponse, FilterState } from "./types";

function App() {
  // ESTADOS DE DADOS (BUSCA)
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

  // AÇÃO DE BUSCA (GLOBAL)
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
      const response = await axios.get<ApiResponse>(
        "http://localhost:5000/api/search_api",
        {
          params: {
            di: currentFilters.di.split("/").reverse().join("-"),
            df: currentFilters.df.split("/").reverse().join("-"),
            modo: currentFilters.modo,
            unidade: currentFilters.termo,
            page: 1,
            page_size: currentFilters.pageSize,
          },
        }
      );
      setData(response.data);
    } catch (err) {
      setError("Erro ao buscar dados. Verifique se o app.py está rodando.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50">
        {/* Menu Lateral Simplificado */}
        <Menu />

        {/* Área de Conteúdo */}
        <div className="flex-1 ml-64 transition-all duration-300">
          <Routes>
            {/* ROTA 1: VISÃO GERAL (Dashboard) */}
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

            {/* ROTA 2: VALIDADOR JURÍDICO */}
            <Route path="/validator" element={<Validator />} />

            {/* ROTA 3: RANKING */}
            <Route
              path="/ranking"
              element={<Ranking data={data} loading={loading} />}
            />

            {/* Qualquer rota desconhecida volta pro início */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
