const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth(['clerk', 'admin']));

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, or WebP images are accepted'));
  },
});

// POST /api/upload/photo
// Returns: { url, ocr: { full_name, id_number, dob, doc_type, confidence } }
router.post('/photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo file received' });

  const fileUrl = `/uploads/${req.file.filename}`;

  // --- Google Vision OCR (replace stub when API key is set) ---
  let ocr = { full_name: '', id_number: '', dob: '', doc_type: 'NIDA', confidence: 0 };

  if (process.env.GOOGLE_VISION_API_KEY) {
    try {
      // Send image as base64 — Vision API requires either base64 or a GCS URI,
      // not a local relative path.
      const imageBytes = fs.readFileSync(req.file.path);
      const base64Image = imageBytes.toString('base64');

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION' }],
            }],
          }),
        }
      );
      const data = await response.json();
      const rawText = data.responses?.[0]?.fullTextAnnotation?.text ?? '';
      ocr = parseIDText(rawText);
    } catch (err) {
      console.error('Vision API error:', err.message);
    }
  }

  res.json({ url: fileUrl, ocr });
});

// Serve uploaded files
router.use('/files', express.static(path.join(__dirname, '../../uploads')));

// Basic heuristic parser — clerk reviews and corrects every field before saving
function parseIDText(text) {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  // NIDA numbers are 20 digits; voter cards vary; licences have alphanumeric codes
  const idMatch = text.match(/\b(\d{8}-\d{5}-\d{5}-\d{2}|\d{20}|[A-Z]{2}\d{6,})\b/);
  const dobMatch = text.match(/\b(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/);

  const docType = /voter/i.test(text) ? 'VOTER'
    : /driving|licence|license/i.test(text) ? 'LICENCE'
    : /passport/i.test(text) ? 'PASSPORT'
    : 'NIDA';

  // Name heuristic: first all-caps line of 2+ words that isn't a field label
  const SKIP = /UNITED|REPUBLIC|TANZANIA|NATIONAL|IDENTIFICATION|AUTHORITY|DATE|BORN|CARD|SURNAME|GIVEN/i;
  const nameLine = lines.find(l => /^[A-Z ]{5,}$/.test(l) && l.includes(' ') && !SKIP.test(l));

  return {
    full_name: nameLine ? nameLine.split(/\s+/).map(w => w[0] + w.slice(1).toLowerCase()).join(' ') : '',
    id_number: idMatch?.[1] ?? '',
    dob: dobMatch?.[1] ?? '',
    doc_type: docType,
    confidence: idMatch ? 75 : 30,
  };
}

module.exports = router;
