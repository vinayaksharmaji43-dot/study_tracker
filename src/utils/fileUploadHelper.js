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
