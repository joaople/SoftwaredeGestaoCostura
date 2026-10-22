import { createFileRoute } from "@tanstack/react-router";
import SignupForm from "../components/SignupForm2";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return <SignupForm />;
}