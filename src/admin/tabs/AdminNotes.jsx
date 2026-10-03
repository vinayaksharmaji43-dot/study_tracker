import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { supabase, isSupabaseConfigured } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  ExternalLink, 
  Upload, 
  AlertCircle,
  BookOpen,
  Calendar,
  Layers,
  Search,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  FilePlus,
  Tag,
  ArrowUpDown,
  X,
  Loader2,
  Folder,
  Link,
  ShieldAlert,
  Sparkles,
  ArrowUp,
  ArrowDown,
  GraduationCap
} from 'lucide-react';
import { uploadPdfFile } from '../../utils/fileUploadHelper';
import toast from 'react-hot-toast';

const BUCKET_NAME = 'study-material';

export const DEFAULT_STREAMS = [
  'CA Foundation',
  'CA Intermediate',
  'CA Final',
  'CMA Foundation',
  'CMA Intermediate',
  'CMA Final'
];

export const DEFAULT_NOTES_TYPES = [
  { id: 'short-notes', name: 'Short Notes', order: 1 },
  { id: 'sticky-notes', name: 'Sticky Notes', order: 2 },
  { id: 'brief-notes', name: 'Brief Notes', order: 3 },
  { id: 'pyq', name: 'PYQ', order: 4 },
  { id: 'rtp', name: 'RTP', order: 5 },
  { id: 'mtp', name: 'MTP', order: 6 },
  { id: 'question-bank', name: 'Question Bank', order: 7 },
  { id: 'mcq', name: 'MCQ', order: 8 },
  { id: 'true-false', name: 'True / False', order: 9 },
  { id: 'other', name: 'Other', order: 10 }
];

export const CA_FOUNDATION_SUBJECTS = [
  'Paper 1: Accounting',
  'Paper 2: Business Laws',
  'Paper 3: Quantitative Aptitude',
  'Paper 4: Business Economics',
  'General / Common'
];

export const CA_INTERMEDIATE_SUBJECTS = [
  'Paper 1 — Advanced Accounting',
  'Paper 2 — Corporate and Other Laws',
  'Paper 3 — Taxation',
  'Paper 4 — Cost and Management Accounting',
  'Paper 5 — Auditing and Ethics',
  'Paper 6 — Financial Management and Strategic Management',
  'General / Common'
];

export const CA_FINAL_SUBJECTS = [
  'Paper 1: Financial Reporting',
  'Paper 2: Advanced Financial Management',
  'Paper 3: Advanced Auditing, Assurance and Professional Ethics',
  'Paper 4: Direct Tax Laws & International Taxation',
  'Paper 5: Indirect Tax Laws',
  'Paper 6: Integrated Business Solutions',
  'General / Common'
];

export const CMA_FOUNDATION_SUBJECTS = [
  'Paper 1 — Fundamentals of Business Laws and Business Communication',
  'Paper 2 — Fundamentals of Financial and Cost Accounting',
  'Paper 3 — Fundamentals of Business Mathematics and Statistics',
  'Paper 4 — Fundamentals of Business Economics and Management',
  'General / Common'
];

export const CMA_INTERMEDIATE_SUBJECTS = [
  'Paper 5 — Business Laws and Ethics',
  'Paper 6 — Financial Accounting',
  'Paper 7 — Direct and Indirect Taxation',
  'Paper 8 — Cost Accounting',
  'Paper 9 — Operations Management and Strategic Management',
  'Paper 10 — Corporate Accounting and Auditing',
  'Paper 11 — Financial Management and Business Data Analytics',
  'Paper 12 — Management Accounting',
  'General / Common'
];

export const CMA_FINAL_SUBJECTS = [
  'Paper 13: Corporate and Economic Laws',
  'Paper 14: Strategic Financial Management',
  'Paper 15: Direct Tax Laws and International Taxation',
  'Paper 16: Strategic Cost Management',
  'Paper 17: Cost and Management Audit',
  'Paper 18: Corporate Financial Reporting',
  'Paper 19: Indirect Tax Laws and Practice',
  'Paper 20: Strategic Performance Management and Business Valuation',
  'General / Common'
];

export function getSubjectsForStream(stream) {
  switch (stream) {
    case 'CA Foundation':
      return CA_FOUNDATION_SUBJECTS;
    case 'CA Intermediate':
      return CA_INTERMEDIATE_SUBJECTS;
    case 'CA Final':
      return CA_FINAL_SUBJECTS;
    case 'CMA Foundation':
      return CMA_FOUNDATION_SUBJECTS;
    case 'CMA Intermediate':
      return CMA_INTERMEDIATE_SUBJECTS;
    case 'CMA Final':
      return CMA_FINAL_SUBJECTS;
    default:
      return ['General / Common'];
  }
}

export default function AdminNotes() {
  const { userProfile, currentUser } = useAuth();

  // Active filters in Admin
  const [selectedStream, setSelectedStream] = useState('CA Foundation');
  const [selectedNotesTypeId, setSelectedNotesTypeId] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Data from Firestore
  const [streamsList, setStreamsList] = useState(DEFAULT_STREAMS);
  const [notesTypes, setNotesTypes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic "+" Create Picker Modal
  const [showCreatePicker, setShowCreatePicker] = useState(false);

  // 1. Add / Edit Stream Modal
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [streamNameInput, setStreamNameInput] = useState('');
  const [savingStream, setSavingStream] = useState(false);

  // 2. Add / Edit Notes Type Modal
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeNameInput, setTypeNameInput] = useState('');
  const [typeOrderInput, setTypeOrderInput] = useState(1);
  const [savingType, setSavingType] = useState(false);

  // 3. Add / Edit Topic Modal
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicStream, setTopicStream] = useState('CA Foundation');
  const [topicNotesType, setTopicNotesType] = useState('');
  const [topicSubject, setTopicSubject] = useState('');
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicOrder, setTopicOrder] = useState(1);
  const [savingTopic, setSavingTopic] = useState(false);

  // 4. Add / Edit Material Modal
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialStream, setMaterialStream] = useState('CA Foundation');
  const [materialNotesType, setMaterialNotesType] = useState('');
  const [materialSubject, setMaterialSubject] = useState('');
  const [materialTopicId, setMaterialTopicId] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [materialUploadMode, setMaterialUploadMode] = useState('pdf'); // 'pdf' | 'drive'
  const [materialDriveUrl, setMaterialDriveUrl] = useState('');
  const [materialFile, setMaterialFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [savingMaterial, setSavingMaterial] = useState(false);

  // Delete Confirmation Modal
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null); // { type: 'type'|'topic'|'material'|'stream', item, details }
  const [isDeleting, setIsDeleting] = useState(false);

  // Expanded topic sections
  const [expandedTopicIds, setExpandedTopicIds] = useState({});

  // ==========================================
  // REAL-TIME FIRESTORE LISTENERS
  // ==========================================

  // 1. Listen to Streams (custom + default)
  useEffect(() => {
    const q = query(collection(db, 'notesStreams'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const customStreams = snap.docs.map(d => d.data().name).filter(Boolean);
      const combined = Array.from(new Set([...DEFAULT_STREAMS, ...customStreams]));
      setStreamsList(combined);
      if (!combined.includes(selectedStream)) {
        setSelectedStream(combined[0] || 'CA Foundation');
      }
    }, (err) => {
      console.warn("Notes streams query error:", err);
      setStreamsList(DEFAULT_STREAMS);
    });

    return () => unsub();
  }, []);

  // 2. Listen to Notes Types
  useEffect(() => {
    const q = query(collection(db, 'notesTypes'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        // Auto-seed default notes types if collection is empty
        const seededList = [];
        for (const item of DEFAULT_NOTES_TYPES) {
          try {
            const docRef = await addDoc(collection(db, 'notesTypes'), {
              name: item.name,
              order: item.order,
              isDefault: true,
              createdAt: serverTimestamp()
            });
            seededList.push({ id: docRef.id, name: item.name, order: item.order, isDefault: true });
          } catch (e) {
            console.error("Error auto-seeding notes types:", e);
          }
        }
        setNotesTypes(seededList);
        if (seededList[0]) setSelectedNotesTypeId(seededList[0].id);
      } else {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setNotesTypes(list);

        // Keep selectedNotesTypeId valid
        setSelectedNotesTypeId(prev => {
          if (prev && list.some(t => t.id === prev || t.name === prev)) {
            return prev;
          }
          return list[0]?.id || '';
        });
      }
    }, (err) => {
      console.error("Error listening to notesTypes:", err);
    });

    return () => unsub();
  }, []);

  // 3. Listen to Topics
  useEffect(() => {
    const q = query(collection(db, 'notesTopics'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setTopics(list);
    }, (err) => {
      console.error("Error listening to topics:", err);
    });

    return () => unsub();
  }, []);

  // 4. Listen to Materials (from 'notes' collection)
  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMaterials(list);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to materials:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Toggle topic accordion
  const toggleTopicExpand = (topicId) => {
    setExpandedTopicIds(prev => ({
      ...prev,
      [topicId]: prev[topicId] === undefined ? false : !prev[topicId]
    }));
  };

  // Get active notes type object
  const activeTypeObj = notesTypes.find(t => t.id === selectedNotesTypeId || t.name === selectedNotesTypeId) || notesTypes[0];

  // Helper: check if a topic/material matches notes type
  const isTypeMatch = (itemTypeId, itemTypeName, targetType) => {
    if (!targetType) return true;
    if (itemTypeId === targetType.id || itemTypeId === targetType.name) return true;
    if (itemTypeName && targetType.name && itemTypeName.toLowerCase() === targetType.name.toLowerCase()) return true;
    return false;
  };

  // Filter topics for the currently selected Stream + Notes Type
  const currentStreamTopics = topics.filter(top => {
    const matchStream = (top.stream || '').toLowerCase() === selectedStream.toLowerCase();
    const matchType = isTypeMatch(top.notesTypeId, top.notesTypeName, activeTypeObj);
    const matchSubject = selectedSubjectFilter === 'ALL' || top.subject === selectedSubjectFilter;
    return matchStream && matchType && matchSubject;
  });

  // Unique subjects present in the current stream topics
  const availableSubjectsForStream = Array.from(new Set([
    ...getSubjectsForStream(selectedStream),
    ...topics.filter(t => (t.stream || '').toLowerCase() === selectedStream.toLowerCase()).map(t => t.subject).filter(Boolean)
  ]));

  // Filter materials for search query & topic
  const getMaterialsForTopic = (topicId) => {
    return materials.filter(m => {
      const matchTopic = m.topicId === topicId;
      if (!matchTopic) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (m.title || '').toLowerCase().includes(q) || 
          (m.subject || '').toLowerCase().includes(q) ||
          (m.fileName || '').toLowerCase().includes(q) ||
          (m.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  };

  // Materials without a topic in this stream & type
  const uncategorizedMaterials = materials.filter(m => {
    const matchStream = (m.course || m.stream || '').toLowerCase() === selectedStream.toLowerCase();
    const matchType = isTypeMatch(m.notesTypeId, m.notesTypeName, activeTypeObj) || !m.notesTypeId;
    const hasValidTopic = topics.some(t => t.id === m.topicId);
    const matchSubject = selectedSubjectFilter === 'ALL' || m.subject === selectedSubjectFilter;
    if (!matchStream || !matchType || hasValidTopic || !matchSubject) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (m.title || '').toLowerCase().includes(q) || 
        (m.subject || '').toLowerCase().includes(q) ||
        (m.fileName || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate material count for each Notes Type under selected stream
  const getCountForType = (typeItem) => {
    return materials.filter(m => {
      const matchStream = (m.course || m.stream || '').toLowerCase() === selectedStream.toLowerCase();
      const matchType = isTypeMatch(m.notesTypeId, m.notesTypeName, typeItem);
      return matchStream && matchType;
    }).length;
  };

  // ==========================================
  // HANDLERS: STREAMS
  // ==========================================
  const handleOpenAddStream = () => {
    setStreamNameInput('');
    setShowStreamModal(true);
    setShowCreatePicker(false);
  };

  const handleSaveStream = async (e) => {
    e.preventDefault();
    const trimmed = streamNameInput.trim();
    if (!trimmed) return toast.error("Please enter a stream name.");

    if (streamsList.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error("This stream already exists.");
    }

    try {
      setSavingStream(true);
      await addDoc(collection(db, 'notesStreams'), {
        name: trimmed,
        order: streamsList.length + 1,
        createdAt: serverTimestamp()
      });
      setSelectedStream(trimmed);
      setShowStreamModal(false);
      setStreamNameInput('');
      toast.success(`Stream "${trimmed}" added!`);
    } catch (err) {
      console.error("Error saving stream:", err);
      toast.error("Failed to add stream: " + err.message);
    } finally {
      setSavingStream(false);
    }
  };

  // ==========================================
  // HANDLERS: NOTES TYPE (Category)
  // ==========================================
  const handleOpenAddType = () => {
    setEditingType(null);
    setTypeNameInput('');
    setTypeOrderInput((notesTypes.length || 0) + 1);
    setShowTypeModal(true);
    setShowCreatePicker(false);
  };

  const handleOpenEditType = (typeItem) => {
    setEditingType(typeItem);
    setTypeNameInput(typeItem.name || '');
    setTypeOrderInput(typeItem.order || 1);
    setShowTypeModal(true);
  };

  const handleSaveType = async (e) => {
    e.preventDefault();
    const nameTrimmed = typeNameInput.trim();
    if (!nameTrimmed) return toast.error("Please enter a category / type name.");

    try {
      setSavingType(true);
      if (editingType) {
        await updateDoc(doc(db, 'notesTypes', editingType.id), {
          name: nameTrimmed,
          order: Number(typeOrderInput) || 1,
          updatedAt: serverTimestamp()
        });
        toast.success(`Category "${nameTrimmed}" updated!`);
      } else {
        const newRef = await addDoc(collection(db, 'notesTypes'), {
          name: nameTrimmed,
          order: Number(typeOrderInput) || (notesTypes.length + 1),
          isDefault: false,
          createdAt: serverTimestamp()
        });
        setSelectedNotesTypeId(newRef.id);
        toast.success(`Category "${nameTrimmed}" created!`);
      }
      setShowTypeModal(false);
      setTypeNameInput('');
    } catch (err) {
      console.error("Error saving notes type:", err);
      toast.error("Failed to save category: " + err.message);
    } finally {
      setSavingType(false);
    }
  };

  const handleMoveTypeOrder = async (typeItem, direction) => {
    const currentIndex = notesTypes.findIndex(t => t.id === typeItem.id);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= notesTypes.length) return;

    const targetType = notesTypes[targetIndex];
    try {
      const currentOrder = typeItem.order || (currentIndex + 1);
      const targetOrder = targetType.order || (targetIndex + 1);

      await updateDoc(doc(db, 'notesTypes', typeItem.id), { order: targetOrder });
      await updateDoc(doc(db, 'notesTypes', targetType.id), { order: currentOrder });
    } catch (e) {
      console.error("Error reordering notes types:", e);
    }
  };

  // ==========================================
  // HANDLERS: TOPIC MANAGEMENT
  // ==========================================
  const handleOpenAddTopic = (prefilledSubject = null) => {
    setEditingTopic(null);
    setTopicStream(selectedStream);
    setTopicNotesType(activeTypeObj?.id || selectedNotesTypeId);
    const available = getSubjectsForStream(selectedStream);
    const chosenSubject = prefilledSubject || available[0] || 'General / Common';
    setTopicSubject(chosenSubject);
    setIsCustomSubject(false);
    setCustomSubjectInput('');
    setTopicTitle('');
    setTopicDescription('');
    setTopicOrder((currentStreamTopics.length || 0) + 1);
    setShowTopicModal(true);
    setShowCreatePicker(false);
  };

  const handleOpenEditTopic = (topicItem) => {
    setEditingTopic(topicItem);
    setTopicStream(topicItem.stream || selectedStream);
    setTopicNotesType(topicItem.notesTypeId || activeTypeObj?.id || selectedNotesTypeId);
    
    const available = getSubjectsForStream(topicItem.stream || selectedStream);
    if (available.includes(topicItem.subject)) {
      setTopicSubject(topicItem.subject);
      setIsCustomSubject(false);
      setCustomSubjectInput('');
    } else {
      setTopicSubject('__custom__');
      setIsCustomSubject(true);
      setCustomSubjectInput(topicItem.subject || '');
    }

    setTopicTitle(topicItem.title || '');
    setTopicDescription(topicItem.description || '');
    setTopicOrder(topicItem.order || 1);
    setShowTopicModal(true);
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    if (!topicTitle.trim()) return toast.error("Please enter a topic title.");

    const finalSubject = isCustomSubject 
      ? customSubjectInput.trim() 
      : topicSubject;

    if (!finalSubject) return toast.error("Please provide a subject for this topic.");

    try {
      setSavingTopic(true);
      const chosenTypeObj = notesTypes.find(t => t.id === topicNotesType) || activeTypeObj;

      const payload = {
        stream: topicStream,
        notesTypeId: topicNotesType || chosenTypeObj?.id,
        notesTypeName: chosenTypeObj?.name || 'Notes',
        subject: finalSubject,
        title: topicTitle.trim(),
        description: topicDescription.trim(),
        order: Number(topicOrder) || 1,
        updatedAt: serverTimestamp()
      };

      if (editingTopic) {
        await updateDoc(doc(db, 'notesTopics', editingTopic.id), payload);
        toast.success(`Topic "${topicTitle.trim()}" updated!`);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'notesTopics'), payload);
        toast.success(`Topic "${topicTitle.trim()}" created!`);
      }

      setShowTopicModal(false);
      setTopicTitle('');
      setTopicDescription('');
    } catch (err) {
      console.error("Error saving topic:", err);
      toast.error("Failed to save topic: " + err.message);
    } finally {
      setSavingTopic(false);
    }
  };

  const handleMoveTopicOrder = async (topicItem, direction) => {
    const currentIndex = currentStreamTopics.findIndex(t => t.id === topicItem.id);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentStreamTopics.length) return;

    const targetTopic = currentStreamTopics[targetIndex];
    try {
      const currentOrder = topicItem.order || (currentIndex + 1);
      const targetOrder = targetTopic.order || (targetIndex + 1);

      await updateDoc(doc(db, 'notesTopics', topicItem.id), { order: targetOrder });
      await updateDoc(doc(db, 'notesTopics', targetTopic.id), { order: currentOrder });
    } catch (e) {
      console.error("Error reordering topics:", e);
    }
  };

  // ==========================================
  // HANDLERS: MATERIAL MANAGEMENT
  // ==========================================
  const handleOpenAddMaterial = (prefilledTopicId = null) => {
    setEditingMaterial(null);
    setMaterialStream(selectedStream);
    setMaterialNotesType(activeTypeObj?.id || selectedNotesTypeId);
    
    // Auto-select topic if passed or use first topic
    const targetTopic = topics.find(t => t.id === prefilledTopicId) || currentStreamTopics[0];
    const availableSubjects = getSubjectsForStream(selectedStream);
    setMaterialSubject(targetTopic?.subject || availableSubjects[0] || 'General / Common');
    setMaterialTopicId(targetTopic?.id || prefilledTopicId || '');
    setMaterialTitle('');
    setMaterialDescription('');
    setMaterialUploadMode('pdf');
    setMaterialDriveUrl('');
    setMaterialFile(null);
    setUploadProgress('');
    setShowMaterialModal(true);
    setShowCreatePicker(false);
  };

  const handleOpenEditMaterial = (mat) => {
    setEditingMaterial(mat);
    setMaterialStream(mat.stream || mat.course || selectedStream);
    setMaterialNotesType(mat.notesTypeId || activeTypeObj?.id || selectedNotesTypeId);
    setMaterialSubject(mat.subject || getSubjectsForStream(selectedStream)[0]);
    setMaterialTopicId(mat.topicId || '');
    setMaterialTitle(mat.title || '');
    setMaterialDescription(mat.description || '');
    setMaterialUploadMode(mat.uploadMode || (mat.fileUrl?.includes('drive.google') ? 'drive' : 'pdf'));
    setMaterialDriveUrl(mat.fileUrl || mat.driveUrl || '');
    setMaterialFile(null);
    setUploadProgress('');
    setShowMaterialModal(true);
  };

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    if (!materialTitle.trim()) return toast.error("Please enter a material title.");
    if (materialUploadMode === 'pdf' && !materialFile && !editingMaterial?.fileUrl) {
      return toast.error("Please select a PDF file to upload.");
    }
    if (materialUploadMode === 'drive' && !materialDriveUrl.trim()) {
      return toast.error("Please enter the Google Drive / document link.");
    }

    try {
      setSavingMaterial(true);
      let fileUrl = editingMaterial?.fileUrl || materialDriveUrl.trim();
      let fileName = editingMaterial?.fileName || materialFile?.name || 'Document';
      let filePath = editingMaterial?.filePath || null;

      // Handle PDF Upload to Storage with Dual-Cloud Fallback (Supabase + Firebase)
      if (materialUploadMode === 'pdf' && materialFile) {
        setUploadProgress("Uploading PDF to storage...");
        const uploadResult = await uploadPdfFile(materialFile, 'notes', materialStream);
        fileUrl = uploadResult.url;
        fileName = uploadResult.fileName || materialFile.name;
        filePath = uploadResult.storagePath || null;
      }

      const chosenTypeObj = notesTypes.find(t => t.id === materialNotesType) || activeTypeObj;

      // Also get subject from chosen topic if topicId selected
      let subjectToUse = materialSubject;
      if (materialTopicId) {
        const foundTopic = topics.find(t => t.id === materialTopicId);
        if (foundTopic?.subject) subjectToUse = foundTopic.subject;
      }

      const payload = {
        title: materialTitle.trim(),
        description: materialDescription.trim(),
        stream: materialStream,
        course: materialStream, // Backward-compatible with student side
        subject: subjectToUse,
        topicId: materialTopicId || null,
        notesTypeId: materialNotesType || chosenTypeObj?.id,
        notesTypeName: chosenTypeObj?.name || 'Notes',
        fileUrl,
        fileName,
        filePath,
        uploadMode: materialUploadMode,
        isActive: editingMaterial?.isActive !== undefined ? editingMaterial.isActive : true,
        published: editingMaterial?.published !== undefined ? editingMaterial.published : true,
        updatedAt: serverTimestamp()
      };

      if (editingMaterial) {
        await updateDoc(doc(db, 'notes', editingMaterial.id), payload);
        toast.success(`Material "${materialTitle.trim()}" updated!`);
      } else {
        payload.createdAt = serverTimestamp();
        payload.author = userProfile?.name || 'Admin';
        payload.createdBy = userProfile?.email || 'Admin';
        await addDoc(collection(db, 'notes'), payload);
        toast.success(`Material "${materialTitle.trim()}" published!`);
      }

      setShowMaterialModal(false);
      setMaterialTitle('');
      setMaterialDescription('');
      setMaterialFile(null);
      setMaterialDriveUrl('');
    } catch (err) {
      console.error("Error saving material:", err);
      toast.error("Upload failed: " + err.message);
    } finally {
      setSavingMaterial(false);
      setUploadProgress('');
    }
  };

  const handleToggleMaterialActive = async (materialItem) => {
    try {
      const nextState = materialItem.isActive === false ? true : false;
      await updateDoc(doc(db, 'notes', materialItem.id), {
        isActive: nextState,
        published: nextState,
        updatedAt: serverTimestamp()
      });
      toast.success(nextState ? 'Material published for students' : 'Material hidden from students');
    } catch (e) {
      console.error("Error toggling active state:", e);
      toast.error("Failed to update status");
    }
  };

  // ==========================================
  // CONFIRMATION DELETIONS
  // ==========================================
  const handleExecuteDelete = async () => {
    if (!deleteConfirmTarget) return;
    try {
      setIsDeleting(true);
      const { type, item } = deleteConfirmTarget;

      if (type === 'type') {
        // Delete Notes Type
        await deleteDoc(doc(db, 'notesTypes', item.id));
        toast.success(`Category "${item.name}" deleted.`);
      } else if (type === 'topic') {
        // Delete Topic & all materials inside it
        const matsToDelete = materials.filter(m => m.topicId === item.id);
        for (const m of matsToDelete) {
          if (m.filePath && isSupabaseConfigured()) {
            await supabase.storage.from(BUCKET_NAME).remove([m.filePath]).catch(() => {});
          }
          await deleteDoc(doc(db, 'notes', m.id));
        }
        await deleteDoc(doc(db, 'notesTopics', item.id));
        toast.success(`Topic "${item.title}" and ${matsToDelete.length} materials deleted.`);
      } else if (type === 'material') {
        // Delete single Material
        if (item.filePath && isSupabaseConfigured()) {
          await supabase.storage.from(BUCKET_NAME).remove([item.filePath]).catch(() => {});
        }
        await deleteDoc(doc(db, 'notes', item.id));
        toast.success(`Material "${item.title}" deleted.`);
      }

      setDeleteConfirmTarget(null);
    } catch (err) {
      console.error("Deletion failed:", err);
      toast.error("Failed to delete: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================================= */}
      {/* 1. TOP HEADER BANNER WITH DYNAMIC "+" BUTTON              */}
      {/* ========================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Admin Study Material Control</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Manage Notes & <span className="gold-gradient-text">Study Materials</span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Create and customize dynamic Notes Categories (Short Notes, Sticky Notes, RTP, PYQ, etc.), organize stream-wise topics, and manage PDF documents & links with full admin authority.
            </p>
          </div>

          {/* DYNAMIC "+" ACTION BUTTON */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowCreatePicker(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-navy-950 font-black text-sm shadow-glow-gold flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>+ Add Content</span>
            </button>
          </div>
        </div>

        {/* STREAM SELECTION BAR */}
        <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              Stream:
            </span>
            {streamsList.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setSelectedStream(st);
                  setSelectedSubjectFilter('ALL');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedStream === st
                    ? 'bg-amber-500 text-navy-950 font-black shadow-glow-gold'
                    : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {st}
              </button>
            ))}

            <button
              type="button"
              onClick={handleOpenAddStream}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
              title="Add Custom Stream"
            >
              <Plus className="w-3 h-3" />
              <span>Stream</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics or files..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 2. DYNAMIC NOTES TYPES (Categories Navigation Bar)        */}
      {/* ========================================================= */}
      <div className="p-4 rounded-2xl glass-card border border-white/10 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Notes Categories ({notesTypes.length})
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenAddType}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Category</span>
          </button>
        </div>

        {/* Scrollable Notes Types Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {notesTypes.map((typeItem, index) => {
            const isSelected = selectedNotesTypeId === typeItem.id || selectedNotesTypeId === typeItem.name;
            const countForType = getCountForType(typeItem);

            return (
              <div key={typeItem.id} className="relative group shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedNotesTypeId(typeItem.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-navy-950 font-black shadow-glow-gold'
                      : 'bg-navy-900/90 text-slate-300 hover:text-white hover:bg-navy-800 border border-white/10'
                  }`}
                >
                  <span>{typeItem.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-navy-950 text-amber-400' : 'bg-white/10 text-slate-300'
                  }`}>
                    {countForType}
                  </span>
                </button>

                {/* Edit / Delete / Reorder Controls on Hover */}
                <div className="absolute -top-2 -right-2 hidden group-hover:flex items-center gap-0.5 bg-navy-950 rounded-full border border-white/20 p-0.5 z-20 shadow-xl">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleMoveTypeOrder(typeItem, 'left'); }}
                      className="p-1 hover:text-white text-slate-400"
                      title="Move Left"
                    >
                      &larr;
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleOpenEditType(typeItem); }}
                    className="p-1 hover:text-amber-400 text-slate-400"
                    title="Edit Category Name & Order"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setDeleteConfirmTarget({ 
                        type: 'type', 
                        item: typeItem,
                        details: `Deleting this category will affect ${countForType} materials currently tagged with it.`
                      }); 
                    }}
                    className="p-1 hover:text-red-400 text-slate-400"
                    title="Delete Category"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Optional Subject Filter Filter Pills */}
        {availableSubjectsForStream.length > 0 && (
          <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Subject Filter:</span>
            <button
              type="button"
              onClick={() => setSelectedSubjectFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedSubjectFilter === 'ALL'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All Subjects
            </button>
            {availableSubjectsForStream.map(sub => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubjectFilter(sub)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer truncate max-w-xs ${
                  selectedSubjectFilter === sub
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={sub}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. TOPIC & MATERIAL EXPLORER (Hierarchy Display)          */}
      {/* ========================================================= */}
      <div className="space-y-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-navy-900/60 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{selectedStream}</span>
                <span className="text-slate-500">&rarr;</span>
                <span className="text-amber-400">{activeTypeObj?.name || 'Notes'}</span>
                {selectedSubjectFilter !== 'ALL' && (
                  <>
                    <span className="text-slate-500">&rarr;</span>
                    <span className="text-purple-300 text-xs font-medium">({selectedSubjectFilter})</span>
                  </>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                {currentStreamTopics.length} Topics configured under this stream & category
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenAddTopic()}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Add Topic</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddMaterial()}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>+ Add Material</span>
            </button>
          </div>
        </div>

        {/* Empty state if no topics */}
        {currentStreamTopics.length === 0 && uncategorizedMaterials.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={`No Content for ${selectedStream} (${activeTypeObj?.name})`}
            description="Start organizing study material by adding a Topic or uploading Material directly."
            actionText="+ Create Topic"
            onAction={() => handleOpenAddTopic()}
          />
        ) : (
          <div className="space-y-4">
            
            {/* List Topics */}
            {currentStreamTopics.map((topicItem, index) => {
              const topicMaterials = getMaterialsForTopic(topicItem.id);
              const isExpanded = expandedTopicIds[topicItem.id] !== false; // Default expanded

              return (
                <div
                  key={topicItem.id}
                  className="rounded-3xl glass-card border border-white/10 overflow-hidden shadow-lg transition-all"
                >
                  {/* Topic Header Row */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-navy-900/90 to-navy-950/80 border-b border-white/5">
                    
                    <div 
                      className="flex items-start sm:items-center gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => toggleTopicExpand(topicItem.id)}
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                        <Folder className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 text-amber-300 border border-white/10 text-[10px] font-bold">
                            {topicItem.subject}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-white truncate">
                            {topicItem.title}
                          </h3>
                        </div>
                        {topicItem.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {topicItem.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Topic Controls & Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-white/5 text-slate-300 text-xs font-bold border border-white/10">
                        {topicMaterials.length} {topicMaterials.length === 1 ? 'file' : 'files'}
                      </span>

                      {/* Reorder Buttons */}
                      <div className="flex items-center border border-white/10 rounded-xl overflow-hidden bg-navy-900">
                        <button
                          type="button"
                          onClick={() => handleMoveTopicOrder(topicItem, 'up')}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move Topic Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveTopicOrder(topicItem, 'down')}
                          disabled={index === currentStreamTopics.length - 1}
                          className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move Topic Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quick Add Material to this Topic */}
                      <button
                        type="button"
                        onClick={() => handleOpenAddMaterial(topicItem.id)}
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                        title="Add Material to this Topic"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      {/* Edit Topic */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditTopic(topicItem)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs transition-all cursor-pointer"
                        title="Edit Topic"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete Topic */}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTarget({ 
                          type: 'topic', 
                          item: topicItem,
                          details: `All ${topicMaterials.length} study materials inside this topic will also be permanently deleted.`
                        })}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-all cursor-pointer"
                        title="Delete Topic & Its Materials"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Accordion toggle */}
                      <button
                        type="button"
                        onClick={() => toggleTopicExpand(topicItem.id)}
                        className="p-2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                  </div>

                  {/* Materials list inside this topic */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 space-y-3 bg-navy-950/40">
                      {topicMaterials.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-navy-900/40 border border-white/5 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <span>No materials added to this topic yet.</span>
                          <button
                            type="button"
                            onClick={() => handleOpenAddMaterial(topicItem.id)}
                            className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add First Material</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {topicMaterials.map((mat) => (
                            <div
                              key={mat.id}
                              className={`p-4 rounded-2xl border transition-all space-y-2 relative ${
                                mat.isActive !== false
                                  ? 'bg-navy-900/80 border-white/10 hover:border-amber-500/30'
                                  : 'bg-navy-950/80 border-white/5 opacity-60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      mat.uploadMode === 'pdf'
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    }`}>
                                      {mat.uploadMode === 'pdf' ? 'PDF File' : 'Drive Link'}
                                    </span>

                                    {mat.isActive === false && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                                        Hidden from Students
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-sm font-bold text-white truncate">
                                    {mat.title}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Test Link */}
                                  {mat.fileUrl && (
                                    <a
                                      href={mat.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                                      title="Open Material"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}

                                  {/* Edit Material */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditMaterial(mat)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                                    title="Edit Material"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Material */}
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmTarget({ 
                                      type: 'material', 
                                      item: mat,
                                      details: 'This study material will be permanently deleted.'
                                    })}
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                    title="Delete Material"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {mat.description && (
                                <p className="text-xs text-slate-400 line-clamp-2">
                                  {mat.description}
                                </p>
                              )}

                              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                                <span>Uploaded: {formatDate(mat.createdAt)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleMaterialActive(mat)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                                    mat.isActive !== false 
                                      ? 'text-emerald-400 hover:bg-emerald-500/10' 
                                      : 'text-amber-400 hover:bg-amber-500/10'
                                  }`}
                                >
                                  {mat.isActive !== false ? '● Active (Shown)' : '○ Inactive (Hidden)'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}

            {/* Uncategorized / Legacy Materials Container */}
            {uncategorizedMaterials.length > 0 && (
              <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-3 bg-navy-950/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      General / Unassigned Materials ({uncategorizedMaterials.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Edit to assign into a specific topic
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {uncategorizedMaterials.map((mat) => (
                    <div key={mat.id} className="p-3.5 rounded-2xl bg-navy-900 border border-white/5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{mat.title}</div>
                        <div className="text-[10px] text-slate-400">{mat.subject}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {mat.fileUrl && (
                          <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:text-white text-slate-400">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button type="button" onClick={() => handleOpenEditMaterial(mat)} className="p-1.5 hover:text-amber-400 text-slate-400">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setDeleteConfirmTarget({ 
                            type: 'material', 
                            item: mat,
                            details: 'This study material will be permanently deleted.'
                          })} 
                          className="p-1.5 hover:text-red-400 text-slate-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* MODAL 1: DYNAMIC "+" CREATE PICKER MODAL                   */}
      {/* ========================================================= */}
      {showCreatePicker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowCreatePicker(false)}
        >
          <div 
            className="w-full max-w-md bg-gradient-to-b from-[#19122a] via-navy-900 to-navy-950 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>What would you like to create?</span>
              </h3>
              <button 
                onClick={() => setShowCreatePicker(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Option 1: Add Notes Type */}
              <button
                type="button"
                onClick={handleOpenAddType}
                className="p-4 rounded-2xl bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 text-left flex items-start gap-3 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    + Add Notes Type / Category
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Create a new category (e.g. Formula Book, Concept Maps, Flashcards).
                  </div>
                </div>
              </button>

              {/* Option 2: Add Topic */}
              <button
                type="button"
                onClick={() => handleOpenAddTopic()}
                className="p-4 rounded-2xl bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 text-left flex items-start gap-3 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                    + Add Topic
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Create a chapter or subject topic inside {selectedStream} under {activeTypeObj?.name || 'Notes'}.
                  </div>
                </div>
              </button>

              {/* Option 3: Add Material */}
              <button
                type="button"
                onClick={() => handleOpenAddMaterial()}
                className="p-4 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-left flex items-start gap-3 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FilePlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    + Add Study Material
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Upload a PDF document or paste a Google Drive link under a topic.
                  </div>
                </div>
              </button>

              {/* Option 4: Add Stream */}
              <button
                type="button"
                onClick={handleOpenAddStream}
                className="p-4 rounded-2xl bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 text-left flex items-start gap-3 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    + Add Stream
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Add a new stream or course for custom study materials.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD / EDIT STREAM MODAL                          */}
      {/* ========================================================= */}
      {showStreamModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowStreamModal(false)}
        >
          <div 
            className="w-full max-w-md bg-gradient-to-b from-[#19122a] via-navy-900 to-navy-950 border border-purple-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-400" />
                <span>Add New Stream</span>
              </h3>
              <button onClick={() => setShowStreamModal(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveStream} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Stream Name *
                </label>
                <input
                  type="text"
                  required
                  value={streamNameInput}
                  onChange={(e) => setStreamNameInput(e.target.value)}
                  placeholder="e.g. CA Final, CS Executive, CMA Final"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowStreamModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStream || !streamNameInput.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-black text-xs shadow-glow-purple flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingStream ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Stream</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADD / EDIT NOTES TYPE MODAL                      */}
      {/* ========================================================= */}
      {showTypeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowTypeModal(false)}
        >
          <div 
            className="w-full max-w-md bg-gradient-to-b from-[#19122a] via-navy-900 to-navy-950 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-400" />
                <span>{editingType ? 'Edit Category' : 'Create New Notes Category'}</span>
              </h3>
              <button onClick={() => setShowTypeModal(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveType} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={typeNameInput}
                  onChange={(e) => setTypeNameInput(e.target.value)}
                  placeholder="e.g. Formula Book, Concept Maps, Flashcards"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={typeOrderInput}
                  onChange={(e) => setTypeOrderInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingType || !typeNameInput.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-navy-950 font-black text-xs shadow-glow-gold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingType ? 'Update Category' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: ADD / EDIT TOPIC MODAL                           */}
      {/* ========================================================= */}
      {showTopicModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowTopicModal(false)}
        >
          <div 
            className="w-full max-w-lg bg-gradient-to-b from-[#19122a] via-navy-900 to-navy-950 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-400" />
                <span>{editingTopic ? 'Edit Topic' : 'Add New Topic'}</span>
              </h3>
              <button onClick={() => setShowTopicModal(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveTopic} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Stream *</label>
                  <select
                    value={topicStream}
                    onChange={(e) => {
                      setTopicStream(e.target.value);
                      const subs = getSubjectsForStream(e.target.value);
                      setTopicSubject(subs[0] || 'General / Common');
                      setIsCustomSubject(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    {streamsList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Notes Category *</label>
                  <select
                    value={topicNotesType}
                    onChange={(e) => setTopicNotesType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    {notesTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Subject Selection with Custom Subject option */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Subject *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSubject(!isCustomSubject);
                      if (!isCustomSubject) setCustomSubjectInput('');
                    }}
                    className="text-[10px] text-amber-400 hover:underline font-semibold"
                  >
                    {isCustomSubject ? 'Pick from List' : '+ Enter Custom Subject'}
                  </button>
                </div>

                {isCustomSubject ? (
                  <input
                    type="text"
                    required
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    placeholder="e.g. Accounts, Direct Tax, Auditing, Corporate Law"
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-amber-500/40 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <select
                    value={topicSubject}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomSubject(true);
                      } else {
                        setTopicSubject(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    {getSubjectsForStream(topicStream).map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="__custom__">+ Custom Subject...</option>
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Topic / Chapter Title *</label>
                <input
                  type="text"
                  required
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g. Chapter 1: Introduction to Accounting or Partnership Deeds"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Description (Optional)</label>
                <textarea
                  rows="2"
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  placeholder="Key concepts or instructions for this topic..."
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Display Order</label>
                <input
                  type="number"
                  min={1}
                  value={topicOrder}
                  onChange={(e) => setTopicOrder(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTopic || !topicTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-navy-950 font-black text-xs shadow-glow-gold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingTopic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingTopic ? 'Update Topic' : 'Save Topic'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: ADD / EDIT MATERIAL MODAL                        */}
      {/* ========================================================= */}
      {showMaterialModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowMaterialModal(false)}
        >
          <div 
            className="w-full max-w-lg bg-gradient-to-b from-[#19122a] via-navy-900 to-navy-950 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5 max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-emerald-400" />
                <span>{editingMaterial ? 'Edit Study Material' : 'Add Study Material'}</span>
              </h3>
              <button onClick={() => setShowMaterialModal(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Stream *</label>
                  <select
                    value={materialStream}
                    onChange={(e) => {
                      setMaterialStream(e.target.value);
                      const subs = getSubjectsForStream(e.target.value);
                      setMaterialSubject(subs[0] || 'General / Common');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    {streamsList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Notes Category *</label>
                  <select
                    value={materialNotesType}
                    onChange={(e) => setMaterialNotesType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    {notesTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Subject *</label>
                  <select
                    value={materialSubject}
                    onChange={(e) => setMaterialSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    {getSubjectsForStream(materialStream).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Assign to Topic (Optional)</label>
                  <select
                    value={materialTopicId}
                    onChange={(e) => setMaterialTopicId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">No Topic (General / Direct)</option>
                    {topics
                      .filter(t => (t.stream || '').toLowerCase() === materialStream.toLowerCase())
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.title} ({t.subject})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Material Title *</label>
                <input
                  type="text"
                  required
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="e.g. Partnership Retirement Complete Handwritten Notes"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Description (Optional)</label>
                <textarea
                  rows="2"
                  value={materialDescription}
                  onChange={(e) => setMaterialDescription(e.target.value)}
                  placeholder="Additional context, tips, or chapter guidance for students..."
                  className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Material Format *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMaterialUploadMode('pdf')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      materialUploadMode === 'pdf'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm'
                        : 'bg-navy-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload PDF File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaterialUploadMode('drive')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      materialUploadMode === 'drive'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-sm'
                        : 'bg-navy-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>Google Drive Link</span>
                  </button>
                </div>
              </div>

              {materialUploadMode === 'pdf' ? (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    {editingMaterial?.fileUrl ? 'Replace PDF (Optional)' : 'Select PDF File *'}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-navy-950 hover:file:bg-amber-400"
                  />
                  {editingMaterial?.fileName && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      Current file: <span className="text-white">{editingMaterial.fileName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Google Drive / Web Link *</label>
                  <input
                    type="url"
                    required={materialUploadMode === 'drive'}
                    value={materialDriveUrl}
                    onChange={(e) => setMaterialDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/.../view"
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              )}

              {uploadProgress && (
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadProgress}</span>
                </div>
              )}

              <div className="pt-3 border-t border-white/10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMaterial || !materialTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-glow-emerald flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingMaterial ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingMaterial ? 'Update Material' : 'Publish Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: DELETE CONFIRMATION MODAL                        */}
      {/* ========================================================= */}
      {deleteConfirmTarget && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isDeleting && setDeleteConfirmTarget(null)}
        >
          <div 
            className="w-full max-w-md bg-gradient-to-b from-[#24111a] via-navy-900 to-navy-950 border border-rose-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Permanent Deletion</h3>
                <p className="text-xs text-rose-300">This action cannot be undone.</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed bg-navy-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1.5">
              <div>
                {deleteConfirmTarget.type === 'type' && (
                  <>Are you sure you want to delete the category <strong>"{deleteConfirmTarget.item.name}"</strong>?</>
                )}
                {deleteConfirmTarget.type === 'topic' && (
                  <>Are you sure you want to delete the topic <strong>"{deleteConfirmTarget.item.title}"</strong>?</>
                )}
                {deleteConfirmTarget.type === 'material' && (
                  <>Are you sure you want to delete the material <strong>"{deleteConfirmTarget.item.title}"</strong>?</>
                )}
              </div>
              {deleteConfirmTarget.details && (
                <div className="text-amber-400/90 text-[11px] font-medium">
                  {deleteConfirmTarget.details}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-glow-rose flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
