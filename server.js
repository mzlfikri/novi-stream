const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');
const ADMIN_FILE = path.join(__dirname, 'admin.json');

// Inisialisasi database jika belum ada sama sekali
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(ADMIN_FILE)) {
  const defaultAdmin = { username: "owner", password: "123", role: "owner" };
  fs.writeFileSync(ADMIN_FILE, JSON.stringify([defaultAdmin], null, 2));
}

// API untuk Ambil Daftar Video (Dijamin aman membaca database.json)
app.get('/api/videos', (req, res) => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.json([]);
  }
});

// API untuk Upload / Tambah / Edit Series (Menyimpan data tanpa menghapus data lama yang tidak terkait)
app.post('/api/upload', (req, res) => {
  const { id, title, category, description, thumbnail, episodes } = req.body;
  
  try {
    const fileData = fs.readFileSync(DB_FILE, 'utf8');
    let videos = JSON.parse(fileData);

    let thumbFinal = thumbnail;
    if (!thumbFinal || thumbFinal.trim() === '') {
      thumbFinal = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
    }

    if (id) {
      // Jika Edit Series yang sudah ada
      videos = videos.map(v => v.id === id ? { ...v, title, category, description, thumbnail: thumbFinal, episodes } : v);
    } else {
      // Jika Tambah Series Baru
      const newVideo = {
        id: Date.now(),
        title,
        category: category || 'Animasi',
        description,
        thumbnail: thumbFinal,
        episodes,
        likes: 0,
        comments: []
      };
      videos.unshift(newVideo); // Masukkan ke urutan paling atas
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2));
    res.json({ success: true, message: 'Berhasil disimpan!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan data.' });
  }
});

// API untuk Hapus Series
app.delete('/api/videos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  try {
    let videos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    videos = videos.filter(v => v.id !== id);
    fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// API Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const admins = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
    const found = admins.find(a => a.username === username && a.password === password);
    if (found) {
      res.json({ success: true, role: found.role });
    } else {
      res.status(401).json({ success: false, message: 'Username atau password salah!' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Kesalahan server.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});