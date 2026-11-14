import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/perfil")({
  component: Perfil,
});

type Usuario = {
  id: string;
  email: string | null;
  ultimoAcesso: string | null;
};

type Mensagem = { tipo: "ok" | "erro"; texto: string };

function MensagemInline({ mensagem }: { mensagem: Mensagem | null }) {
  if (!mensagem) return null;
  return (
    <p
      role={mensagem.tipo === "erro" ? "alert" : "status"}
      className={`text-sm ${
        mensagem.tipo === "erro" ? "text-red-600" : "text-emerald-600"
      }`}
    >
      {mensagem.texto}
    </p>
  );
}

function Perfil() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [nomeSalvo, setNomeSalvo] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [msgNome, setMsgNome] = useState<Mensagem | null>(null);

  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState<Mensagem | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data, error } = await supabase.auth.getUser();
      if (!ativo) return;
      if (error || !data.user) {
        void navigate({ to: "/login" });
        return;
      }

      const { data: perfil, error: erroPerfil } = await supabase
        .from("perfis")
        .select("nome_exibicao")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!ativo) return;
      if (erroPerfil) console.error(erroPerfil);

      const nomePerfil = (perfil?.nome_exibicao as string | null) ?? "";
      setUsuario({
        id: data.user.id,
        email: data.user.email ?? null,
        ultimoAcesso: data.user.last_sign_in_at ?? null,
      });
      setNomeSalvo(nomePerfil);
      setNome(nomePerfil);
      setCarregando(false);
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, [navigate]);

  async function salvarNome(e: FormEvent) {
    e.preventDefault();
    if (!usuario) return;

    const limpo = nome.trim().slice(0, 80);
    setSalvandoNome(true);
    setMsgNome(null);
    const { error } = await supabase.from("perfis").upsert({
      id: usuario.id,
      nome_exibicao: limpo || null,
      updated_at: new Date().toISOString(),
    });
    setSalvandoNome(false);

    if (error) {
      console.error(error);
      setMsgNome({ tipo: "erro", texto: "Não foi possível salvar o nome." });
      return;
    }
    setNomeSalvo(limpo);
    setNome(limpo);
    setMsgNome({ tipo: "ok", texto: "Nome salvo." });
  }

  async function alterarSenha(e: FormEvent) {
    e.preventDefault();
    setMsgSenha(null);

    if (nova.length < 8) {
      setMsgSenha({
        tipo: "erro",
        texto: "A nova senha precisa ter pelo menos 8 caracteres.",
      });
      return;
    }
    if (nova !== confirmacao) {
      setMsgSenha({ tipo: "erro", texto: "As senhas não coincidem." });
      return;
    }

    setSalvandoSenha(true);
    const { error } = await supabase.auth.updateUser({
      password: nova,
      current_password: atual,
    });
    setSalvandoSenha(false);

    if (error) {
      const msg = error.message.toLowerCase();
      setMsgSenha({
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
    setConfirmacao("");
    setMsgSenha({ tipo: "ok", texto: "Senha alterada." });
  }

  const formatarDataHora = (valor: string | null) =>
    valor ? new Date(valor).toLocaleString("pt-BR") : "—";

  if (carregando) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
        <p className="text-sm text-[var(--sea-ink-soft)]">Carregando...</p>
      </main>
    );
  }

  const inicial = (nomeSalvo || usuario?.email || "?").charAt(0).toUpperCase();

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
      <header className="mb-8 flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
          {inicial}
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {nomeSalvo || "Meu perfil"}
          </h1>
          <p className="text-sm text-[var(--sea-ink-soft)]">{usuario?.email}</p>
        </div>
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4" />
              Meus dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={salvarNome} className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <div className="flex gap-2">
                <Input
                  id="nome"
                  value={nome}
                  maxLength={80}
                  placeholder="Seu nome"
                  onChange={(e) => setNome(e.target.value)}
                />
                <Button type="submit" disabled={salvandoNome}>
                  {salvandoNome ? "Salvando..." : "Salvar"}
                </Button>
              </div>
              <MensagemInline mensagem={msgNome} />
            </form>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--sea-ink-soft)]">E-mail</dt>
                <dd className="font-medium">{usuario?.email}</dd>
              </div>
              <div>
                <dt className="text-[var(--sea-ink-soft)]">Último acesso</dt>
                <dd className="font-medium">
                  {formatarDataHora(usuario?.ultimoAcesso ?? null)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Alterar senha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={alterarSenha} className="space-y-3">
              <div className="grid gap-1.5">
                <Label htmlFor="senha-atual">Senha atual</Label>
                <Input
                  id="senha-atual"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={atual}
                  onChange={(e) => setAtual(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="senha-nova">Nova senha</Label>
                <Input
                  id="senha-nova"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  value={nova}
                  onChange={(e) => setNova(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="senha-confirmacao">Confirmar nova senha</Label>
                <Input
                  id="senha-confirmacao"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                />
              </div>
              <MensagemInline mensagem={msgSenha} />
              <Button type="submit" disabled={salvandoSenha}>
                {salvandoSenha ? "Salvando..." : "Alterar senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
