import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import { TrustGauge } from '../../components/ui/TrustGauge';
import {
  User,
  Mail,
  Building,
  GraduationCap,
  Phone,
  KeyRound,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  RefreshCw,
  Camera,
  Layers,
  ArrowRight,
  Wallet,
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshProfile, logout } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Profile Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [departmentId, setDepartmentId] = useState<number | ''>(user?.departmentId || '');
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || '');
  const [departments, setDepartments] = useState<any[]>([]);

  // Password Change State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form Validation & Submission State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Danger Zone / Account Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteEligibility, setDeleteEligibility] = useState<{
    canDelete: boolean;
    blockers: string[];
    activeRentalsCount: number;
    activeRentals: any[];
    escrowLockedTotal: number;
    activeListingsCount: number;
    availableInventoryCount: number;
  } | null>(null);
  const [isLoadingEligibility, setIsLoadingEligibility] = useState(false);

  // Preset Avatar Options
  const AVATAR_PRESETS = [
    { label: 'Academic Blue', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
    { label: 'Engineer Bench', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' },
    { label: 'Lab Researcher', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
    { label: 'Maker Purple', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
  ];

  // Sync state when user profile changes
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setStudentId(user.studentId || '');
      setPhone(user.phone || '');
      setDepartmentId(user.departmentId || '');
      setProfileImageUrl(user.profileImageUrl || '');
    }
  }, [user]);

  // Load departments for user's university
  useEffect(() => {
    if (user?.universityId) {
      api
        .getUniversities()
        .then((res) => {
          const matchedUni = res.universities.find(
            (u: any) => Number(u.university_id) === Number(user.universityId)
          );
          if (matchedUni && Array.isArray(matchedUni.departments)) {
            setDepartments(matchedUni.departments);
          }
        })
        .catch(() => {});
    }
  }, [user?.universityId]);

  // Load deletion eligibility check
  const loadDeletionEligibility = async () => {
    setIsLoadingEligibility(true);
    try {
      const data = await api.getDeletionEligibility();
      setDeleteEligibility(data);
    } catch {
      // Fallback
    } finally {
      setIsLoadingEligibility(false);
    }
  };

  useEffect(() => {
    loadDeletionEligibility();
  }, []);

  const clearFieldError = (field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters';
    }

    if (!studentId.trim() || studentId.trim().length < 2) {
      errors.student_id = 'Student ID / Roll must be at least 2 characters';
    }

    if (phone.trim() && phone.trim().length > 30) {
      errors.phone = 'Phone number cannot exceed 30 characters';
    }

    if (showPasswordSection && (currentPassword || newPassword || confirmPassword)) {
      if (!currentPassword) {
        errors.current_password = 'Enter your current password to set a new password';
      }
      if (!newPassword || newPassword.length < 6) {
        errors.new_password = 'New password must be at least 6 characters long';
      }
      if (newPassword && newPassword !== confirmPassword) {
        errors.confirm_password = 'New passwords do not match';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstErr = Object.values(errors)[0];
      error('Validation Failed', firstErr);
      return;
    }

    setFormErrors({});
    setIsSaving(true);

    try {
      const payload: any = {
        full_name: fullName.trim(),
        student_id: studentId.trim(),
        phone: phone.trim() || null,
        department_id: departmentId ? Number(departmentId) : null,
        profile_image_url: profileImageUrl.trim() || null,
      };

      if (showPasswordSection && newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await api.updateProfile(payload);
      await refreshProfile();
      success('Profile Updated', res.message || 'Your account details were saved successfully.');

      // Clear password fields on successful update
      if (newPassword) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      }
    } catch (err: any) {
      if (err.issues && Array.isArray(err.issues)) {
        const fieldIssues: Record<string, string> = {};
        for (const issue of err.issues) {
          if (issue.field) {
            fieldIssues[issue.field] = issue.message;
          }
        }
        setFormErrors(fieldIssues);
      }
      error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Permanent Account Deletion
  const handleDeleteAccount = async () => {
    if (!deletePassword && deleteConfirmationText !== 'DELETE') {
      error(
        'Confirmation Required',
        'Please enter your password or type DELETE in uppercase to confirm account deletion'
      );
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteAccount({
        password: deletePassword || undefined,
        confirmation: deleteConfirmationText.trim(),
      });

      setIsDeleteModalOpen(false);
      logout();
      navigate('/login');
      success(
        'Account Deleted',
        'Your BorrowLab account, active listings, and inventory units have been permanently removed.'
      );
    } catch (err: any) {
      error(err.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account & Profile Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your verified campus credentials, contact information, security keys, and account lifecycle.
        </p>
      </div>

      {/* Hero Overview Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-level-3 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* User Avatar with Ring */}
            <div className="relative shrink-0">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={user.fullName}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover ring-3 ring-indigo-400/40 shadow-lg"
                />
              ) : (
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600/60 ring-3 ring-indigo-400/40 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-wider uppercase border-2 border-slate-900">
                {user.status}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">{user.fullName}</h2>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-semibold text-[11px] uppercase tracking-wider">
                  {user.roles[0] || 'STUDENT'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  {user.universityEmail}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  ID: {user.studentId}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  {user.universityShortName || 'University'}
                </span>
                {user.departmentCode && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-slate-400" />
                    {user.departmentCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm self-start md:self-auto">
            <div className="text-center px-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trust Score</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">{user.trustScore.toFixed(0)}%</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center px-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Wallet Balance</div>
              <div className="text-lg font-bold text-indigo-300 font-mono mt-0.5">
                {(user.walletBalance || 0).toLocaleString()} ৳
              </div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center px-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Rentals</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {(user.activeBorrowsCount || 0) + (user.activeLendsCount || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Edit Form */}
      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <User className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                1. Institutional & Contact Details
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Fields with * are required</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Full Legal Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clearFieldError('full_name');
                }}
                placeholder="e.g. John Doe"
                className={`w-full h-[40px] bg-white border rounded-lg px-3 text-sm text-slate-900 focus:outline-none shadow-xs ${
                  formErrors.full_name
                    ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                }`}
                required
              />
              {formErrors.full_name && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.full_name}
                </p>
              )}
            </div>

            {/* University Email (Readonly) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  University Email Address
                </label>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  Institutional SSO Locked
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  value={user.universityEmail}
                  disabled
                  className="w-full h-[40px] bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-500 font-mono cursor-not-allowed select-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tied to your university domain verification ({user.universityShortName || 'Campus'}).
              </p>
            </div>

            {/* Student ID / Roll */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Student ID / Institutional Roll *
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value);
                  clearFieldError('student_id');
                }}
                placeholder="e.g. 011201048"
                className={`w-full h-[40px] bg-white border rounded-lg px-3 text-sm font-mono text-slate-900 focus:outline-none shadow-xs ${
                  formErrors.student_id
                    ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                }`}
                required
              />
              {formErrors.student_id && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.student_id}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Phone Number (Mobile)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-mono font-semibold text-slate-400">+880</span>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFieldError('phone');
                  }}
                  placeholder="1XXXXXXXXX"
                  className={`w-full h-[40px] bg-white border rounded-lg pl-14 pr-3 text-sm font-mono text-slate-900 focus:outline-none shadow-xs ${
                    formErrors.phone
                      ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                      : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
              </div>
              {formErrors.phone && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.phone}
                </p>
              )}
              <p className="text-[11px] text-slate-500 mt-1">Used for campus pickup handshakes and return alerts.</p>
            </div>

            {/* Department */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Academic Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(Number(e.target.value) || '');
                  clearFieldError('department_id');
                }}
                className={`w-full h-[40px] bg-white border rounded-lg px-3 text-sm text-slate-900 focus:outline-none shadow-xs ${
                  formErrors.department_id
                    ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              >
                <option value="">-- Select Your Department --</option>
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
              {formErrors.department_id && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.department_id}
                </p>
              )}
            </div>
          </div>

          {/* Avatar / Profile Image Selection */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Profile Avatar Photo
              </label>
              <span className="text-[11px] text-slate-400">Select preset or provide photo URL</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... or avatar image URL"
                className="flex-1 w-full h-[38px] bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              {profileImageUrl && (
                <button
                  type="button"
                  onClick={() => setProfileImageUrl('')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium shrink-0"
                >
                  Clear Photo
                </button>
              )}
            </div>

            {/* Quick Avatar Presets */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-400 text-[11px]">Quick Avatars:</span>
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setProfileImageUrl(preset.url)}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 font-medium transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Security & Password Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <KeyRound className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                2. Security & Password
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPasswordSection(!showPasswordSection);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setFormErrors({});
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {showPasswordSection ? 'Cancel Password Change' : '+ Change Password'}
            </button>
          </div>

          {!showPasswordSection ? (
            <p className="text-xs text-slate-500 leading-relaxed">
              Your password is encrypted with standard bcrypt hashing. Click "+ Change Password" above if you wish to
              rotate your account credentials.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 animate-in fade-in duration-200">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Current Password *
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      clearFieldError('current_password');
                    }}
                    placeholder="••••••••"
                    className={`w-full h-[40px] bg-white border rounded-lg pl-3 pr-10 text-sm text-slate-900 focus:outline-none shadow-xs ${
                      formErrors.current_password
                        ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.current_password && (
                  <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.current_password}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  New Password *
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      clearFieldError('new_password');
                    }}
                    placeholder="Min 6 characters"
                    className={`w-full h-[40px] bg-white border rounded-lg pl-3 pr-10 text-sm text-slate-900 focus:outline-none shadow-xs ${
                      formErrors.new_password
                        ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.new_password && (
                  <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.new_password}
                  </p>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError('confirm_password');
                  }}
                  placeholder="Repeat new password"
                  className={`w-full h-[40px] bg-white border rounded-lg px-3 text-sm text-slate-900 focus:outline-none shadow-xs ${
                    formErrors.confirm_password
                      ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                      : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
                {formErrors.confirm_password && (
                  <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.confirm_password}
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Action Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            className="px-6 gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Save Account Changes
          </Button>
        </div>
      </form>

      {/* Danger Zone: Account Deletion */}
      <div className="pt-6 border-t border-slate-200">
        <div className="border border-red-200 bg-red-50/40 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-950 uppercase tracking-wider">
                Danger Zone: Delete Account
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Permanently deactivate or remove your BorrowLab profile, active listings, and inventory units.
              </p>
            </div>
          </div>

          {/* Deletion Eligibility Status Box */}
          {deleteEligibility && (
            <div className="rounded-xl border p-4 bg-white/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  Account Deletion Pre-Flight Check:
                </span>
                {deleteEligibility.canDelete ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Eligible for Deletion
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Commitments Pending
                  </span>
                )}
              </div>

              {deleteEligibility.canDelete ? (
                <p className="text-xs text-slate-500 leading-relaxed">
                  You have 0 active rentals and 0 locked escrow funds. Deleting your account will retire any listed
                  hardware and close your profile.
                </p>
              ) : (
                <div className="space-y-2 text-xs text-amber-900 bg-amber-50/70 p-3 rounded-lg border border-amber-200/80">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    Please resolve the following items before deleting your account:
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
                    {deleteEligibility.blockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>

                  {deleteEligibility.activeRentalsCount > 0 && (
                    <div className="pt-1">
                      <Link
                        to="/rentals"
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 underline"
                      >
                        View Active Rentals & Returns <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Delete Action Trigger */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500">
              Once initiated, you will be signed out immediately. Historical audit entries will be securely anonymized.
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteEligibility ? !deleteEligibility.canDelete : false}
              onClick={() => {
                setDeleteConfirmationText('');
                setDeletePassword('');
                setIsDeleteModalOpen(true);
              }}
              className="gap-1.5 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete My Account
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Account Deletion"
        subtitle="This action is permanent and cannot be reversed."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-950 space-y-1">
              <div className="font-bold">Permanent Account Termination</div>
              <p className="text-slate-600 leading-relaxed">
                By deleting your account, all personal profile information, your hardware listings, and waitlist
                entries will be removed or retired.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Confirm by entering your Password
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full h-[40px] bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-mono uppercase">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Type <span className="text-red-600 font-mono font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full h-[40px] bg-white border border-slate-300 rounded-lg px-3 text-sm font-mono text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDeleteAccount}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Permanently Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
