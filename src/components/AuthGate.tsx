import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { buscarMeuPapel, type Papel } from "@/lib/acesso";
import { AcessoContext, type Acesso } from "@/lib/acesso-context";
import { AguardandoLiberacao } from "@/components/AguardandoLiberacao";
import { Sidebar } from "@/components/Sidebar";

// Páginas que qualquer pessoa pode abrir sem estar logada.
const PUBLIC_ROUTES = ["/login"];

type EstadoAcesso =
  | { estado: "carregando" }
  | { estado: "erro" }
  | { estado: "ok"; papel: Papel | null };

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
 * - Com login mas sem acesso liberado: mostra a tela "Acesso não liberado".
 * - Com acesso: descobre o papel (leitor, editor ou administrador) e o
 *   disponibiliza para todas as telas pelo useAcesso().
 *
 * A sessão fica guardada no navegador (o Supabase faz isso), por isso a checagem
 * acontece aqui, no navegador, e não no servidor.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // undefined = ainda verificando | null = sem login | Session = logado
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [acesso, setAcesso] = useState<EstadoAcesso>({ estado: "carregando" });
  const reverificar = useRef<() => Promise<void>>(async () => {});

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

  const userId = session?.user.id ?? null;

  // Descobre o papel de quem está logado (e confere de novo ao voltar para a aba)
  useEffect(() => {
    setAcesso({ estado: "carregando" });
    if (!userId) return;

    const id = userId;
    let ativo = true;

    async function carregar() {
      try {
        const papel = await buscarMeuPapel(id);
        if (ativo) setAcesso({ estado: "ok", papel });
      } catch (erro) {
        console.error(erro);
        // se já sabíamos o papel, mantém (pode ser só uma falha de rede)
        if (ativo) {
          setAcesso((atual) =>
            atual.estado === "ok" ? atual : { estado: "erro" },
          );
        }
      }
    }

    function aoVoltarParaAba() {
      if (document.visibilityState === "visible") void carregar();
    }

    reverificar.current = carregar;
    void carregar();
    document.addEventListener("visibilitychange", aoVoltarParaAba);

    return () => {
      ativo = false;
      document.removeEventListener("visibilitychange", aoVoltarParaAba);
    };
  }, [userId]);

  const papel = acesso.estado === "ok" ? acesso.papel : null;
  const email = session?.user.email ?? null;

  const valorAcesso = useMemo<Acesso>(
    () => ({
      userId,
      email,
      papel,
      podeEditar: papel === "editor" || papel === "admin",
      ehAdmin: papel === "admin",
    }),
    [userId, email, papel],
  );

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

  // Logado: falta saber o que essa pessoa pode fazer
  if (acesso.estado === "carregando") return <Carregando />;

  if (acesso.estado === "erro") {
    return (
      <AguardandoLiberacao
        tipo="erro"
        email={email}
        onVerificar={() => reverificar.current()}
      />
    );
  }

  if (acesso.papel === null) {
    return (
      <AguardandoLiberacao
        tipo="espera"
        email={email}
        onVerificar={() => reverificar.current()}
      />
    );
  }

  return (
    <AcessoContext.Provider value={valorAcesso}>
      <div className="flex min-h-screen bg-[var(--bg-base)]">
        <Sidebar />
        <div className="flex-1 bg-[var(--bg-base)] text-[var(--foreground)]">
          {children}
        </div>
      </div>
    </AcessoContext.Provider>
  );
}
