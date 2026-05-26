import api from '../api.js';

const CLOUDINARY_FOLDER = 'bit-byte/quotation-attachments';

const MIME_BY_EXTENSION = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png'
};

export function getFileMimeType(file) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return MIME_BY_EXTENSION[extension] || 'application/octet-stream';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadToCloudinary(file, { folder = CLOUDINARY_FOLDER } = {}) {
  const fileData = await readFileAsDataUrl(file);
  const { data } = await api.post('/uploads/cloudinary', {
    filename: file.name,
    fileData,
    folder
  });
  return data;
}
