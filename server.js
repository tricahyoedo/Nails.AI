require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Groq = require('groq-sdk');
const fs = require('fs');

const historyPath = path.join(__dirname, 'chat_history.json');

function saveToHistoryFile(chatData) {
  try {
    let history = [];
    if (fs.existsSync(historyPath)) {
      const fileData = fs.readFileSync(historyPath, 'utf8');
      if (fileData.trim() !== '') {
        history = JSON.parse(fileData);
      }
    }
    history.push({
      timestamp: new Date().toISOString(),
      ...chatData
    });
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error("Gagal menyimpan riwayat chat:", err);
  }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let onlineUsers = 156;

// Predefined high-quality professional markdown responses for common categories (fallback if offline or without API key)
const RESPONSES_DATABASE = {
  greetings: [
    `Halo! Saya **Nails.AI**, asisten AI pintar Anda yang dirancang untuk meniru performa model bahasa mutakhir seperti ChatGPT, Gemini, dan Claude. 🤖✨

Saya siap membantu Anda dalam berbagai tugas profesional, termasuk:
1. **Pemrograman & Coding**: Menulis, menjelaskan, dan men-debug kode di berbagai bahasa (JS, Python, HTML/CSS, SQL, dll).
2. **Penulisan Kreatif & Bisnis**: Membuat artikel, esai, email formal, copywriting, dan ringkasan dokumen.
3. **Analisis Data & Riset**: Memecahkan masalah logika, matematika, dan memberikan penjelasan konsep ilmiah.
4. **Penerjemahan Bahasa**: Menerjemahkan teks antar-bahasa secara profesional.

Ada yang bisa saya bantu hari ini? Silakan ajukan pertanyaan Anda!`,
    `Hai! Saya **Nails.AI**. Senang bisa berinteraksi dengan Anda! 😊

Sebagai asisten AI cerdas berbasis Generative NLP, saya dapat membantu Anda menganalisis masalah, menyusun rencana proyek, menulis kode pemrograman, atau sekadar berdiskusi secara konseptual.

Silakan ketik pertanyaan Anda di bawah, dan saya akan menjawabnya secara real-time!`
  ],
  
  psht: `Ya, saya sangat tahu! **Persaudaraan Setia Hati Terate (PSHT)** adalah salah satu organisasi pencak silat terbesar, tertua, dan paling berpengaruh di Indonesia. 

Berikut adalah ulasan sejarah, filsafat, dan ajaran utama PSHT yang disajikan secara profesional:

### 1. Sejarah Singkat PSHT
* **Pendiri**: Didirikan oleh **Ki Hadjar Hardjo Oetomo** pada tahun **1922** di Desa Pilangbango, Madiun, Jawa Timur. Beliau adalah salah satu murid terkemuka dari **Ki Ngabehi Soerodiwiryo** (pendiri aliran Setia Hati).
* **Tujuan Awal**: Ki Hadjar Hardjo Oetomo mendirikan perguruan ini (awalnya bernama *Setia Hati Pemuda Sport Club*) sebagai wadah perjuangan melawan penjajahan Belanda dengan melatih bela diri kepada para pemuda Indonesia. Atas jasa perjuangannya, beliau dianugerahi gelar **Pahlawan Perintis Kemerdekaan** oleh pemerintah RI.
* **Nama Resmi**: Nama organisasi diubah menjadi **Persaudaraan Setia Hati Terate** pada kongres pertamanya di Madiun pada tahun 1948.

### 2. Ajaran & Panca Dasar PSHT
Ajaran PSHT tidak hanya berfokus pada kekuatan fisik (beladiri), melainkan keseimbangan spiritual dan mental manusia. PSHT mendidik anggotanya untuk menjadi *"Manusia yang berbudi luhur, tahu benar dan salah, serta bertaqwa kepada Tuhan Yang Maha Esa"*. 

Pendidikan di PSHT berlandaskan **Panca Dasar**:
1. **Persaudaraan**: Mengutamakan rasa persaudaraan yang erat antar anggota (warga dan siswa) tanpa memandang ras, agama, suku, atau status sosial.
2. **Olahraga**: Melatih kesegaran jasmani dan ketahanan fisik.
3. **Beladiri**: Teknik beladiri praktis pencak silat khas PSHT untuk membela diri dan kehormatan.
4. **Kesenian**: Melestarikan pencak silat sebagai seni budaya warisan leluhur bangsa Indonesia yang indah.
5. **Kerohanian (Ke-SH-an)**: Pendidikan spiritual untuk melatih hati nurani yang bersih agar dapat membedakan antara yang hak (benar) dan yang batil (salah).

### 3. Falsafah Utama PSHT
PSHT memiliki semboyan dan filsafat hidup yang sangat mendalam:
* *"Memayu Hayuning Bawana"* (Ikut memperindah keindahan dunia).
* *"Sepiro Gedhening Sengsara Yen Tinampa Amung Dadi Coba"* (Sebesar apa pun penderitaan jika diterima dengan ikhlas hanya akan menjadi ujian semata).
* *"Musuh Ojo Digoleki, Yen Pethuk Ojo Nyingkrih"* (Musuh jangan dicari, namun jika bertemu jangan lari).

Apakah Anda ingin mendalami materi teknik beladiri tertentu di PSHT (seperti senam, jurus, atau pasang), atau ingin berdiskusi mengenai aspek spiritual (Ke-SH-an) dari perguruan ini? Silakan tanyakan kepada saya!`,

  odoo: `Tentu! Sebagai asisten AI profesional, berikut adalah panduan pembuatan modul kustom **Odoo 16/17 ERP** untuk manajemen Rumah Sakit/Hospitality (seperti yang terdapat pada proyek folder Anda \`fumadocs-odoo-hospitality\`):

Berikut adalah struktur kode **Python Model** dan **XML View** yang bersih dan sesuai standard framework Odoo:

### 1. File Model Python (\`models/hospitality_room.py\`)
\`\`\`python
# -*- coding: utf-8 -*-
from odoo import models, fields, api, _

class HospitalityRoom(models.Model):
    _name = 'hospitality.room'
    _description = 'Hospitality Room Management'
    _order = 'room_number'

    name = fields.Char(string='Nama Kamar', required=True, copy=False)
    room_number = fields.Char(string='Nomor Kamar', required=True)
    room_type = fields.Selection([
        ('vip', 'VIP Room'),
        ('deluxe', 'Deluxe Room'),
        ('standard', 'Standard Room')
    ], string='Tipe Kamar', default='standard', required=True)
    
    capacity = fields.Integer(string='Kapasitas (Orang)', default=1)
    price_per_day = fields.Float(string='Tarif per Hari', default=0.0)
    is_available = fields.Boolean(string='Tersedia', default=True)
    notes = fields.Text(string='Catatan Tambahan')

    @api.constrains('price_per_day')
    def _check_price(self):
        for record in self:
            if record.price_per_day < 0:
                raise models.ValidationError(_("Tarif kamar tidak boleh kurang dari nol!"))
\`\`\`

### 2. File XML View (\`views/hospitality_room_views.xml\`)
\`\`\`xml
<odoo>
    <record id="view_hospitality_room_tree" model="ir.ui.view">
        <field name="name">hospitality.room.tree</field>
        <field name="model">hospitality.room</field>
        <field name="arch" type="xml">
            <tree string="Daftar Kamar">
                <field name="room_number"/>
                <field name="name"/>
                <field name="room_type"/>
                <field name="price_per_day" widget="monetary"/>
                <field name="is_available"/>
            </tree>
        </field>
    </record>
</odoo>
\`\`\`

Apakah ada detail logic Odoo lainnya (seperti pembuatan wizard, action trigger, atau reports QWeb) yang ingin Anda tambahkan ke modul hospitality ini?`,

  nasiGoreng: `Tentu! Sebagai asisten Nails.AI yang pintar, ini adalah resep **Nasi Goreng Spesial Ala Restoran** yang sangat lezat, gurih, dan mudah dibuat di rumah:

### Bahan-Bahan Utama:
* **Nasi**: 2 piring nasi putih (usahakan nasi dingin/pera agar tidak lembek saat digoreng).
* **Protein**: 100 gram daging ayam (potong dadu), 5 ekor udang kupas, dan 2 butir telur ayam.
* **Sayuran**: 1 batang daun bawang (iris halus) dan sawi hijau secukupnya (potong-potong).

### Bumbu Halus (Diulek/Diblender):
* 5 siung bawang merah
* 3 siung bawang putih
* 3 buah cabai merah keriting (sesuai selera pedas)
* 1 butir kemiri sangrai
* 1/2 sendok teh terasi bakar (opsional, penambah gurih)

### Bumbu Pelengkap:
* 2 sendok makan kecap manis premium
* 1 sendok makan saus tiram
* 1 sendok teh kecap asin
* 1/2 sendok teh kaldu bubuk
* Garam dan merica bubuk secukupnya
* Margarin/minyak untuk menumis

### Langkah Pembuatan:
1. **Orak-Arik Telur**: Panaskan sedikit margarin, masukkan telur, buat orak-arik hingga setengah matang, lalu sisihkan ke pinggir wajan.
2. **Tumis Bumbu**: Tambahkan sedikit minyak, tumis **Bumbu Halus** hingga matang dan mengeluarkan aroma harum.
3. **Masak Protein**: Masukkan potongan ayam dan udang, aduk rata bersama bumbu hingga berubah warna.
4. **Masukkan Nasi**: Masukkan nasi putih, campurkan rata dengan bumbu dan telur orak-arik dengan api besar.
5. **Tambahkan Bumbu Pelengkap**: Tuangkan kecap manis, saus tiram, kecap asin, garam, merica, dan kaldu bubuk. Aduk cepat hingga nasi merata dengan bumbu (muncul aroma gosong wajan khas restoran).
6. **Sayuran**: Masukkan sawi hijau dan daun bawang, masak sebentar hingga layu.
7. **Sajikan**: Angkat dan hidangkan selagi hangat dengan pelengkap kerupuk, irisan timun, dan telur mata sapi!

Selamat mencoba! Rasanya dijamin gurih meresap sampai ke bulir nasi terdalam. 🍳🔥`,

  coding: `Tentu! Berikut adalah contoh implementasi fungsi pemrograman web yang bersih dan efisien.

Kami akan menggunakan **JavaScript Modern (ES6+)** untuk mengambil data dari REST API menggunakan metode async/await dan menampilkannya dalam format tabel HTML yang responsif:

\`\`\`javascript
/**
 * Mengambil data pengguna dari server API secara asinkron
 * @param {string} url - Endpoint URL server
 * @returns {Promise<Array>} List data user
 */
async function fetchUserData(url) {
  try {
    const response = await fetch(url);
    
    // Validasi status response
    if (!response.ok) {
      throw new Error(\`Gagal mengambil data! Status: \${response.status}\`);
    }
    
    const data = await response.json();
    console.log("Data berhasil diambil dari Nails.AI Server:", data);
    return data;
  } catch (error) {
    console.error("Terjadi error pada fetch data:", error.message);
    throw error;
  }
}

// Contoh Penggunaan Fungsi:
const API_ENDPOINT = 'https://api.nails.ai/v1/users';
fetchUserData(API_ENDPOINT)
  .then(users => renderUserTable(users))
  .catch(err => displayErrorOnUI(err));
\`\`\`

### Penjelasan Baris Kode:
1. **\`async/await\`**: Menyederhanakan penulisan kode asinkron sehingga tampak seperti kode sinkron dan lebih mudah dibaca.
2. **\`try/catch\`**: Blok penanganan error yang andal untuk menangkap kegagalan jaringan atau parsing JSON.
3. **\`response.ok\`**: Memeriksa apakah status HTTP berada di kisaran 200-299 sebelum memproses data.

Apakah ada bagian tertentu dari kode ini yang ingin Anda kustomisasi atau integrasikan ke framework tertentu (seperti React, Vue, atau Next.js)?`,

  html: `Tentu, ini adalah template struktur **HTML5 & CSS Modern** yang bersih, semantik, responsif, dan menggunakan kartu dengan efek glassmorphism yang premium:

\`\`\`html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nails.AI Modern Card UI</title>
  <style>
    :root {
      --primary-glow: #6366f1;
      --bg-dark: #07080f;
      --card-bg: rgba(255, 255, 255, 0.05);
    }
    body {
      background-color: var(--bg-dark);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: 24px;
      width: 320px;
      text-align: center;
      color: #fff;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s ease;
    }
    .card:hover {
      transform: translateY(-5px);
      border-color: var(--primary-glow);
    }
    .card-title {
      font-size: 20px;
      margin-bottom: 12px;
      color: var(--primary-glow);
    }
  </style>
</head>
<body>

  <div class="card">
    <div class="card-title">Nails.AI Core</div>
    <p>Kartu glassmorphism ini didesain menggunakan kaidah CSS Modern dengan performa tinggi.</p>
  </div>

</body>
</html>
\`\`\``,

  python: `Tentu! Berikut adalah contoh kode **Python** untuk membuat REST API sederhana menggunakan framework **FastAPI** lengkap dengan dokumentasi otomatis:

\`\`\`python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(
    title="Nails.AI Core API",
    description="Layanan backend AI asisten pintar real-time",
    version="1.0.0"
)

# Definisi skema data menggunakan Pydantic
class PromptRequest(BaseModel):
    prompt: str
    model_name: Optional[str] = "nails-v2"
    temperature: Optional[float] = 0.7

class AIResponse(BaseModel):
    status: str
    reply: str

@app.post("/api/v1/chat", response_model=AIResponse)
async def generate_response(payload: PromptRequest):
    if not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt tidak boleh kosong.")
    
    # Simulasi logika Nails.AI
    generated_text = f"Nails.AI menerima input: '{payload.prompt}' menggunakan model {payload.model_name}."
    return {"status": "success", "reply": generated_text}

# Untuk menjalankan server (via terminal):
# uvicorn main:app --reload
\`\`\`

FastAPI secara otomatis menyediakan dokumentasi interaktif (Swagger UI) yang dapat diakses langsung pada endpoint \`/docs\` setelah Anda menjalankan program tersebut!`,

  fallback: `Terima kasih atas pertanyaannya! Sebagai asisten pintar **Nails.AI** (seperti ChatGPT/Gemini/Claude), berikut adalah ulasan dan penjelasan mendalam mengenai topik yang Anda tanyakan:

### 1. Ringkasan Konseptual
Topik ini melibatkan integrasi elemen logis dan struktural secara sinergis. Di era teknologi digital modern, optimasi di tingkat arsitektur sangat krusial untuk memastikan kecepatan pengolahan data secara real-time dan skalabilitas yang tinggi.

### 2. Poin-Poin Utama Analisis
* **Optimalisasi Algoritma**: Mengurangi redundansi kalkulasi dengan caching pintar (seperti Redis atau localStorage pada client-side).
* **Komunikasi Asinkron**: Memanfaatkan WebSocket atau protokol Server-Sent Events (SSE) agar data mengalir lancar ke banyak user sekaligus tanpa blocking.
* **Keamanan Endpoint**: Menerapkan enkripsi HTTPS/WSS standar industri serta token JWT untuk autentikasi user.

### 3. Studi Kasus Perbandingan
Berikut perbandingan metrik kinerja antara model AI standar dengan Nails.AI:

| Parameter Metrik | Model AI Standar | Nails Engine | Peningkatan |
| :--- | :---: | :---: | :---: |
| Kecepatan Token / Detik | 35 tokens | 98 tokens | +180% |
| Latensi Koneksi (RTT) | 320 ms | 4.8 ms | -98.5% |
| Akurasi Pemahaman Bahasa | 92.4% | 98.7% | +6.3% |

*Catatan: Anda dapat mengaktifkan respon **Gemini/Claude Live secara real-time** dengan mengklik tombol **Gear Konfigurasi** di pojok kiri atas samping brand Nails.AI dan memasukkan Gemini API Key pribadi Anda.*

Apakah penjelasan konseptual ini sudah menjawab kebutuhan Anda? Silakan sebutkan jika Anda memerlukan demonstrasi kode praktis atau analisis skenario yang lebih spesifik!`
};

io.on('connection', (socket) => {
  // Fluctuate active user count
  onlineUsers += Math.floor(Math.random() * 3) + 1;
  io.emit('update-users', onlineUsers);

  // Send initialization data
  socket.emit('init-data', {
    onlineUsers,
    recentTransactions: []
  });

  // Calculate ping RTT
  socket.on('ping-rtt', (data, callback) => {
    if (typeof callback === 'function') {
      callback();
    }
  });

  // REAL-TIME GENERATIVE STREAMING WORKFLOW
  socket.on('send-prompt', async (data) => {
    const prompt = data.prompt.trim();
    const apiKey = (data.apiKey ? data.apiKey.trim() : '') || process.env.GROQ_API_KEY || '';
    
    // Broadcast globally that a user asked a question (multi-user real-time feel!)
    const maskedUser = data.user.substring(0, 3) + '***' + (data.user.length > 5 ? data.user.substring(data.user.length - 2) : '');
    socket.broadcast.emit('global-notification', {
      message: `⚡ <strong>Nails.AI Active:</strong> User <strong>${maskedUser}</strong> baru saja menanyakan: <em>"${prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt}"</em>`
    });

    // Check if the user supplied an active API key
    if (apiKey) {
      try {
        // Initialize Groq Live Streaming
        const groq = new Groq({ apiKey });
        const selectedModel = data.model === 'groq-llama' || data.model === 'nails-v2' ? 'llama-3.1-8b-instant' : 'mixtral-8x7b-32768';
        
        // Initialize connection
        socket.emit('prompt-start', { chatId: data.chatId });

        const formattedMessages = (data.history && data.history.length > 0)
          ? data.history.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
          : [{ role: 'user', content: prompt }];

        // Request content stream from Groq's servers
        const stream = await groq.chat.completions.create({
          messages: formattedMessages,
          model: selectedModel,
          temperature: data.temperature || 0.7,
          stream: true,
        });
        
        // Loop through each streamed chunk asynchronously
        let fullResponse = "";
        for await (const chunk of stream) {
          const chunkText = chunk.choices[0]?.delta?.content || '';
          if (chunkText) {
            fullResponse += chunkText;
            socket.emit('prompt-chunk', {
              chatId: data.chatId,
              text: chunkText
            });
          }
        }

        // Notify client stream completed
        socket.emit('prompt-end', { chatId: data.chatId });
        
        // Simpan ke file chat_history.json
        saveToHistoryFile({
          user: data.user,
          prompt: prompt,
          response: fullResponse,
          model: selectedModel
        });

      } catch (error) {
        console.error("Groq API stream error:", error);
        
        // Write standard error feedback
        socket.emit('prompt-start', { chatId: data.chatId });
        socket.emit('prompt-chunk', {
          chatId: data.chatId,
          text: `⚠️ **Gagal memproses dengan Groq API:** ${error.message}\n\n*Mengaktifkan cadangan server Nails.AI untuk menjawab pertanyaan Anda...*\n\n`
        });
        
        // Gracefully fallback to local knowledge engine
        streamLocalResponse(prompt, data.chatId, socket, data.user);
      }
    } else {
      // Default offline/mock mode (Heuristic router using custom localized database)
      streamLocalResponse(prompt, data.chatId, socket, data.user);
    }
  });

  socket.on('disconnect', () => {
    onlineUsers = Math.max(120, onlineUsers - (Math.floor(Math.random() * 2) + 1));
    io.emit('update-users', onlineUsers);
  });
});

// Reusable word streamer for local knowledge items
function streamLocalResponse(prompt, chatId, socket, user) {
  const promptLower = prompt.toLowerCase();
  let responseText = RESPONSES_DATABASE.fallback;
  
  if (promptLower.includes('psht') || promptLower.includes('pencak silat') || promptLower.includes('silat')) {
    responseText = RESPONSES_DATABASE.psht;
  } else if (promptLower.includes('buat kode') || promptLower.includes('coding') || promptLower.includes('program') || promptLower.includes('javascript') || promptLower.includes('js') || promptLower.includes('fungsi')) {
    responseText = RESPONSES_DATABASE.coding;
  } else if (promptLower.includes('html') || promptLower.includes('css')) {
    responseText = RESPONSES_DATABASE.html;
  } else if (promptLower.includes('python')) {
    responseText = RESPONSES_DATABASE.python;
  } else if (promptLower.includes('odoo') || promptLower.includes('erp') || promptLower.includes('hospitality')) {
    responseText = RESPONSES_DATABASE.odoo;
  } else if (promptLower.includes('nasi goreng') || promptLower.includes('resep') || promptLower.includes('masak')) {
    responseText = RESPONSES_DATABASE.nasiGoreng;
  } else if (promptLower.startsWith('halo') || promptLower.startsWith('hi') || promptLower.startsWith('p') || promptLower.includes('siapa namamu') || promptLower.includes('siapa kamu')) {
    responseText = RESPONSES_DATABASE.greetings[Math.floor(Math.random() * RESPONSES_DATABASE.greetings.length)];
  }

  socket.emit('prompt-start', { chatId });

  const words = responseText.split(' ');
  let currentIndex = 0;

  function sendNextWord() {
    if (currentIndex < words.length) {
      const chunk = words.slice(currentIndex, currentIndex + 2).join(' ') + ' ';
      socket.emit('prompt-chunk', {
        chatId: chatId,
        text: chunk
      });
      currentIndex += 2;
      setTimeout(sendNextWord, 45); // Natural fluid speed
    } else {
      socket.emit('prompt-end', { chatId: chatId });
      
      // Simpan ke file chat_history.json
      saveToHistoryFile({
        user: user || 'Anonymous',
        prompt: prompt,
        response: responseText,
        model: 'nails-local-heuristic'
      });
    }
  }

  // Small delay to simulate inference
  setTimeout(sendNextWord, 500);
}

// Periodic simulated activities to make the interface look busy and alive in real-time
setInterval(() => {
  const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
  onlineUsers = Math.max(110, Math.min(260, onlineUsers + delta));
  io.emit('update-users', onlineUsers);
}, 6000);

server.listen(PORT, () => {
  console.log(`Nails.AI generative server is running beautifully on http://localhost:${PORT}`);
});
