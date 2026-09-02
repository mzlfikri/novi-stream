const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi Multer untuk penyimpanan video lokal
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const DB_FILE = path.join(__dirname, 'database.json');
const ADMIN_FILE = path.join(__dirname, 'admin.json');

// AMAN: Jangan menimpa file database.json jika sudah ada isinya!
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(ADMIN_FILE)) {
  const defaultAdmin = [{ username: "owner", password: "123", role: "owner" }];
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultAdmin, null, 2));
}

// API: Ambil semua data video
app.get('/api/videos', (req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json([]);
    }
  } catch (err) {
    res.json([]);
  }
});

// API: Upload Video Film atau Siaran TV
app.post('/api/upload', upload.array('videoFiles'), (req, res) => {
  try {
    const { id, title, type, category, description, thumbnail, tvUrl, existingEpisodes } = req.body;
    
    let videos = [];
    if (fs.existsSync(DB_FILE)) {
      videos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }

    let thumbFinal = thumbnail && thumbnail.trim() !== '' 
      ? thumbnail 
      : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';

    let episodes = existingEpisodes ? JSON.parse(existingEpisodes) : [];

    // Jika ini adalah tipe Siaran TV (menggunakan link M3U8)
    if (type === 'tv') {
      episodes = [{ epNum: 1, src: tvUrl }];
    } else {
      // Jika upload file video lokal (.mp4)
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          const fileUrl = `/uploads/${file.filename}`;
          episodes.push({
            epNum: episodes.length + 1,
            src: fileUrl
          });
        });
      }
    }

    if (id) {
      videos = videos.map(v => v.id == id ? { ...v, title, type: type || 'film', category, description, thumbnail: thumbFinal, episodes } : v);
    } else {
      const newVideo = {
        id: Date.now(),
        title,
        type: type || 'film', // 'film' atau 'tv'
        category: category || 'Animasi',
        description,
        thumbnail: thumbFinal,
        episodes: episodes,
        likes: 0,
        comments: []
      };
      videos.unshift(newVideo);
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2));
    res.json({ success: true, message: 'Data berhasil disimpan ke server!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan ke server.' });
  }
});

// API: Hapus data
app.delete('/api/videos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (fs.existsSync(DB_FILE)) {
      let videos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      videos = videos.filter(v => v.id !== id);
      fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus.' });
  }
});

// API: Login Admin
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (fs.existsSync(ADMIN_FILE)) {
      const admins = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
      const found = admins.find(a => a.username === username && a.password === password);
      if (found) {
        res.json({ success: true, role: found.role });
        return;
      }
    }
    res.status(401).json({ success: false, message: 'Username atau password salah!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Kesalahan server.' });
  }
});

// API: Buat Admin Baru
app.post('/api/create-admin', (req, res) => {
  try {
    const { newUsername, newPassword } = req.body;
    let admins = [];
    if (fs.existsSync(ADMIN_FILE)) {
      admins = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
    }
    
    if (admins.some(a => a.username === newUsername)) {
      return res.status(400).json({ success: false, message: 'Username admin sudah digunakan!' });
    }

    admins.push({ username: newUsername, password: newPassword, role: 'admin' });
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(admins, null, 2));
    res.json({ success: true, message: 'Akun admin baru berhasil dibuat!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal membuat admin.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server NOVI berjalan di port ${PORT}`);
});