import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PERMISSION_CATEGORIES, 
  PRESET_ROLES, 
  PRESET_DESIGNATIONS, 
  ALL_PERMISSIONS, 
  assignAdminRole, 
  updateAdminPermissions, 
  toggleAdminStatus, 
  revokeAdminRole, 
  subscribeAllAdmins, 
  subscribeAuditLogs,
  isOwnerAccount 
} from '../../utils/permissionService';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { 
  ShieldCheck, 
  ShieldAlert, 
  UserPlus, 
  Users, 
  Search, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Trash2, 
  Lock, 
  Unlock, 
  Crown, 
  Key, 
  Sparkles, 
  RefreshCw, 
  FileText, 
  Check, 
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  History,
  Tag,
  Shield,
  Layers,
  Megaphone
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminManagement() {
  const { currentUser, userProfile, isOwner } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('all_admins'); // 'all_admins' | 'add_admin' | 'audit_logs'

  // Admins List State
  const [adminsList, setAdminsList] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');

  // All Registered Students (for user selection in Add Admin)
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Add/Edit Form State
  const [selectedDesignation, setSelectedDesignation] = useState('Manager');
  const [customDesignation, setCustomDesignation] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState(
    PRESET_ROLES.find(r => r.id === 'manager')?.permissions || []
  );
  const [selectedPresetId, setSelectedPresetId] = useState('manager');
  const [submitting, setSubmitting] = useState(false);

  // Edit Admin Modal State
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editDesignation, setEditDesignation] = useState('');
  const [editPermissions, setEditPermissions] = useState([]);
  const [isEditSaving, setIsEditSaving] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Expanded permissions view in cards
  const [expandedPermAdminId, setExpandedPermAdminId] = useState(null);

  // 1. Subscribe to Admins list
  useEffect(() => {
    const unsub = subscribeAllAdmins((list) => {
      setAdminsList(list);
      setLoadingAdmins(false);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to Users list (for Add Admin search)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllUsers(list);
    }, (err) => {
      console.error("Error loading users:", err);
    });
    return () => unsub();
  }, []);

  // 3. Subscribe to Audit Logs
  useEffect(() => {
    const unsub = subscribeAuditLogs((logs) => {
      setAuditLogs(logs);
      setLoadingLogs(false);
    }, 60);
    return () => unsub();
  }, []);

  // Filter Admins
  const filteredAdmins = useMemo(() => {
    const term = adminSearchTerm.trim().toLowerCase();
    if (!term) return adminsList;
    return adminsList.filter(a => {
      const name = (a.name || '').toLowerCase();
      const email = (a.email || '').toLowerCase();
      const desig = (a.adminDesignation || '').toLowerCase();
      const roll = (a.rollNumber || '').toLowerCase();
      return name.includes(term) || email.includes(term) || desig.includes(term) || roll.includes(term);
    });
  }, [adminsList, adminSearchTerm]);

  // Filter Candidates for Add Admin
  const candidateUsers = useMemo(() => {
    const term = userSearchTerm.trim().toLowerCase();
    if (!term || term.length < 2) return [];

    return allUsers
      .filter(u => {
        // Exclude current super admins and already active admins from search results unless selecting
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const roll = (u.rollNumber || '').toLowerCase();
        return name.includes(term) || email.includes(term) || roll.includes(term);
      })
      .slice(0, 10);
  }, [allUsers, userSearchTerm]);

  // Handle Preset Selection in Add Form
  const handleApplyPreset = (presetId) => {
    setSelectedPresetId(presetId);
    if (presetId === 'all') {
      setSelectedPermissions(ALL_PERMISSIONS);
      return;
    }
    const found = PRESET_ROLES.find(r => r.id === presetId);
    if (found) {
      setSelectedPermissions(found.permissions);
      setSelectedDesignation(found.designation);
      setCustomDesignation('');
    }
  };

  // Toggle single permission in Add Form
  const togglePermission = (permId) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permId)) {
        return prev.filter(p => p !== permId);
      } else {
        return [...prev, permId];
      }
    });
    setSelectedPresetId('custom');
  };

  // Toggle Category in Add Form
  const toggleCategoryPermissions = (categoryPerms) => {
    const catIds = categoryPerms.map(p => p.id);
    const allSelected = catIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !catIds.includes(id)));
    } else {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...catIds])));
    }
    setSelectedPresetId('custom');
  };

  // Handle Creating / Granting Admin Role
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error("Please search and select a user first.");
      return;
    }

    const designationToAssign = selectedDesignation === 'Custom' 
      ? (customDesignation.trim() || 'Admin') 
      : selectedDesignation;

    if (!designationToAssign) {
      toast.error("Please specify an Admin Designation.");
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error("Please assign at least one permission.");
      return;
    }

    setSubmitting(true);
    try {
      await assignAdminRole({
        userDocId: selectedUser.id,
        designation: designationToAssign,
        permissions: selectedPermissions,
        status: 'active',
        performedBy: { user: currentUser, profile: userProfile }
      });

      toast.success(`✓ Successfully granted Admin access to ${selectedUser.name} as ${designationToAssign}!`);
      setSelectedUser(null);
      setUserSearchTerm('');
      setActiveSubTab('all_admins');
    } catch (err) {
      console.error("Assign admin error:", err);
      toast.error(err.message || "Failed to assign admin access.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (admin) => {
    setEditingAdmin(admin);
    setEditDesignation(admin.adminDesignation || 'Admin');
    setEditPermissions(Array.isArray(admin.permissions) ? admin.permissions : []);
  };

  // Save Edit Admin
  const handleSaveEditAdmin = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setIsEditSaving(true);
    try {
      await updateAdminPermissions({
        adminUid: editingAdmin.uid || editingAdmin.id,
        designation: editDesignation.trim() || 'Admin',
        permissions: editPermissions,
        performedBy: { user: currentUser, profile: userProfile }
      });

      toast.success(`✓ Updated permissions for ${editingAdmin.name}!`);
      setEditingAdmin(null);
    } catch (err) {
      console.error("Edit admin error:", err);
      toast.error(err.message || "Failed to update permissions.");
    } finally {
      setIsEditSaving(false);
    }
  };

  // Toggle Admin Status
  const handleToggleStatus = async (admin) => {
    const isCurrentlyActive = admin.adminStatus !== 'inactive';
    const newStatus = isCurrentlyActive ? 'inactive' : 'active';
    const actionWord = isCurrentlyActive ? 'deactivate' : 'activate';

    if (!window.confirm(`Are you sure you want to ${actionWord} Admin privileges for ${admin.name}?`)) {
      return;
    }

    try {
      await toggleAdminStatus({
        adminUid: admin.uid || admin.id,
        newStatus,
        performedBy: { user: currentUser, profile: userProfile }
      });
      toast.success(`Admin ${admin.name} is now ${newStatus}.`);
    } catch (err) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  // Remove Admin
  const handleRemoveAdmin = async (admin) => {
    if (!window.confirm(`⚠️ DANGER: Are you sure you want to completely REVOKE all Admin privileges for "${admin.name}"?\n\nThey will be reverted to a normal student account.`)) {
      return;
    }

    try {
      await revokeAdminRole({
        adminUid: admin.uid || admin.id,
        performedBy: { user: currentUser, profile: userProfile }
      });
      toast.success(`Revoked admin access for ${admin.name}.`);
    } catch (err) {
      toast.error(err.message || "Failed to revoke admin.");
    }
  };

  // Check if target is Owner
  const isTargetOwner = (admin) => {
    return isOwnerAccount({ email: admin.email }, admin);
  };

  // Security gate: If current user is not Owner, block view
  if (!isOwner) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl glass-card border border-red-500/40 text-center space-y-6 max-w-2xl mx-auto my-12 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-red-500/20 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Access Denied: Owner Privileges Required</h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Only the <strong>Platform Owner / Super Admin</strong> has authorization to manage administrators, grant roles, and configure system permissions.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/5 text-xs text-slate-400">
          Your current designation: <strong className="text-amber-400">{userProfile?.adminDesignation || 'Administrator'}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-royal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-bold border border-gold-500/30">
              <Crown className="w-3.5 h-3.5 text-gold-400" />
              <span>Owner & Super Admin Security Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Admin Management & <span className="gold-gradient-text">Role-Based Access</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Create and manage administrators, assign custom designations (e.g. <strong>CEO, Manager, Batch Coordinator</strong>), configure granular section permissions, and audit security events.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 shrink-0 text-center sm:text-right space-y-1.5">
            <div className="text-xs font-black uppercase tracking-wider text-gold-400 flex items-center justify-center sm:justify-end gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Owner Authorized</span>
            </div>
            <div className="text-sm font-extrabold text-white">
              {userProfile?.name || currentUser?.email}
            </div>
            <div className="text-[11px] text-slate-400">
              Full System Access Active
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-2xl glass-card border border-white/10">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          
          <button
            type="button"
            onClick={() => setActiveSubTab('all_admins')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'all_admins'
                ? 'bg-gradient-to-r from-royal-600 to-sky-600 text-white shadow-glow-royal scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 All Admins</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold ml-1">
              {adminsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('add_admin')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'add_admin'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow-emerald scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>➕ Add New Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('audit_logs')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'audit_logs'
                ? 'bg-gradient-to-r from-amber-500 to-gold-500 text-navy-950 shadow-glow-gold scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            <span>📜 Security Audit Logs</span>
          </button>

        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 pr-3">
          <Key className="w-4 h-4 text-gold-400" />
          <span>Granular RBAC updates take effect immediately without re-login.</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. ALL ADMINS LIST VIEW */}
      {/* ======================================================== */}
      {activeSubTab === 'all_admins' && (
        <div className="space-y-6">
          
          {/* Search & Stats Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, designation..."
                value={adminSearchTerm}
                onChange={(e) => setAdminSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900/90 border border-white/10 text-white text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-royal-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs text-slate-400">
              <span className="px-3 py-1.5 rounded-xl bg-navy-900/80 border border-white/10 font-bold">
                Active Admins: <strong className="text-emerald-400">{adminsList.filter(a => a.adminStatus !== 'inactive').length}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-navy-900/80 border border-white/10 font-bold">
                Total: <strong className="text-white">{adminsList.length}</strong>
              </span>
            </div>
          </div>

          {/* Admins Grid */}
          {loadingAdmins ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gold-400" />
              <p className="text-xs font-bold">Loading administrators...</p>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <EmptyState
              icon={Users}
              title={adminSearchTerm ? "No matching admins found" : "No administrators registered"}
              description="Click '+ Add New Admin' to select any user by Roll Number or Email and assign permissions."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAdmins.map((admin) => {
                const isOwnerAccountBool = isTargetOwner(admin);
                const isActive = admin.adminStatus !== 'inactive';
                const permsCount = Array.isArray(admin.permissions) ? admin.permissions.length : 0;
                const isExpanded = expandedPermAdminId === (admin.uid || admin.id);

                return (
                  <div
                    key={admin.uid || admin.id}
                    className={`p-6 rounded-3xl glass-card border transition-all duration-300 relative overflow-hidden flex flex-col justify-between space-y-5 ${
                      isOwnerAccountBool 
                        ? 'border-gold-500/40 shadow-glow-gold' 
                        : isActive 
                        ? 'border-white/10 hover:border-royal-500/40 shadow-xl' 
                        : 'border-red-500/20 bg-navy-950/50 opacity-80'
                    }`}
                  >
                    {/* Glow */}
                    <div className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
                      isOwnerAccountBool ? 'bg-gold-500/10' : isActive ? 'bg-royal-500/10' : 'bg-red-500/5'
                    }`} />

                    <div className="space-y-4 relative z-10">
                      
                      {/* Top Bar: Designation Badge & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isOwnerAccountBool ? (
                            <span className="px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-gold-500 text-navy-950 flex items-center gap-1.5 shadow-md">
                              <Crown className="w-3.5 h-3.5" />
                              <span>Super Admin / Owner</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl text-xs font-black bg-royal-500/20 text-sky-300 border border-royal-500/40 flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-royal-400" />
                              <span>{admin.adminDesignation || 'Admin'}</span>
                            </span>
                          )}
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          isActive 
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                            : 'bg-red-500/15 text-red-300 border-red-500/30'
                        }`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Admin Profile Details */}
                      <div>
                        <h3 className="text-lg font-black text-white truncate flex items-center gap-2">
                          <span>{admin.name}</span>
                        </h3>
                        <p className="text-xs text-slate-300 font-medium truncate">
                          {admin.email}
                        </p>
                        {admin.rollNumber && (
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Roll No: <strong className="text-slate-300">{admin.rollNumber}</strong>
                          </p>
                        )}
                      </div>

                      {/* Permissions Summary Pill */}
                      <div className="p-3 rounded-2xl bg-navy-900/80 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-gold-400" />
                            <span>Granted Permissions:</span>
                          </span>
                          <span className="text-white font-mono font-black">
                            {isOwnerAccountBool ? 'All (Unrestricted)' : `${permsCount} permissions`}
                          </span>
                        </div>

                        {!isOwnerAccountBool && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setExpandedPermAdminId(isExpanded ? null : (admin.uid || admin.id))}
                              className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>{isExpanded ? 'Hide Permissions List' : 'View Permissions Breakdown'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {isExpanded && (
                              <div className="pt-2 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                {(admin.permissions || []).map(pId => (
                                  <span key={pId} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-slate-300 font-mono">
                                    {pId}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Announcement attribution sample preview */}
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-400">
                        <span>Announcement signature: </span>
                        <strong className="text-amber-300">Posted by {admin.adminDesignation || 'Admin'}</strong>
                      </div>

                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 relative z-10">
                      {isOwnerAccountBool ? (
                        <div className="text-[11px] text-gold-400 font-bold flex items-center gap-1.5 py-1">
                          <Shield className="w-3.5 h-3.5" />
                          <span>Owner Account (Protected)</span>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(admin)}
                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                            <span>Edit Roles</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(admin)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                isActive 
                                  ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' 
                                  : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                              title={isActive ? 'Deactivate Admin' : 'Activate Admin'}
                            >
                              {isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveAdmin(admin)}
                              className="p-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                              title="Revoke Admin Access (Demote to Student)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ADD NEW ADMIN VIEW */}
      {/* ======================================================== */}
      {activeSubTab === 'add_admin' && (
        <form onSubmit={handleCreateAdmin} className="space-y-8">
          
          {/* STEP 1: Search and Select User */}
          <div className="p-6 sm:p-7 rounded-3xl glass-card border border-white/10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black">
                1
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Find & Select User</h3>
                <p className="text-xs text-slate-400">Search student by Roll Number, Gmail / Email, or Name to promote to Admin.</p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Type Roll Number (e.g. CA-27-001) or Gmail address or Name..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-navy-900/90 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Candidate Search Results */}
            {userSearchTerm.trim().length >= 2 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Matching Account:
                </span>
                {candidateUsers.length === 0 ? (
                  <div className="p-4 rounded-xl bg-navy-900/50 border border-white/5 text-xs text-slate-400 text-center">
                    No matching users found for "{userSearchTerm}".
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {candidateUsers.map((user) => {
                      const isSelected = selectedUser?.id === user.id;
                      const isAlreadyAdmin = user.role === 'admin';

                      return (
                        <div
                          key={user.id}
                          onClick={() => setSelectedUser(user)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-glow-emerald'
                              : 'bg-navy-900/80 border-white/10 hover:border-white/20 text-slate-300'
                          }`}
                        >
                          <div className="space-y-0.5 truncate pr-2">
                            <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isAlreadyAdmin && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-royal-500/30 text-sky-300 font-extrabold">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                            {user.rollNumber && (
                              <div className="text-[10px] text-gold-400 font-mono">Roll: {user.rollNumber}</div>
                            )}
                          </div>

                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-emerald-500 text-navy-950 font-black' : 'bg-white/5 text-slate-500'
                          }`}>
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected User Banner */}
            {selectedUser && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-navy-950 flex items-center justify-center font-black">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-400 uppercase tracking-wider">Selected Target User</div>
                    <div className="text-sm font-extrabold text-white">{selectedUser.name} ({selectedUser.email})</div>
                    {selectedUser.rollNumber && <div className="text-[11px] text-slate-300 font-mono">Roll No: {selectedUser.rollNumber}</div>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: Assign Designation */}
          <div className="p-6 sm:p-7 rounded-3xl glass-card border border-white/10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-royal-500/20 border border-royal-500/40 text-royal-400 flex items-center justify-center font-black">
                2
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Assign Admin Designation / Title</h3>
                <p className="text-xs text-slate-400">
                  This title appears on notices ("Posted by [Designation]") and establishes the admin's official role.
                </p>
              </div>
            </div>

            {/* Preset Designation Pills */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Select Predefined Designation:
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_DESIGNATIONS.map((desig) => (
                  <button
                    key={desig}
                    type="button"
                    onClick={() => { setSelectedDesignation(desig); setCustomDesignation(''); }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedDesignation === desig
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md font-black'
                        : 'bg-navy-900/80 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    {desig}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setSelectedDesignation('Custom')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDesignation === 'Custom'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md font-black'
                      : 'bg-navy-900/80 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  ✨ Custom Designation
                </button>
              </div>
            </div>

            {/* Custom Designation Input */}
            {selectedDesignation === 'Custom' && (
              <div className="pt-2 animate-in fade-in duration-200">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Type Custom Title / Role Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chief Academic Officer, Exam Controller..."
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-royal-500"
                />
              </div>
            )}
          </div>

          {/* STEP 3: Granular Permissions Checklist */}
          <div className="p-6 sm:p-7 rounded-3xl glass-card border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-500/40 text-gold-400 flex items-center justify-center font-black">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Granular Permissions Configuration</h3>
                  <p className="text-xs text-slate-400">
                    Control precisely what this admin can view, create, edit, or delete.
                  </p>
                </div>
              </div>

              {/* Quick Template Switcher */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400">Quick Template:</span>
                {PRESET_ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleApplyPreset(r.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      selectedPresetId === r.id
                        ? 'bg-gold-500 text-navy-950 shadow-sm font-black'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Permission Categories Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {PERMISSION_CATEGORIES.map((cat) => {
                const catPermIds = cat.permissions.map(p => p.id);
                const isAllCatSelected = catPermIds.every(id => selectedPermissions.includes(id));
                const selectedCatCount = catPermIds.filter(id => selectedPermissions.includes(id)).length;

                return (
                  <div key={cat.id} className="p-5 rounded-2xl bg-navy-900/80 border border-white/10 space-y-4">
                    
                    {/* Category Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-white">{cat.label}</h4>
                        <span className="text-[11px] text-slate-400">
                          {selectedCatCount} of {cat.permissions.length} allowed
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleCategoryPermissions(cat.permissions)}
                        className="text-[11px] font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
                      >
                        {isAllCatSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {/* Permissions list */}
                    <div className="space-y-2.5">
                      {cat.permissions.map((perm) => {
                        const isChecked = selectedPermissions.includes(perm.id);

                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-royal-600/15 border-royal-500/40 text-white'
                                : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-0.5 rounded border-white/20 text-royal-600 focus:ring-0 cursor-pointer"
                            />
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold leading-tight text-white">{perm.label}</div>
                              <div className="text-[10px] text-slate-400 leading-tight">{perm.desc}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Grant Button Row */}
            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                Selected: <strong className="text-white font-mono">{selectedPermissions.length}</strong> total permissions for this administrator.
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedUser}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Granting Admin Access...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Confirm & Create Admin</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      )}

      {/* ======================================================== */}
      {/* 3. SECURITY AUDIT LOGS VIEW */}
      {/* ======================================================== */}
      {activeSubTab === 'audit_logs' && (
        <div className="p-6 sm:p-7 rounded-3xl glass-card border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <History className="w-5 h-5 text-gold-400" />
                <span>Security Audit Logs</span>
              </h3>
              <p className="text-xs text-slate-400">
                Tamper-resistant audit trail of administrator assignments, role changes, and removals.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Showing last {auditLogs.length} events
            </span>
          </div>

          {loadingLogs ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-gold-400" />
              <span>Loading audit logs...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-navy-900/40 rounded-2xl border border-white/5">
              No audit log entries recorded yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-royal-500/20 text-sky-300 border border-royal-500/30">
                        {log.action}
                      </span>
                      <strong className="text-white">{log.targetName || log.targetEmail || 'Resource'}</strong>
                      {log.targetEmail && <span className="text-slate-400 text-[11px]">({log.targetEmail})</span>}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Performed by: <strong className="text-slate-200">{log.performedByName}</strong> ({log.performedByDesignation || 'Owner'})
                    </div>

                    {log.details && (
                      <div className="text-[10px] text-slate-400 font-mono bg-navy-950/60 p-1.5 rounded-lg border border-white/5">
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 shrink-0 font-medium sm:text-right">
                    {log.createdAt ? formatDate(log.createdAt) : (log.isoDate ? new Date(log.isoDate).toLocaleString() : '')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT ADMIN PERMISSIONS MODAL */}
      {/* ======================================================== */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-950 border border-white/10 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-sky-400" />
                  <span>Edit Administrator Roles & Permissions</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Target: <strong className="text-white">{editingAdmin.name}</strong> ({editingAdmin.email})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmin} className="space-y-6">
              
              {/* Designation Edit */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Admin Designation / Display Title *
                </label>
                <input
                  type="text"
                  required
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  placeholder="e.g. Manager, Doubt Coordinator, Content Manager"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-royal-500"
                />
              </div>

              {/* Permissions Checkboxes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Permissions ({editPermissions.length} enabled)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (editPermissions.length === ALL_PERMISSIONS.length) {
                        setEditPermissions([]);
                      } else {
                        setEditPermissions(ALL_PERMISSIONS);
                      }
                    }}
                    className="text-xs font-bold text-sky-400 hover:text-sky-300"
                  >
                    {editPermissions.length === ALL_PERMISSIONS.length ? 'Deselect All' : 'Select All Permissions'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-1">
                  {PERMISSION_CATEGORIES.map((cat) => (
                    <div key={cat.id} className="p-3.5 rounded-xl bg-navy-900/90 border border-white/10 space-y-2">
                      <div className="text-xs font-black text-white border-b border-white/5 pb-1">
                        {cat.label}
                      </div>
                      <div className="space-y-1.5">
                        {cat.permissions.map(perm => {
                          const checked = editPermissions.includes(perm.id);
                          return (
                            <label key={perm.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setEditPermissions(prev => checked ? prev.filter(p => p !== perm.id) : [...prev, perm.id]);
                                }}
                                className="rounded border-white/20 text-royal-600 focus:ring-0"
                              />
                              <span className={checked ? 'text-white font-bold' : 'text-slate-400'}>{perm.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSaving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg"
                >
                  {isEditSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
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
}
