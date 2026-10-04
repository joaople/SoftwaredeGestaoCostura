import { createFileRoute } from "@tanstack/react-router";
import { Activity, Package, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { hojeISO, listarApontamentos, listarSessoes } from "@/lib/production";
import {
  CurvaProducao,
  montarPontosRecentes,
  type PontoCurva,
} from "@/components/CurvaProducao";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
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
  pecasProduzidasMes: number;
  eficienciaMedia: number;
  ranking: RankingPerson[];
  costureiras: { id: string; nome: string }[];
};

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Curva de produção: costureira escolhida nas abas e pontos do gráfico
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [curva, setCurva] = useState<PontoCurva[]>([]);
  const [curvaCarregando, setCurvaCarregando] = useState(false);

  // Sem escolha do usuário, mostra a primeira do ranking
  const curvaId =
    selecionadaId ?? data?.ranking[0]?.id ?? data?.costureiras[0]?.id ?? null;
  const costureiraDaCurva = data?.costureiras.find((c) => c.id === curvaId);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (!curvaId) return;
    let cancelado = false;

    async function carregarCurva(id: string) {
      setCurvaCarregando(true);
      try {
        // Só as sessões mais recentes: evita pedir milhares de ids de uma vez
        const sessoes = (await listarSessoes(id)).slice(0, 30);
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
  }, [curvaId]);

  async function carregarDados() {
    setLoading(true);
    setErro(null);

    try {
      // Data local (não UTC), no formato YYYY-MM-DD
      const dataHoje = hojeISO();
      const inicioDoMes = `${dataHoje.slice(0, 8)}01`;

      // As duas consultas independentes rodam ao mesmo tempo
      const [resCostureiras, resSessoes] = await Promise.all([
        supabase.from("costureiras").select("id, nome").eq("ativa", true),
        supabase
          .from("sessoes_producao")
          .select("id, costureira_id, data, tempo_padrao")
          .gte("data", inicioDoMes),
      ]);

      if (resCostureiras.error) throw resCostureiras.error;
      if (resSessoes.error) throw resSessoes.error;

      const costureiras = resCostureiras.data ?? [];
      const sessoes = resSessoes.data ?? [];

      // Depende das sessões, por isso vem depois
      const apontamentos = await listarApontamentos(sessoes.map((s) => s.id));

      const sessaoPorId = new Map(sessoes.map((s) => [s.id, s]));

      type Acumulado = { pecas: number; padrao: number; gasto: number };
      const porCostureira = new Map<string, Acumulado>();
      let pecasProduzidasMes = 0;
      let totalPadrao = 0;
      let totalGasto = 0;

      for (const ap of apontamentos) {
        const sessao = sessaoPorId.get(ap.sessao_id);
        if (!sessao) continue;

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

        pecasProduzidasMes += ap.quantidade;
        totalPadrao += padrao;
        totalGasto += ap.minutos_gastos;
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

      setData({
        costureirasAtivas: costureiras.length,
        pecasProduzidasMes,
        eficienciaMedia,
        ranking,
        costureiras: costureiras
          .map((c) => ({ id: c.id as string, nome: c.nome as string }))
          .sort((a, b) => a.nome.localeCompare(b.nome)),
      });
    } catch (e) {
      console.error(e);
      setErro("Não foi possível carregar os dados. Tente novamente.");
    } finally {
      setLoading(false);
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
          CosturaFlow
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Painel das costureiras
        </h1>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Acompanhe a produção e o desempenho da equipe.
        </p>
      </header>

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
          value={data.pecasProduzidasMes.toLocaleString("pt-BR")}
          description="Produção do mês"
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
              Produção acumulada da equipe neste mês.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {data.ranking.length === 0 && (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Nenhuma produção registrada este mês ainda.
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

      {data.costureiras.length > 0 && (
        <section className="mt-6">
          <Card>
            <CardHeader className="gap-3">
              <CardTitle>
                Curva de produção
                {costureiraDaCurva ? ` — ${costureiraDaCurva.nome}` : ""}
              </CardTitle>
              <CardDescription>
                Eficiência de cada apontamento (últimos 24).
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