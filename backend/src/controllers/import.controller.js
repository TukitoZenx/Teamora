const path = require('path');
const multer = require('multer');
const mammoth = require('mammoth');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');
const workspaceService = require('../services/workspace.service');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
}).single('file');

const parsePptxFromBuffer = async (buffer) => {
  return new Promise((resolve, reject) => {
    try {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      const slideEntries = zipEntries
        .filter((entry) => entry.entryName.match(/ppt\/slides\/slide\d+\.xml/))
        .sort((a, b) => {
          const aMatch = a.entryName.match(/\d+/);
          const bMatch = b.entryName.match(/\d+/);
          return parseInt(aMatch[0], 10) - parseInt(bMatch[0], 10);
        });

      const slides = [];
      let processed = 0;

      if (slideEntries.length === 0) return resolve({ slides: [] });

      slideEntries.forEach((entry, index) => {
        try {
          const xml = entry.getData().toString('utf8');
          xml2js.parseString(xml, (err, result) => {
            if (err) {
              processed++;
              return;
            }
            let slideText = '';
            const extractText = (obj) => {
              if (!obj) return;
              if (obj['a:t']) {
                if (Array.isArray(obj['a:t'])) {
                  slideText += obj['a:t'].map((t) => (typeof t === 'string' ? t : t._ || '')).join(' ') + '\n';
                }
              } else if (typeof obj === 'object') {
                for (const key in obj) {
                  extractText(obj[key]);
                }
              }
            };
            extractText(result);
            slides[index] = { number: index + 1, text: slideText.trim() };
            processed++;
            if (processed === slideEntries.length) {
              resolve({ slides: slides.filter(Boolean) });
            }
          });
        } catch (e) {
          processed++;
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

const importFile = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
      const workspaceId = req.params.id;
      // Verify workspace access
      await workspaceService.getWorkspaceById(req.user._id, workspaceId);

      const ext = path.extname(req.file.originalname).toLowerCase();
      const baseName = req.file.originalname.replace(/\.[^.]+$/, '');

      if (ext === '.docx') {
        const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
        return res.status(200).json({
          success: true,
          type: 'docx',
          name: baseName,
          html: result.value
        });
      } else if (ext === '.pptx') {
        const pptxResult = await parsePptxFromBuffer(req.file.buffer);
        const mappedSlides = pptxResult.slides.map((slide) => ({
          id: uuidv4(),
          title: `Slide ${slide.number}`,
          elements: [
            {
              id: uuidv4(),
              type: 'textbox',
              text: slide.text || 'Empty Slide',
              x: 100,
              y: 120,
              width: 650,
              height: 380,
              fontSize: '20px',
              fontFamily: 'Inter, sans-serif',
              color: '#000000',
              fill: 'transparent'
            }
          ],
          hidden: false
        }));

        return res.status(200).json({
          success: true,
          type: 'pptx',
          name: baseName,
          slides: mappedSlides
        });
      } else if (['.txt', '.md', '.html', '.htm'].includes(ext)) {
        const text = req.file.buffer.toString('utf8');
        return res.status(200).json({
          success: true,
          type: 'text',
          name: baseName,
          text
        });
      } else {
        return res.status(400).json({ success: false, message: 'Unsupported file type for import' });
      }
    } catch (error) {
      next(error);
    }
  });
};

module.exports = {
  importFile
};
