import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { signIn, register } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/challenges";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        const u = await signIn(email, password);
        const destination = from !== "/challenges" ? from : (u?.role === "teacher" || u?.role === "admin" ? "/teacher" : "/challenges");
        nav(destination, { replace: true });
      } else {
        await register(email, name, password);
        nav(from, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.fields[0]?.message ?? err.message : "Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
      <Card className="mt-6 p-5">
        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === "register" && <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />}
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
          {mode === "register" && <p className="text-xs text-muted">At least 10 characters, with numbers or symbols as well as letters.</p>}
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          <Button type="submit" loading={busy} className="w-full">
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-muted">
        {mode === "login" ? (
          <>New here? <Link className="text-accent" to="/register">Create an account</Link></>
        ) : (
          <>Already registered? <Link className="text-accent" to="/login">Sign in</Link></>
        )}
      </p>
    </main>
  );
}
