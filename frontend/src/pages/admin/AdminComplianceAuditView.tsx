import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Building,
  Upload,
  Trash2,
  MessageSquare,
  FileDown,
  Clock,
  Layers,
  Sparkles,
  Award,
  FileCheck,
  X,
  UserCog,
  UserMinus,
} from 'lucide-react';
import api from '../../services/api';
import { EvidenceExportModal } from '../../components/common/EvidenceExportModal';
import { toast } from 'sonner';
import { getDownloadQueryUrl } from '../../utils/fileUrl';

export const AdminComplianceAuditView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    project: any;
    service: any;
    questionnaires: any[];
    reviews: any[];
    evidenceDocs: any[];
    comments: any[];
    reports: any[];
  } | null>(null);

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [sidebarTab, setSidebarTab] = useState<'reports' | 'actions' | 'milestone'>('reports');

  // Modal Upload States
  const [aocModalOpen, setAocModalOpen] = useState(false);
  const [rocModalOpen, setRocModalOpen] = useState(false);

  const [endDateInput, setEndDateInput] = useState('');
  const [rocFile, setRocFile] = useState<File | null>(null);
  const [aocFile, setAocFile] = useState<File | null>(null);
  const [isUploadingRoc, setIsUploadingRoc] = useState(false);
  const [isUploadingAoc, setIsUploadingAoc] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Reassignment Modal States
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [qsas, setQsas] = useState<any[]>([]);
  const [qas, setQas] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [reassignForm, setReassignForm] = useState({
    qsaId: '',
    qaId: '',
    consultantId: '',
    startDate: '',
    endDate: '',
  });
  const [isSavingReassign, setIsSavingReassign] = useState(false);

  const openReassignModal = async () => {
    if (!data?.project) return;
    setReassignForm({
      qsaId: data.project.qsaId?._id || data.project.qsaId || '',
      qaId: data.project.qaId?._id || data.project.qaId || '',
      consultantId: data.project.consultantId?._id || data.project.consultantId || '',
      startDate: data.project.startDate || '',
      endDate: data.project.endDate || '',
    });
    setReassignModalOpen(true);
    try {
      const [qsaRes, qaRes, consRes] = await Promise.all([
        api.get('/admin/assessors?userType=2'),
        api.get('/admin/assessors?userType=3'),
        api.get('/admin/assessors?userType=4'),
      ]);
      setQsas(qsaRes.data.assessors || []);
      setQas(qaRes.data.assessors || []);
      setConsultants(consRes.data.assessors || []);
    } catch {
      toast.error('Failed to load assessors list.');
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setIsSavingReassign(true);
    try {
      const res = await api.put(`/admin/compliance-projects/${projectId}/reassign`, {
        qsaId: reassignForm.qsaId || null,
        qaId: reassignForm.qaId || null,
        consultantId: reassignForm.consultantId || null,
        startDate: reassignForm.startDate,
        endDate: reassignForm.endDate,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Project team updated.');
        setReassignModalOpen(false);
        fetchProjectDetails();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update assignees.');
    } finally {
      setIsSavingReassign(false);
    }
  };

  const fetchProjectDetails = async (isInitial = false) => {
    if (!projectId) return;
    if (isInitial) setIsLoading(true);
    try {
      const res = await api.get(`/admin/compliance-projects/${projectId}/details`);
      if (res.data.success) {
        setData(res.data);
        if (res.data.project.endDate) {
          setEndDateInput(res.data.project.endDate);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load compliance project details.');
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails(true);
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-3">
        <div className="w-10 h-10 border-4 border-panacea-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Loading compliance workspace & audit questions...</p>
      </div>
    );
  }

  if (!data || !data.project) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-600 font-semibold">Compliance project not found.</p>
        <button
          onClick={() => navigate('/admin/compliances')}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-xs transition"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const { project, service, questionnaires, reviews, evidenceDocs, comments, reports } = data;

  const reviewMap = new Map<string, any>();
  reviews.forEach((r) => {
    reviewMap.set(String(r.questionnaireId), r);
  });

  const approvedQuestionsCount = questionnaires.filter((q) => {
    const rev = reviewMap.get(String(q._id));
    return rev && (rev.allStatus === 4 || rev.allStatus === 7 || rev.adminStatus === 1 || rev.qaStatus === 1);
  }).length;

  const docsMap = new Map<string, any[]>();
  evidenceDocs.forEach((d) => {
    const qId = String(d.questionnaireId);
    if (!docsMap.has(qId)) docsMap.set(qId, []);
    docsMap.get(qId)!.push(d);
  });

  const commentsMap = new Map<string, any[]>();
  comments.forEach((c) => {
    const qId = String(c.questionId || c.questionnaireId);
    if (!commentsMap.has(qId)) commentsMap.set(qId, []);
    commentsMap.get(qId)!.push(c);
  });

  const rocReport = reports.find((r) => r.reportOf === 'ROC');
  const aocReport = reports.find((r) => r.reportOf === 'AOC');

  const pendingCount = questionnaires.filter((q) => {
    const rev = reviewMap.get(String(q._id));
    return !rev || rev.allStatus === -1 || rev.allStatus === undefined;
  }).length;
  const qsaApprovedCount = questionnaires.filter((q) => {
    const rev = reviewMap.get(String(q._id));
    return rev && rev.allStatus === 1;
  }).length;
  const qaApprovedCount = questionnaires.filter((q) => {
    const rev = reviewMap.get(String(q._id));
    return rev && (rev.allStatus === 4 || rev.allStatus === 7 || rev.adminStatus === 1 || rev.qaStatus === 1);
  }).length;
  const modRequestedCount = questionnaires.filter((q) => {
    const rev = reviewMap.get(String(q._id));
    return rev && (rev.cusModification === 1 || rev.qaModification === 1);
  }).length;
  const inProgressCount = questionnaires.filter((q) => {
    const rev = reviewMap.get(String(q._id));
    return rev && (rev.allStatus === 0 || rev.allStatus === 3);
  }).length;
  const disapprovedCount = questionnaires.filter((q) => {
    const rev = reviewMap.get(String(q._id));
    return rev && [2, 5, 6, 8, 9].includes(rev.allStatus);
  }).length;

  const filterTabs = [
    { key: 'all', label: 'All ', count: questionnaires.length },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'qsa_approved', label: 'QSA Approved', count: qsaApprovedCount },
    { key: 'qa_approved', label: 'QA Approved', count: qaApprovedCount },
    { key: 'mod_requested', label: 'Modification', count: modRequestedCount },
    { key: 'in_progress', label: 'In Progress', count: inProgressCount },
    { key: 'disapproved', label: 'Disapproved', count: disapprovedCount },
  ];

  const filteredQuestionnaires = questionnaires.filter((q) => {
    const rev = reviewMap.get(String(q._id));
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pending') {
      return !rev || rev.allStatus === -1 || rev.allStatus === undefined;
    }
    if (selectedFilter === 'qsa_approved') {
      return rev && rev.allStatus === 1;
    }
    if (selectedFilter === 'qa_approved') {
      return rev && (rev.allStatus === 4 || rev.allStatus === 7 || rev.adminStatus === 1 || rev.qaStatus === 1);
    }
    if (selectedFilter === 'mod_requested') {
      return rev && (rev.cusModification === 1 || rev.qaModification === 1);
    }
    if (selectedFilter === 'in_progress') {
      return rev && (rev.allStatus === 0 || rev.allStatus === 3);
    }
    if (selectedFilter === 'disapproved') {
      return rev && [2, 5, 6, 8, 9].includes(rev.allStatus);
    }
    return true;
  });

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestions(filteredQuestionnaires.map((q) => q._id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const handleSelectQuestion = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedQuestions((prev) => [...prev, id]);
    } else {
      setSelectedQuestions((prev) => prev.filter((item) => item !== id));
    }
  };

  // Batch Status Update
  const handleBulkStatusChange = async (status: number) => {
    if (selectedQuestions.length === 0) {
      toast.warning('Please select at least one questionnaire item.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const res = await api.post(`/admin/compliance-projects/${projectId}/bulk-status`, {
        questionIds: selectedQuestions,
        status,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Audit statuses updated.');
        fetchProjectDetails();
        setSelectedQuestions([]);
      }
    } catch (err: any) {
      toast.error('Failed to update audit statuses.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // QA Modification
  const handleQaModification = async (questionnaireId: string, action: number) => {
    try {
      const res = await api.post(`/admin/compliance-projects/${projectId}/qa-modification`, {
        questionnaireId,
        action,
      });
      if (res.data.success) {
        toast.success(res.data.message);
        fetchProjectDetails();
      }
    } catch {
      toast.error('Failed to process modification request.');
    }
  };

  // Customer Modification
  const handleCustomerModification = async (questionnaireId: string, action: number) => {
    try {
      const res = await api.post(`/admin/compliance-projects/${projectId}/customer-modification`, {
        questionnaireId,
        action,
      });
      if (res.data.success) {
        toast.success(res.data.message);
        fetchProjectDetails();
      }
    } catch {
      toast.error('Failed to process modification request.');
    }
  };

  // End Date Save
  const handleSaveEndDate = async () => {
    if (!endDateInput) {
      toast.warning('Please specify an end date.');
      return;
    }
    try {
      const res = await api.post(`/admin/compliance-projects/${projectId}/end-date`, {
        endDate: endDateInput,
      });
      if (res.data.success) {
        toast.success('Project End Date recorded successfully.');
        fetchProjectDetails();
      }
    } catch {
      toast.error('Failed to save end date.');
    }
  };

  const handleToggleProjectStatus = async (status: number) => {
    try {
      const res = await api.put(`/admin/compliance-projects/${projectId}/status`, { status });
      if (res.data.success) {
        toast.success(res.data.message || 'Project status updated.');
        fetchProjectDetails();
      }
    } catch {
      toast.error('Failed to update project status.');
    }
  };

  // Upload Report (ROC or AOC)
  const handleUploadReport = async (type: 'ROC' | 'AOC', customFile?: File) => {
    const file = customFile || (type === 'ROC' ? rocFile : aocFile);
    if (!file) {
      toast.warning(`Please select a ${type} PDF file to upload.`);
      return;
    }

    const setLoader = type === 'ROC' ? setIsUploadingRoc : setIsUploadingAoc;
    setLoader(true);

    const formData = new FormData();
    formData.append('reportFile', file);
    formData.append('reportOf', type);

    try {
      const res = await api.post(`/admin/compliance-projects/${projectId}/reports`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success(`${type} uploaded successfully.`);
        if (type === 'ROC') {
          setRocFile(null);
          setRocModalOpen(false);
        }
        if (type === 'AOC') {
          setAocFile(null);
          setAocModalOpen(false);
        }
        fetchProjectDetails();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to upload ${type}.`);
    } finally {
      setLoader(false);
    }
  };

  // Delete Report
  const handleDeleteReport = async (reportId: string, type: string) => {
    if (!confirm(`Are you sure you want to delete the ${type} document?`)) return;
    try {
      const res = await api.delete(`/admin/compliance-projects/${projectId}/reports/${reportId}`);
      if (res.data.success) {
        toast.success(`${type} report removed.`);
        fetchProjectDetails();
      }
    } catch {
      toast.error('Failed to delete report.');
    }
  };

  const getStatusText = (rev?: any) => {
    if (!rev) return { label: 'Pending Upload', color: 'bg-slate-100 text-slate-700 border border-slate-300' };
    const allStatus = Number(rev.allStatus ?? -1);
    switch (allStatus) {
      case 0:
        return { label: 'Assigned To QSA', color: 'bg-teal-50 text-teal-700 border border-teal-200/80' };
      case 1:
        return { label: 'Assigned to QA', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80' };
      case 2:
        return { label: 'Disapproved by QSA', color: 'bg-rose-50 text-rose-700 border border-rose-200/80' };
      case 3:
        return { label: 'Marked Incomplete by QSA', color: 'bg-amber-50 text-amber-700 border border-amber-200/80' };
      case 4:
      case 7:
        return { label: 'Approved by QA / Admin', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' };
      case 5:
      case 8:
        return { label: 'Disapproved by QA / Admin', color: 'bg-rose-50 text-rose-700 border border-rose-200/80' };
      case 6:
      case 9:
        return { label: 'Marked Incomplete by QA / Admin', color: 'bg-amber-50 text-amber-700 border border-amber-200/80' };
      default:
        return { label: 'In Review', color: 'bg-blue-50 text-blue-700 border border-blue-200/80' };
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header — Pinned Sticky */}
      <div className="sticky -top-4 sm:-top-6 lg:-top-8 z-30 bg-white rounded-2xl border border-slate-200 shadow-xs transition-all">
        <div className="px-5 py-4 flex flex-col lg:flex-row justify-between gap-4">
          {/* Left: Back + Title Block */}
          <div className="flex items-start space-x-3 min-w-0">
            <button
              onClick={() => navigate('/admin/compliances')}
              className="mt-1 p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-800 shrink-0"
              title="Back to Compliances"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-900 leading-tight">Audit & Review Workspace</h1>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>
                  Customer: <strong className="text-slate-700">{project.customerId?.companyName || project.customerId?.fullName || '—'}</strong>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  Scope: <strong className="text-slate-700">{project.processId?.processName || '—'}</strong>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  QSA: <strong className="text-slate-700">{project.qsaId?.fullName || 'Unassigned'}</strong>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  QA: <strong className="text-slate-700">{project.qaId?.fullName || 'Unassigned'}</strong>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  Consultant: <strong className="text-slate-700">{project.consultantId?.fullName || 'Unassigned'}</strong>
                </span>
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-white uppercase tracking-wider">
                  {service?.serviceName || 'Compliance Standard'}
                </span>
                {project.status === 1 ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Completed ({approvedQuestionsCount}/{questionnaires.length})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    In Progress ({approvedQuestionsCount}/{questionnaires.length} Approved)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap lg:flex-nowrap">
            <button
              onClick={openReassignModal}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-2xs"
              title="Reassign or remove project assessors"
            >
              <UserCog className="w-3.5 h-3.5 text-amber-700" />
              <span>Reassign Team</span>
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-xs"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export Evidence</span>
            </button>
            <button
              onClick={() => setAocModalOpen(true)}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-xs"
            >
              <Award className="w-3.5 h-3.5" />
              <span>{aocReport ? 'Manage AOC' : 'Upload AOC'}</span>
            </button>
            <button
              onClick={() => setRocModalOpen(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition"
            >
              <FileCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>{rocReport ? 'Manage ROC' : 'Upload ROC'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Questionnaire list */}
        <div className="lg:col-span-8 space-y-4">
          {/* Status Filter Tabs + Select All — combined in one card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Filter Tabs */}
            <div className="px-4 pt-3 pb-2.5 flex flex-wrap gap-1 text-[11px] font-semibold border-b border-slate-100">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedFilter(tab.key)}
                  className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${selectedFilter === tab.key
                    ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1 py-0.5 rounded text-[9px] font-bold leading-none ${selectedFilter === tab.key
                      ? 'bg-sky-200/60 text-sky-800'
                      : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Select All Bar */}
            <div className="px-4 py-2.5 flex justify-between items-center text-xs bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="selectAllQuestions"
                  checked={selectedQuestions.length === filteredQuestionnaires.length && filteredQuestionnaires.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="selectAllQuestions" className="font-semibold text-slate-600 cursor-pointer">
                  Select All Questions ({filteredQuestionnaires.length} of {questionnaires.length})
                </label>
              </div>
              {selectedQuestions.length > 0 && (
                <span className="font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg">
                  {selectedQuestions.length} Selected
                </span>
              )}
            </div>
          </div>

          {/* Questionnaires List */}
          {filteredQuestionnaires.length === 0 ? (
            <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              No questions found matching the &ldquo;{filterTabs.find((t) => t.key === selectedFilter)?.label}&rdquo; filter.
            </div>
          ) : (
            filteredQuestionnaires.map((q) => {
              const isExpanded = expandedQuestions[q._id] ?? true;
              const rev = reviewMap.get(String(q._id));
              const docs = docsMap.get(String(q._id)) || [];
              const qComments = commentsMap.get(String(q._id)) || [];
              const statusInfo = getStatusText(rev);
              const isSelected = selectedQuestions.includes(q._id);
              const masterIdx = questionnaires.findIndex((item) => item._id === q._id);

              return (
                <div
                  key={q._id}
                  className={`bg-white rounded-2xl border transition shadow-2xs overflow-hidden ${isSelected ? 'border-slate-400 ring-1 ring-slate-400' : 'border-slate-200'
                    }`}
                >
                  {/* Header */}
                  <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectQuestion(q._id, e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Question {masterIdx + 1}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 mt-1 whitespace-pre-line leading-relaxed">
                        {q.question}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleQuestion(q._id)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 p-1"
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 text-xs">
                      {/* Uploaded Evidence Documents */}
                      <div>
                        <h4 className="font-bold text-slate-700 flex items-center space-x-1.5 mb-2">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>Uploaded Evidence Files ({docs.length})</span>
                        </h4>
                        {docs.length === 0 ? (
                          <p className="text-slate-400 italic py-2">No evidence document submitted yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {docs.map((doc, dIdx) => (
                              <div
                                key={dIdx}
                                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                              >
                                <div className="flex items-center space-x-2 truncate">
                                  <FileDown className="w-4 h-4 text-slate-500 shrink-0" />
                                  <div className="truncate">
                                    <a
                                      href={getDownloadQueryUrl(`evidence/${doc.docs}`)}
                                      target="_blank"
                                      rel="noreferrer"
                                      download
                                      className="font-bold text-slate-800 hover:text-slate-900 truncate block"
                                      title={doc.docs}
                                    >
                                      {doc.docs}
                                    </a>
                                    <p className="text-[10px] text-slate-400">
                                      {doc.updatedDate || doc.createdAt ? new Date(doc.updatedDate || doc.createdAt).toLocaleString() : ''}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* QA Modification Request Card */}
                      {rev?.qaModification === 1 && rev?.adminQa === 0 && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="font-bold text-amber-900">Modification Request from QA Assessor</span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleQaModification(q._id, 1)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleQaModification(q._id, 2)}
                              className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Customer Modification Request Card */}
                      {rev?.cusModification === 1 && (!rev?.adminCustomer || rev?.adminCustomer === 0) && (
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="font-bold text-blue-900">Requirement Modification Request from Customer</span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleCustomerModification(q._id, 1)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleCustomerModification(q._id, 2)}
                              className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Discussion Comments Thread */}
                      <div>
                        <h4 className="font-bold text-slate-700 flex items-center space-x-1.5 mb-2">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          <span>Auditor / Customer Discussion Thread ({qComments.length})</span>
                        </h4>
                        {qComments.length === 0 ? (
                          <p className="text-slate-400 italic">No comments posted yet.</p>
                        ) : (
                          <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                            {qComments.map((c, cIdx) => (
                              <div key={cIdx} className="text-xs">
                                <span className="font-bold text-slate-800">
                                  {c.loginUserId?.fullName || 'Assessor'}:
                                </span>{' '}
                                <span className="text-slate-600">{c.comments}</span>
                                <span className="text-[10px] text-slate-400 ml-1">
                                  ({new Date(c.updatedDate || c.createdAt).toLocaleString()})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }))}
        </div>

        {/* Right Column: Sticky Tabbed Quick Action Hub */}
        <div className="lg:col-span-4 sticky top-20 sm:top-24 lg:top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-0.5 space-y-4">
          {/* Tab Navigation */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex text-xs font-semibold">
            <button
              onClick={() => setSidebarTab('reports')}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-1.5 ${sidebarTab === 'reports'
                ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50/50'
                }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>AOC & ROC</span>
            </button>
            <button
              onClick={() => setSidebarTab('actions')}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-1.5 ${sidebarTab === 'actions'
                ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50/50'
                }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Review ({selectedQuestions.length})</span>
            </button>
            <button
              onClick={() => setSidebarTab('milestone')}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-1.5 ${sidebarTab === 'milestone'
                ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50/50'
                }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Milestone</span>
            </button>
          </div>

          {/* Tab 1: AOC & ROC Reports Hub */}
          {sidebarTab === 'reports' && (
            <div className="space-y-4">
              {/* AOC (Attestation of Compliance) Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-sky-600" />
                    <h3 className="text-sm font-bold text-slate-900">Attestation of Compliance (AOC)</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    Official AOC
                  </span>
                </div>

                {aocReport ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <a
                        href={getDownloadQueryUrl(`report/${aocReport.reportDocs}`)}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="font-semibold text-slate-900 hover:underline flex items-center space-x-1.5 truncate"
                      >
                        <FileDown className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="truncate">{aocReport.reportDocs}</span>
                      </a>
                      <button
                        onClick={() => handleDeleteReport(aocReport._id, 'AOC')}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete AOC"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Uploaded: {new Date(aocReport.createdAt || aocReport.updatedAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setAocFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50/50"
                    />
                    <button
                      disabled={!aocFile || isUploadingAoc}
                      onClick={() => handleUploadReport('AOC')}
                      className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-white" />
                      <span>{isUploadingAoc ? 'Uploading...' : 'Upload AOC PDF'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ROC (Report on Compliance) Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-sky-600" />
                    <h3 className="text-sm font-bold text-slate-900">Report on Compliance (ROC)</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    Official ROC
                  </span>
                </div>

                {rocReport ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <a
                        href={getDownloadQueryUrl(`report/${rocReport.reportDocs}`)}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="font-semibold text-slate-900 hover:underline flex items-center space-x-1.5 truncate"
                      >
                        <FileDown className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="truncate">{rocReport.reportDocs}</span>
                      </a>
                      <button
                        onClick={() => handleDeleteReport(rocReport._id, 'ROC')}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete ROC"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Uploaded: {new Date(rocReport.createdAt || rocReport.updatedAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setRocFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50/50"
                    />
                    <button
                      disabled={!rocFile || isUploadingRoc}
                      onClick={() => handleUploadReport('ROC')}
                      className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-white" />
                      <span>{isUploadingRoc ? 'Uploading...' : 'Upload ROC PDF'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Batch Review Actions */}
          {sidebarTab === 'actions' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Batch Review Actions
              </h3>
              <p className="text-xs text-slate-500">
                Apply approval status to {selectedQuestions.length} selected question(s):
              </p>
              <div className="space-y-2">
                <button
                  disabled={isUpdatingStatus || selectedQuestions.length === 0}
                  onClick={() => handleBulkStatusChange(1)}
                  className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 disabled:opacity-50 font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Approve Selected</span>
                </button>
                <button
                  disabled={isUpdatingStatus || selectedQuestions.length === 0}
                  onClick={() => handleBulkStatusChange(2)}
                  className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 disabled:opacity-50 font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Disapprove Selected</span>
                </button>
                <button
                  disabled={isUpdatingStatus || selectedQuestions.length === 0}
                  onClick={() => handleBulkStatusChange(4)}
                  className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 disabled:opacity-50 font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Mark Incomplete</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Milestone & End Date */}
          {sidebarTab === 'milestone' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Audit Completion & Milestone
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Progress: <strong className="text-slate-800">{approvedQuestionsCount}</strong> of <strong className="text-slate-800">{questionnaires.length}</strong> controls approved.
                </p>
              </div>

              {/* Status Switch */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Project Status:</span>
                  <span className={project.status === 1 ? 'font-bold text-emerald-700' : 'font-bold text-amber-700'}>
                    {project.status === 1 ? 'Completed' : 'In Progress'}
                  </span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleProjectStatus(1)}
                    disabled={project.status === 1}
                    className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  >
                    Mark Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleProjectStatus(0)}
                    disabled={project.status === 0 || !project.status}
                    className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Mark In Progress
                  </button>
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-2 text-xs">
                <label className="font-semibold text-slate-700">Target / Actual End Date:</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    className="flex-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-semibold text-slate-800"
                  />
                  <button
                    onClick={handleSaveEndDate}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-xs transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instant AOC Upload Modal */}
      {aocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-slate-800" />
                <h3 className="text-base font-bold text-slate-900">Upload Attestation of Compliance (AOC)</h3>
              </div>
              <button onClick={() => setAocModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {aocReport && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 truncate">Current: {aocReport.reportDocs}</span>
                <button
                  onClick={() => handleDeleteReport(aocReport._id, 'AOC')}
                  className="text-rose-600 font-bold hover:underline"
                >
                  Delete
                </button>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <label className="font-bold text-slate-700">Select AOC PDF Document:</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setAocFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50/50"
              />
              <button
                disabled={!aocFile || isUploadingAoc}
                onClick={() => handleUploadReport('AOC')}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>{isUploadingAoc ? 'Uploading...' : 'Confirm & Upload AOC'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant ROC Upload Modal */}
      {rocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-slate-800" />
                <h3 className="text-base font-bold text-slate-900">Upload Report on Compliance (ROC)</h3>
              </div>
              <button onClick={() => setRocModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {rocReport && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 truncate">Current: {rocReport.reportDocs}</span>
                <button
                  onClick={() => handleDeleteReport(rocReport._id, 'ROC')}
                  className="text-rose-600 font-bold hover:underline"
                >
                  Delete
                </button>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <label className="font-bold text-slate-700">Select ROC PDF Document:</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setRocFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50/50"
              />
              <button
                disabled={!rocFile || isUploadingRoc}
                onClick={() => handleUploadReport('ROC')}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>{isUploadingRoc ? 'Uploading...' : 'Confirm & Upload ROC'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Evidence Package Export Security Modal */}
      {data?.project && (
        <EvidenceExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          processId={data.project.processId?._id || data.project.processId}
          serviceId={data.project.serviceId}
          customerId={data.project.customerId?._id || data.project.customerId}
          processName={data.project.processId?.processName || 'Compliance Process'}
          serviceName={data.service?.serviceName || `Service #${data.project.serviceId}`}
        />
      )}

      {/* Reassign Team Modal */}
      {reassignModalOpen && data?.project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reassign Project Team</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Update or unassign QSA, QA, or Consultant for this engagement</p>
                </div>
              </div>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassignSubmit} className="space-y-3.5 text-xs">
              {/* QSA Assignment */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Qualified Security Assessor (QSA)</label>
                  {reassignForm.qsaId && (
                    <button
                      type="button"
                      onClick={() => setReassignForm({ ...reassignForm, qsaId: '' })}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center space-x-1"
                      title="Clear QSA assignment"
                    >
                      <UserMinus className="w-3 h-3" />
                      <span>Remove / Unassign</span>
                    </button>
                  )}
                </div>
                <select
                  value={reassignForm.qsaId}
                  onChange={(e) => setReassignForm({ ...reassignForm, qsaId: e.target.value })}
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 font-medium"
                >
                  <option value="">— None (Unassigned / Remove) —</option>
                  {qsas.map((q) => (
                    <option key={q._id} value={q._id}>
                      {q.fullName} ({q.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* QA Assignment */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Quality Assurance (QA) Reviewer</label>
                  {reassignForm.qaId && (
                    <button
                      type="button"
                      onClick={() => setReassignForm({ ...reassignForm, qaId: '' })}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center space-x-1"
                      title="Clear QA assignment"
                    >
                      <UserMinus className="w-3 h-3" />
                      <span>Remove / Unassign</span>
                    </button>
                  )}
                </div>
                <select
                  value={reassignForm.qaId}
                  onChange={(e) => setReassignForm({ ...reassignForm, qaId: e.target.value })}
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 font-medium"
                >
                  <option value="">— None (Unassigned / Remove) —</option>
                  {qas.map((qa) => (
                    <option key={qa._id} value={qa._id}>
                      {qa.fullName} ({qa.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Consultant Assignment */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Compliance Consultant</label>
                  {reassignForm.consultantId && (
                    <button
                      type="button"
                      onClick={() => setReassignForm({ ...reassignForm, consultantId: '' })}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center space-x-1"
                      title="Clear Consultant assignment"
                    >
                      <UserMinus className="w-3 h-3" />
                      <span>Remove / Unassign</span>
                    </button>
                  )}
                </div>
                <select
                  value={reassignForm.consultantId}
                  onChange={(e) => setReassignForm({ ...reassignForm, consultantId: e.target.value })}
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 font-medium"
                >
                  <option value="">— None (Unassigned / Remove) —</option>
                  {consultants.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.fullName} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingReassign}
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingReassign}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5"
                >
                  {isSavingReassign ? (
                    <span>Saving Changes...</span>
                  ) : (
                    <>
                      <UserCog className="w-3.5 h-3.5" />
                      <span>Save Team Assignments</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
