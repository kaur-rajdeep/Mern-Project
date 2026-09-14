import React, { useState } from 'react';
import { ShieldCheck, Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import { validateEmail } from '../../utils/validators';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    try {
      setIsLoading(true);
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setIsSuccess(true);
        toast.success('Password reset instructions sent!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 mb-2 shadow-2xs">
            <ShieldCheck className="w-8 h-8 text-sky-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Reset Password</h2>
          <p className="text-xs text-slate-500 font-medium">
            Enter your registered email to receive a temporary recovery password.
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-sky-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">Check Your Email</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              We have generated a temporary password and sent it to <strong>{email}</strong>.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center space-x-2 text-xs font-bold text-sky-600 hover:text-sky-700 underline underline-offset-2"
            >
              <ArrowLeft className="w-4 h-4 text-sky-600" />
              <span>Back to Login</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                  placeholder="your.name@company.com"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Generating...</span>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span>Send Recovery Password</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-sky-600 font-semibold transition"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-current" />
                <span>Return to login</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
