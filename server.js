const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');
const ADMIN_FILE = path.join(__dirname, 'admin.json');

// Inisialisasi file database jika belum ada
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(ADMIN_FILE)) {
  const defaultAdmin = [{ username: "owner", password: "123", role: "owner" }];
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultAdmin, null, 2));
}

// API Ambil Daftar Video
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

// API Tambah / Edit Video (Upload)
app.post('/api/upload', (req, res) => {
  try {
    const { id, title, category, description, thumbnail, episodes } = req.body;
    
    let videos = [];
    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, 'utf8');
      videos = JSON.parse(fileData);
    }

    let thumbFinal = thumbnail;
    if (!thumbFinal || thumbFinal.trim() === '') {
      thumbFinal = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
    }

    if (id) {
      // Proses Edit
      videos = videos.map(v => v.id == id ? { ...v, title, category, description, thumbnail: thumbFinal, episodes } : v);
    } else {
      // Proses Tambah Baru
      const newVideo = {
        id: Date.now(),
        title,
        category: category || 'Animasi',
        description,
        thumbnail: thumbFinal,
        episodes: episodes || [],
        likes: 0,
        comments: []
      };
      videos.unshift(newVideo);
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2));
    res.json({ success: true, message: 'Berhasil disimpan!' });
  } catch (err) {
    console.error("Error di /api/upload:", err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan data ke server.' });
  }
});

// API Hapus Video
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

// API Login Admin
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

// API Buat Admin Baru (Khusus Owner)
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
  console.log(`Server NOVI berjalan di http://localhost:${PORT}`);
});