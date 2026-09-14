import React, { useEffect, useMemo, useState } from 'react';
import { User as UserIcon, Lock, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  validateFullName,
  validatePhone,
  validatePassword,
  validateConfirmPassword,
} from '../../utils/validators';
import { useNavigationGuard } from '../../hooks/useNavigationGuard';
import { NavigationGuardModal } from '../../components/common/NavigationGuardModal';

// Reusable inline error component
const FieldError: React.FC<{ message: string }> = ({ message }) =>
  message ? (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600 font-medium">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  ) : null;

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  // --- Profile fields ---
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [address, setAddress] = useState(user?.address || '');

  // --- Password fields ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- Loading states for manual save buttons ---
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // --- Validation error state — profile form ---
  const [profileErrors, setProfileErrors] = useState({
    fullName: '',
    phoneNumber: '',
  });

  // --- Validation error state — password form ---
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Sync form fields when user profile loads or changes
  useEffect(() => {
    if (user) {
      setFullName((prev) => (prev === '' ? (user.fullName || '') : prev));
      setPhoneNumber((prev) => (prev === '' ? (user.phoneNumber || '') : prev));
      setCompanyName((prev) => (prev === '' ? (user.companyName || '') : prev));
      setAddress((prev) => (prev === '' ? (user.address || '') : prev));
    }
  }, [user]);

  // Combine all editable profile fields into a single object for saving
  const profileData = useMemo(
    () => ({ fullName, phoneNumber, companyName, address }),
    [fullName, phoneNumber, companyName, address]
  );

  // -------------------------------------------------------
  // NAVIGATION GUARD — only block when user actually changed data
  // -------------------------------------------------------
  const isProfileChanged = useMemo(() => {
    if (!user) return false;
    return (
      (fullName || '').trim() !== (user.fullName || '').trim() ||
      (phoneNumber || '').trim() !== (user.phoneNumber || '').trim() ||
      (companyName || '').trim() !== (user.companyName || '').trim() ||
      (address || '').trim() !== (user.address || '').trim()
    );
  }, [user, fullName, phoneNumber, companyName, address]);

  const isPasswordChanged = Boolean(
    currentPassword.trim() || newPassword.trim() || confirmPassword.trim()
  );

  // Dirty only if actual values differ from the database or password is typed
  const profileIsDirty = isProfileChanged || isPasswordChanged;
  const [isSavingAndLeaving, setIsSavingAndLeaving] = useState(false);

  const { isGuardOpen, confirmNavigation, cancelNavigation, proceedNavigation } = useNavigationGuard({
    isDirty: profileIsDirty,
    onDiscard: () => {
      if (user) {
        setFullName(user.fullName || '');
        setPhoneNumber(user.phoneNumber || '');
        setCompanyName(user.companyName || '');
        setAddress(user.address || '');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setProfileErrors({ fullName: '', phoneNumber: '' });
      setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.info('Changes discarded.');
    },
  });

  // -------------------------------------------------------
  // Live validation handlers
  // -------------------------------------------------------
  const handleFullNameChange = (val: string) => {
    setFullName(val);
    setProfileErrors((prev) => ({ ...prev, fullName: validateFullName(val) }));
  };

  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    setProfileErrors((prev) => ({ ...prev, phoneNumber: validatePhone(val) }));
  };

  const handleNewPasswordChange = (val: string) => {
    setNewPassword(val);
    setPasswordErrors((prev) => ({
      ...prev,
      newPassword: validatePassword(val),
      confirmPassword: confirmPassword ? validateConfirmPassword(val, confirmPassword) : prev.confirmPassword,
    }));
  };

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val);
    setPasswordErrors((prev) => ({
      ...prev,
      confirmPassword: validateConfirmPassword(newPassword, val),
    }));
  };

  // -------------------------------------------------------
  // Manual save handlers (still available via button)
  // -------------------------------------------------------
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateFullName(fullName);
    const phoneErr = validatePhone(phoneNumber);
    setProfileErrors({ fullName: nameErr, phoneNumber: phoneErr });

    if (nameErr || phoneErr) {
      toast.error('Please fix the form errors before saving.');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      const res = await api.put('/auth/profile', profileData);
      if (res.data.success) {
        toast.success('Profile details updated.');
        refreshUser();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentErr = currentPassword ? '' : 'Current password is required.';
    const newErr = validatePassword(newPassword);
    const confirmErr = validateConfirmPassword(newPassword, confirmPassword);
    setPasswordErrors({ currentPassword: currentErr, newPassword: newErr, confirmPassword: confirmErr });

    if (currentErr || newErr || confirmErr) {
      toast.error('Please fix the form errors before updating.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (res.data.success) {
        toast.success('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  /**
   * Called from the navigation guard when user picks "Save & Leave".
   * Persists the profile to the server, then proceeds with the blocked navigation.
   */
  const handleSaveAndLeave = async () => {
    setIsSavingAndLeaving(true);
    try {
      const res = await api.put('/auth/profile', profileData);
      if (res.data.success) {
        refreshUser();
        toast.success('Profile saved successfully.');
        proceedNavigation();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSavingAndLeaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">User Profile &amp; Security Settings</h2>
        <p className="text-sm text-slate-500 font-medium">
          Manage your personal details, contact information, and security password.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Profile Card ── */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          {/* Header row with status indicator */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <UserIcon className="w-5 h-5 text-sky-600" />
              <h3 className="text-base font-bold text-slate-900">Personal &amp; Organization Info</h3>
            </div>
            {isProfileChanged && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </span>
            )}
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs" noValidate>
            <div>
              <label className="font-bold text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => handleFullNameChange(e.target.value)}
                className={`w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition ${
                  profileErrors.fullName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              <FieldError message={profileErrors.fullName} />
            </div>

            <div>
              <label className="font-bold text-slate-700">Email Address (Read Only)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full mt-1 p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">
                Phone Number
                <span className="ml-1 text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className={`w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition ${
                  profileErrors.phoneNumber ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              <FieldError message={profileErrors.phoneNumber} />
              {!profileErrors.phoneNumber && (
                <p className="mt-1 text-[11px] text-slate-400">Allowed: digits, spaces, +, -, ( )</p>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700">Organization / Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">Address / Location</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>

            {/* Manual save button — still available as fallback / explicit action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-white" />
                <span>{isUpdatingProfile ? 'Saving…' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ── Security & Password Card ── */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Lock className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900">Change Password</h3>
          </div>
          {/* Note: password changes are intentional — no autosave */}
          <p className="text-[11px] text-slate-400 italic -mt-2">
            Password changes require an explicit submit for security.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs" noValidate>
            <div>
              <label className="font-bold text-slate-700">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordErrors((prev) => ({
                    ...prev,
                    currentPassword: e.target.value ? '' : 'Current password is required.',
                  }));
                }}
                placeholder="••••••••"
                className={`w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition ${
                  passwordErrors.currentPassword ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              <FieldError message={passwordErrors.currentPassword} />
            </div>

            <div>
              <label className="font-bold text-slate-700">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => handleNewPasswordChange(e.target.value)}
                placeholder="••••••••"
                className={`w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition ${
                  passwordErrors.newPassword ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              <FieldError message={passwordErrors.newPassword} />
              {!passwordErrors.newPassword && (
                <p className="mt-1 text-[11px] text-slate-400">Min 8 chars, 1 uppercase letter, 1 number</p>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                placeholder="••••••••"
                className={`w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition ${
                  passwordErrors.confirmPassword ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              <FieldError message={passwordErrors.confirmPassword} />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Lock className="w-4 h-4 text-white" />
                <span>{isUpdatingPassword ? 'Updating…' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Navigation guard dialog */}
      <NavigationGuardModal
        isOpen={isGuardOpen}
        onSave={handleSaveAndLeave}
        onDiscard={confirmNavigation}
        onStay={cancelNavigation}
        isSaving={isSavingAndLeaving}
        saveLabel="Save Profile & Leave"
        discardLabel="Discard Changes & Leave"
        title="Unsaved Profile Changes"
        description="You have unsaved changes in your profile. Would you like to save before navigating away, or discard them?"
      />
    </div>
  );
};
