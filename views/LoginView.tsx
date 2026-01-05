// ==============================================================================
// FILE PATH: views/LoginView.tsx
// ==============================================================================

import React, { useState } from 'react';
import { User } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';
import { Lock, Mail, Terminal, Github } from 'lucide-react';
import { supabase } from '../data/supabaseClient';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const logVisit = async (user: User) => {
    try {
      let ip = '0.0.0.0';
      let country = 'Unknown';
      try {
        const res = await fetch('https://api.country.is');
        const data = await res.json();
        ip = data.ip;
        country = data.country;
      } catch (e) {
         const res = await fetch('https://api.ipify.org?format=json');
         const data = await res.json();
         ip = data.ip;
      }
      const { data: existing } = await supabase.from('access_logs').select('login_count, first_login_at').match({ user_id: user.id, ip_address: ip }).maybeSingle();
      const newCount = (existing?.login_count || 0) + 1;
      const firstTime = existing?.first_login_at || new Date().toISOString();
      await supabase.from('access_logs').upsert({
        user_id: user.id,
        user_name: user.name,
        role: user.role,
        ip_address: ip,
        country: country,
        login_count: newCount,
        first_login_at: firstTime,
        last_login_at: new Date().toISOString()
      }, { onConflict: 'user_id, ip_address' });
    } catch (e) { console.warn("Could not log visit:", e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        const input = email.trim();
        const { data: rosterUsers, error: rosterError } = await supabase.from('users').select('*').or(`email.eq.${input},name.ilike.${input},email.ilike.${input}%`).limit(5);
        if (rosterError) throw rosterError;
        const rosterUser = rosterUsers?.find(u => u.email.toLowerCase() === input.toLowerCase() || u.name.toLowerCase() === input.toLowerCase());
        if (!rosterUser) throw new Error("You are not on the class roster.");

        const cleanEmail = rosterUser.email.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase();
        let { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: password });

        if (authError && authError.message.includes("Invalid login")) {
             console.log("User not found in Auth system. Attempting Auto-Registration...");
             const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: cleanEmail, password: password, options: { data: { full_name: rosterUser.name, role: rosterUser.role } } });
             if (signUpError) {
                 if (signUpError.message.includes("already registered")) throw new Error("Incorrect password.");
                 throw signUpError;
             }
             authData = { user: signUpData.user, session: signUpData.session };
        } else if (authError) throw authError;

        if (authData.user && !rosterUser.auth_id) {
            await supabase.from('users').update({ auth_id: authData.user.id }).eq('id', rosterUser.id);
        }

        await logVisit(rosterUser as User);
        onLogin(rosterUser as User);

    } catch (err: any) {
        console.error("Login Error:", err);
        setError(err.message || 'Login failed.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
         <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 mb-4">
                <Terminal className="h-7 w-7 text-blue-600" />
            </div>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">PyPathway</h2>
            <p className="mt-2 text-sm text-slate-600">Intro to Python Programming</p>
         </div>

         <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <Input id="email" label="Username or Email" placeholder="e.g. demo" value={email} onChange={e=>setEmail(e.target.value)} icon={<Mail className="w-5 h-5"/>} required />
            <Input id="password" type="password" label="Password" value={password} onChange={e=>setPassword(e.target.value)} icon={<Lock className="w-5 h-5"/>} required />
            <Button type="submit" fullWidth isLoading={isLoading}>Sign in</Button>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
         </form>

         <div className="mt-4 text-center">
           <p className="text-xs text-slate-400">
             Contact Instructor: <a href="mailto:jdr_maggiea@hotmail.com" className="hover:text-blue-600 hover:underline transition-colors">jdr_maggiea@hotmail.com</a>
           </p>
         </div>
      </div>

      <p className="mt-8 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
        Found a bug or have a suggestion?
        <a href="https://github.com/cceekkigg/python-course-dashboard/issues" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-slate-800 underline transition-colors">
          <Github className="w-3 h-3" /> Report an issue on GitHub
        </a>
      </p>
    </div>
  );
};

export default LoginView;