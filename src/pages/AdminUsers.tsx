/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { UserPlus, Trash2, Users, Building } from "lucide-react";
import { api } from "../api";

// Declara window para evitar erro do TypeScript
declare const window: any;

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulário
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newCompany, setNewCompany] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users", { withCredentials: true });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(
        "/api/users",
        {
          name: newName,
          email: newEmail,
          password: newPass,
          role: newRole,
          company: newCompany,
        },
        { withCredentials: true }
      );

      window.alert("Usuário criado com sucesso!");
      setNewName("");
      setNewEmail("");
      setNewPass("");
      fetchUsers();
    } catch (err: any) {
      window.alert(err.response?.data?.error || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja remover este usuário?")) return;
    try {
      await api.delete(`/api/users/${id}`, { withCredentials: true });
      fetchUsers();
    } catch (err) {
      console.error(err); // Usa 'err' para evitar aviso
      window.alert("Erro ao deletar usuário");
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-md">
          <Users size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Gestão de Acessos
          </h2>
          <p className="text-slate-500 text-sm">
            Cadastre seus clientes e defina permissões.
          </p>
        </div>
      </div>

      {/* Formulário de Criação */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
          <UserPlus size={18} /> Novo Usuário
        </h3>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
        >
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">Nome</label>
            <input
              type="text"
              required
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="Nome do cliente"
              value={newName}
              onChange={(e: any) => setNewName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">Email</label>
            <input
              type="email"
              required
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="email@cliente.com"
              value={newEmail}
              onChange={(e: any) => setNewEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">Senha</label>
            <input
              type="text"
              required
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="Senha inicial"
              value={newPass}
              onChange={(e: any) => setNewPass(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">Cargo</label>
            <select
              className="w-full p-2 border rounded-lg text-sm"
              value={newRole}
              onChange={(e: any) => setNewRole(e.target.value)}
            >
              <option value="user">Usuário (Padrão)</option>
              <option value="admin">Admin (Sócio)</option>
              <option value="master">Master (Você)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">Empresa</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="Nome da Empresa"
              value={newCompany}
              onChange={(e: any) => setNewCompany(e.target.value)}
            />
          </div>
          <button
            disabled={loading}
            className="bg-green-600 text-white p-2 rounded-lg font-bold hover:bg-green-700 transition-colors h-[38px]"
          >
            {loading ? "Sal..." : "Cadastrar"}
          </button>
        </form>
      </div>

      {/* Lista de Usuários */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Empresa</th>
              <th className="px-6 py-4">Cargo</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-700">
                  {u.name}
                </td>
                <td className="px-6 py-3 text-slate-500">{u.email}</td>
                <td className="px-6 py-3 flex items-center gap-2 text-slate-600">
                  {u.company && (
                    <>
                      <Building size={14} className="text-slate-400" />{" "}
                      {u.company}
                    </>
                  )}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      u.role === "master"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
