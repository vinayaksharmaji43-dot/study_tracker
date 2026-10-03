import { supabase, isSupabaseConfigured } from '../config/supabase';
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const IMGBB_KEY = 'f43ca36cbb4a3e5de80d145fb53cbfff';
const BUCKET_NAME = 'study-material';

/**
 * Sanitize filename to avoid S3/Storage URI encoding errors
 */
function sanitizeFileName(fileName) {
  const clean = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${Date.now()}_${clean}`;
}

/**
 * Upload a PDF file with Dual-Cloud fallback (Supabase Storage -> Firebase Storage)
 * Works across all streams for Test Papers, Notes, Study Material, etc.
 * 
 * @param {File} file - The file object from <input type="file">
 * @param {string} folder - Destination folder name (e.g. 'tests', 'notes', 'submissions')
 * @param {string} stream - Stream name for organizational subfolder
 * @returns {Promise<{ url: string, provider: string, fileName: string, filePath: string }>}
 */
export async function uploadPdfFile(file, folder = 'tests', stream = 'all') {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // Maximum allowed size: 50MB
  const maxBytes = 50 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 50MB.`);
  }

  const cleanStream = (stream || 'all').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const sanitizedName = sanitizeFileName(file.name);
  const filePath = `${folder}/${cleanStream}/${sanitizedName}`;
  const contentType = file.type || 'application/pdf';

  let lastError = null;

  // 1. STRATEGY 1: Supabase Storage
  if (isSupabaseConfigured()) {
    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          contentType,
          upsert: true
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          return {
            url: publicUrlData.publicUrl,
            provider: 'supabase',
            fileName: file.name,
            filePath
          };
        }
      } else {
        console.warn('Supabase storage upload failed, trying Firebase Storage fallback:', uploadError);
        lastError = uploadError;
      }
    } catch (supErr) {
      console.warn('Supabase storage exception, trying Firebase fallback:', supErr);
      lastError = supErr;
    }
  }

  // 2. STRATEGY 2: Firebase Storage Fallback
  if (storage) {
    try {
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);

      return {
        url: downloadUrl,
        provider: 'firebase',
        fileName: file.name,
        filePath
      };
    } catch (fbErr) {
      console.warn('Firebase Storage upload also failed:', fbErr);
      lastError = fbErr;
    }
  }

  // If both cloud storages fail, throw clear message
  throw new Error(
    lastError?.message || 
    'Could not upload PDF to cloud storage. Please check your network connection or provide a Google Drive link.'
  );
}

/**
 * Upload Image or Document (supports images and PDFs)
 */
export async function uploadImageOrDoc(file, folder = 'proofs', stream = 'all') {
  if (!file) throw new Error('No file provided.');

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    return (await uploadPdfFile(file, folder, stream)).url;
  }

  // If image, try Supabase -> Firebase -> ImgBB
  try {
    const res = await uploadPdfFile(file, folder, stream);
    return res.url;
  } catch (cloudErr) {
    console.warn('Direct storage failed for image, attempting ImgBB fallback:', cloudErr);
    // ImgBB fallback for photos
    const formData = new FormData();
    formData.append('key', IMGBB_KEY);
    formData.append('image', file);

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success && data.data?.url) {
      return data.data.url;
    }
    throw new Error('Image upload failed on all providers.');
  }
}

/**
 * Upload Community Doubt Image Attachment (with multi-tier cloud fallback)
 */
export async function uploadDoubtImage(file, stream = 'all') {
  if (!file) return null;
  if (typeof file === 'string' && (file.startsWith('http://') || file.startsWith('https://'))) {
    return file;
  }
  return await uploadImageOrDoc(file, 'communityDoubts/images', stream);
}

/**
 * Upload Community Doubt Voice Note / Audio Attachment
 * Strategies: Supabase Storage -> Firebase Storage -> Data URL fallback (if small)
 */
export async function uploadDoubtAudio(blob, stream = 'all') {
  if (!blob) return null;
  if (typeof blob === 'string' && (blob.startsWith('http://') || blob.startsWith('https://'))) {
    return blob;
  }

  const cleanStream = (stream || 'all').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `${Date.now()}_voice.webm`;
  const filePath = `communityDoubts/audio/${cleanStream}/${fileName}`;
  const contentType = blob.type || 'audio/webm';

  // 1. Supabase Storage
  if (isSupabaseConfigured()) {
    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, blob, {
          contentType,
          upsert: true
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      } else {
        console.warn('Supabase audio upload warning:', uploadError);
      }
    } catch (supErr) {
      console.warn('Supabase audio upload exception:', supErr);
    }
  }

  // 2. Firebase Storage Fallback
  if (storage) {
    try {
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, blob, { contentType });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (fbErr) {
      console.warn('Firebase Storage audio upload warning:', fbErr);
    }
  }

  // 3. Fallback: Base64 data URL if size is under 400KB
  if (blob.size && blob.size < 400 * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  throw new Error('Could not upload audio note to cloud storage. Please check connection or retry.');
}

