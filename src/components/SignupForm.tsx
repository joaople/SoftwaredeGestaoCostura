import { useState, type FormEvent } from "react";
import "./SignupForm.css";

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="m3 7 9 6 9-6"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect
      x="4"
      y="10"
      width="16"
      height="11"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M8 10V7a4 4 0 0 1 8 0v3"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const EyeIcon = ({ show }: { show: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <circle
      cx="12"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    {show && (
      <path
        d="M4 4l16 16"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    )}
  </svg>
);

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    console.log({
      email,
      password,
    });
  }

  return (
    <div className="login">

      <header className="login__header">

        <div className="login__brand">
          <div className="login__logo">
            ✂
          </div>

          <h1>Confect Time</h1>
        </div>

        <span className="login__private">
          🛡 Acesso privado
        </span>

      </header>

      <div className="login__welcome">

        <span className="login__eyebrow">
          BEM-VINDO AO CONFECT TIME
        </span>

        <h2>
          Bom ter você de volta.
        </h2>

        <p>
          Entre na sua conta para continuar.
        </p>

      </div>

      <div className="login__tabs">

        <button className="active">
          Entrar
        </button>

        <button>
          Cadastrar
        </button>

      </div>

      <form onSubmit={handleSubmit}>

        <div className="field">

          <label>E-mail</label>

          <div className="input">

            <MailIcon />

            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

          </div>

        </div>

        <div className="password-header">

          <label>Senha</label>

          <a href="/">
            Esqueci minha senha
          </a>

        </div>

        <div className="input">

          <LockIcon />

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <button
            type="button"
            className="eye-button"
            onClick={() =>
              setShowPassword(!showPassword)
            }
          >
            <EyeIcon show={showPassword} />
          </button>

        </div>

        <button
          type="submit"
          className="login-button"
        >
          Entrar no sistema →
        </button>

      </form>

      <p className="register">

        Ainda não tem uma conta?

        <a href="/">
          Cadastre-se
        </a>

      </p>

      <footer className="footer">
        © 2026 Confect Time
      </footer>

    </div>
  );
}