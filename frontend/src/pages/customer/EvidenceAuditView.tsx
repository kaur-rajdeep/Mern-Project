import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Upload,
  FileText,
  Trash2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ThreadedComments } from '../../components/common/ThreadedComments';
import { toast } from 'sonner';
import { AuditItem } from '../../types';

export const EvidenceAuditView: React.FC = () => {
  const { user } = useAuth();
  const currentCustomerId = (user?.parentId || (user as any)?._id || user?.id || '') as string;
  const [searchParams] = useSearchParams();
  const processId = searchParams.get('processId') || '';
  const serviceId = Number(searchParams.get('serviceId')) || 1;

  const [auditData, setAuditData] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<{ [key: string]: FileList | null }>({});
  const [uploadComments, setUploadComments] = useState<{ [key: string]: string }>({});
  const [fileInputKeys, setFileInputKeys] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({});

  const fetchAuditView = async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const res = await api.get(`/customer/evidence/audit-view?processId=${processId}&serviceId=${serviceId}`);
      if (res.data.success) {
        setAuditData(res.data.auditData);
        if (res.data.auditData.length > 0 && !expandedId) {
          setExpandedId(res.data.auditData[0].question._id);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load evidence audit matrix.');
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (processId && serviceId) {
      fetchAuditView(true);
    }
  }, [processId, serviceId]);

  const handleFileUploadSubmit = async (questionnaireId: string) => {
    const files = uploadFiles[questionnaireId];
    const comment = uploadComments[questionnaireId] || '';

    if ((!files || files.length === 0) && !comment.trim()) {
      toast.error('Please select files to upload or enter a note.');
      return;
    }

    try {
      setIsUploading((prev) => ({ ...prev, [questionnaireId]: true }));
      const formData = new FormData();
      formData.append('processId', processId);
      formData.append('serviceId', String(serviceId));
      formData.append('questionnaireId', questionnaireId);
      formData.append('comment', comment);

      if (files) {
        for (let i = 0; i < files.length; i++) {
          formData.append('files', files[i]);
        }
      }

      const res = await api.post('/customer/evidence/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success('Evidence submitted successfully.');
        setUploadFiles((prev) => ({ ...prev, [questionnaireId]: null }));
        setUploadComments((prev) => ({ ...prev, [questionnaireId]: '' }));
        setFileInputKeys((prev) => ({ ...prev, [questionnaireId]: (prev[questionnaireId] || 0) + 1 }));
        // Ensure this question stays expanded
        setExpandedId(questionnaireId);
        // Silent in-place refresh without unmounting or scroll jumping
        await fetchAuditView(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload evidence.');
    } finally {
      setIsUploading((prev) => ({ ...prev, [questionnaireId]: false }));
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this evidence file?')) return;
    try {
      const res = await api.delete(`/customer/evidence/${docId}`);
      if (res.data.success) {
        toast.success('Document deleted.');
        fetchAuditView(false);
      }
    } catch {
      toast.error('Failed to delete document.');
    }
  };

  const handleRequestModification = async (questionnaireId: string) => {
    try {
      const res = await api.post('/customer/evidence/request-modification', {
        processId,
        serviceId,
        questionnaireId,
      });
      if (res.data.success) {
        toast.success('Modification requested from Administrator.');
        fetchAuditView(false);
      }
    } catch {
      toast.error('Failed to submit modification request.');
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
      {/* Anchored Top Context Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <Link
            to={`/customer/processes/${processId}`}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-xs transition"
          >
            <span>&larr; Back to Process Summary</span>
          </Link>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Compliance Requirements & Evidence Review</h2>
          <p className="text-xs text-slate-500 font-medium">
            Upload policies, configurations, diagrams, and logs for each requirement.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
          <span className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
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
        <div className="py-16 text-center text-slate-400">Loading audit controls...</div>
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
                {/* Accordion Header */}
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
                        {review?.cusModification === 1 && (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                            Modification Requested
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium">
                          {item.customerDocs.length} evidence attachment(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-1 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-slate-50/40 border-t border-slate-100 space-y-6">
                    {/* Unified Upload Controls */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                          <Upload className="w-4 h-4 text-slate-700" />
                          <span>Upload Evidence Artifacts</span>
                        </h4>
                        <span className="text-[11px] text-slate-400 font-medium">PDF, DOCX, XLSX, PNG, JPG</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Choose Files
                          </label>
                          <input
                            key={fileInputKeys[q._id] || 0}
                            type="file"
                            multiple
                            onChange={(e) =>
                              setUploadFiles((prev) => ({ ...prev, [q._id]: e.target.files }))
                            }
                            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50/50"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Submission Notes / Comments
                          </label>
                          <input
                            type="text"
                            value={uploadComments[q._id] || ''}
                            onChange={(e) =>
                              setUploadComments((prev) => ({ ...prev, [q._id]: e.target.value }))
                            }
                            placeholder="Optional submission note or policy description..."
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-slate-800 placeholder:text-slate-400 transition"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleRequestModification(q._id)}
                          className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center space-x-1.5"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Request Requirement Modification</span>
                        </button>

                        <button
                          type="button"
                          disabled={isUploading[q._id]}
                          onClick={() => handleFileUploadSubmit(q._id)}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50 flex items-center space-x-1.5"
                        >
                          {isUploading[q._id] ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                              <span>Uploading Evidence...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5 text-white" />
                              <span>Submit Evidence</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Customer Uploaded Documents */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Submitted Evidence Documents ({item.customerDocs.length})
                      </h4>
                      {item.customerDocs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-white p-3.5 rounded-xl border border-slate-200">
                          No files submitted yet for this control.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {item.customerDocs.map((doc) => (
                            <div
                              key={doc._id}
                              className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs hover:border-slate-300 transition"
                            >
                              <div className="flex items-center space-x-2.5 truncate pr-2">
                                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate" title={doc.docs}>
                                  {doc.originalFilename || doc.docs}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <a
                                  href={`/api/files/evidence/${doc.docs}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                  title="Download"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-500" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDoc(doc._id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assessor Supplementary Documents */}
                    {item.assessorDocs.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Assessor Working Papers & Sample Evidence ({item.assessorDocs.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {item.assessorDocs.map((sDoc) => (
                            <div
                              key={sDoc._id}
                              className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                            >
                              <div className="flex items-center space-x-2.5 truncate pr-2">
                                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                <div>
                                  <span className="font-semibold text-slate-800 truncate block" title={sDoc.docs}>
                                    {sDoc.originalFilename || sDoc.docs}
                                  </span>
                                  <span className="text-[10px] text-slate-400">By: {sDoc.userId?.fullName}</span>
                                </div>
                              </div>
                              <a
                                href={`/api/files/qsa/${sDoc.docs}`}
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
                        customerId={review?.customerId || currentCustomerId}
                        initialComments={item.comments}
                        onCommentAdded={(newC) => {
                          setAuditData((prev) =>
                            prev.map((it) =>
                              it.question._id === q._id ? { ...it, comments: [...it.comments, newC] } : it
                            )
                          );
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
