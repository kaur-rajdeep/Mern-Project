import React, { useEffect, useState } from 'react';
import { UserCheck, Plus, Download, Eye, Key, X, Trash2, AlertTriangle, ShieldAlert, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  validateFullName,
  validateEmail,
  validatePhone,
  validateAdminPassword,
} from '../../utils/validators';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useNavigationGuard } from '../../hooks/useNavigationGuard';
import { NavigationGuardModal } from '../../components/common/NavigationGuardModal';

// Reusable inline field error
const FieldError: React.FC<{ message: string }> = ({ message }) =>
  message ? (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600 font-medium">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  ) : null;

export const AssessorsManagement: React.FC = () => {
  const [assessors, setAssessors] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Delete Assessor State
  const [assessorToDelete, setAssessorToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingAssignment, setIsCheckingAssignment] = useState(false);
  const [assignedProjects, setAssignedProjects] = useState<any[]>([]);

  // Reset Password State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedAssessor, setSelectedAssessor] = useState<any>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);
  const [sendEmailOnReset, setSendEmailOnReset] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    userType: 2, // 2: QSA, 3: QA, 4: Consultant
    password: '',
  });

  // Validation errors
  const [formErrors, setFormErrors] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
  });

  const validateForm = () => {
    const errors = {
      fullName: validateFullName(formData.fullName),
      email: validateEmail(formData.email),
      phoneNumber: validatePhone(formData.phoneNumber),
      password: validateAdminPassword(formData.password),
    };
    setFormErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  // localStorage draft for the create-assessor modal
  const { getDraft, saveDraft, clearDraft, hasDraft } = useFormDraft<typeof formData>('createAssessor');
  const [draftRestored, setDraftRestored] = useState(false);

  // Navigation guard — block page nav when modal is open with data entered
  const formHasData = createModalOpen && (
    formData.fullName.trim() !== '' ||
    formData.email.trim() !== '' ||
    formData.phoneNumber.trim() !== '' ||
    formData.password.trim() !== ''
  );

  const { isGuardOpen, confirmNavigation, cancelNavigation, proceedNavigation } = useNavigationGuard({
    isDirty: formHasData,
    onDiscard: () => {
      clearDraft();
      setCreateModalOpen(false);
      setFormData({ fullName: '', email: '', phoneNumber: '', userType: 2, password: '' });
      setFormErrors({ fullName: '', email: '', phoneNumber: '', password: '' });
      setDraftRestored(false);
      toast.info('Draft discarded and cleared from local storage.');
    },
  });

  const handleSaveDraftAndLeave = () => {
    saveDraft(formData);
    toast.success('Auditor details saved as draft in local storage.', { duration: 4000 });
    setCreateModalOpen(false);
    proceedNavigation();
  };

  const fetchAssessors = () => {
    setIsLoading(true);
    const query = selectedRole !== 'all' ? `?userType=${selectedRole}` : '';
    api
      .get(`/admin/assessors${query}`)
      .then((res) => setAssessors(res.data.assessors))
      .catch((err) => toast.error(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchAssessors();
  }, [selectedRole]);

  // Restore draft when create modal opens
  useEffect(() => {
    if (createModalOpen) {
      if (hasDraft()) {
        const draft = getDraft();
        if (draft) {
          setFormData(draft);
          setDraftRestored(true);
          toast.info('Draft restored — your previously entered details have been loaded.', { duration: 4000 });
        }
      } else {
        setDraftRestored(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createModalOpen]);



  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting.');
      return;
    }
    try {
      const res = await api.post('/admin/assessors', formData);
      if (res.data.success) {
        toast.success(res.data.message);
        clearDraft(); // Remove draft after successful creation
        setCreateModalOpen(false);
        setFormData({ fullName: '', email: '', phoneNumber: '', userType: 2, password: '' });
        setFormErrors({ fullName: '', email: '', phoneNumber: '', password: '' });
        setDraftRestored(false);
        fetchAssessors();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create assessor.');
    }
  };

  const handleCloseCreateModal = () => {
    // Keep draft in localStorage so it can be restored next time
    setCreateModalOpen(false);
  };

  const openDeleteModal = async (assessor: any) => {
    setAssessorToDelete(assessor);
    setIsCheckingAssignment(true);
    setAssignedProjects([]);
    try {
      const res = await api.get(`/admin/assessors/${assessor._id}/assignment-status`);
      if (res.data.success) {
        setAssignedProjects(res.data.projects || []);
      }
    } catch (error: any) {
      toast.error('Failed to verify assessor project status.');
    } finally {
      setIsCheckingAssignment(false);
    }
  };

  const handleDelete = async () => {
    if (!assessorToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/admin/assessors/${assessorToDelete._id}`);
      if (res.data.success) {
        toast.success(res.data.message || 'Assessor deleted successfully.');
        setAssessorToDelete(null);
        fetchAssessors();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete assessor.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword || !selectedAssessor) return;
    try {
      const res = await api.post(`/admin/users/${selectedAssessor._id}/reset-password`, {
        adminPassword,
        sendEmail: sendEmailOnReset,
      });
      if (res.data.success) {
        setResetPasswordResult(res.data.password);
        toast.success(sendEmailOnReset ? 'Password reset and emailed.' : 'Password reset successfully.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid Admin password or failed to reset.');
    }
  };

  const getRoleBadge = (type: number) => {
    switch (type) {
      case 2:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">QSA Assessor</span>;
      case 3:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">QA Auditor</span>;
      case 4:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Consultant</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Security Assessors & Auditors</h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage QSA assessors, QA review teams, and compliance advisory consultants.
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Add New Assessor</span>
        </button>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3 text-xs font-semibold">
        {[
          { label: 'All Assessors', val: 'all' },
          { label: 'QSA Assessors', val: '2' },
          { label: 'QA Auditors', val: '3' },
          { label: 'Consultants', val: '4' },
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => setSelectedRole(tab.val)}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              selectedRole === tab.val
                ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Assessor Name</th>
                <th className="py-3.5 px-4">Role / Department</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Loading assessors...
                  </td>
                </tr>
              ) : assessors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    No assessors found in this category.
                  </td>
                </tr>
              ) : (
                assessors.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{a.fullName}</td>
                    <td className="py-3.5 px-4">{getRoleBadge(a.userType)}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{a.email}</td>
                    <td className="py-3.5 px-4 text-slate-600">{a.phoneNumber || '—'}</td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedAssessor(a);
                          setResetPasswordResult(null);
                          setAdminPassword('');
                          setSendEmailOnReset(false);
                          setResetModalOpen(true);
                        }}
                        title="Reset Password"
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Key className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(a)}
                        title="Delete Assessor"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Assessor Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Security Assessor</h3>
              <button onClick={handleCloseCreateModal}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Draft restored banner */}
            {draftRestored && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-700 font-semibold">
                <span>📋</span>
                <span>Draft restored from your last session. <button type="button" onClick={() => { clearDraft(); setFormData({ fullName: '', email: '', phoneNumber: '', userType: 2, password: '' }); setDraftRestored(false); }} className="underline underline-offset-2 hover:text-amber-900">Clear draft</button></span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3 text-xs" noValidate>
              <div>
                <label className="font-bold text-slate-700">Role Designation</label>
                <select
                  value={formData.userType}
                  onChange={(e) => setFormData({ ...formData, userType: Number(e.target.value) })}
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-semibold"
                >
                  <option value={2}>Qualified Security Assessor (QSA)</option>
                  <option value={3}>Quality Assurance (QA)</option>
                  <option value={4}>Compliance Consultant</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    setFormErrors((prev) => ({ ...prev, fullName: validateFullName(e.target.value) }));
                  }}
                  className={`w-full mt-1 p-2 bg-white border rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 ${
                    formErrors.fullName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                <FieldError message={formErrors.fullName} />
              </div>

              <div>
                <label className="font-bold text-slate-700">Email Address (Username)</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setFormErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
                  }}
                  className={`w-full mt-1 p-2 bg-white border rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 ${
                    formErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                <FieldError message={formErrors.email} />
              </div>

              <div>
                <label className="font-bold text-slate-700">
                  Phone Number
                  <span className="ml-1 text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, phoneNumber: e.target.value });
                    setFormErrors((prev) => ({ ...prev, phoneNumber: validatePhone(e.target.value) }));
                  }}
                  placeholder="e.g. +91 98765 43210"
                  className={`w-full mt-1 p-2 bg-white border rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 ${
                    formErrors.phoneNumber ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                <FieldError message={formErrors.phoneNumber} />
              </div>

              <div>
                <label className="font-bold text-slate-700">Initial Password <span className="font-normal text-slate-400">(Optional)</span></label>
                <input
                  type="text"
                  placeholder="Defaults to auto-generated"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setFormErrors((prev) => ({ ...prev, password: validateAdminPassword(e.target.value) }));
                  }}
                  className={`w-full mt-1 p-2 bg-white border rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-mono ${
                    formErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                <FieldError message={formErrors.password} />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Save Assessor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Security Verification</h3>
              <button onClick={() => setResetModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {resetPasswordResult ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
                <p className="text-xs text-slate-500">New Temporary Password for <strong className="text-slate-800">{selectedAssessor?.fullName}</strong>:</p>
                <p className="text-lg font-mono font-bold text-slate-900 select-all p-2 bg-white rounded border border-slate-200">
                  {resetPasswordResult}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(resetPasswordResult);
                    toast.success('Password copied to clipboard');
                  }}
                  className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition"
                >
                  Copy to Clipboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                  <p className="font-semibold mb-1">Reset Assessor Password</p>
                  <p className="text-[11px]">This will immediately invalidate their current password.</p>
                </div>

                <div>
                  <p className="text-slate-600 mb-1">Enter your Super Admin password to confirm:</p>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Super Admin Password"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>

                <div className="flex items-center space-x-2 p-1">
                  <input
                    type="checkbox"
                    id="sendEmailAssessor"
                    checked={sendEmailOnReset}
                    onChange={(e) => setSendEmailOnReset(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <label htmlFor="sendEmailAssessor" className="text-slate-600 font-medium cursor-pointer">
                    Send new password via email
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs transition"
                >
                  Reset Password
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Assessor Modal */}
      {assessorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            {isCheckingAssignment ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <div className="w-7 h-7 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-slate-500 font-medium">Checking project assignments...</p>
              </div>
            ) : assignedProjects.length > 0 ? (
              /* Case 1: Assessor is assigned to projects -> Directly inform them they cannot be deleted */
              <div className="space-y-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900">Cannot Delete Assessor</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <strong className="text-slate-800">{assessorToDelete.fullName}</strong> is currently assigned to{' '}
                      <strong className="text-amber-700 font-semibold">{assignedProjects.length} active project{assignedProjects.length > 1 ? 's' : ''}</strong>.
                    </p>
                  </div>
                  <button onClick={() => setAssessorToDelete(null)}>
                    <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Active Project Assignments
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
                    {assignedProjects.map((p, idx) => (
                      <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                        <div className="font-semibold text-slate-800">
                          {p.client}
                          <span className="text-slate-400 font-normal ml-1.5">({p.process})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                          {p.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    This assessor has assigned projects, so you cannot delete them. Please reassign their projects to another assessor or auditor before deleting.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setAssessorToDelete(null)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                  >
                    Understood, Close
                  </button>
                </div>
              </div>
            ) : (
              /* Case 2: Assessor has no active projects -> Prompt for confirmation to delete */
              <div className="space-y-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900">Delete Assessor / Auditor</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Are you sure you want to delete <strong className="text-slate-800">{assessorToDelete.fullName}</strong> ({assessorToDelete.email})?
                    </p>
                  </div>
                  <button onClick={() => !isDeleting && setAssessorToDelete(null)} disabled={isDeleting}>
                    <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                  </button>
                </div>

                <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <p>
                    No active projects assigned. This assessor account can be safely removed.
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setAssessorToDelete(null)}
                    className="px-4 py-2 font-semibold text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                  >
                    {isDeleting ? (
                      <span>Deleting...</span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation guard — fires when user tries to leave while assessor form is open */}
      <NavigationGuardModal
        isOpen={isGuardOpen}
        onSave={handleSaveDraftAndLeave}
        onDiscard={confirmNavigation}
        onStay={cancelNavigation}
        saveLabel="Save Draft & Leave"
        discardLabel="Discard & Clear Draft"
        title="Unsaved Auditor Form"
        description="You have unsaved details in the auditor form. Would you like to save your draft to local storage before leaving, or discard it?"
      />
    </div>
  );
};
