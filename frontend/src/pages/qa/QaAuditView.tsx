import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  FileText,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ThreadedComments } from '../../components/common/ThreadedComments';
import { EvidenceExportModal } from '../../components/common/EvidenceExportModal';
import { toast } from 'sonner';
import { AuditItem } from '../../types';
import { getFileDownloadUrl } from '../../utils/fileUrl';

export const QaAuditView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const processId = searchParams.get('processId') || '';
  const serviceId = Number(searchParams.get('serviceId')) || 1;
  const customerId = searchParams.get('customerId') || '';

  const [auditData, setAuditData] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const fetchAuditData = async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const res = await api.get(
        `/qa/audit-view?processId=${processId}&serviceId=${serviceId}&customerId=${customerId}`
      );
      if (res.data.success) {
        setAuditData(res.data.auditData);
        if (res.data.auditData.length > 0 && !expandedId) {
          setExpandedId(res.data.auditData[0].question._id);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load QA matrix.');
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (processId && serviceId && customerId) {
      fetchAuditData(true);
    }
  }, [processId, serviceId, customerId]);

  const handleStatusUpdate = async (questionnaireId: string, status: number) => {
    try {
      const res = await api.put('/qa/evidence/status', {
        processId,
        serviceId,
        questionnaireId,
        customerId,
        status,
      });
      if (res.data.success) {
        toast.success(res.data.message);
        fetchAuditData(false);
      }
    } catch {
      toast.error('Failed to update QA status.');
    }
  };

  const handleBulkStatus = async (status: number) => {
    if (selectedIds.length === 0) {
      toast.error('Please select questions for batch update.');
      return;
    }

    try {
      const res = await api.post('/qa/evidence/bulk-status', {
        processId,
        serviceId,
        customerId,
        questionnaireIds: selectedIds,
        status,
      });
      if (res.data.success) {
        toast.success(`Batch QA status updated for ${selectedIds.length} items.`);
        setSelectedIds([]);
        fetchAuditData(false);
      }
    } catch {
      toast.error('Failed to execute bulk update.');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(auditData.map((it) => it.question._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const pendingCount = auditData.filter(
    (item) => !item.review || item.review.allStatus === 0 || item.review.allStatus === undefined
  ).length;
  const qsaApprovedCount = auditData.filter((item) => item.review?.allStatus === 1).length;
  const qaApprovedCount = auditData.filter((item) => item.review?.allStatus === 4 || item.review?.allStatus === 7).length;
  const modRequestedCount = auditData.filter(
    (item) => item.review?.cusModification === 1 || item.review?.qaModification === 1
  ).length;
  const inProgressCount = auditData.filter((item) => item.review?.allStatus === 3).length;
  const disapprovedCount = auditData.filter(
    (item) => item.review?.allStatus && [2, 5, 6, 8, 9].includes(item.review.allStatus)
  ).length;

  const filterTabs = [
    { key: 'all', label: 'All Controls', count: auditData.length },
    { key: 'pending', label: 'Pending Submission', count: pendingCount },
    { key: 'qsa_approved', label: 'QSA Approved', count: qsaApprovedCount },
    { key: 'qa_approved', label: 'QA Approved', count: qaApprovedCount },
    { key: 'mod_requested', label: 'Modification Requested', count: modRequestedCount },
    { key: 'in_progress', label: 'In Progress', count: inProgressCount },
    { key: 'disapproved', label: 'Disapproved / Incomplete', count: disapprovedCount },
  ];

  const filteredAuditData = auditData.filter((item) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pending') {
      return !item.review || item.review.allStatus === 0 || item.review.allStatus === undefined;
    }
    if (selectedFilter === 'qsa_approved') {
      return item.review?.allStatus === 1;
    }
    if (selectedFilter === 'qa_approved') {
      return item.review?.allStatus === 4 || item.review?.allStatus === 7;
    }
    if (selectedFilter === 'mod_requested') {
      return item.review?.cusModification === 1 || item.review?.qaModification === 1;
    }
    if (selectedFilter === 'in_progress') {
      return item.review?.allStatus === 3;
    }
    if (selectedFilter === 'disapproved') {
      return item.review?.allStatus && [2, 5, 6, 8, 9].includes(item.review.allStatus);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Anchored Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <Link
            to="/qa/dashboard"
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-xs transition"
          >
            <span>&larr; Back to QA Engagements</span>
          </Link>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">QA Review & Verification Matrix</h2>
          <p className="text-xs text-slate-500 font-medium">
            Verify QSA assessments, perform batch quality approvals, and sign off on audit controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-slate-600 shrink-0">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-panacea-600 hover:bg-panacea-700 text-white font-bold shadow-sm shadow-panacea-600/20 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Evidence Package</span>
          </button>
          <span className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
            {filteredAuditData.length} of {auditData.length} Controls
          </span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-xs font-semibold">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
              selectedFilter === tab.key
                ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50/50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                selectedFilter === tab.key
                  ? 'bg-sky-200/60 text-sky-800'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk Action Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={selectedIds.length === filteredAuditData.length && filteredAuditData.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded text-sky-600 focus:ring-sky-500"
          />
          <span>Select All ({selectedIds.length} chosen)</span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => handleBulkStatus(1)}
            disabled={selectedIds.length === 0}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold rounded-xl transition disabled:opacity-40 flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Batch Approve</span>
          </button>
          <button
            onClick={() => handleBulkStatus(2)}
            disabled={selectedIds.length === 0}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold rounded-xl transition disabled:opacity-40 flex items-center space-x-1.5"
          >
            <X className="w-3.5 h-3.5 text-rose-600" />
            <span>Batch Disapprove</span>
          </button>
          <button
            onClick={() => handleBulkStatus(4)}
            disabled={selectedIds.length === 0}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold rounded-xl transition disabled:opacity-40 flex items-center space-x-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Batch Incomplete</span>
          </button>
        </div>
      </div>

      {/* Matrix List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400">Loading QA audit scope...</div>
      ) : filteredAuditData.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          No requirements found in the &ldquo;{filterTabs.find((t) => t.key === selectedFilter)?.label}&rdquo; filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAuditData.map((item) => {
            const q = item.question;
            const review = item.review;
            const isExpanded = expandedId === q._id;
            const masterIdx = auditData.findIndex((d) => d.question._id === q._id);

            return (
              <div
                key={q._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm overflow-hidden transition"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 flex items-start justify-between cursor-pointer hover:bg-slate-50/80 transition">
                  <div className="flex items-start space-x-3.5 flex-1 pr-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(q._id)}
                      onChange={(e) => handleSelectOne(q._id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded text-sky-600 focus:ring-sky-500 mt-1"
                    />
                    <span
                      onClick={() => setExpandedId(isExpanded ? null : q._id)}
                      className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5"
                    >
                      {masterIdx + 1}
                    </span>
                    <div onClick={() => setExpandedId(isExpanded ? null : q._id)} className="space-y-1.5 flex-1">
                      <p className="text-sm font-bold text-slate-900 leading-snug">{q.question}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <StatusBadge status={review?.allStatus || 0} type="all" />
                        {(review?.qaModification === 1 || review?.cusModification === 1) && (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                            Modification Requested
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium">
                          {item.customerDocs.length} customer doc(s), {item.assessorDocs.length} assessor note(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div onClick={() => setExpandedId(isExpanded ? null : q._id)} className="p-1 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-slate-50/40 border-t border-slate-100 space-y-6">
                    {/* QA Decision Bar */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-bold text-slate-700">QA Decision:</span>
                        <StatusBadge status={review?.qaStatus || 0} type="qa" />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(q._id, 1)}
                          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>QA Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(q._id, 2)}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>QA Disapprove</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(q._id, 4)}
                          className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Mark Incomplete</span>
                        </button>
                      </div>
                    </div>

                    {/* Customer Documents */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Evidence Documents Submitted ({item.customerDocs.length})
                      </h4>
                      {item.customerDocs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-white p-3.5 rounded-xl border border-slate-200">
                          No customer files attached.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {item.customerDocs.map((doc) => (
                            <div
                              key={doc._id}
                              className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                            >
                              <div className="flex items-center space-x-2.5 truncate pr-2">
                                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate" title={doc.docs}>
                                  {doc.originalFilename || doc.docs}
                                </span>
                              </div>
                              <a
                                href={getFileDownloadUrl('evidence', doc.docs)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5 text-slate-500" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assessor Papers */}
                    {item.assessorDocs.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Assessor Working Papers & Samples ({item.assessorDocs.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {item.assessorDocs.map((sDoc) => (
                            <div
                              key={sDoc._id}
                              className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                            >
                              <div className="flex items-center space-x-2.5 truncate pr-2">
                                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate" title={sDoc.docs}>
                                  {sDoc.originalFilename || sDoc.docs}
                                </span>
                              </div>
                              <a
                                href={getFileDownloadUrl('qsa', sDoc.docs)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5 text-slate-500" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Threaded Discussion */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                      <ThreadedComments
                        questionId={q._id}
                        serviceId={serviceId}
                        processId={processId}
                        customerId={customerId}
                        initialComments={item.comments}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Evidence Package Export Security Modal */}
      <EvidenceExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        processId={processId}
        serviceId={serviceId}
        customerId={customerId}
        processName={`Process #${processId.slice(-6)}`}
        serviceName={`Compliance Service #${serviceId}`}
      />
    </div>
  );
};
