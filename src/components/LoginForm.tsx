import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message);
    }

    setLoading(false);
  };

  return (
    <main className="shell centered">
      <section className="card auth-card">
        <h1>Athrone CRM + Client Portal</h1>
        <p>Login with Supabase Auth.</p>
        <form onSubmit={onSubmit}>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          <button disabled={loading} type="submit">{loading ? 'Signing in...' : 'Sign in'}</button>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
    </main>
  );
}
