import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  OPCOES_PAPEL,
  ROTULO_PAPEL,
  definirPapel,
  listarContas,
  type Conta,
  type PapelOuNenhum,
} from "@/lib/acesso";
import { useAcesso } from "@/lib/acesso-context";
import { formatarData } from "@/lib/production";
import { mensagemDeErro } from "@/lib/tarefas";

export const Route = createFileRoute("/usuarios")({
  component: Usuarios,
});

type Mensagem = { tipo: "ok" | "erro"; texto: string };

function Usuarios() {
  const { ehAdmin, userId } = useAcesso();
  const [contas, setContas] = useState<Conta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  async function carregar() {
    try {
      setContas(await listarContas());
    } catch (erro) {
      console.error(erro);
      setMensagem({
        tipo: "erro",
        texto: mensagemDeErro(erro, "Não foi possível carregar as contas."),
      });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (ehAdmin) void carregar();
    else setCarregando(false);
  }, [ehAdmin]);

  // Avisos de sucesso somem sozinhos; erros ficam até a próxima ação.
  useEffect(() => {
    if (!mensagem || mensagem.tipo === "erro") return;
    const timer = window.setTimeout(() => setMensagem(null), 3000);
    return () => window.clearTimeout(timer);
  }, [mensagem]);

  async function handleMudar(conta: Conta, novo: PapelOuNenhum) {
    setMensagem(null);
    setSalvandoId(conta.id);
    try {
      await definirPapel(conta.id, novo);
      setMensagem({
        tipo: "ok",
        texto: `Acesso de ${conta.email ?? "conta"} atualizado.`,
      });
      await carregar();
    } catch (erro) {
      console.error(erro);
      setMensagem({
        tipo: "erro",
        texto: mensagemDeErro(erro, "Não foi possível alterar o acesso."),
      });
      await carregar(); // volta a caixa para o valor que está de fato salvo
    } finally {
      setSalvandoId(null);
    }
  }

  if (!ehAdmin) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Apenas administradores podem acessar esta página.
        </p>
      </main>
    );
  }

  const leitores = contas.filter((c) => c.papel === "leitor").length;

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--lagoon-deep)]">
          Confectime
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Quem cria uma conta entra como Leitor. Aqui você escolhe quem passa a
          ser Editor ou Administrador.
        </p>
      </header>

      {mensagem && (
        <p
          role={mensagem.tipo === "erro" ? "alert" : "status"}
          className={`mb-4 text-sm ${
            mensagem.tipo === "erro" ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {mensagem.texto}
        </p>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>O que cada acesso permite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p>
              <strong>{ROTULO_PAPEL.leitor}:</strong> só visualiza os dados.
            </p>
            <p>
              <strong>{ROTULO_PAPEL.editor}:</strong> visualiza e também
              cadastra, altera e exclui (costureiras, tarefas e produção).
            </p>
            <p>
              <strong>{ROTULO_PAPEL.admin}:</strong> tudo do Editor, e também
              define o acesso de outras pessoas nesta página.
            </p>
            <p className="text-[var(--sea-ink-soft)]">
              <strong>Sem acesso:</strong> a pessoa não vê nada até você liberar
              de novo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contas cadastradas</CardTitle>
            <CardDescription>
              {contas.length} conta{contas.length !== 1 ? "s" : ""} ·{" "}
              {leitores} leitor{leitores !== 1 ? "es" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {carregando ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Acesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contas.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-sm text-[var(--sea-ink-soft)]"
                      >
                        Nenhuma conta encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {contas.map((conta) => {
                    const ehVoce = conta.id === userId;
                    return (
                      <TableRow key={conta.id}>
                        <TableCell className="font-medium">
                          {conta.email ?? "(sem e-mail)"}
                          {ehVoce && (
                            <Badge variant="secondary" className="ml-2">
                              Você
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatarData(conta.criado_em)}
                        </TableCell>
                        <TableCell>
                          <select
                            aria-label={`Acesso de ${conta.email ?? "conta"}`}
                            className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                            value={conta.papel ?? "nenhum"}
                            // para ninguém se trancar para fora por engano
                            disabled={ehVoce || salvandoId === conta.id}
                            title={
                              ehVoce
                                ? "Você não pode mudar o próprio acesso"
                                : undefined
                            }
                            onChange={(e) =>
                              void handleMudar(
                                conta,
                                e.target.value as PapelOuNenhum,
                              )
                            }
                          >
                            {OPCOES_PAPEL.map((o) => (
                              <option key={o.valor} value={o.valor}>
                                {o.rotulo}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
