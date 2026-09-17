import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Scissors, LayoutGrid, Users, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Costureira = {
  id: string;
  nome: string;
};

export function Sidebar() {
  const [costureiras, setCostureiras] = useState<Costureira[]>([]);
  const location = useLocation();

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("costureiras")
        .select("id, nome")
        .eq("ativa", true);

      if (!error && data) setCostureiras(data);
    }
    carregar();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col bg-[#0f1b3d] text-slate-300">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500">
          <Scissors className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-white">
            Confec time
          </p>
          <p className="text-xs leading-tight text-orange-400">
            Gestão de produção
          </p>
        </div>
      </div>

      <nav className="mt-2 flex flex-col gap-1 px-3">
        <p className="px-2 pb-2 text-xs font-medium tracking-wide text-slate-500">
          COSTUREIRAS
        </p>
        {costureiras.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <User className="h-4 w-4" />
            {c.nome}
          </div>
        ))}
      </nav>

      <div className="mx-5 my-4 border-t border-white/10" />

      <nav className="flex flex-col gap-1 px-3">
        <p className="px-2 pb-2 text-xs font-medium tracking-wide text-slate-500">
          GESTÃO
        </p>

        <Link
          to="/"
          className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
            isActive("/")
              ? "bg-white/10 text-white"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Painel
        </Link>

        <Link
          to ="/costureiras"
          className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
            isActive("/costureiras")
              ? "bg-white/10 text-white"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          Costureiras
        </Link>
      </nav>
    </aside>
  );
}