import { useState } from "react";
import { Clock, LogOut, TriangleAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  /** "espera" = conta nova sem acesso | "erro" = não deu para verificar */
  tipo: "espera" | "erro";
  email: string | null;
  onVerificar: () => Promise<void>;
};

/** Tela mostrada a quem tem conta mas ainda não foi liberado por um administrador. */
export function AguardandoLiberacao({ tipo, email, onVerificar }: Props) {
  const [verificando, setVerificando] = useState(false);
  const espera = tipo === "espera";

  async function verificar() {
    setVerificando(true);
    try {
      await onVerificar();
    } finally {
      setVerificando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-[var(--hero-a)] text-[var(--lagoon-deep)]">
            {espera ? <Clock className="size-5" /> : <TriangleAlert className="size-5" />}
          </div>
          <CardTitle>
            {espera ? "Acesso não liberado" : "Não foi possível verificar seu acesso"}
          </CardTitle>
          <CardDescription>
            {espera
              ? `Sua conta${email ? ` (${email})` : ""} está sem acesso aos dados da fábrica. Fale com um administrador e depois toque em "Verificar novamente".`
              : "Confira a conexão com a internet e tente novamente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={verificar} disabled={verificando}>
            {verificando ? "Verificando..." : "Verificar novamente"}
          </Button>
          <Button variant="outline" onClick={() => void supabase.auth.signOut()}>
            <LogOut /> Sair
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
