import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  Briefcase,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Users,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

interface Engagement {
  _id: string;
  engagementId: number;
  engagementType: 'compliance' | 'testing';
  engagementName: string;
  startDate?: string;
  endDate?: string;
  qsaId?: { fullName: string; email: string };
  qaId?: { fullName: string; email: string };
  consultantId?: { fullName: string; email: string };
  stats: {
    totalQuestions: number;
    attempted: number;
    notAttempted: number;
    assignedToQsa: number;
    assignedToQa: number;
    approvedByQa: number;
    disapprovedByQsa: number;
    disapprovedByQa: number;
    markedIncomplete: number;
    needsAction: number;
    inReview: number;
  };
}

interface DashboardData {
  summary: {
    totalEngagements: number;
    totalQuestions: number;
    totalAttempted: number;
    totalNeedsAction: number;
  };
  services: Engagement[];
}

// Truncate abbreviation for the service badge
const getServiceAbbr = (name: string | undefined | null): string => {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.substring(0, 7).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
};

export const ProcessDetailsPage: React.FC = () => {
  const { processId } = useParams<{ processId: string }>();
  const [processName, setProcessName] = useState<string>('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!processId) return;

    // Load process name from the services endpoint (already exists)
    api
      .get(`/customer/processes/${processId}/services`)
      .then((res) => {
        setProcessName(res.data.process?.processName || 'Process');
      })
      .catch(() => { });

    // Load dashboard analytics
    api
      .post('/analytics/process-dashboard', { processId })
      .then((res) => {
        if (res.data.success) {
          setDashboard(res.data);
        }
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load dashboard.'))
      .finally(() => setIsLoading(false));
  }, [processId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const summary = dashboard?.summary;
  const engagements = dashboard?.services || [];

  const summaryCards = [
    {
      id: 'engagements',
      label: 'Engagements',
      value: summary?.totalEngagements ?? 0,
      sub: engagements.map((e) => getServiceAbbr(e.engagementName)).join(' · ') || '—',
      icon: Briefcase,
      color: 'sky',
    },
    {
      id: 'questions',
      label: 'Questions in scope',
      value: summary?.totalQuestions ?? 0,
      sub: 'across all engagements',
      icon: ClipboardList,
      color: 'slate',
    },
    {
      id: 'attempted',
      label: 'Attempted',
      value: summary?.totalAttempted ?? 0,
      sub: summary
        ? `${Math.round(((summary.totalAttempted || 0) / Math.max(summary.totalQuestions, 1)) * 100)}% of total`
        : '—',
      icon: CheckCircle2,
      color: 'emerald',
    },
    {
      id: 'needs-action',
      label: 'Needs your action',
      value: summary?.totalNeedsAction ?? 0,
      sub: 'across all engagements',
      icon: AlertTriangle,
      color: 'rose',
      highlight: (summary?.totalNeedsAction ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
          <Link to="/customer/dashboard" className="hover:text-sky-600 transition font-medium">
            Processes
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-700 font-semibold">{processName}</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{processName}</h2>
        <p className="text-sm text-slate-500 mt-1">
          Assigned compliance frameworks, testing engagements, and live audit progress.
        </p>
      </div>

      {/* Summary Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`bg-white rounded-2xl border ${card.highlight
                  ? 'border-rose-200 bg-gradient-to-br from-rose-50 to-white'
                  : 'border-slate-200'
                } p-5 shadow-sm hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {card.label}
                </p>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color === 'sky'
                      ? 'bg-sky-50 text-sky-500'
                      : card.color === 'emerald'
                        ? 'bg-emerald-50 text-emerald-500'
                        : card.color === 'rose'
                          ? 'bg-rose-50 text-rose-500'
                          : 'bg-slate-50 text-slate-400'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p
                className={`text-3xl font-black tracking-tight ${card.highlight ? 'text-rose-500' : 'text-slate-900'
                  }`}
              >
                {card.value}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Assigned Compliance Standards */}
      <div className="space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Assigned Compliance Standards</h3>
            <p className="text-xs text-slate-400">
              Your active engagements, what still needs your attention, and who's reviewing.
            </p>
          </div>
        </div>

        {engagements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            No compliance frameworks assigned to this process yet.
          </div>
        ) : (
          <div className="space-y-4">
            {engagements.map((svc) => {
              const { stats } = svc;
              const progressPct = stats.totalQuestions
                ? Math.round((stats.attempted / stats.totalQuestions) * 100)
                : 0;
              const abbr = getServiceAbbr(svc.engagementName);
              const isTesting = svc.engagementType === 'testing';

              return (
                <div
                  key={svc._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-200 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg border tracking-wide shrink-0 ${
                            isTesting
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                              : 'bg-panacea-100 text-panacea-700 border-panacea-200'
                          }`}
                        >
                          {abbr}
                        </span>
                        <h4 className="text-base font-bold text-slate-800">{svc.engagementName || '—'}</h4>
                      </div>
                      {svc.startDate && svc.endDate && (
                        <span className="text-xs text-slate-400 font-mono whitespace-nowrap shrink-0">
                          {svc.startDate} — {svc.endDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" />
                        Progress
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        {stats.attempted} / {stats.totalQuestions} attempted ·{' '}
                        <span className="text-sky-600">{progressPct}%</span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-panacea-500 transition-all duration-700"
                        style={{ width: `${Math.max(progressPct, progressPct > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Breakdown */}
                  <div className="px-6 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Needs Action */}
                    <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wide">
                          Needs your action · {stats.needsAction}
                        </p>
                      </div>
                      <p className="text-3xl font-black text-rose-500 leading-none mb-2">
                        {stats.needsAction}
                      </p>
                      <div className="space-y-0.5 text-[11px] text-rose-400 font-medium">
                        <p>{stats.disapprovedByQsa} disapproved by QSA</p>
                        <p>{stats.disapprovedByQa} disapproved by QA</p>
                        <p>{stats.markedIncomplete} incomplete</p>
                      </div>
                    </div>

                    {/* In Review */}
                    <div className="rounded-xl bg-sky-50 border border-sky-100 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                        <p className="text-[11px] font-semibold text-sky-600 uppercase tracking-wide">
                          In review
                        </p>
                      </div>
                      <p className="text-3xl font-black text-sky-500 leading-none mb-2">
                        {stats.inReview}
                      </p>
                      <div className="space-y-0.5 text-[11px] text-sky-400 font-medium">
                        <p>{stats.assignedToQsa} with QSA</p>
                        <p>{stats.assignedToQa} with QA</p>
                      </div>
                    </div>

                    {/* Approved */}
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">
                          Approved
                        </p>
                      </div>
                      <p className="text-3xl font-black text-emerald-500 leading-none mb-2">
                        {stats.approvedByQa}
                      </p>
                      <div className="space-y-0.5 text-[11px] text-emerald-400 font-medium">
                        <p>Reviewed &amp; approved</p>
                      </div>
                    </div>
                  </div>

                  {/* Team + CTA */}
                  <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-300" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">QSA</p>
                          <p className="text-sm font-semibold text-slate-800 leading-tight">
                            {svc.qsaId?.fullName || '—'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">QA</p>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">
                          {svc.qaId?.fullName || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">
                          Consultant
                        </p>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">
                          {svc.consultantId?.fullName || '—'}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/customer/evidence-audit?processId=${processId}&serviceId=${svc.engagementId}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
                    >
                      Upload &amp; review evidence
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
