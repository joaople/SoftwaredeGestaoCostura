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
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--lagoon)]">
          <Scissors className="h-5 w-5 text-[var(--sea-ink)]" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-[var(--sea-ink)]">
            Confec time
          </p>
          <p className="text-xs leading-tight text-[var(--lagoon-deep)]">
            Gestão de produção
          </p>
        </div>
      </div>

      <nav className="mt-2 flex flex-col gap-1 px-3">
        <p className="px-2 pb-2 text-xs font-medium tracking-wide text-[var(--sea-ink-soft)]">
          COSTUREIRAS
        </p>
        {costureiras.map((c) => (
          <Link
            key={c.id}
            to="/costureiras/$id"
            params={{ id: c.id }}
            className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
              isActive(`/costureiras/${c.id}`)
                ? "bg-[var(--chip-bg)] text-[var(--sea-ink)]"
                : "text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
            }`}
          >
            <User className="h-4 w-4" />
            {c.nome}
          </Link>
        ))}
      </nav>

      <div className="mx-5 my-4 border-t border-[var(--line)]" />

      <nav className="flex flex-col gap-1 px-3">
        <p className="px-2 pb-2 text-xs font-medium tracking-wide text-[var(--sea-ink-soft)]">
          GESTÃO
        </p>

        <Link
          to="/"
          className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
            isActive("/")
              ? "bg-[var(--chip-bg)] text-[var(--sea-ink)]"
              : "text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Painel
        </Link>

        <Link
          to="/costureiras"
          className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
            isActive("/costureiras")
              ? "bg-[var(--chip-bg)] text-[var(--sea-ink)]"
              : "text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
          }`}
        >
          <Users className="h-4 w-4" />
          Costureiras
        </Link>
      </nav>
    </aside>
  );
}