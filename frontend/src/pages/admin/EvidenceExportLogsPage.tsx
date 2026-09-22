import React, { useEffect, useState } from 'react';
import {
  FolderLock,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  User,
  Building2,
  FileCheck2,
  Globe,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

export const EvidenceExportLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/compliance/export-logs');
      if (res.data.success) {
        setLogs(res.data.logs || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch export audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getRoleBadge = (role: number) => {
    switch (role) {
      case 1:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Admin</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">QSA Auditor</span>;
      case 3:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">QA Reviewer</span>;
      case 4:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">Consultant</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">User</span>;
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.processTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ipAddress || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isSuccess = log.status === 'SUCCESS';
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'SUCCESS' && isSuccess) ||
      (statusFilter === 'FAILED' && !isSuccess);

    return matchesSearch && matchesStatus;
  });

  const totalSuccessful = logs.filter((l) => l.status === 'SUCCESS').length;
  const totalFailed = logs.filter((l) => l.status !== 'SUCCESS').length;
  const totalFilesBundled = logs.reduce((acc, curr) => acc + (curr.fileCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-panacea-50 border border-panacea-200 flex items-center justify-center text-panacea-600 shadow-2xs">
              <FolderLock className="w-4 h-4 text-sky-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Audit Vault Export Logs</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Permanent compliance traceability record of all packaged evidence archive exports.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Package Exports</p>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{logs.length}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{totalSuccessful} successfully delivered</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blocked / Unauthorized</p>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalFailed}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Authorization &amp; credential rejections</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Evidence Files Bundled</p>
            <FileCheck2 className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalFilesBundled}</p>
          <p className="text-[11px] text-sky-600 font-medium mt-0.5">Total artifacts packaged into vault archives</p>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by auditor name, email, client, process, or IP..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 self-start">
            {(['ALL', 'SUCCESS', 'FAILED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === filter
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {filter === 'ALL' ? 'All Logs' : filter === 'SUCCESS' ? 'Successful' : 'Blocked / Failed'}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Export Timestamp</th>
                <th className="py-3.5 px-4">Auditor / Requester</th>
                <th className="py-3.5 px-4">Target Organization &amp; Scope</th>
                <th className="py-3.5 px-4">Origin IP</th>
                <th className="py-3.5 px-4">Package Status</th>
                <th className="py-3.5 px-4 text-right">Files Included</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Loading audit download logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No export log records match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  const dateStr = log.downloadedAt ? new Date(log.downloadedAt).toLocaleString() : 'N/A';

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{dateStr}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{log.userName}</span>
                            {getRoleBadge(log.userRole)}
                          </div>
                          <p className="text-[11px] text-slate-500">{log.userEmail}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{log.customerName || 'Customer Organization'}</span>
                          </div>
                          <p className="text-[11px] text-sky-600 font-medium">
                            {log.processTitle || 'General Process'} {log.serviceName ? `• ${log.serviceName}` : ''}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.ipAddress || 'unknown'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Success (Verified)
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              {log.status === 'FAILED_AUTH' ? 'Auth Failed' : 'Forbidden (IDOR Blocked)'}
                            </span>
                            {log.failureReason && (
                              <p className="text-[10px] text-rose-600 max-w-xs truncate" title={log.failureReason}>
                                {log.failureReason}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-slate-700">
                        {isSuccess ? `${log.fileCount || 0} artifacts` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
