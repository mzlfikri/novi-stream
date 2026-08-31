const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
const ADMIN_PASSWORD = "123456";

const uploadDir = path.join(__dirname, 'uploads');
const metadataFile = path.join(__dirname, 'metadata.json');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(metadataFile)) fs.writeFileSync(metadataFile, JSON.stringify({}));

function getMetadata() {
  try { return JSON.parse(fs.readFileSync(metadataFile)); } catch (e) { return {}; }
}
function saveMetadata(data) {
  fs.writeFileSync(metadataFile, JSON.stringify(data, null, 2));
}

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + path.extname(file.originalname))
});

const upload = multer({ storage: storage, limits: { fileSize: 500 * 1024 * 1024 } });

app.post('/api/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) res.json({ success: true, message: "Login Berhasil!" });
  else res.status(401).json({ success: false, message: "Password Salah!" });
});

app.post('/api/upload', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_PASSWORD) return res.status(403).json({ error: "Akses Ditolak!" });
  if (!req.files['video']) return res.status(400).json({ error: 'File video wajib diunggah!' });

  const videoFile = req.files['video'][0].filename;
  const thumbFile = req.files['thumbnail'] ? req.files['thumbnail'][0].filename : null;

  const meta = getMetadata();
  meta[videoFile] = {
    title: req.body.title || videoFile,
    description: req.body.description || "Tidak ada deskripsi.",
    category: req.body.category || "Drama",
    thumbnail: thumbFile ? `/uploads/${thumbFile}` : null,
    badge: req.body.badge || "HD",
    likes: 0,
    comments: []
  };
  saveMetadata(meta);
  res.json({ success: true });
});

app.get('/api/videos', (req, res) => {
  fs.readdir('uploads/', (err, files) => {
    if (err) return res.status(500).json({ error: 'Gagal membaca direktori.' });
    const meta = getMetadata();
    const videoFiles = files.filter(f => f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.webm'));

    const result = videoFiles.map(file => {
      const info = meta[file] || { title: file, description: "", likes: 0, comments: [] };
      return {
        filename: file,
        src: `/uploads/${file}`,
        title: info.title,
        description: info.description,
        category: info.category || "Drama",
        thumbnail: info.thumbnail || null,
        badge: info.badge || "HD",
        likes: info.likes || 0,
        comments: info.comments || []
      };
    });
    res.json(result);
  });
});

app.delete('/api/videos/:filename', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_PASSWORD) return res.status(403).json({ error: "Akses Ditolak!" });
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  const meta = getMetadata();
  if (meta[filename] && meta[filename].thumbnail) {
    const thumbPath = path.join(uploadDir, meta[filename].thumbnail.replace('/uploads/', ''));
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  }
  delete meta[filename];
  saveMetadata(meta);
  res.json({ success: true });
});

app.post('/api/videos/:filename/like', (req, res) => {
  const meta = getMetadata();
  if (!meta[req.params.filename]) meta[req.params.filename] = { likes: 0 };
  meta[req.params.filename].likes = (meta[req.params.filename].likes || 0) + 1;
  saveMetadata(meta);
  res.json({ likes: meta[req.params.filename].likes });
});

app.post('/api/videos/:filename/comment', (req, res) => {
  const meta = getMetadata();
  if (!meta[req.params.filename]) meta[req.params.filename] = { comments: [] };
  if (!meta[req.params.filename].comments) meta[req.params.filename].comments = [];
  meta[req.params.filename].comments.push({ text: req.body.text, date: new Date().toLocaleTimeString() });
  saveMetadata(meta);
  res.json({ comments: meta[req.params.filename].comments });
});

app.listen(PORT, () => console.log(`Server aktif di http://localhost:${PORT}`));