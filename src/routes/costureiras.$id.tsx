import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  criarApontamento,
  criarSessao,
  diferencaMinutos,
  eficienciaSessao,
  excluirApontamento,
  excluirSessao,
  formatarData,
  formatarHora,
  formatarMinutos,
  hojeISO,
  listarApontamentos,
  listarSessoes,
  metaSessao,
  type ApontamentoProducao,
  type SessaoProducao,
} from "@/lib/production";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/costureiras/$id")({
  component: PerfilCostureira,
});

type Costureira = {
  id: string;
  nome: string;
  funcao: string;
  turno: string;
};

function PerfilCostureira() {
  const { id } = Route.useParams();

  const [costureira, setCostureira] = useState<Costureira | null>(null);
  const [sessoes, setSessoes] = useState<SessaoProducao[]>([]);
  const [apontamentos, setApontamentos] = useState<ApontamentoProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [sessaoAberta, setSessaoAberta] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function mostrarAviso(mensagem: string) {
    setAviso(mensagem);
    setTimeout(() => setAviso((atual) => (atual === mensagem ? null : atual)), 3000);
  }

  async function carregarDados() {
    setLoading(true);
    setErro(null);
    setNaoEncontrada(false);

    try {
      const { data: pessoa, error: erroPessoa } = await supabase
        .from("costureiras")
        .select("id, nome, funcao, turno")
        .eq("id", id)
        .maybeSingle();

      if (erroPessoa) throw erroPessoa;

      if (!pessoa) {
        setNaoEncontrada(true);
        setCostureira(null);
        return;
      }

      setCostureira(pessoa);

      const listaSessoes = await listarSessoes(id);
      setSessoes(listaSessoes);

      const listaApontamentos = await listarApontamentos(
        listaSessoes.map((s) => s.id),
      );
      setApontamentos(listaApontamentos);
    } catch (e: any) {
      console.error(e);
      setErro("Não foi possível carregar os dados desta costureira.");
    } finally {
      setLoading(false);
    }
  }

  const apontamentosPorSessao = useMemo(() => {
    const mapa = new Map<string, ApontamentoProducao[]>();
    for (const a of apontamentos) {
      const lista = mapa.get(a.sessao_id) ?? [];
      lista.push(a);
      mapa.set(a.sessao_id, lista);
    }
    return mapa;
  }, [apontamentos]);

  const agrupadoPorData = useMemo(() => {
    const mapa = new Map<string, SessaoProducao[]>();
    for (const s of sessoes) {
      const lista = mapa.get(s.data) ?? [];
      lista.push(s);
      mapa.set(s.data, lista);
    }
    return [...mapa.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [sessoes]);

  const totais = useMemo(() => {
    let quantidade = 0;
    let minutos = 0;
    let esperado = 0;

    for (const s of sessoes) {
      for (const a of apontamentosPorSessao.get(s.id) ?? []) {
        quantidade += a.quantidade;
        minutos += Number(a.minutos_gastos);
        esperado += metaSessao(Number(a.minutos_gastos), Number(s.tempo_padrao));
      }
    }

    return {
      quantidade,
      minutos,
      eficiencia: esperado > 0 ? (quantidade / esperado) * 100 : 0,
    };
  }, [sessoes, apontamentosPorSessao]);

  async function handleCriarSessao(payload: {
    data: string;
    sequencia: number;
    hora_inicio: string;
    operacao: string;
    tempo_padrao: number;
  }) {
    try {
      await criarSessao({ ...payload, costureira_id: id });
      mostrarAviso("Sessão criada");
      await carregarDados();
    } catch (e: any) {
      mostrarAviso(`Erro ao criar sessão: ${e?.message ?? "tente novamente"}`);
    }
  }

  async function handleExcluirSessao(sessaoId: string) {
    try {
      await excluirSessao(sessaoId);
      mostrarAviso("Sessão removida");
      await carregarDados();
    } catch (e: any) {
      mostrarAviso(`Erro ao remover sessão: ${e?.message ?? "tente novamente"}`);
    }
  }

  async function handleExcluirApontamento(apontamentoId: string) {
    try {
      await excluirApontamento(apontamentoId);
      mostrarAviso("Apontamento removido");
      await carregarDados();
    } catch (e: any) {
      mostrarAviso(`Erro ao remover apontamento: ${e?.message ?? "tente novamente"}`);
    }
  }

  async function handleCriarApontamento(
    sessao: SessaoProducao,
    quantidade: number,
    hora: string,
  ) {
    const rows = apontamentosPorSessao.get(sessao.id) ?? [];
    const anterior = rows.at(-1)?.hora ?? sessao.hora_inicio;
    const minutos = diferencaMinutos(anterior, hora);

    if (minutos <= 0) {
      mostrarAviso(
        "A hora do apontamento deve ser depois do início da sessão ou do apontamento anterior.",
      );
      return;
    }

    try {
      await criarApontamento({
        sessao_id: sessao.id,
        quantidade,
        hora,
        minutos_gastos: minutos,
      });
      mostrarAviso("Apontamento registrado");
      setSessaoAberta(null);
      await carregarDados();
    } catch (e: any) {
      mostrarAviso(`Erro ao registrar: ${e?.message ?? "tente novamente"}`);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-5 py-10 text-slate-900">
        <p className="text-sm text-slate-500">Carregando...</p>
      </main>
    );
  }

  if (naoEncontrada) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-5 py-10 text-slate-900">
        <h1 className="text-xl font-semibold">Costureira não encontrada</h1>
        <Link to="/costureiras" className="text-sm text-emerald-600 underline">
          Voltar para Costureiras
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10 text-slate-900">
      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}
      {aviso && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {aviso}
        </div>
      )}

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            {costureira?.nome}
          </h1>
          <p className="text-sm text-slate-500">
            {costureira?.funcao} · {costureira?.turno}
          </p>
        </div>

        <div className="flex gap-6 text-right">
          <div>
            <p className="text-xs uppercase text-slate-500">Peças</p>
            <p className="text-2xl font-semibold tabular-nums">
              {totais.quantidade}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Tempo</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatarMinutos(totais.minutos)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Eficiência</p>
            <p className="text-2xl font-semibold tabular-nums">
              {totais.eficiencia.toFixed(1)}%
            </p>
          </div>
        </div>
      </header>

      <NovaSessaoForm
        onSubmit={handleCriarSessao}
        proximaSequencia={
          sessoes.filter((s) => s.data === hojeISO()).length + 1
        }
      />

      <div className="mt-6 space-y-6">
        {sessoes.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhuma sessão registrada para esta costureira.
          </p>
        )}

        {agrupadoPorData.map(([data, sessoesDoDia]) => (
          <section key={data} className="space-y-4">
            <h2 className="text-sm font-semibold uppercase text-slate-500">
              {formatarData(data)}
            </h2>

            {sessoesDoDia.map((sessao) => {
              const linhas = apontamentosPorSessao.get(sessao.id) ?? [];
              const quantidade = linhas.reduce((a, r) => a + r.quantidade, 0);
              const minutos = linhas.reduce(
                (a, r) => a + Number(r.minutos_gastos),
                0,
              );
              const eficiencia = eficienciaSessao(
                quantidade,
                minutos,
                Number(sessao.tempo_padrao),
              );

              return (
                <Card key={sessao.id}>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {sessao.sequencia}ª sessão ·{" "}
                        {sessao.operacao || "Sem operação"}
                      </CardTitle>
                      <p className="text-xs text-slate-500">
                        Início {formatarHora(sessao.hora_inicio)} · TP{" "}
                        {Number(sessao.tempo_padrao).toFixed(2)} min/peça
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={eficiencia >= 100 ? "default" : "secondary"}>
                        {eficiencia.toFixed(1)}% · {quantidade} pçs
                      </Badge>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Excluir sessão"
                        onClick={() => handleExcluirSessao(sessao.id)}
                      >
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Qtd. produzida</TableHead>
                            <TableHead>Hora</TableHead>
                            <TableHead>Tempo gasto</TableHead>
                            <TableHead className="text-right">Meta</TableHead>
                            <TableHead className="text-right">%</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {linhas.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="text-sm text-slate-500"
                              >
                                Sem apontamentos nesta sessão.
                              </TableCell>
                            </TableRow>
                          )}
                          {linhas.map((r) => {
                            const meta = metaSessao(
                              Number(r.minutos_gastos),
                              Number(sessao.tempo_padrao),
                            );
                            const pct = eficienciaSessao(
                              r.quantidade,
                              Number(r.minutos_gastos),
                              Number(sessao.tempo_padrao),
                            );
                            return (
                              <TableRow key={r.id}>
                                <TableCell className="tabular-nums">
                                  {r.quantidade}
                                </TableCell>
                                <TableCell className="tabular-nums">
                                  {formatarHora(r.hora)}
                                </TableCell>
                                <TableCell className="tabular-nums">
                                  {formatarMinutos(Number(r.minutos_gastos))}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {meta.toFixed(1)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  <span
                                    className={
                                      pct >= 100
                                        ? "font-semibold text-emerald-600"
                                        : ""
                                    }
                                  >
                                    {pct.toFixed(1)}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="Excluir apontamento"
                                    onClick={() => handleExcluirApontamento(r.id)}
                                  >
                                    <Trash2 className="size-4 text-red-600" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {sessaoAberta === sessao.id ? (
                      <NovoApontamentoForm
                        onCancel={() => setSessaoAberta(null)}
                        onSubmit={(v) =>
                          handleCriarApontamento(sessao, v.quantidade, v.hora)
                        }
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSessaoAberta(sessao.id)}
                      >
                        <Plus className="mr-1 size-4" /> Apontar produção
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}

function NovaSessaoForm({
  onSubmit,
  proximaSequencia,
}: {
  onSubmit: (v: {
    data: string;
    sequencia: number;
    hora_inicio: string;
    operacao: string;
    tempo_padrao: number;
  }) => void;
  proximaSequencia: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hojeISO());
  const [inicio, setInicio] = useState("07:30");
  const [operacao, setOperacao] = useState("");
  const [tp, setTp] = useState("1.00");

  if (!aberto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Plus className="mr-1 size-4" /> Nova sessão
      </Button>
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      data,
      sequencia: proximaSequencia,
      hora_inicio: inicio,
      operacao,
      tempo_padrao: Number(tp) || 1,
    });
    setAberto(false);
    setOperacao("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-3"
    >
      <Campo label="Data">
        <Input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </Campo>
      <Campo label="Início">
        <Input
          type="time"
          step={1}
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          required
        />
      </Campo>
      <Campo label="Operação">
        <Input
          value={operacao}
          onChange={(e) => setOperacao(e.target.value)}
          placeholder="20 - FECHAR LATERAL"
          required
        />
      </Campo>
      <Campo label="TP (min/peça)">
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={tp}
          onChange={(e) => setTp(e.target.value)}
          required
        />
      </Campo>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Criar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setAberto(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function NovoApontamentoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (v: { quantidade: number; hora: string }) => void;
  onCancel: () => void;
}) {
  const [quantidade, setQuantidade] = useState("");
  const [hora, setHora] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      quantidade: Number(quantidade) || 0,
      hora: hora || "00:00",
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 p-3"
    >
      <Campo label="Qtd. produzida">
        <Input
          type="number"
          min="0"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          required
        />
      </Campo>
      <Campo label="Hora do apontamento">
        <Input
          type="time"
          step={1}
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          required
        />
      </Campo>
      <p className="w-full text-xs text-slate-500">
        O tempo gasto é calculado automaticamente: hora do apontamento menos o
        início da sessão (ou o apontamento anterior).
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="w-40">{children}</div>
    </div>
  );
}
