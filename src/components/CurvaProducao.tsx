import { useEffect, useRef, useState } from "react";
import {
  eficienciaSessao,
  formatarData,
  formatarHora,
  type ApontamentoProducao,
  type SessaoProducao,
} from "@/lib/production";

export type PontoCurva = {
  hora: string; // HH:MM:SS (usado para ordenar)
  rotulo?: string; // texto do eixo X; se vazio, usa a hora
  pct: number; // eficiência (%)
  quantidade: number;
  operacao: string;
};

function pontoDoApontamento(
  a: ApontamentoProducao,
  sessao: SessaoProducao,
): PontoCurva {
  return {
    hora: formatarHora(a.hora),
    pct: eficienciaSessao(
      a.quantidade,
      Number(a.minutos_gastos),
      Number(sessao.tempo_padrao),
    ),
    quantidade: a.quantidade,
    operacao: sessao.operacao,
  };
}

/**
 * Pontos dos apontamentos mais recentes (qualquer dia), em ordem cronológica.
 * O rótulo do eixo X é "dd/mm HH:MM".
 */
export function montarPontosRecentes(
  sessoes: SessaoProducao[],
  apontamentos: ApontamentoProducao[],
  limite = 24,
): PontoCurva[] {
  const sessaoPorId = new Map(sessoes.map((s) => [s.id, s]));

  return apontamentos
    .flatMap((a) => {
      const sessao = sessaoPorId.get(a.sessao_id);
      if (!sessao) return [];
      const ponto = pontoDoApontamento(a, sessao);
      return [
        {
          chave: `${sessao.data}${ponto.hora}`,
          ponto: {
            ...ponto,
            rotulo: `${formatarData(sessao.data).slice(0, 5)} ${ponto.hora.slice(0, 5)}`,
          },
        },
      ];
    })
    .sort((a, b) => a.chave.localeCompare(b.chave))
    .slice(-limite)
    .map((x) => x.ponto);
}

const ALTURA = 260;
const PAD_X = 44;
const PAD_TOPO = 38;
const PAD_BASE = 42;
const LARGURA_POR_PONTO = 72;
const PADDING_PAINEL = 32; // p-4 dos dois lados

export function CurvaProducao({
  titulo = "Curva de produção",
  pontos,
}: {
  titulo?: string;
  pontos: PontoCurva[];
}) {
  // Mede a largura disponível para o SVG ocupar tudo sem esticar as letras.
  const ref = useRef<HTMLDivElement>(null);
  const [larguraContainer, setLarguraContainer] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setLarguraContainer(el.clientWidth);
    const observer = new ResizeObserver(() => setLarguraContainer(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const disponivel =
    larguraContainer > 0 ? larguraContainer - PADDING_PAINEL : 720;
  const largura = Math.max(
    disponivel,
    pontos.length * LARGURA_POR_PONTO + PAD_X * 2,
  );
  const areaW = largura - PAD_X * 2;
  const areaH = ALTURA - PAD_TOPO - PAD_BASE;
  const base = PAD_TOPO + areaH;
  const yMax = Math.max(100, ...pontos.map((p) => p.pct));

  const x = (i: number) =>
    pontos.length === 1
      ? PAD_X + areaW / 2
      : PAD_X + (areaW * i) / (pontos.length - 1);
  const y = (valor: number) => PAD_TOPO + areaH - (valor / yMax) * areaH;

  const linha = pontos
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.pct)}`)
    .join(" ");

  return (
    <div ref={ref}>
      {pontos.length > 0 && (
        <div
          className="rounded-xl p-4 shadow-sm"
          style={{ background: "#4472C4" }}
        >
          {titulo && (
            <h3 className="mb-2 text-center text-sm font-bold uppercase tracking-wide text-white">
              {titulo}
            </h3>
          )}

          <div className="overflow-x-auto">
            <svg
              width={largura}
              height={ALTURA}
              viewBox={`0 0 ${largura} ${ALTURA}`}
              role="img"
              aria-label={titulo || "Curva de produção"}
              style={{ display: "block" }}
            >
              {/* eixo X */}
              <line
                x1={PAD_X - 20}
                x2={largura - PAD_X + 20}
                y1={base}
                y2={base}
                stroke="white"
                strokeOpacity={0.6}
              />

              {/* linhas verticais de cada ponto até o eixo */}
              {pontos.map((p, i) => (
                <line
                  key={`v-${i}`}
                  x1={x(i)}
                  x2={x(i)}
                  y1={y(p.pct)}
                  y2={base}
                  stroke="white"
                  strokeOpacity={0.45}
                />
              ))}

              {/* curva */}
              <path
                d={linha}
                fill="none"
                stroke="white"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {pontos.map((p, i) => (
                <g key={`p-${i}`}>
                  <circle cx={x(i)} cy={y(p.pct)} r={3.5} fill="white" />
                  <text
                    x={x(i)}
                    y={y(p.pct) - 11}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={700}
                    fill="white"
                  >
                    {Math.round(p.pct)}%
                  </text>
                  <text
                    x={x(i)}
                    y={base + 22}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill="white"
                    fillOpacity={0.9}
                  >
                    {p.rotulo ?? p.hora}
                  </text>
                  {/* área invisível para o tooltip nativo ao passar o mouse */}
                  <circle cx={x(i)} cy={y(p.pct)} r={14} fill="transparent">
                    <title>
                      {`${p.rotulo ?? p.hora} · ${p.operacao || "Sem operação"}\n${p.quantidade} peças · ${p.pct.toFixed(1)}%`}
                    </title>
                  </circle>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
