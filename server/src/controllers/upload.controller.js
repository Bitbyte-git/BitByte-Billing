import { uploadDataUrlToCloudinary } from '../utils/cloudinary.js';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

function parseDataUrl(fileData) {
  const match = String(fileData || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw Object.assign(new Error('Invalid upload data'), { status: 422 });
  }

  return {
    mimetype: match[1],
    base64: match[2]
  };
}

export async function uploadFile(req, res, next) {
  try {
    const { filename = 'attachment', fileData, folder } = req.body;
    const parsed = parseDataUrl(fileData);
    const size = Buffer.byteLength(parsed.base64, 'base64');

    if (!ALLOWED_MIME_TYPES.includes(parsed.mimetype)) {
      throw Object.assign(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'), { status: 422 });
    }

    if (size > MAX_UPLOAD_BYTES) {
      throw Object.assign(new Error('Attachment must be 5MB or smaller'), { status: 422 });
    }

    const uploaded = await uploadDataUrlToCloudinary({ fileData, folder });
    res.status(201).json({
      filename,
      mimetype: parsed.mimetype,
      size,
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      resourceType: uploaded.resource_type
    });
  } catch (err) {
    next(err);
  }
}
