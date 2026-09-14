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
  HelpCircle,
} from 'lucide-react';
import api from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ThreadedComments } from '../../components/common/ThreadedComments';
import { EvidenceExportModal } from '../../components/common/EvidenceExportModal';
import { toast } from 'sonner';
import { AuditItem } from '../../types';

export const QsaAuditView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const processId = searchParams.get('processId') || '';
  const serviceId = Number(searchParams.get('serviceId')) || 1;
  const customerId = searchParams.get('customerId') || '';

  const [auditData, setAuditData] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [uploadFiles, setUploadFiles] = useState<{ [key: string]: FileList | null }>({});
  const [fileInputKeys, setFileInputKeys] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({});

  const fetchAuditData = async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const res = await api.get(
        `/qsa/audit-view?processId=${processId}&serviceId=${serviceId}&customerId=${customerId}`
      );
      if (res.data.success) {
        setAuditData(res.data.auditData);
        if (res.data.auditData.length > 0 && !expandedId) {
          setExpandedId(res.data.auditData[0].question._id);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load audit controls.');
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
      const res = await api.put('/qsa/evidence/status', {
        processId,
        serviceId,
        questionnaireId,
        customerId,
        status,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Status updated successfully.');
        fetchAuditData(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleUploadSupplementary = async (questionnaireId: string) => {
    const files = uploadFiles[questionnaireId];
    if (!files || files.length === 0) {
      toast.error('Please select files to upload.');
      return;
    }

    try {
      setIsUploading((prev) => ({ ...prev, [questionnaireId]: true }));
      const formData = new FormData();
      formData.append('processId', processId);
      formData.append('serviceId', String(serviceId));
      formData.append('questionnaireId', questionnaireId);
      formData.append('customerId', customerId);

      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await api.post('/qsa/evidence/upload-supplementary', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success('QSA documents uploaded.');
        setUploadFiles((prev) => ({ ...prev, [questionnaireId]: null }));
        setFileInputKeys((prev) => ({ ...prev, [questionnaireId]: (prev[questionnaireId] || 0) + 1 }));
        setExpandedId(questionnaireId);
        await fetchAuditData(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload files.');
    } finally {
      setIsUploading((prev) => ({ ...prev, [questionnaireId]: false }));
    }
  };

  const handleDeleteSupplementary = async (docId: string) => {
    try {
      const res = await api.delete(`/qsa/supplementary-docs/${docId}`);
      if (res.data.success) {
        toast.success(res.data.message || 'Working paper deleted.');
        // Immediate optimistic UI update
        setAuditData((prev) =>
          prev.map((item) => ({
            ...item,
            assessorDocs: item.assessorDocs.filter(
              (d) => d._id !== docId && (d as any).id !== docId && String(d.legacyId) !== docId && d.docs !== docId
            ),
          }))
        );
        fetchAuditData(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete working paper.');
    }
  };

  const handleRequestModification = async (questionnaireId: string) => {
    try {
      const res = await api.post('/qsa/evidence/request-modification', {
        processId,
        serviceId,
        questionnaireId,
        customerId,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Scope modification requested from Administrator.');
        fetchAuditData(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit request.');
    }
  };

  const pendingCount = auditData.filter(
    (item) => !item.review || item.review.allStatus === 0 || item.review.allStatus === undefined
  ).length;
  const qsaApprovedCount = auditData.filter((item) => item.review?.allStatus === 1).length;
  const qaApprovedCount = auditData.filter((item) => item.review?.allStatus === 4 || item.review?.allStatus === 7).length;
  const modRequestedCount = auditData.filter(
    (item) => item.review?.cusModification === 1 || item.review?.qsaModification === 1
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
      return item.review?.cusModification === 1 || item.review?.qsaModification === 1;
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
      {/* Anchored Context Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <Link
            to="/qsa/dashboard"
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-xs transition"
          >
            <span>&larr; Back to Engagements</span>
          </Link>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">QSA Security Assessment Matrix</h2>
          <p className="text-xs text-slate-500 font-medium">
            Verify evidence artifacts, assign statuses, attach assessor samples, and route to QA review.
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

      {isLoading ? (
        <div className="py-16 text-center text-slate-400">Loading assessment requirements...</div>
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
                <div
                  onClick={() => setExpandedId(isExpanded ? null : q._id)}
                  className="p-4 sm:p-5 flex items-start justify-between cursor-pointer hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-start space-x-3.5 flex-1 pr-4">
                    <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {masterIdx + 1}
                    </span>
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-slate-900 leading-snug">{q.question}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <StatusBadge status={review?.allStatus || 0} type="all" />
                        {(review?.cusModification === 1 || review?.qsaModification === 1) && (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                            Modification Requested
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium">
                          {item.customerDocs.length} customer file(s), {item.assessorDocs.length} assessor paper(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-1 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Area */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-slate-50/40 border-t border-slate-100 space-y-6">
                    {/* QSA Decision Bar */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-bold text-slate-700">QSA Assessment Decision:</span>
                        <StatusBadge status={review?.status || 0} type="qsa" />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(q._id, 1)}
                          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Accept & Assign to QA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(q._id, 2)}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Disapprove</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(q._id, 4)}
                          className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Mark Incomplete</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestModification(q._id)}
                          className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                          <span>Request Scope Mod</span>
                        </button>
                      </div>
                    </div>

                    {/* Customer Documents */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Customer Evidence Files ({item.customerDocs.length})
                      </h4>
                      {item.customerDocs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-white p-3.5 rounded-xl border border-slate-200">
                          No customer evidence uploaded yet.
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
                                href={`/api/files/evidence/${doc.docs}`}
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

                    {/* QSA Supplementary File Uploads */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <Upload className="w-4 h-4 text-slate-700" />
                        <span>Upload QSA Working Papers / Sampling Notes</span>
                      </h4>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="file"
                          multiple
                          onChange={(e) =>
                            setUploadFiles((prev) => ({ ...prev, [q._id]: e.target.files }))
                          }
                          className="flex-1 text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50/50"
                        />
                        <button
                          type="button"
                          disabled={isUploading[q._id]}
                          onClick={() => handleUploadSupplementary(q._id)}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50 flex items-center justify-center space-x-1.5 shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5 text-white" />
                          <span>{isUploading[q._id] ? 'Uploading...' : 'Upload'}</span>
                        </button>
                      </div>

                      {item.assessorDocs.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                          {item.assessorDocs.map((sDoc) => (
                            <div
                              key={sDoc._id}
                              className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center space-x-2.5 truncate pr-2">
                                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                <span className="font-semibold text-slate-700 truncate">{sDoc.originalFilename || sDoc.docs}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <a
                                  href={`/api/files/qsa/${sDoc.docs}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
                                  title="Download"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-500" />
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSupplementary(sDoc._id || (sDoc as any).id || String(sDoc.legacyId) || sDoc.docs);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete working paper"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

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
