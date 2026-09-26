import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowUpRight, CheckCircle2, Package, Users,} from "lucide-react";
import { useEffect, useState } from "react";
import { obterPainel, type DashboardData } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    setErro(null);

    try {
      setData(await obterPainel());
    } catch (e) {
      console.error(e);
      setErro("Não foi possível carregar os dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl bg-slate-50 px-5 py-10 text-slate-900">
        <p className="text-slate-500">Carregando painel...</p>
      </main>
    );
  }

  if (erro || !data) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl bg-slate-50 px-5 py-10 text-slate-900">
        <p className="text-red-600">{erro ?? "Erro desconhecido."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-slate-50 px-5 py-10 text-slate-900">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-600">
          CosturaFlow
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Painel das costureiras
        </h1>
        <p className="mt-2 text-slate-500">
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
          description="Produzido em relação à meta"
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Ranking de desempenho</CardTitle>
            <CardDescription>
              Produção acumulada da equipe neste mês.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {data.ranking.length === 0 && (
              <p className="text-sm text-slate-500">
                Nenhuma produção registrada este mês ainda.
              </p>
            )}

            {data.ranking.map((person, index) => (
              <div key={person.name}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{person.name}</p>
                      <p className="text-sm text-slate-500">
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumo de hoje</CardTitle>
            <CardDescription>Atualizado agora</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-emerald-900">
                  Meta do dia
                </p>
                <CheckCircle2 className="size-5 text-emerald-600" />
              </div>
              <p className="mt-2 text-3xl font-bold text-emerald-900">
                {data.metaHojePercentual}%
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                {data.pecasHoje} de {data.metaHojeTotal} peças
              </p>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-semibold">Ver costureiras</p>
                <p className="text-sm text-slate-500">
                  Gerencie a equipe e a produção.
                </p>
              </div>
              <ArrowUpRight className="size-5 text-slate-500" />
            </div>
          </CardContent>
        </Card>
      </section>
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
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {icon}
          {label}
        </div>
        <p className="mt-3 text-3xl font-bold">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}