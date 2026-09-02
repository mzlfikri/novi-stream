const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');
const ADMIN_FILE = path.join(__dirname, 'admin.json');

// Proteksi Database agar tidak ter-reset kosong saat server restart
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
}

if (!fs.existsSync(ADMIN_FILE)) {
  const defaultAdmin = [{ username: "owner", password: "123", role: "owner" }];
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultAdmin, null, 2), 'utf8');
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

// API: Tambah View (Penonton)
app.post('/api/videos/:id/view', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let videos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    videos = videos.map(v => {
      if (v.id === id) v.views = (v.views || 0) + 1;
      return v;
    });
    fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2), 'utf8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// API: Tambah Like
app.post('/api/videos/:id/like', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let videos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    let updatedLikes = 0;
    videos = videos.map(v => {
      if (v.id === id) {
        v.likes = (v.likes || 0) + 1;
        updatedLikes = v.likes;
      }
      return v;
    });
    fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2), 'utf8');
    res.json({ success: true, likes: updatedLikes });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// API: Tambah Komentar
app.post('/api/videos/:id/comment', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { text } = req.body;
    let videos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    let updatedComments = [];
    videos = videos.map(v => {
      if (v.id === id) {
        if (!v.comments) v.comments = [];
        v.comments.push({ text, date: new Date().toLocaleDateString('id-ID') });
        updatedComments = v.comments;
      }
      return v;
    });
    fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2), 'utf8');
    res.json({ success: true, comments: updatedComments });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// API: Simpan Konten (Film / Siaran TV via Link)
app.post('/api/upload', (req, res) => {
  try {
    const { id, title, type, category, description, thumbnail, videoUrl } = req.body;
    
    let videos = [];
    if (fs.existsSync(DB_FILE)) {
      try {
        videos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      } catch (e) {
        videos = [];
      }
    }

    let thumbFinal = thumbnail && thumbnail.trim() !== '' 
      ? thumbnail 
      : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';

    let episodes = [{ epNum: 1, src: videoUrl }];

    if (id) {
      videos = videos.map(v => v.id == id ? { ...v, title, type: type || 'film', category, description, thumbnail: thumbFinal, episodes } : v);
    } else {
      const newVideo = {
        id: Date.now(),
        title,
        type: type || 'film',
        category: category || 'Animasi',
        description,
        thumbnail: thumbFinal,
        episodes: episodes,
        views: 0,
        likes: 0,
        comments: []
      };
      videos.unshift(newVideo);
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2), 'utf8');
    res.json({ success: true, message: 'Konten berhasil disimpan!' });
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
      fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2), 'utf8');
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
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(admins, null, 2), 'utf8');
    res.json({ success: true, message: 'Akun admin baru berhasil dibuat!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal membuat admin.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server NOVI berjalan di port ${PORT}`);
});