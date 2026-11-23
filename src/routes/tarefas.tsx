import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarMinutos } from "@/lib/production";
import {
  criarOperacao,
  excluirOperacao,
  listarCostureirasAtivas,
  listarOperacoes,
  listarTemposOperacao,
  mensagemDeErro,
  salvarTempoOperacao,
  type CostureiraAtiva,
  type Operacao,
  type TempoOperacao,
} from "@/lib/tarefas";

export const Route = createFileRoute("/tarefas")({
  component: Tarefas,
});

type Mensagem = { tipo: "ok" | "erro"; texto: string };

function Tarefas() {
  const [costureiras, setCostureiras] = useState<CostureiraAtiva[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [tempos, setTempos] = useState<TempoOperacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [nome, setNome] = useState("");
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [criando, setCriando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [operacaoParaExcluir, setOperacaoParaExcluir] =
    useState<Operacao | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  async function carregar() {
    try {
      const [listaCostureiras, listaOperacoes, listaTempos] =
        await Promise.all([
          listarCostureirasAtivas(),
          listarOperacoes(),
          listarTemposOperacao(),
        ]);
      setCostureiras(listaCostureiras);
      setOperacoes(listaOperacoes);
      setTempos(listaTempos);
    } catch (erro) {
      console.error(erro);
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível carregar as tarefas. Tente novamente.",
      });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  // Avisos de sucesso somem sozinhos; erros ficam até a próxima ação.
  useEffect(() => {
    if (!mensagem || mensagem.tipo === "erro") return;
    const timer = window.setTimeout(() => setMensagem(null), 3000);
    return () => window.clearTimeout(timer);
  }, [mensagem]);

  const tempoDe = (operacaoId: string, costureiraId: string) =>
    tempos.find(
      (t) => t.operacao_id === operacaoId && t.costureira_id === costureiraId,
    );

  async function handleCriar(e: FormEvent) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;

    setCriando(true);
    setMensagem(null);
    try {
      await criarOperacao(
        nomeLimpo,
        costureiras
          .filter((c) => Number(rascunho[c.id]) > 0)
          .map((c) => ({
            costureira_id: c.id,
            minutos: Number(rascunho[c.id]),
          })),
      );
      setNome("");
      setRascunho({});
      setMensagem({ tipo: "ok", texto: "Tarefa cadastrada." });
      await carregar();
    } catch (erro) {
      console.error(erro);
      const texto = mensagemDeErro(erro, "Não foi possível cadastrar a tarefa.");
      setMensagem({
        tipo: "erro",
        texto: texto.includes("duplicate") ? "Essa tarefa já existe." : texto,
      });
    } finally {
      setCriando(false);
    }
  }

  async function handleSalvarTempo(
    operacaoId: string,
    costureiraId: string,
    minutos: number,
  ) {
    setMensagem(null);
    try {
      await salvarTempoOperacao({
        operacao_id: operacaoId,
        costureira_id: costureiraId,
        minutos,
      });
      setMensagem({ tipo: "ok", texto: "Tempo médio salvo." });
      await carregar();
    } catch (erro) {
      console.error(erro);
      setMensagem({
        tipo: "erro",
        texto: mensagemDeErro(erro, "Não foi possível salvar o tempo médio."),
      });
    }
  }

  function pedirExclusao(operacao: Operacao) {
    setErroExclusao(null);
    setOperacaoParaExcluir(operacao);
  }

  async function confirmarExclusao() {
    if (!operacaoParaExcluir) return;

    setMensagem(null);
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await excluirOperacao(operacaoParaExcluir.id);
      setOperacaoParaExcluir(null);
      setMensagem({ tipo: "ok", texto: "Tarefa removida." });
      await carregar();
    } catch (erro) {
      console.error(erro);
      setErroExclusao(
        mensagemDeErro(erro, "Não foi possível remover a tarefa."),
      );
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--lagoon-deep)]">
          Confectime
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Cadastre cada operação e o tempo médio que cada costureira leva por
          peça.
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
            <CardTitle>Nova tarefa</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCriar}>
              <div className="grid max-w-md gap-1.5">
                <Label htmlFor="nome-operacao">Nome da operação</Label>
                <Input
                  id="nome-operacao"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="20 - FECHAR LATERAL"
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-[var(--sea-ink-soft)]">
                  Tempo médio por peça de cada costureira (minutos)
                </Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {costureiras.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="w-28 truncate text-sm">{c.nome}</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-28"
                        placeholder="ex.: 1,20"
                        value={rascunho[c.id] ?? ""}
                        onChange={(e) =>
                          setRascunho({ ...rascunho, [c.id]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={criando}>
                <Plus /> {criando ? "Cadastrando..." : "Cadastrar tarefa"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo médio por costureira</CardTitle>
            <CardDescription>
              Altere um valor e clique fora do campo para salvar.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {carregando ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarefa</TableHead>
                    {costureiras.map((c) => (
                      <TableHead key={c.id} className="text-center">
                        {c.nome}
                      </TableHead>
                    ))}
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operacoes.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={costureiras.length + 2}
                        className="text-sm text-[var(--sea-ink-soft)]"
                      >
                        Nenhuma tarefa cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {operacoes.map((operacao) => (
                    <TableRow key={operacao.id}>
                      <TableCell className="font-medium">
                        {operacao.nome}
                      </TableCell>
                      {costureiras.map((c) => {
                        const t = tempoDe(operacao.id, c.id);
                        return (
                          <TableCell key={c.id} className="text-center">
                            <Input
                              key={`${operacao.id}-${c.id}-${t?.minutos_por_peca ?? ""}`}
                              type="number"
                              step="0.01"
                              min="0"
                              className="mx-auto w-24 text-center"
                              defaultValue={
                                t ? Number(t.minutos_por_peca).toFixed(2) : ""
                              }
                              placeholder="—"
                              title={
                                t
                                  ? `${formatarMinutos(Number(t.minutos_por_peca))} por peça`
                                  : ""
                              }
                              onBlur={(e) => {
                                const valor = Number(e.target.value);
                                if (
                                  valor > 0 &&
                                  valor !== Number(t?.minutos_por_peca)
                                ) {
                                  void handleSalvarTempo(
                                    operacao.id,
                                    c.id,
                                    valor,
                                  );
                                }
                              }}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Excluir tarefa ${operacao.nome}`}
                          onClick={() => pedirExclusao(operacao)}
                        >
                          <Trash2 className="text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!operacaoParaExcluir}
        onOpenChange={(open) => {
          if (!open && !excluindo) setOperacaoParaExcluir(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir tarefa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong>{operacaoParaExcluir?.nome}</strong>? Os tempos de todas
              as costureiras nessa tarefa também serão apagados. Essa ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {erroExclusao && (
            <p role="alert" className="text-sm text-red-600">
              {erroExclusao}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOperacaoParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmarExclusao}
              disabled={excluindo}
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
