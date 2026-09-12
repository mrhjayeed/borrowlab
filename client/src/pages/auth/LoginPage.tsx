import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Cpu, Mail, Lock, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, switchPersona } = useAuth();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      success('Logged in successfully');
      navigate('/dashboard');
    } catch (err: any) {
      error(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (userId: number, name: string) => {
    setIsLoading(true);
    try {
      await switchPersona(userId);
      success(`Signed in as ${name}`);
      navigate('/dashboard');
    } catch (err: any) {
      error(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center mx-auto shadow-level-2">
            <Cpu className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to BorrowLab
          </h2>
          <p className="text-xs text-slate-500">
            United International University Academic Hardware Network
          </p>
        </div>

        <Card className="p-6 space-y-6 shadow-level-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="University Email"
              type="email"
              placeholder="e.g. 011191001@uiu.ac.bd"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          {/* Development Environment Only — Test Credentials Quick Fill */}
          {import.meta.env.DEV && (
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
                  Dev Environment Quick-Fill
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Local Dev Only
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin(3, 'Tanzim (Student)')}
                  className="p-2 rounded border border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 text-left transition-colors"
                >
                  <div className="font-semibold text-xs text-slate-900">Tanzim</div>
                  <div className="text-[10px] text-slate-500 font-mono">Student</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin(2, 'Sarah (Moderator)')}
                  className="p-2 rounded border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 text-left transition-colors"
                >
                  <div className="font-semibold text-xs text-slate-900">Sarah</div>
                  <div className="text-[10px] text-amber-700 font-mono">Moderator</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin(1, 'Dr. Farhan (Admin)')}
                  className="p-2 rounded border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-colors"
                >
                  <div className="font-semibold text-xs text-slate-900">Dr. Farhan</div>
                  <div className="text-[10px] text-indigo-700 font-mono">Admin</div>
                </button>
              </div>
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-slate-500">
          New to BorrowLab?{' '}
          <Link to="/register" className="font-semibold text-[#4F46E5] hover:underline">
            Register with your university ID
          </Link>
        </p>
      </div>
    </div>
  );
};
