const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');
const ADMIN_FILE = path.join(__dirname, 'admin.json');

// Pastikan file database.json ada. Jika belum ada, buat file kosong. 
// Jika sudah ada, JANGAN DIUBAH ATAU DITIMPA agar data film tidak hilang!
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(ADMIN_FILE)) {
  const defaultAdmin = { username: "owner", password: "123", role: "owner" };
  fs.writeFileSync(ADMIN_FILE, JSON.stringify([defaultAdmin], null, 2));
}

// API untuk Mengambil Daftar Film/Series
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

// API untuk Menyimpan / Edit Series (Aman, tidak menghapus data lama)
app.post('/api/upload', (req, res) => {
  const { id, title, category, description, thumbnail, episodes } = req.body;
  
  try {
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
      // Jika sedang mengedit film yang sudah ada
      videos = videos.map(v => v.id == id ? { ...v, title, category, description, thumbnail: thumbFinal, episodes } : v);
    } else {
      // Jika menambah film baru, masukkan ke posisi teratas
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
      videos.unshift(newVideo);
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2));
    res.json({ success: true, message: 'Berhasil disimpan!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan data.' });
  }
});

// API untuk Menghapus Series
app.delete('/api/videos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  try {
    if (fs.existsSync(DB_FILE)) {
      let videos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      videos = videos.filter(v => v.id !== id);
      fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// API untuk Login Admin
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  try {
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

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});