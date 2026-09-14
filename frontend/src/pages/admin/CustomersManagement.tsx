import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Download,
  Eye,
  Trash2,
  Edit,
  Layers,
  Archive,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  validateFullName,
  validateEmail,
  validatePhone,
  validateCompanyName,
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

export const CustomersManagement: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    companyName: '',
    companyNumber: '',
    address: '',
    password: '',
  });

  const [adminPassword, setAdminPassword] = useState('');
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);

  // Processes state
  const [processes, setProcesses] = useState<any[]>([]);
  const [newProcessName, setNewProcessName] = useState('');

  // Form validation errors
  const [formErrors, setFormErrors] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    companyName: '',
    password: '',
  });

  // localStorage draft for the create-customer modal
  const { getDraft, saveDraft, clearDraft, hasDraft } = useFormDraft<typeof formData>('createCustomer');
  const [draftRestored, setDraftRestored] = useState(false);

  const validateForm = () => {
    const errors = {
      fullName: validateFullName(formData.fullName),
      email: validateEmail(formData.email),
      phoneNumber: validatePhone(formData.phoneNumber),
      companyName: validateCompanyName(formData.companyName),
      password: validateAdminPassword(formData.password),
    };
    setFormErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  // Navigation guard — block page nav when modal is open with unsaved data
  const formHasData = createModalOpen && (
    formData.fullName.trim() !== '' ||
    formData.email.trim() !== '' ||
    formData.phoneNumber.trim() !== '' ||
    formData.companyName.trim() !== '' ||
    formData.companyNumber.trim() !== '' ||
    formData.address.trim() !== '' ||
    formData.password.trim() !== ''
  );

  const { isGuardOpen, confirmNavigation, cancelNavigation, proceedNavigation } = useNavigationGuard({
    isDirty: formHasData,
    onDiscard: () => {
      clearDraft();
      setCreateModalOpen(false);
      setFormData({ fullName: '', email: '', phoneNumber: '', companyName: '', companyNumber: '', address: '', password: '' });
      setFormErrors({ fullName: '', email: '', phoneNumber: '', companyName: '', password: '' });
      setDraftRestored(false);
      toast.info('Draft discarded and cleared from local storage.');
    },
  });

  const handleSaveDraftAndLeave = () => {
    saveDraft(formData);
    toast.success('Customer details saved as draft in local storage.', { duration: 4000 });
    setCreateModalOpen(false);
    proceedNavigation();
  };

  const fetchCustomers = () => {
    setIsLoading(true);
    api
      .get('/admin/customers')
      .then((res) => setCustomers(res.data.customers))
      .catch((err) => toast.error(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Restore draft when the create modal opens
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
      const res = await api.post('/admin/customers', formData);
      if (res.data.success) {
        toast.success('Customer created successfully.');
        clearDraft(); // Remove saved draft on success
        setCreateModalOpen(false);
        setFormData({
          fullName: '',
          email: '',
          phoneNumber: '',
          companyName: '',
          companyNumber: '',
          address: '',
          password: '',
        });
        setFormErrors({ fullName: '', email: '', phoneNumber: '', companyName: '', password: '' });
        setDraftRestored(false);
        fetchCustomers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create customer.');
    }
  };

  const handleCloseCreateModal = () => {
    // Keep the draft in localStorage so it can be restored next time
    setCreateModalOpen(false);
  };

  const handleRevealPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword || !selectedCustomer) return;
    try {
      const res = await api.post(`/admin/users/${selectedCustomer._id}/reveal-password`, {
        adminPassword,
      });
      if (res.data.success) {
        setRevealedPassword(res.data.password);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid Admin password.');
    }
  };

  const openProcessModal = async (cust: any) => {
    setSelectedCustomer(cust);
    setProcessModalOpen(true);
    try {
      const res = await api.get(`/admin/customers/${cust._id}/processes`);
      if (res.data.success) {
        setProcesses(res.data.processes);
      }
    } catch (error: any) {
      toast.error('Failed to load processes.');
    }
  };

  const handleAddProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcessName.trim() || !selectedCustomer) return;
    try {
      const res = await api.post('/admin/processes', {
        customerId: selectedCustomer._id,
        processName: newProcessName.trim(),
      });
      if (res.data.success) {
        toast.success('Process created.');
        setNewProcessName('');
        setProcesses((prev) => [...prev, res.data.process]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add process.');
    }
  };

  const handleArchiveProcess = async (processId: string) => {
    if (!confirm('Move this process to the historical archive?')) return;
    try {
      const res = await api.post(`/admin/processes/${processId}/archive`);
      if (res.data.success) {
        toast.success('Process archived.');
        setProcesses((prev) => prev.filter((p) => p._id !== processId));
      }
    } catch (error: any) {
      toast.error('Failed to archive process.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Organizations</h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage enterprise clients and compliance audit scopes.
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-xs shadow-xs flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Add New Customer</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Organization / Contact</th>
                <th className="py-3.5 px-4">Company Number</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    No customer organizations registered yet.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900">{c.companyName || c.fullName}</span>
                        <p className="text-[11px] text-slate-400">{c.fullName}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{c.companyNumber || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{c.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => openProcessModal(c)}
                        title="Manage Audit Processes"
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Layers className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustomer(c);
                          setRevealedPassword(null);
                          setAdminPassword('');
                          setRevealModalOpen(true);
                        }}
                        title="Reveal Password"
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Customer Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Customer Organization</h3>
              <button onClick={handleCloseCreateModal}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Draft restored banner */}
            {draftRestored && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-700 font-semibold">
                <span>📋</span>
                <span>Draft restored from your last session. <button type="button" onClick={() => { clearDraft(); setFormData({ fullName: '', email: '', phoneNumber: '', companyName: '', companyNumber: '', address: '', password: '' }); setDraftRestored(false); }} className="underline underline-offset-2 hover:text-amber-900">Clear draft</button></span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3 text-xs" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Company / Organization Name</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => {
                      setFormData({ ...formData, companyName: e.target.value });
                      setFormErrors((prev) => ({ ...prev, companyName: validateCompanyName(e.target.value) }));
                    }}
                    className={`w-full mt-1 p-2 bg-white border rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 ${
                      formErrors.companyName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    }`}
                  />
                  <FieldError message={formErrors.companyName} />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Company ID / Number</label>
                  <input
                    type="text"
                    value={formData.companyNumber}
                    onChange={(e) => setFormData({ ...formData, companyNumber: e.target.value })}
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Primary Contact Person</label>
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
              </div>

              <div>
                <label className="font-bold text-slate-700">Email Address (Login Username)</label>
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
                <label className="font-bold text-slate-700">Custom Password <span className="font-normal text-slate-400">(Optional — auto-generated if blank)</span></label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setFormErrors((prev) => ({ ...prev, password: validateAdminPassword(e.target.value) }));
                  }}
                  placeholder="Auto-generated if left blank"
                  className={`w-full mt-1 p-2 bg-white border rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 ${
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
                  Create Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reveal Password Modal */}
      {revealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Security Verification</h3>
              <button onClick={() => setRevealModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {revealedPassword ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <p className="text-xs text-slate-500">Plaintext User Password:</p>
                <p className="text-lg font-mono font-bold text-slate-900 select-all">{revealedPassword}</p>
              </div>
            ) : (
              <form onSubmit={handleRevealPassword} className="space-y-3 text-xs">
                <p className="text-slate-600">Enter your Super Admin password to reveal user credentials:</p>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Super Admin Password"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Verify & Reveal
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Process Scope Modal */}
      {processModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Audit Processes & Scopes</h3>
                <p className="text-xs text-slate-500">{selectedCustomer.companyName || selectedCustomer.fullName}</p>
              </div>
              <button onClick={() => setProcessModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Add Process */}
            <form onSubmit={handleAddProcess} className="flex gap-2 text-xs">
              <input
                type="text"
                required
                value={newProcessName}
                onChange={(e) => setNewProcessName(e.target.value)}
                placeholder="e.g. Cardholder Data Environment (CDE)"
                className="flex-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-xs"
              >
                Add Process
              </button>
            </form>

            {/* List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {processes.length === 0 ? (
                <p className="text-slate-400 italic py-4 text-center">No active audit processes configured.</p>
              ) : (
                processes.map((p) => (
                  <div
                    key={p._id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center"
                  >
                    <span className="font-semibold text-slate-800">{p.processName}</span>
                    <button
                      onClick={() => handleArchiveProcess(p._id)}
                      title="Move to Archive"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition"
                    >
                      <Archive className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation guard — fires when user tries to leave page with the form open */}
      <NavigationGuardModal
        isOpen={isGuardOpen}
        onSave={handleSaveDraftAndLeave}
        onDiscard={confirmNavigation}
        onStay={cancelNavigation}
        saveLabel="Save Draft & Leave"
        discardLabel="Discard & Clear Draft"
        title="Unsaved Customer Form"
        description="You have unsaved details in the customer form. Would you like to save your draft to local storage before leaving, or discard it?"
      />
    </div>
  );
};
