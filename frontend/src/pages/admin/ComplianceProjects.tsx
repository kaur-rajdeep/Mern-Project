import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Plus, Calendar, Eye, X, ArrowRight, AlertCircle, RotateCcw, UserCog, UserMinus } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import { validateDateRange } from '../../utils/validators';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useNavigationGuard } from '../../hooks/useNavigationGuard';
import { NavigationGuardModal } from '../../components/common/NavigationGuardModal';

export const ComplianceProjects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [qsas, setQsas] = useState<any[]>([]);
  const [qas, setQas] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [customerProcesses, setCustomerProcesses] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [dateRangeError, setDateRangeError] = useState('');

  // Reassignment Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [projectToReassign, setProjectToReassign] = useState<any>(null);
  const [reassignForm, setReassignForm] = useState({
    qsaId: '',
    qaId: '',
    consultantId: '',
    startDate: '',
    endDate: '',
  });
  const [isSavingReassign, setIsSavingReassign] = useState(false);
  const [reassignDateError, setReassignDateError] = useState('');

  const [formData, setFormData] = useState({
    serviceId: 1,
    customerId: '',
    processId: '',
    qsaId: '',
    qaId: '',
    consultantId: '',
    startDate: '',
    endDate: '',
  });

  // localStorage draft for compliance project creation
  const { getDraft, saveDraft, clearDraft, hasDraft } = useFormDraft<typeof formData>('createComplianceProject');
  const [draftRestored, setDraftRestored] = useState(false);

  // Navigation guard
  const formHasData = createModalOpen && Boolean(
    formData.customerId || formData.startDate || formData.endDate || formData.qsaId
  );

  const { isGuardOpen, confirmNavigation, cancelNavigation, proceedNavigation } = useNavigationGuard({
    isDirty: formHasData,
    onDiscard: () => {
      clearDraft();
      setCreateModalOpen(false);
      setFormData({
        serviceId: 1,
        customerId: '',
        processId: '',
        qsaId: '',
        qaId: '',
        consultantId: '',
        startDate: '',
        endDate: '',
      });
      setDateRangeError('');
      setDraftRestored(false);
      toast.info('Draft discarded and cleared from local storage.');
    },
  });

  const handleSaveDraftAndLeave = () => {
    saveDraft(formData);
    toast.success('Project draft saved to local storage.', { duration: 4000 });
    setCreateModalOpen(false);
    proceedNavigation();
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [projRes, servRes, custRes, qsaRes, qaRes, consRes] = await Promise.all([
        api.get('/admin/compliance-projects'),
        api.get('/admin/compliance-services'),
        api.get('/admin/customers'),
        api.get('/admin/assessors?userType=2'),
        api.get('/admin/assessors?userType=3'),
        api.get('/admin/assessors?userType=4'),
      ]);

      setProjects(projRes.data.projects);
      setServices(servRes.data.services);
      setCustomers(custRes.data.customers);
      setQsas(qsaRes.data.assessors);
      setQas(qaRes.data.assessors);
      setConsultants(consRes.data.assessors);
    } catch (err: any) {
      toast.error('Failed to load project records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Restore draft when modal opens
  useEffect(() => {
    if (createModalOpen) {
      if (hasDraft()) {
        const draft = getDraft();
        if (draft) {
          setFormData(draft);
          setDraftRestored(true);
          if (draft.customerId) {
            handleCustomerSelect(draft.customerId);
          }
          toast.info('Draft restored from local storage.', { duration: 4000 });
        }
      } else {
        setDraftRestored(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createModalOpen]);



  const handleCustomerSelect = async (custId: string) => {
    setFormData((prev) => ({ ...prev, customerId: custId, processId: '' }));
    if (!custId) {
      setCustomerProcesses([]);
      return;
    }
    try {
      const res = await api.get(`/admin/customers/${custId}/processes`);
      if (res.data.success) {
        setCustomerProcesses(res.data.processes);
      }
    } catch {
      toast.error('Failed to load processes for customer.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const dateErr = validateDateRange(formData.startDate, formData.endDate);
    setDateRangeError(dateErr);
    if (dateErr) {
      toast.error(dateErr);
      return;
    }
    try {
      const res = await api.post('/admin/compliance-projects', formData);
      if (res.data.success) {
        toast.success('Compliance project mapping created.');
        clearDraft();
        setCreateModalOpen(false);
        setDraftRestored(false);
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create project mapping.');
    }
  };

  const openReassignModal = (p: any) => {
    setProjectToReassign(p);
    setReassignForm({
      qsaId: p.qsaId?._id || p.qsaId || '',
      qaId: p.qaId?._id || p.qaId || '',
      consultantId: p.consultantId?._id || p.consultantId || '',
      startDate: p.startDate || '',
      endDate: p.endDate || '',
    });
    setReassignDateError('');
    setReassignModalOpen(true);
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToReassign) return;
    const dateErr = validateDateRange(reassignForm.startDate, reassignForm.endDate);
    setReassignDateError(dateErr);
    if (dateErr) {
      toast.error(dateErr);
      return;
    }
    setIsSavingReassign(true);
    try {
      const res = await api.put(`/admin/compliance-projects/${projectToReassign._id}/reassign`, {
        qsaId: reassignForm.qsaId || null,
        qaId: reassignForm.qaId || null,
        consultantId: reassignForm.consultantId || null,
        startDate: reassignForm.startDate,
        endDate: reassignForm.endDate,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Project assignees updated.');
        setReassignModalOpen(false);
        setProjectToReassign(null);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project assignees.');
    } finally {
      setIsSavingReassign(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">5-Party Compliance Engagements</h2>
          <p className="text-sm text-slate-500 font-medium">
            Map frameworks (PCI DSS, ISO, HIPAA) to Customer processes, QSA assessors, QA teams, and Consultants.
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-xs shadow-xs flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Assign New Project</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Framework Standard</th>
                <th className="py-3.5 px-4">Customer & Scope</th>
                <th className="py-3.5 px-4">Assigned QSA</th>
                <th className="py-3.5 px-4">Assigned QA</th>
                <th className="py-3.5 px-4">Assigned Consultant</th>
                <th className="py-3.5 px-4">Milestone Dates</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Loading compliance projects...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No compliance projects assigned yet.
                  </td>
                </tr>
              ) : (
                projects.map((p) => {
                  const serviceName =
                    services.find((s) => s.legacyId === p.serviceId)?.serviceName || `Standard #${p.serviceId}`;
                  return (
                    <tr
                      key={p._id}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                      onClick={() => navigate(`/admin/compliances/${p._id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {serviceName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900">{p.customerId?.companyName || p.customerId?.fullName}</span>
                          <p className="text-[11px] text-slate-500 font-medium">{p.processId?.processName}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{p.qsaId?.fullName || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{p.qaId?.fullName || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{p.consultantId?.fullName || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {p.startDate || p.endDate ? (
                          <span className="text-[11px]">
                            {p.startDate} &rarr; {p.endDate}
                          </span>
                        ) : (
                          'Active'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openReassignModal(p)}
                          title="Reassign Project Assessors"
                          aria-label="Reassign Project Assessors"
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        >
                          <UserCog className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/compliances/${p._id}`)}
                          title="Audit View"
                          aria-label="Audit View"
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4 text-slate-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Assign Compliance Project</h3>
              <button onClick={() => setCreateModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Compliance Standard</label>
                <select
                  required
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: Number(e.target.value) })}
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-semibold"
                >
                  {services.map((s) => (
                    <option key={s._id} value={s.legacyId}>
                      {s.serviceName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Customer Organization</label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.companyName || c.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Audit Process / Scope</label>
                  <select
                    required
                    disabled={customerProcesses.length === 0}
                    value={formData.processId}
                    onChange={(e) => setFormData({ ...formData, processId: e.target.value })}
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  >
                    <option value="">Select Process Scope</option>
                    {customerProcesses.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.processName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Assigned QSA</label>
                  <select
                    required
                    value={formData.qsaId}
                    onChange={(e) => setFormData({ ...formData, qsaId: e.target.value })}
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  >
                    <option value="">Select QSA</option>
                    {qsas.map((q) => (
                      <option key={q._id} value={q._id}>
                        {q.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Assigned QA</label>
                  <select
                    required
                    value={formData.qaId}
                    onChange={(e) => setFormData({ ...formData, qaId: e.target.value })}
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  >
                    <option value="">Select QA</option>
                    {qas.map((qa) => (
                      <option key={qa._id} value={qa._id}>
                        {qa.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Consultant</label>
                  <select
                    required
                    value={formData.consultantId}
                    onChange={(e) => setFormData({ ...formData, consultantId: e.target.value })}
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  >
                    <option value="">Select Consultant</option>
                    {consultants.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Audit Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      setFormData({ ...formData, startDate: e.target.value });
                      setDateRangeError(validateDateRange(e.target.value, formData.endDate));
                    }}
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Audit Completion Target</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => {
                      setFormData({ ...formData, endDate: e.target.value });
                      setDateRangeError(validateDateRange(formData.startDate, e.target.value));
                    }}
                    className={`w-full mt-1 p-2 bg-white border rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 ${
                      dateRangeError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>
              {dateRangeError && (
                <p className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium -mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {dateRangeError}
                </p>
              )}

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Project Assessors Modal */}
      {reassignModalOpen && projectToReassign && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reassign Project Assessors</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Update team assignments or unassign/remove assessors</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReassignModalOpen(false);
                  setProjectToReassign(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Project Overview Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Framework:</span>
                <span className="font-bold text-slate-800">
                  {services.find((s) => s.legacyId === projectToReassign.serviceId)?.serviceName || `Standard #${projectToReassign.serviceId}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Customer:</span>
                <span className="font-bold text-slate-800">
                  {projectToReassign.customerId?.companyName || projectToReassign.customerId?.fullName || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Scope / Process:</span>
                <span className="font-bold text-slate-800">
                  {projectToReassign.processId?.processName || '—'}
                </span>
              </div>
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

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700">Audit Start Date</label>
                  <input
                    type="date"
                    value={reassignForm.startDate}
                    onChange={(e) => {
                      setReassignForm({ ...reassignForm, startDate: e.target.value });
                      setReassignDateError(validateDateRange(e.target.value, reassignForm.endDate));
                    }}
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Audit Completion Target</label>
                  <input
                    type="date"
                    value={reassignForm.endDate}
                    onChange={(e) => {
                      setReassignForm({ ...reassignForm, endDate: e.target.value });
                      setReassignDateError(validateDateRange(reassignForm.startDate, e.target.value));
                    }}
                    className={`w-full mt-1 p-2 bg-white border rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 ${
                      reassignDateError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>
              {reassignDateError && (
                <p className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium -mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {reassignDateError}
                </p>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingReassign}
                  onClick={() => {
                    setReassignModalOpen(false);
                    setProjectToReassign(null);
                  }}
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
                      <span>Save Assignments</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation guard — fires when user tries to leave while project form is open */}
      <NavigationGuardModal
        isOpen={isGuardOpen}
        onSave={handleSaveDraftAndLeave}
        onDiscard={confirmNavigation}
        onStay={cancelNavigation}
        saveLabel="Save Draft & Leave"
        discardLabel="Discard & Clear Draft"
        title="Unsaved Project Mapping"
        description="You have unsaved details in the compliance project form. Would you like to save your draft to local storage before leaving, or discard it?"
      />
    </div>
  );
};
