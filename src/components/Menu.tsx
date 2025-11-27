import { NavLink } from "react-router-dom";
import { LayoutDashboard, Trophy, Zap, FileText } from "lucide-react";

export function Menu() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
      isActive
        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <aside className="w-64 bg-slate-900 h-screen fixed left-0 top-0 flex flex-col border-r border-slate-800 z-50">
      <div className="p-6 flex items-center gap-3 mb-6">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Zap size={24} className="text-white fill-current" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            PowerMap
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            v5.0 Open
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        <div className="px-2 mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
          Ferramentas
        </div>

        <NavLink to="/" className={linkClass}>
          <LayoutDashboard size={20} />
          <span>Visão Geral</span>
        </NavLink>

        <NavLink to="/validator" className={linkClass}>
          <FileText size={20} />
          <span>Validador Jurídico</span>
        </NavLink>

        <NavLink to="/ranking" className={linkClass}>
          <Trophy size={20} />
          <span>Ranking Top 10</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-500">Estalk Advogados Associados</p>
      </div>
    </aside>
  );
}
