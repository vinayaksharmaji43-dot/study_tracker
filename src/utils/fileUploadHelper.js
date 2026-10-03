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
 * Fast Data URL to Blob converter (runs in <2ms)
 */
function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Strict timeout wrapper to prevent cloud storage hanging
 */
function withTimeout(promise, ms = 2500, fallbackVal = null) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallbackVal), ms))
  ]);
}

/**
 * Upload Community Doubt Image Attachment (Instant + Non-Blocking)
 * 1. Checks for fast Data URL fallback (<60KB compressed image)
 * 2. Attempts Cloud Upload with strict 2.5s timeout
 * 3. Immediately falls back to optimized compressed Data URL if cloud is slow or network hangs
 */
export async function uploadDoubtImage(fileOrDataUrl, stream = 'all', fallbackDataUrl = null) {
  if (!fileOrDataUrl) return null;
  if (typeof fileOrDataUrl === 'string' && (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://'))) {
    return fileOrDataUrl;
  }

  const fastFallback = (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) 
    ? fileOrDataUrl 
    : fallbackDataUrl;

  const cleanStream = (stream || 'all').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `${Date.now()}_img.jpg`;
  const filePath = `communityDoubts/images/${cleanStream}/${fileName}`;

  let blobToUpload = null;
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
    try {
      blobToUpload = dataUrlToBlob(fileOrDataUrl);
    } catch {
      return fileOrDataUrl;
    }
  } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
    blobToUpload = fileOrDataUrl;
  }

  const cloudUploadPromise = (async () => {
    // 1. Try Firebase Storage directly
    if (storage && blobToUpload) {
      try {
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, blobToUpload, { contentType: 'image/jpeg' });
        const downloadUrl = await getDownloadURL(snapshot.ref);
        if (downloadUrl) return downloadUrl;
      } catch (fbErr) {
        console.warn('Firebase Storage fast upload skipped:', fbErr?.message);
      }
    }

    // 2. Try Supabase Storage if configured
    if (isSupabaseConfigured() && blobToUpload) {
      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, blobToUpload, { contentType: 'image/jpeg', upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) return publicUrlData.publicUrl;
        }
      } catch (supErr) {
        console.warn('Supabase storage fast upload skipped:', supErr?.message);
      }
    }

    return null;
  })();

  try {
    const cloudUrl = await withTimeout(cloudUploadPromise, 2500, null);
    if (cloudUrl) return cloudUrl;
  } catch {
    // Timeout or network error
  }

  // Instant Fallback: return sharp compressed Data URL (<60KB) so doubt publishes in <1s!
  if (fastFallback) {
    return fastFallback;
  }

  return null;
}

/**
 * Upload Community Doubt Voice Note / Audio Attachment (Instant + Non-Blocking)
 * 1. Checks for fast Audio Data URL fallback
 * 2. Attempts Cloud Upload with strict 2.5s timeout
 * 3. Immediately falls back to optimized Opus Data URL if cloud is slow or network hangs
 */
export async function uploadDoubtAudio(blobOrDataUrl, stream = 'all', fallbackDataUrl = null) {
  if (!blobOrDataUrl) return null;
  if (typeof blobOrDataUrl === 'string' && (blobOrDataUrl.startsWith('http://') || blobOrDataUrl.startsWith('https://'))) {
    return blobOrDataUrl;
  }

  const fastFallback = (typeof blobOrDataUrl === 'string' && blobOrDataUrl.startsWith('data:'))
    ? blobOrDataUrl
    : fallbackDataUrl;

  const cleanStream = (stream || 'all').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `${Date.now()}_voice.webm`;
  const filePath = `communityDoubts/audio/${cleanStream}/${fileName}`;

  let blobToUpload = null;
  if (typeof blobOrDataUrl === 'string' && blobOrDataUrl.startsWith('data:')) {
    try {
      blobToUpload = dataUrlToBlob(blobOrDataUrl);
    } catch {
      return blobOrDataUrl;
    }
  } else if (blobOrDataUrl instanceof Blob || blobOrDataUrl instanceof File) {
    blobToUpload = blobOrDataUrl;
  }

  const cloudAudioUpload = (async () => {
    // 1. Try Firebase Storage directly
    if (storage && blobToUpload) {
      try {
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, blobToUpload, { contentType: blobToUpload.type || 'audio/webm' });
        const downloadUrl = await getDownloadURL(snapshot.ref);
        if (downloadUrl) return downloadUrl;
      } catch (fbErr) {
        console.warn('Firebase Storage audio fast upload skipped:', fbErr?.message);
      }
    }

    // 2. Try Supabase Storage
    if (isSupabaseConfigured() && blobToUpload) {
      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, blobToUpload, { contentType: blobToUpload.type || 'audio/webm', upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) return publicUrlData.publicUrl;
        }
      } catch (supErr) {
        console.warn('Supabase audio fast upload skipped:', supErr?.message);
      }
    }

    return null;
  })();

  try {
    const cloudUrl = await withTimeout(cloudAudioUpload, 2500, null);
    if (cloudUrl) return cloudUrl;
  } catch {
    // Timeout or network error
  }

  // Instant Fallback: return recorded audio Data URL (<100KB)
  if (fastFallback) {
    return fastFallback;
  }

  // If only blob is present, convert quickly to data URL
  if (blobToUpload) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blobToUpload);
    });
  }

  return null;
}


