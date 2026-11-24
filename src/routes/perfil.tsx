import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/perfil")({
  component: Perfil,
});

type Mensagem = { tipo: "ok" | "erro"; texto: string };

// Campo de senha com o olhinho para mostrar/ocultar o que foi digitado
function CampoSenha({
  id,
  rotulo,
  valor,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={128}
          required
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--sea-ink-soft)] hover:text-[var(--foreground)]"
        >
          {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function Perfil() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data, error } = await supabase.auth.getUser();
      if (!ativo) return;
      if (error || !data.user) {
        void navigate({ to: "/login" });
        return;
      }
      setEmail(data.user.email ?? null);
      setCarregando(false);
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, [navigate]);

  async function alterarSenha(e: FormEvent) {
    e.preventDefault();
    setMensagem(null);

    if (nova.length < 8) {
      setMensagem({
        tipo: "erro",
        texto: "A nova senha precisa ter pelo menos 8 caracteres.",
      });
      return;
    }

    setSalvando(true);
    const { error } = await supabase.auth.updateUser({
      password: nova,
      current_password: atual,
    });
    setSalvando(false);

    if (error) {
      const msg = error.message.toLowerCase();
      setMensagem({
        tipo: "erro",
        texto:
          msg.includes("current") || msg.includes("invalid")
            ? "Senha atual incorreta."
            : msg.includes("same") || msg.includes("different")
              ? "A nova senha deve ser diferente da atual."
              : "Não foi possível alterar a senha.",
      });
      return;
    }

    setAtual("");
    setNova("");
    setMensagem({ tipo: "ok", texto: "Senha alterada." });
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
      {carregando ? (
        <p className="text-sm text-[var(--sea-ink-soft)]">Carregando...</p>
      ) : (
        <>
          <h1 className="text-3xl font-bold tracking-tight">Alterar senha</h1>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">{email}</p>

          <form onSubmit={alterarSenha} className="mt-8 space-y-4">
            <CampoSenha
              id="senha-atual"
              rotulo="Senha atual"
              valor={atual}
              onChange={setAtual}
              autoComplete="current-password"
            />
            <CampoSenha
              id="senha-nova"
              rotulo="Nova senha"
              valor={nova}
              onChange={setNova}
              autoComplete="new-password"
              minLength={8}
            />

            {mensagem && (
              <p
                role={mensagem.tipo === "erro" ? "alert" : "status"}
                className={`text-sm ${
                  mensagem.tipo === "erro" ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {mensagem.texto}
              </p>
            )}

            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Alterar senha"}
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
