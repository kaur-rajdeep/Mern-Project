import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  FileSpreadsheet,
  FolderArchive,
  Download,
  Loader2,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface EvidenceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  processId: string;
  serviceId: number;
  customerId?: string;
  processName?: string;
  serviceName?: string;
}

export const EvidenceExportModal: React.FC<EvidenceExportModalProps> = ({
  isOpen,
  onClose,
  processId,
  serviceId,
  customerId,
  processName = 'Compliance Process',
  serviceName = 'Compliance Framework',
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const downloadSteps = [
    { id: 1, label: 'Verifying Security Credentials & Session Authority' },
    { id: 2, label: 'Compiling Master Traceability Matrix (.xlsx)' },
    { id: 3, label: 'Bundling & Compressing Evidence Vault Files (.zip)' },
    { id: 4, label: 'Streaming & Finalizing Package Download' },
  ];

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('Please enter your account password to authorize download.');
      return;
    }

    setErrorMessage(null);
    setIsDownloading(true);
    setCurrentStep(1);
    setStatusMessage('Authenticating security authorization...');

    // Simulate multi-stage visual loader progress while request processes
    const stepTimer1 = setTimeout(() => {
      setCurrentStep(2);
      setStatusMessage('Querying compliance requirements & building styled Excel matrix...');
    }, 900);

    const stepTimer2 = setTimeout(() => {
      setCurrentStep(3);
      setStatusMessage('Collecting evidence documents, assessor workpapers & packing zip archive...');
    }, 2200);

    try {
      const token = localStorage.getItem('panacea_token');
      const apiBase = import.meta.env.VITE_API_URL || '/api';

      const response = await axios.post(
        `${apiBase}/compliance/export-package`,
        {
          processId,
          serviceId,
          customerId,
          password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          responseType: 'blob', // Required for binary zip download
        }
      );

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setCurrentStep(4);
      setStatusMessage('Download ready! Transferring file package...');

      // Extract filename from Content-Disposition header if available
      let filename = `Panacea_Evidence_Package_${serviceName.replace(/\s+/g, '_')}.zip`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Create download blob URL and trigger browser download
      const blob = new Blob([response.data], { type: 'application/zip' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Evidence package downloaded successfully.');
      setTimeout(() => {
        setIsDownloading(false);
        setPassword('');
        setCurrentStep(0);
        onClose();
      }, 1200);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsDownloading(false);
      setCurrentStep(0);

      // Handle blob error response (convert blob back to json text)
      if (err.response?.data instanceof Blob) {
        try {
          const errorText = await err.response.data.text();
          const parsed = JSON.parse(errorText);
          setErrorMessage(parsed.message || 'Export failed. Please verify your password.');
          toast.error(parsed.message || 'Authentication failed.');
        } catch {
          setErrorMessage('Export authorization failed. Please check your password.');
          toast.error('Export authorization failed.');
        }
      } else {
        const msg = err.response?.data?.message || err.message || 'Failed to download evidence package.';
        setErrorMessage(msg);
        toast.error(msg);
      }
    }
  };

  const handleClose = () => {
    if (isDownloading) return;
    setPassword('');
    setErrorMessage(null);
    setCurrentStep(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-panacea-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-panacea-500/20 border border-panacea-400/30 flex items-center justify-center text-panacea-300">
                <FolderArchive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Export Complete Evidence Package</h3>
                <p className="text-xs text-slate-300">Confidential Audit Vault Package (.ZIP)</p>
              </div>
            </div>
            {!isDownloading && (
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Target Metadata Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-900 block">{processName}</span>
              <span className="text-panacea-700 font-medium">{serviceName}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Audit Vault Export
            </div>
          </div>

          {/* Package Contents Breakdown */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">Master Excel Matrix</p>
                <p className="text-blue-700/80 text-[11px]">Formatted controls, statuses, notes & hashes</p>
              </div>
            </div>
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-2.5">
              <FileCheck className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-indigo-900">Evidence Documents</p>
                <p className="text-indigo-700/80 text-[11px]">All uploaded customer & assessor artifacts</p>
              </div>
            </div>
          </div>

          {/* Stepped Status Loader when Downloading */}
          {isDownloading ? (
            <div className="space-y-4 py-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-panacea-600 animate-spin" />
                  {statusMessage}
                </span>
                <span className="text-panacea-700 font-bold">{Math.round((currentStep / 4) * 100)}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-panacea-600 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>

              {/* Stepper items */}
              <div className="space-y-2 pt-1">
                {downloadSteps.map((step) => {
                  const isDone = currentStep > step.id;
                  const isCurrent = currentStep === step.id;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-2.5 text-xs transition-all ${
                        isDone
                          ? 'text-emerald-700 font-medium'
                          : isCurrent
                          ? 'text-panacea-700 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2 border-panacea-600 border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleDownload} className="space-y-4">
              {/* Security Warning Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Security Confirmation Required</p>
                  <p className="text-amber-800 text-[11px]">
                    This export contains sensitive audit evidence. Per security policy, please confirm your current login password. This action will be logged in the permanent audit trail.
                  </p>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Confirm Your Account Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter your current password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-panacea-500 focus:border-panacea-500 focus:bg-white transition"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message Display */}
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!password.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-panacea-600 hover:bg-panacea-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-panacea-500/20 transition"
                >
                  <Download className="w-4 h-4" />
                  Authorize & Download (.ZIP)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
