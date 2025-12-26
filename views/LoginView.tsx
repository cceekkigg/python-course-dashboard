// FILE: src/views/LoginView.tsx

import React, { useState } from 'react';
import { User } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';
import { Lock, Mail, Terminal } from 'lucide-react';
import { supabase } from '../data/supabaseClient';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper to log the visit (Optimized for Free Tier limits)
  const logVisit = async (user: User) => {
    try {
      // 1. Get IP Address
      const res = await fetch('https://api.ipify.org?format=json');
      const { ip } = await res.json();

      // 2. Efficient Upsert: Update existing row if user+ip matches, otherwise insert.
      // This prevents database bloat by aggregating logins from the same IP.
      const { data: existing } = await supabase
        .from('access_logs')
        .select('login_count, first_login_at')
        .match({ user_id: user.id, ip_address: ip })
        .maybeSingle();

      const newCount = (existing?.login_count || 0) + 1;
      const firstTime = existing?.first_login_at || new Date().toISOString();

      await supabase.from('access_logs').upsert({
        user_id: user.id,
        user_name: user.name,
        role: user.role,
        ip_address: ip,
        login_count: newCount,
        first_login_at: firstTime,
        last_login_at: new Date().toISOString()
      }, { onConflict: 'user_id, ip_address' });

    } catch (e) {
      console.warn("Could not log visit:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const input = email.trim().toLowerCase();

        // 1. Fetch User from Custom DB
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${input},name.ilike.${input},email.ilike.${input}%`)
            .limit(5);

        if (error) throw error;

        const foundUser = data?.find(u => u.password === password);

        if (foundUser && foundUser.password === password) {
            console.log("✅ App Login Success");

            // 2. FORCE SIGN OUT (Clear any stale sessions for 'Cover Login')
            await supabase.auth.signOut();

            // 3. SECURE HANDSHAKE (Admin Only)
            if (foundUser.role === 'admin') {
                const { error: authError } = await supabase.auth.signInWithPassword({
                    email: foundUser.email,
                    password: password
                });

                if (authError) {
                    console.warn("⚠️ Admin matched in DB but Supabase Auth failed:", authError.message);
                } else {
                    console.log("🔐 Secure Admin Session Established");
                }
            }

            // 4. Log Visit & Proceed
            await logVisit(foundUser as User);
            onLogin(foundUser as User);

        } else {
            setError('Invalid credentials.');
            setIsLoading(false);
        }

    } catch (err) {
        console.error("Login Error:", err);
        setError('Connection failed. Please try again.');
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
            <Input
              id="email"
              label="Username or Email"
              placeholder="e.g. demo"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              icon={<Mail className="w-5 h-5"/>}
              required
            />
            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              icon={<Lock className="w-5 h-5"/>}
              required
            />
            <Button type="submit" fullWidth isLoading={isLoading}>Sign in</Button>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
         </form>

         <div className="mt-4 text-center">
           <p className="text-xs text-slate-400">Initial password for enrolled students is email address</p>
           <p className="text-xs text-slate-400">Default password for demo is demo</p>
         </div>
      </div>

      <p className="mt-8 text-center text-xs text-slate-500">
        Contact:{" "}
        <a
          href="mailto:jdr_maggiea@hotmail.com"
          className="hover:text-slate-700 underline"
        >
          jdr_maggiea@hotmail.com
        </a>
      </p>
    </div>
  );
};

export default LoginView;