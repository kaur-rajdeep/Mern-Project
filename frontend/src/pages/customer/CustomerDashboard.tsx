import React, { useEffect, useState } from 'react';
import { ArrowRight, Layers, Activity, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';

export const CustomerDashboard: React.FC = () => {
  const [processes, setProcesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/customer/dashboard')
      .then((res) => setProcesses(res.data.processes))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load processes.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Customer Audit Workspace
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Select an active audit process to upload evidence, converse with assessors, or inspect
            framework progress.
          </p>
        </div>
        {!isLoading && processes.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">
              {processes.length} active process{processes.length > 1 ? 'es' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Process Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          // Skeleton loaders
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 mb-4" />
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-6" />
              <div className="h-px bg-slate-100 mb-4" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))
        ) : processes.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Layers className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium text-sm">No active audit processes configured.</p>
            <p className="text-slate-300 text-xs">Contact your administrator to get started.</p>
          </div>
        ) : (
          processes.map((p) => (
            <Link
              key={p._id}
              to={`/customer/processes/${p._id}`}
              className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-sky-300 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Subtle gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-panacea-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-t-2xl" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 group-hover:bg-sky-100 transition-colors">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                    <Activity className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                      Active
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                    {p.processName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Audit Scope &amp; Environment
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-600 group-hover:text-sky-700 transition-colors">
                  View Assigned Frameworks
                </span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-600 transition-colors duration-200">
                  <ArrowRight className="w-3.5 h-3.5 text-sky-600 group-hover:text-white transition-colors duration-200 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};
