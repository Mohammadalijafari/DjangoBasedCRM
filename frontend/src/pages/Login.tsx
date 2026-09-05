import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Login.module.css";
import { useAuth } from "../auth/AuthContext";
import { Button, ErrorText, Field, Input } from "../components/ui";
import { apiErrorMessage } from "../api/client";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const dest = (location.state as { from?: string })?.from ?? "/deals";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err) || "Check your email and password and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.mark}>Ledger</div>
        <p className={styles.tagline}>Sign in to your sales register</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label="Email">
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
