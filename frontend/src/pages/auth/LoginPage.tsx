import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { validateEmail } from '../../utils/validators';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    const pwdErr = !password ? 'Password is required.' : '';
    setEmailError(emailErr);
    setPasswordError(pwdErr);
    if (emailErr || pwdErr) return;

    try {
      setIsLoading(true);
      const res = await api.post('/auth/login', { email, password });

      if (res.data.success) {
        login(res.data.token, res.data.user);
        toast.success(`Welcome back, ${res.data.user.fullName}!`);

        // Route by role
        switch (res.data.user.userType) {
          case 1:
            navigate('/admin/dashboard');
            break;
          case 2:
            navigate('/qsa/dashboard');
            break;
          case 3:
            navigate('/qa/dashboard');
            break;
          case 4:
            navigate('/consultant/dashboard');
            break;
          default:
            navigate('/customer/dashboard');
            break;
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 mb-2 shadow-2xs">
            <ShieldCheck className="w-8 h-8 text-sky-600" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            PANACEA <span className="text-sky-600">INFOSEC</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">Compliance & Cybersecurity Assessment Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(validateEmail(e.target.value));
                }}
                placeholder="user@endtest-mail.io"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition ${
                  emailError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
            </div>
            {emailError && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {emailError}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-sky-600 hover:text-sky-700 font-semibold underline underline-offset-2">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(e.target.value ? '' : 'Password is required.');
                }}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition ${
                  passwordError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
            </div>
            {passwordError && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {passwordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Panacea Infosec Secure Compliance Portal &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

