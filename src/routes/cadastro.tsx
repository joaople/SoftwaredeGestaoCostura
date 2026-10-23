import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SignupForm from "../components/SignupForm";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/cadastro")({
  component: CadastroPage,
});

function CadastroPage() {
  const navigate = useNavigate();

  async function handleSignup({ email, password }: { email: string; password: string }) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);

    // Ajuste o destino conforme as rotas do seu projeto
    navigate({ to: "/" });
  }

  return (
    <SignupForm
      onSubmit={handleSignup}
      o// TODO: trocar para "/login" quando a tela de login for mesclada
onGoToLogin={() => navigate({ to: "/" })}
    />
  );
}
