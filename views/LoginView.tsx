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

  // Helper to log the visit
  const logVisit = async (user: User) => {
    try {
      // 1. Get IP Address (using a public API)
      const res = await fetch('https://api.ipify.org?format=json');
      const { ip } = await res.json();

      // 2. Insert into Supabase
      await supabase.from('access_logs').insert({
        user_id: user.id,
        user_name: user.name,
        role: user.role,
        ip_address: ip,
        login_time: new Date().toISOString()
      });
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

        // 1. Fetch User from your custom table
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${input},name.ilike.${input},email.ilike.${input}%`)
            .limit(1);

        if (error) throw error;

        const foundUser = data && data.length > 0 ? data[0] : null;

        if (foundUser && foundUser.password === password) {
            console.log("✅ App Login Success");

            // 2. SECURE HANDSHAKE
            // If user is Admin, sign them into Supabase Auth to get the storage token.
            if (foundUser.role === 'admin') {
                const { error: authError } = await supabase.auth.signInWithPassword({
                    email: foundUser.email,
                    password: password
                });

                if (authError) {
                    console.warn("⚠️ Admin matched in DB but Supabase Auth failed:", authError.message);
                    // We don't block login here, but uploads might fail if Auth is missing.
                } else {
                    console.log("🔐 Secure Admin Session Established");
                }
            } else {
                // For Students/Guests, ensure no stale Admin token exists
                await supabase.auth.signOut();
            }

            // 3. Log Visit & Proceed
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

  // Return JSX
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