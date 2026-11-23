import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";

// Páginas que qualquer pessoa pode abrir sem estar logada.
const PUBLIC_ROUTES = ["/login"];

function Carregando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] text-sm text-[var(--sea-ink-soft)]">
      Carregando...
    </div>
  );
}

/**
 * Porteiro do sistema.
 *
 * - Sem login: qualquer página leva para /login.
 * - Com login: /login leva para o painel, e o menu lateral aparece.
 *
 * As contas são criadas somente pelo administrador do sistema (no painel do
 * Supabase). Quem tem conta tem acesso completo; não existem papéis.
 *
 * A sessão fica guardada no navegador (o Supabase faz isso), por isso a checagem
 * acontece aqui, no navegador, e não no servidor.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // undefined = ainda verificando | null = sem login | Session = logado
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setSession(data.session);
    });

    // Avisa quando a pessoa entra, sai (outra aba também) ou a sessão é renovada
    const { data: assinatura } = supabase.auth.onAuthStateChange(
      (_evento, novaSessao) => {
        if (ativo) setSession(novaSessao);
      },
    );

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
    };
  }, []);

  const caminho = pathname.replace(/\/+$/, "") || "/";
  const isPublic = PUBLIC_ROUTES.includes(caminho);

  useEffect(() => {
    if (session === undefined) return;

    if (!session && !isPublic) {
      void navigate({ to: "/login", replace: true });
    } else if (session && isPublic) {
      void navigate({ to: "/", replace: true });
    }
  }, [session, isPublic, navigate]);

  // Ainda não sabemos se há login, ou o redirecionamento está acontecendo
  if (session === undefined) return <Carregando />;
  if (!session && !isPublic) return <Carregando />;
  if (session && isPublic) return <Carregando />;

  // Sem login numa página pública (login): mostra a página sem menu
  if (isPublic) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex-1 bg-[var(--bg-base)] text-[var(--foreground)]">
        {children}
      </div>
    </div>
  );
}
