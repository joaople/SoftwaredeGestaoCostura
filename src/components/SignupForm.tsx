import { useState, type FormEvent } from "react";
import "./SignupForm.css";

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    <circle cx="12" cy="15.5" r="1" fill="currentColor" />
  </svg>
);

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

type SignupFormProps = {
  onSubmit: (data: { email: string; password: string }) => Promise<void> | void;
  onGoToLogin?: () => void;
};

export default function SignupForm({ onSubmit, onGoToLogin }: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 8) return setError("A senha deve ter pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");

    try {
      setLoading(true);
      await onSubmit({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup">
      <div className="signup__container">
        <span className="signup__eyebrow">Seu novo começo</span>
        <h1 className="signup__title">Crie sua conta.</h1>
        <p className="signup__subtitle">Cadastre seu e-mail e escolha uma senha segura.</p>

        <div className="signup__tabs" role="tablist">
          <button type="button" role="tab" aria-selected="false" className="signup__tab" onClick={onGoToLogin}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected="true" className="signup__tab signup__tab--active">
            Cadastrar
          </button>
        </div>

        <form className="signup__form" onSubmit={handleSubmit} noValidate>
          <div className="signup__field">
            <label htmlFor="signup-email">E-mail</label>
            <div className="signup__input">
              <span className="signup__icon"><MailIcon /></span>
              <input
                id="signup-email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="signup__field">
            <label htmlFor="signup-password">Senha</label>
            <div className="signup__input">
              <span className="signup__icon"><LockIcon /></span>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="Pelo menos 8 caracteres"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="signup__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          <div className="signup__field">
            <label htmlFor="signup-confirm">Confirmar senha</label>
            <div className="signup__input">
              <span className="signup__icon"><LockIcon /></span>
              <input
                id="signup-confirm"
                type={showPassword ? "text" : "password"}
                placeholder="Digite a senha novamente"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="signup__error" role="alert">{error}</p>}

          <button type="submit" className="signup__submit" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
            {!loading && <ArrowIcon />}
          </button>
        </form>

        <p className="signup__login">
          Já tem uma conta?{" "}
          <button type="button" className="signup__link" onClick={onGoToLogin}>Entrar</button>
        </p>
        <p className="signup__note">O acesso à produção é exclusivo para a conta autorizada.</p>
      </div>
    </div>
  );
}
