import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  where 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Primary Owner Accounts
export const OWNER_EMAILS = [
  'vaultstore27@gmail.com',
  'thunderworld766@gmail.com'
];

/**
 * Check if user is Super Admin / Owner
 */
export function isOwnerAccount(user, userProfile) {
  if (!user && !userProfile) return false;
  const email = (user?.email || userProfile?.email || '').toLowerCase().trim();
  if (OWNER_EMAILS.includes(email)) return true;
  if (userProfile?.isOwner === true) return true;
  if (userProfile?.role === 'owner') return true;
  return false;
}

// Granular Permission Categories & Items
export const PERMISSION_CATEGORIES = [
  {
    id: 'dashboard',
    label: 'Dashboard / General',
    permissions: [
      { id: 'view_dashboard', label: 'View Admin Dashboard', desc: 'Access and view admin overview and general stats' }
    ]
  },
  {
    id: 'announcements',
    label: 'Announcements',
    permissions: [
      { id: 'view_announcements', label: 'View Announcements', desc: 'View announcement lists and stream' },
      { id: 'create_announcement', label: 'Create Announcement', desc: 'Compose and create new announcements' },
      { id: 'edit_announcement', label: 'Edit Announcement', desc: 'Modify existing announcements' },
      { id: 'delete_announcement', label: 'Delete Announcement', desc: 'Permanently remove announcements' },
      { id: 'publish_announcement', label: 'Publish / Unpublish', desc: 'Broadcast or hide announcements' }
    ]
  },
  {
    id: 'doubts',
    label: 'Doubt Section',
    permissions: [
      { id: 'view_doubts', label: 'View Doubts', desc: 'View doubts asked by students' },
      { id: 'reply_doubts', label: 'Reply to Doubts', desc: 'Post answers, guidance and solutions' },
      { id: 'resolve_doubts', label: 'Resolve Doubts', desc: 'Mark doubts as resolved/closed' },
      { id: 'delete_doubts', label: 'Delete Doubts', desc: 'Permanently remove doubt posts' }
    ]
  },
  {
    id: 'students',
    label: 'Student Management',
    permissions: [
      { id: 'view_students', label: 'View Student Database', desc: 'Browse registered students list' },
      { id: 'edit_students', label: 'Edit Student Data', desc: 'Update student stream, details and study hours' },
      { id: 'adjust_student_data', label: 'Adjust Study Hours & Points', desc: 'Manually add/edit study hours and points with audit history' },
      { id: 'delete_students', label: 'Delete Student Data', desc: 'Permanently delete student account & data' },
      { id: 'view_student_profile', label: 'View Student Profile', desc: 'View complete student analytics profile' }
    ]
  },
  {
    id: 'courses',
    label: 'Courses & Exam Dates',
    permissions: [
      { id: 'manage_courses', label: 'Manage Courses', desc: 'View courses, attempts and exam dates' },
      { id: 'add_course_content', label: 'Add Course Content & Dates', desc: 'Set exam dates and add attempt cycles' },
      { id: 'edit_course_content', label: 'Edit Course Content & Dates', desc: 'Modify exam dates and attempts' },
      { id: 'delete_course_content', label: 'Delete Course Content', desc: 'Delete exam attempts or streams' }
    ]
  },
  {
    id: 'quiz',
    label: 'Quiz Management',
    permissions: [
      { id: 'create_quiz', label: 'Create Quiz', desc: 'Create new MCQ quiz sets' },
      { id: 'edit_quiz', label: 'Edit Quiz', desc: 'Modify quiz rules and details' },
      { id: 'delete_quiz', label: 'Delete Quiz', desc: 'Permanently delete quizzes' },
      { id: 'publish_quiz', label: 'Publish Quiz', desc: 'Publish or unpublish quizzes for students' },
      { id: 'manage_quiz_questions', label: 'Manage Questions', desc: 'Add, edit, and delete questions' }
    ]
  },
  {
    id: 'notes',
    label: 'Notes / Study Material',
    permissions: [
      { id: 'add_notes', label: 'Add Notes', desc: 'Upload notes, PDFs and resources' },
      { id: 'edit_notes', label: 'Edit Notes', desc: 'Modify note titles, files and subjects' },
      { id: 'delete_notes', label: 'Delete Notes', desc: 'Permanently remove study notes' },
      { id: 'manage_notes_categories', label: 'Manage Categories', desc: 'Create and organize subjects/folders' }
    ]
  },
  {
    id: 'syllabus',
    label: 'Syllabus / Revision',
    permissions: [
      { id: 'manage_syllabus', label: 'Manage Syllabus', desc: 'Edit curriculum, subjects and modules' },
      { id: 'manage_units', label: 'Manage Units & Chapters', desc: 'Create and organize chapters & units' },
      { id: 'manage_revision', label: 'Manage Revision Tracker', desc: 'Configure revision cycles (R1, R2, R3)' },
      { id: 'activate_deactivate_units', label: 'Activate/Deactivate Units', desc: 'Toggle unit status' }
    ]
  },
  {
    id: 'special',
    label: 'Additional Operations',
    permissions: [
      { id: 'manage_tests', label: 'Manage Test Papers', desc: 'Upload and organize test papers' },
      { id: 'manage_writing', label: 'Manage Writing Practice', desc: 'Create writing practice questions' },
      { id: 'manage_coaching', label: 'Manage Coaching Study', desc: 'Oversee student coaching logs' },
      { id: 'manage_webcam', label: 'Manage Webcam Study Hall', desc: 'Control webcam study rooms' },
      { id: 'manage_discipline', label: 'Manage Inactive / Discipline', desc: 'Issue discipline strikes' },
      { id: 'manage_access_locks', label: 'Manage Section Locks', desc: 'Lock or unlock app sections' },
      { id: 'manage_levels', label: 'Manage Levels & Gifts', desc: 'Configure 35-level badges & physical gifts' },
      { id: 'manage_premium', label: 'Manage Premium Access', desc: 'Grant Pro / Premium privileges' }
    ]
  }
];

// All permission IDs flattened
export const ALL_PERMISSIONS = PERMISSION_CATEGORIES.flatMap(cat => cat.permissions.map(p => p.id));

// Preset roles
export const PRESET_ROLES = [
  {
    id: 'ceo',
    name: 'CEO',
    designation: 'CEO',
    description: 'Executive admin with comprehensive operational permissions',
    permissions: ALL_PERMISSIONS
  },
  {
    id: 'manager',
    name: 'Manager',
    designation: 'Manager',
    description: 'General manager overseeing students, announcements, doubts and content',
    permissions: [
      'view_dashboard',
      'view_announcements', 'create_announcement', 'edit_announcement', 'delete_announcement', 'publish_announcement',
      'view_doubts', 'reply_doubts', 'resolve_doubts',
      'view_students', 'edit_students', 'view_student_profile',
      'manage_courses', 'add_course_content', 'edit_course_content',
      'manage_syllabus', 'manage_units', 'manage_revision', 'activate_deactivate_units',
      'add_notes', 'edit_notes', 'manage_notes_categories',
      'create_quiz', 'edit_quiz', 'publish_quiz', 'manage_quiz_questions'
    ]
  },
  {
    id: 'announcement_manager',
    name: 'Announcement Manager',
    designation: 'Announcement Manager',
    description: 'Specialized in drafting, broadcasting, and managing student notices',
    permissions: [
      'view_dashboard',
      'view_announcements', 'create_announcement', 'edit_announcement', 'delete_announcement', 'publish_announcement'
    ]
  },
  {
    id: 'doubt_coordinator',
    name: 'Doubt Coordinator',
    designation: 'Doubt Coordinator',
    description: 'Specialized in replying to academic doubts and clearing questions',
    permissions: [
      'view_dashboard',
      'view_doubts', 'reply_doubts', 'resolve_doubts'
    ]
  },
  {
    id: 'academic_head',
    name: 'Academic Head',
    designation: 'Academic Head',
    description: 'Academic curriculum controller overseeing syllabus, tests, and chapters',
    permissions: [
      'view_dashboard',
      'view_students', 'view_student_profile',
      'manage_courses', 'add_course_content', 'edit_course_content',
      'manage_syllabus', 'manage_units', 'manage_revision', 'activate_deactivate_units',
      'add_notes', 'edit_notes', 'manage_notes_categories',
      'create_quiz', 'edit_quiz', 'publish_quiz', 'manage_quiz_questions',
      'manage_tests', 'manage_writing'
    ]
  },
  {
    id: 'content_manager',
    name: 'Content Manager',
    designation: 'Content Manager',
    description: 'Manages study materials, PDF notes, quiz sets, and course topics',
    permissions: [
      'view_dashboard',
      'add_notes', 'edit_notes', 'delete_notes', 'manage_notes_categories',
      'create_quiz', 'edit_quiz', 'delete_quiz', 'publish_quiz', 'manage_quiz_questions',
      'manage_courses', 'add_course_content', 'edit_course_content'
    ]
  },
  {
    id: 'batch_coordinator',
    name: 'Batch Coordinator',
    designation: 'Batch Coordinator',
    description: 'Oversees student batches, schedules, announcements, and progress',
    permissions: [
      'view_dashboard',
      'view_announcements', 'create_announcement', 'publish_announcement',
      'view_doubts', 'reply_doubts',
      'view_students', 'view_student_profile',
      'manage_courses'
    ]
  },
  {
    id: 'support_manager',
    name: 'Support Manager',
    designation: 'Support Manager',
    description: 'Handles student inquiries, doubts, and support issues',
    permissions: [
      'view_dashboard',
      'view_doubts', 'reply_doubts', 'resolve_doubts',
      'view_students', 'view_student_profile'
    ]
  }
];

export const PRESET_DESIGNATIONS = [
  'CEO',
  'Manager',
  'Batch Coordinator',
  'Announcement Manager',
  'Doubt Coordinator',
  'Content Manager',
  'Academic Head',
  'Support Manager'
];

/**
 * Check if admin has specific permission
 */
export function hasAdminPermission(user, userProfile, permissionId) {
  if (!user && !userProfile) return false;
  
  // Super Admin / Owner always has ALL permissions implicitly
  if (isOwnerAccount(user, userProfile)) return true;

  // Non-owner must have active admin role
  if (userProfile?.role !== 'admin') return false;
  if (userProfile?.adminStatus === 'inactive') return false;

  const perms = Array.isArray(userProfile?.permissions) ? userProfile.permissions : [];
  return perms.includes(permissionId);
}

/**
 * Log an action to admin_audit_logs collection
 */
export async function logAdminAction({
  action,
  details = {},
  targetId = '',
  targetName = '',
  targetEmail = '',
  performedBy = null
}) {
  try {
    const adminUid = performedBy?.uid || 'system';
    const adminName = performedBy?.name || performedBy?.displayName || 'Admin';
    const adminEmail = performedBy?.email || '';
    const adminDesignation = performedBy?.adminDesignation || 'Admin';

    await setDoc(doc(collection(db, 'admin_audit_logs')), {
      action,
      details,
      targetId,
      targetName,
      targetEmail,
      performedByUid: adminUid,
      performedByName: adminName,
      performedByEmail: adminEmail,
      performedByDesignation: adminDesignation,
      createdAt: serverTimestamp(),
      isoDate: new Date().toISOString()
    });
  } catch (err) {
    console.error("Audit log recording error:", err);
  }
}

/**
 * Convert user to Admin or update Admin role/permissions
 */
export async function assignAdminRole({
  userDocId,
  designation,
  permissions = [],
  status = 'active',
  performedBy
}) {
  if (!userDocId) throw new Error("Target user ID is required");
  if (!isOwnerAccount(performedBy?.user, performedBy?.profile)) {
    throw new Error("Unauthorized: Only the Owner can grant or modify admin roles.");
  }

  const userRef = doc(db, 'users', userDocId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error("User account not found");
  }

  const userData = userSnap.data();

  // Prevent modifying the Owner account by anyone
  if (isOwnerAccount({ email: userData.email }, userData)) {
    throw new Error("The Owner account cannot be modified by any other admin.");
  }

  const cleanDesignation = String(designation || 'Admin').trim();
  const cleanPermissions = Array.from(new Set(permissions));

  const adminPayload = {
    role: 'admin',
    adminDesignation: cleanDesignation,
    permissions: cleanPermissions,
    adminStatus: status,
    adminAssignedAt: serverTimestamp(),
    adminAssignedBy: performedBy.user?.uid || '',
    adminAssignedByName: performedBy.profile?.name || performedBy.user?.email || 'Owner',
    adminAssignedByEmail: performedBy.user?.email || ''
  };

  // 1. Update users document
  await updateDoc(userRef, adminPayload);

  // 2. Mirror into admins collection for fast listing & indexing
  const adminDocRef = doc(db, 'admins', userDocId);
  await setDoc(adminDocRef, {
    uid: userDocId,
    name: userData.name || userData.displayName || 'Admin User',
    email: userData.email || '',
    rollNumber: userData.rollNumber || '',
    course: userData.course || '',
    level: userData.level || '',
    ...adminPayload,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // 3. Record Audit Log
  await logAdminAction({
    action: 'ASSIGN_ADMIN_ROLE',
    details: {
      designation: cleanDesignation,
      permissionsCount: cleanPermissions.length,
      permissions: cleanPermissions,
      status
    },
    targetId: userDocId,
    targetName: userData.name || '',
    targetEmail: userData.email || '',
    performedBy: {
      uid: performedBy.user?.uid,
      name: performedBy.profile?.name,
      email: performedBy.user?.email,
      adminDesignation: 'Owner'
    }
  });

  return { success: true };
}

/**
 * Update existing admin designation and/or permissions
 */
export async function updateAdminPermissions({
  adminUid,
  designation,
  permissions,
  performedBy
}) {
  if (!adminUid) throw new Error("Admin ID is required");
  if (!isOwnerAccount(performedBy?.user, performedBy?.profile)) {
    throw new Error("Unauthorized: Only the Owner can modify admin permissions.");
  }

  const userRef = doc(db, 'users', adminUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("Admin account not found");
  const userData = userSnap.data();

  if (isOwnerAccount({ email: userData.email }, userData)) {
    throw new Error("Cannot modify the Owner account permissions.");
  }

  const cleanDesignation = designation ? String(designation).trim() : (userData.adminDesignation || 'Admin');
  const cleanPermissions = Array.isArray(permissions) ? Array.from(new Set(permissions)) : (userData.permissions || []);

  const updateData = {
    adminDesignation: cleanDesignation,
    permissions: cleanPermissions,
    permissionsUpdatedAt: serverTimestamp()
  };

  await updateDoc(userRef, updateData);

  // Mirror to admins collection
  const adminDocRef = doc(db, 'admins', adminUid);
  await setDoc(adminDocRef, {
    ...updateData,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // Record Audit Log
  await logAdminAction({
    action: 'UPDATE_ADMIN_PERMISSIONS',
    details: {
      designation: cleanDesignation,
      permissionsCount: cleanPermissions.length,
      permissions: cleanPermissions
    },
    targetId: adminUid,
    targetName: userData.name || '',
    targetEmail: userData.email || '',
    performedBy: {
      uid: performedBy.user?.uid,
      name: performedBy.profile?.name,
      email: performedBy.user?.email,
      adminDesignation: 'Owner'
    }
  });

  return { success: true };
}

/**
 * Toggle admin active/inactive status
 */
export async function toggleAdminStatus({
  adminUid,
  newStatus,
  performedBy
}) {
  if (!adminUid) throw new Error("Admin ID is required");
  if (!isOwnerAccount(performedBy?.user, performedBy?.profile)) {
    throw new Error("Unauthorized: Only the Owner can change admin status.");
  }

  const userRef = doc(db, 'users', adminUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("Admin account not found");
  const userData = userSnap.data();

  if (isOwnerAccount({ email: userData.email }, userData)) {
    throw new Error("Cannot deactivate the Owner account.");
  }

  const status = newStatus === 'active' ? 'active' : 'inactive';
  await updateDoc(userRef, { adminStatus: status });

  const adminDocRef = doc(db, 'admins', adminUid);
  await setDoc(adminDocRef, { adminStatus: status, updatedAt: serverTimestamp() }, { merge: true });

  await logAdminAction({
    action: status === 'active' ? 'ACTIVATE_ADMIN' : 'DEACTIVATE_ADMIN',
    details: { status },
    targetId: adminUid,
    targetName: userData.name || '',
    targetEmail: userData.email || '',
    performedBy: {
      uid: performedBy.user?.uid,
      name: performedBy.profile?.name,
      email: performedBy.user?.email,
      adminDesignation: 'Owner'
    }
  });

  return { success: true };
}

/**
 * Remove admin role completely (demote back to student)
 */
export async function revokeAdminRole({
  adminUid,
  performedBy
}) {
  if (!adminUid) throw new Error("Admin ID is required");
  if (!isOwnerAccount(performedBy?.user, performedBy?.profile)) {
    throw new Error("Unauthorized: Only the Owner can revoke admin roles.");
  }

  const userRef = doc(db, 'users', adminUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("User account not found");
  const userData = userSnap.data();

  if (isOwnerAccount({ email: userData.email }, userData)) {
    throw new Error("Cannot remove the Owner account.");
  }

  // Revert role to student and clear permissions
  await updateDoc(userRef, {
    role: 'student',
    adminDesignation: '',
    permissions: [],
    adminStatus: 'inactive',
    adminRevokedAt: serverTimestamp(),
    adminRevokedBy: performedBy.user?.uid || ''
  });

  // Delete from admins mirror collection
  const adminDocRef = doc(db, 'admins', adminUid);
  await deleteDoc(adminDocRef);

  await logAdminAction({
    action: 'REVOKE_ADMIN_ROLE',
    details: { previousDesignation: userData.adminDesignation },
    targetId: adminUid,
    targetName: userData.name || '',
    targetEmail: userData.email || '',
    performedBy: {
      uid: performedBy.user?.uid,
      name: performedBy.profile?.name,
      email: performedBy.user?.email,
      adminDesignation: 'Owner'
    }
  });

  return { success: true };
}

/**
 * Subscribe to realtime list of all admins
 */
export function subscribeAllAdmins(callback) {
  // Listen to `admins` collection
  const q = query(collection(db, 'admins'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(list);
  }, (err) => {
    console.error("subscribeAllAdmins error:", err);
    callback([]);
  });
}

/**
 * Subscribe to recent audit logs
 */
export function subscribeAuditLogs(callback, limitCount = 50) {
  const q = query(
    collection(db, 'admin_audit_logs'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(list);
  }, (err) => {
    console.error("subscribeAuditLogs error:", err);
    callback([]);
  });
}
