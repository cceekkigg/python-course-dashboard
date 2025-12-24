import React, { useState } from 'react';
import { User, StudentRecord } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';
import { Lock, Mail, Terminal } from 'lucide-react';

interface LoginViewProps {
  onLogin: (user: User) => void;
  students: StudentRecord[];
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, students }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      // Admin Login
      if (email === 'admin' && (password === 'admin' || password === 'any')) {
        const adminUser = {
          id: 'admin',
          name: 'Course Instructor',
          email: 'admin@pymastery.com',
          role: 'admin',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
          attendance: 0,
          assignmentScores: {}
        };
        onLogin(adminUser as any);
        return;
      }

      // Student Login
      // Check for strict email OR username match
      const student = students.find(s => {
        const username = s.email.split('@')[0];
        // Allow user to login with just username part or full email
        const isUserMatch = s.email === email || username === email;
        const isCredentialMatch = isUserMatch && s.password === password;
        
        return isCredentialMatch;
      });
      
      if (student) {
        onLogin(student);
      } else {
        setError('Invalid credentials.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 mb-4">
            <Terminal className="h-7 w-7 text-blue-600" />
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            PyMastery
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Intro to Python Programming
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="email"
              name="email"
              type="text"
              label="Email or Username"
              placeholder="Enter your student email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-5 w-5" />}
              error={error}
            />
            
            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-5 w-5" />}
            />
          </div>

          <Button type="submit" fullWidth isLoading={isLoading} variant="primary">
            Sign in
          </Button>
        </form>
        
        {/* No more cheat sheet */}
        <div className="mt-4 text-center">
           <p className="text-xs text-slate-400">Default password for new students is <code className="bg-slate-100 px-1 py-0.5 rounded">123456</code></p>
        </div>

      </div>
      
      <p className="mt-8 text-center text-xs text-slate-500">
        &copy; 2025-2026 PyMastery Education.
      </p>
    </div>
  );
};

export default LoginView;