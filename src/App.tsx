import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { LoginForm } from './components/LoginForm';
import { supabase } from './lib/supabase';
import { authDb } from './lib/db';
import { AdminDashboard } from './pages/AdminDashboard';
import { ClientPortal } from './pages/ClientPortal';
import { Profile } from './types';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user.id) {
        setProfile(null);
        return;
      }

      const { data } = await authDb.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data as Profile);
    };
    loadProfile();
  }, [session?.user.id]);

  if (!session) {
    return <LoginForm />;
  }

  if (!profile) {
    return <main className="shell centered"><p>Loading profile...</p></main>;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <strong>{profile.full_name}</strong> <span className="muted">({profile.role})</span>
        </div>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      {profile.role === 'admin' ? <AdminDashboard profileId={profile.id} /> : <ClientPortal profileId={profile.id} />}
    </>
  );
}
