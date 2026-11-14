import { createFileRoute } from "@tanstack/react-router";
import { Activity, Package, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  formatarData,
  hojeISO,
  listarApontamentos,
  listarSessoesPorData,
  paginarConsulta,
} from "@/lib/production";
import {
  CurvaProducao,
  montarPontosRecentes,
  type PontoCurva,
} from "@/components/CurvaProducao";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

type RankingPerson = {
  id: string;
  name: string;
  pieces: number;
  efficiency: number;
};

type DashboardData = {
  costureirasAtivas: number;
  pecasProduzidasDia: number;
  eficienciaMedia: number;
  ranking: RankingPerson[];
  costureiras: { id: string; nome: string }[];
  operacoes: { nome: string; pecas: number; minutos: number }[];
  sessoesSemData: {
    id: string;
    costureira: string;
    operacao: string;
    pecas: number;
    minutos: number;
  }[];
};

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState(hojeISO());

  // Curva de produção: costureira escolhida nas abas e pontos do gráfico
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [curva, setCurva] = useState<PontoCurva[]>([]);
  const [curvaCarregando, setCurvaCarregando] = useState(false);

  // Sem escolha do usuário, mostra a primeira do ranking
  const curvaId =
    selecionadaId ?? data?.ranking[0]?.id ?? data?.costureiras[0]?.id ?? null;
  const costureiraDaCurva = data?.costureiras.find((c) => c.id === curvaId);

  useEffect(() => {
    let cancelado = false;
    carregarDados(dataSelecionada, () => !cancelado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      cancelado = true;
    };
  }, [dataSelecionada]);

  useEffect(() => {
    if (!curvaId) return;
    let cancelado = false;

    async function carregarCurva(id: string) {
      setCurvaCarregando(true);
      try {
        const sessoes = (await listarSessoesPorData(id, dataSelecionada))
          .filter((sessao) => sessao.data !== null)
          .slice(0, 30);
        const apontamentos = await listarApontamentos(sessoes.map((s) => s.id));
        if (!cancelado) setCurva(montarPontosRecentes(sessoes, apontamentos, 24));
      } catch (e) {
        console.error(e);
        if (!cancelado) setCurva([]);
      } finally {
        if (!cancelado) setCurvaCarregando(false);
      }
    }

    carregarCurva(curvaId);
    return () => {
      cancelado = true;
    };
  }, [curvaId, dataSelecionada]);

  async function carregarDados(data: string, estaAtivo = () => true) {
    if (!estaAtivo()) return;
    setLoading(true);
    setErro(null);

    try {
      const [resCostureiras, resSessoesDoDia, sessoesSemData] =
        await Promise.all([
        supabase.from("costureiras").select("id, nome, ativa"),
        supabase
          .from("sessoes_producao")
          .select("id, costureira_id, data, operacao, tempo_padrao")
          .eq("data", data),
        paginarConsulta((inicio, fim) =>
          supabase
            .from("sessoes_producao")
            .select("id, costureira_id, data, operacao, tempo_padrao")
            .is("data", null)
            .order("id", { ascending: true })
            .range(inicio, fim),
        ),
      ]);

      if (resCostureiras.error) throw resCostureiras.error;
      if (resSessoesDoDia.error) throw resSessoesDoDia.error;

      const todasCostureiras = resCostureiras.data ?? [];
      const costureiras = todasCostureiras.filter((c) => c.ativa);
      const sessoesDoDia = resSessoesDoDia.data ?? [];
      const sessoes = [...sessoesDoDia, ...sessoesSemData];

      const apontamentos = await listarApontamentos(sessoes.map((s) => s.id));

      const sessaoPorId = new Map(sessoes.map((s) => [s.id, s]));
      const nomePorCostureira = new Map(
        todasCostureiras.map((costureira) => [costureira.id, costureira.nome]),
      );

      type Acumulado = { pecas: number; padrao: number; gasto: number };
      const porCostureira = new Map<string, Acumulado>();
      const porOperacao = new Map<string, { pecas: number; minutos: number }>();
      let pecasProduzidasDia = 0;
      let totalPadrao = 0;
      let totalGasto = 0;

      for (const ap of apontamentos) {
        const sessao = sessaoPorId.get(ap.sessao_id);
        if (!sessao || sessao.data !== data) continue;

        // minutos que as peças deveriam levar (quantidade x TP)
        const padrao = ap.quantidade * sessao.tempo_padrao;

        const atual = porCostureira.get(sessao.costureira_id) ?? {
          pecas: 0,
          padrao: 0,
          gasto: 0,
        };
        atual.pecas += ap.quantidade;
        atual.padrao += padrao;
        atual.gasto += ap.minutos_gastos;
        porCostureira.set(sessao.costureira_id, atual);

        const operacao = sessao.operacao || "Sem operação";
        const totalOperacao = porOperacao.get(operacao) ?? {
          pecas: 0,
          minutos: 0,
        };
        totalOperacao.pecas += ap.quantidade;
        totalOperacao.minutos += Number(ap.minutos_gastos);
        porOperacao.set(operacao, totalOperacao);

        pecasProduzidasDia += ap.quantidade;
        totalPadrao += padrao;
        totalGasto += Number(ap.minutos_gastos);
      }

      // Eficiência = minutos padrão / minutos gastos (mesma regra da página da costureira)
      const ranking: RankingPerson[] = costureiras
        .map((c) => {
          const acc = porCostureira.get(c.id);
          const eficiencia =
            acc && acc.gasto > 0 ? Math.round((acc.padrao / acc.gasto) * 100) : 0;
          return {
            id: c.id as string,
            name: c.nome as string,
            pieces: acc?.pecas ?? 0,
            efficiency: eficiencia,
          };
        })
        .sort((a, b) => b.pieces - a.pieces)
        .slice(0, 4);

      const eficienciaMedia =
        totalGasto > 0 ? Math.round((totalPadrao / totalGasto) * 1000) / 10 : 0;

      if (!estaAtivo()) return;
      setData({
        costureirasAtivas: costureiras.length,
        pecasProduzidasDia,
        eficienciaMedia,
        ranking,
        costureiras: costureiras
          .map((c) => ({ id: c.id as string, nome: c.nome as string }))
          .sort((a, b) => a.nome.localeCompare(b.nome)),
        operacoes: [...porOperacao.entries()]
          .map(([nome, total]) => ({ nome, ...total }))
          .sort((a, b) => b.pecas - a.pecas),
        sessoesSemData: sessoesSemData.map((sessao) => {
          const linhas = apontamentos.filter(
            (apontamento) => apontamento.sessao_id === sessao.id,
          );
          return {
            id: sessao.id,
            costureira:
              nomePorCostureira.get(sessao.costureira_id) ?? "Costureira",
            operacao: sessao.operacao || "Sem operação",
            pecas: linhas.reduce((total, linha) => total + linha.quantidade, 0),
            minutos: linhas.reduce(
              (total, linha) => total + Number(linha.minutos_gastos),
              0,
            ),
          };
        }),
      });
    } catch (e) {
      console.error(e);
      if (estaAtivo()) {
        setErro("Não foi possível carregar os dados. Tente novamente.");
      }
    } finally {
      if (estaAtivo()) setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
        <p className="text-[var(--sea-ink-soft)]">Carregando painel...</p>
      </main>
    );
  }

  if (erro || !data) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
        <p className="text-red-600">{erro ?? "Erro desconhecido."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--lagoon-deep)]">
          Confectime
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Painel das costureiras
        </h1>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Acompanhe a produção e o desempenho da equipe.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label
          htmlFor="data-dashboard"
          className="text-sm text-[var(--sea-ink-soft)]"
        >
          Data da produção
        </label>
        <Input
          id="data-dashboard"
          type="date"
          value={dataSelecionada}
          onChange={(e) => {
            if (e.target.value) setDataSelecionada(e.target.value);
          }}
          className="w-auto"
        />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Users className="size-5" />}
          label="Costureiras ativas"
          value={String(data.costureirasAtivas)}
          description="Equipe cadastrada"
        />
        <StatCard
          icon={<Package className="size-5" />}
          label="Peças produzidas"
          value={data.pecasProduzidasDia.toLocaleString("pt-BR")}
          description={`Produção em ${formatarData(dataSelecionada)}`}
        />
        <StatCard
          icon={<Activity className="size-5" />}
          label="Eficiência média"
          value={`${data.eficienciaMedia.toLocaleString("pt-BR")}%`}
          description="Tempo padrão em relação ao tempo gasto"
        />
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Ranking de desempenho</CardTitle>
            <CardDescription>
              Produção em {formatarData(dataSelecionada)}.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {data.ranking.length === 0 && (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Nenhuma produção registrada nesta data.
              </p>
            )}

            {data.ranking.map((person, index) => (
              <div key={person.name}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-[var(--hero-a)] text-sm font-bold text-[var(--lagoon-deep)]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{person.name}</p>
                      <p className="text-sm text-[var(--sea-ink-soft)]">
                        {person.pieces} peças produzidas
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={person.efficiency >= 100 ? "default" : "secondary"}
                  >
                    {person.efficiency}% eficiente
                  </Badge>
                </div>

                <Progress value={Math.min(person.efficiency, 100)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Produção por operação</CardTitle>
            <CardDescription>
              Quantidade e tempo gasto em {formatarData(dataSelecionada)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.operacoes.length === 0 ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Nenhuma operação registrada nesta data.
              </p>
            ) : (
              data.operacoes.map((operacao) => (
                <div
                  key={operacao.nome}
                  className="flex flex-wrap justify-between gap-2 border-b border-[var(--line)] pb-2 last:border-0"
                >
                  <span className="font-medium">{operacao.nome}</span>
                  <span className="text-sm text-[var(--sea-ink-soft)]">
                    {operacao.pecas} peças · {operacao.minutos.toFixed(2)} min
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {data.sessoesSemData.length > 0 && (
        <section className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Registros sem data</CardTitle>
              <CardDescription>
                Preservados e não incluídos nos indicadores do dia selecionado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.sessoesSemData.map((sessao) => (
                <div
                  key={sessao.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-[var(--line)] pb-2 last:border-0"
                >
                  <span className="font-medium">
                    {sessao.costureira} · {sessao.operacao}
                  </span>
                  <span className="text-sm text-[var(--sea-ink-soft)]">
                    {sessao.pecas} peças · {sessao.minutos.toFixed(2)} min
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {data.costureiras.length > 0 && (
        <section className="mt-6">
          <Card>
            <CardHeader className="gap-3">
              <CardTitle>
                Curva de produção
                {costureiraDaCurva ? ` — ${costureiraDaCurva.nome}` : ""}
              </CardTitle>
              <CardDescription>
                Eficiência de cada apontamento.
              </CardDescription>
              <div className="flex flex-wrap gap-2">
                {data.costureiras.map((c) => (
                  <Button
                    key={c.id}
                    size="sm"
                    variant={c.id === curvaId ? "default" : "outline"}
                    onClick={() => setSelecionadaId(c.id)}
                  >
                    {c.nome}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              {curvaCarregando ? (
                <div className="h-64 animate-pulse rounded-md bg-[var(--muted)]" />
              ) : curva.length === 0 ? (
                <p className="text-sm text-[var(--sea-ink-soft)]">
                  Sem apontamentos para essa costureira ainda.
                </p>
              ) : (
                <CurvaProducao titulo="" pontos={curva} />
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-[var(--sea-ink-soft)]">
          {icon}
          {label}
        </div>
        <p className="mt-3 text-3xl font-bold">{value}</p>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">{description}</p>
      </CardContent>
    </Card>
  );
}