# Dokumentasi Webpify

Webpify adalah konverter gambar ke WebP yang jalan sepenuhnya di browser. Gambar Anda tidak diunggah ke server mana pun, jadi cepat, privat, dan tidak membebani hosting.

Dibuat dengan React 19, Vite, Tailwind CSS v4, dan Motion. Versi pertamanya dihasilkan lewat Google AI Studio, lalu dikembangkan dan dirawat oleh Wahyu Mahmudiyanto.

Kode sumber: https://github.com/wahyu043/webpify

---

## Kenapa Dibuat Seperti Ini

Ukuran gambar ikut menentukan kecepatan halaman, dan kecepatan halaman ikut menentukan pengalaman pengunjung. Webpify dirancang supaya tidak ada beban di sisi server:

1. **Konversi di browser.** Gambar diproses dengan HTML5 Canvas API di komputer pengguna. Tidak ada file yang dikirim ke server.
2. **Server tetap ringan.** Karena kompresi dikerjakan di sisi pengguna, hosting Anda (VPS dengan HestiaCP/Nginx atau hosting biasa) tidak terbebani lonjakan RAM atau CPU.
3. **Privasi terjaga.** Gambar pribadi atau sensitif tidak pernah keluar dari perangkat pengguna.
4. **Lebih ringan untuk SEO.** Menurut Google, WebP lossy bisa 25-34% lebih kecil dari JPEG pada kualitas yang terlihat sama, dan WebP lossless sekitar 26% lebih kecil dari PNG. Gambar yang lebih ringan membantu skor LCP (Largest Contentful Paint) di Core Web Vitals.

---

## Teknologi

- **React 19**: antarmuka
- **Vite 6**: build tool dan dev server
- **Tailwind CSS v4**: styling, tema gelap dengan aksen hijau
- **Motion**: animasi antrean dan transisi
- **Lucide React**: ikon
- **FileReader dan HTML5 Canvas API**: membaca dan mengonversi gambar

---

## Struktur Direktori

```bash
├── .gitignore           # Mengabaikan node_modules, dist, dan file .env
├── index.html           # Titik masuk HTML, termasuk title dan meta SEO
├── metadata.json        # Metadata bawaan Google AI Studio
├── package.json         # Dependensi dan script npm
├── vite.config.ts       # Konfigurasi Vite
├── tsconfig.json        # Konfigurasi TypeScript
└── src/
    ├── main.tsx         # Inisialisasi aplikasi React
    ├── App.tsx          # Komponen utama: drag and drop, konverter Canvas, antrean
    └── index.css        # Gaya global, font JetBrains Mono, variabel warna tema
```

---

## Cara Kerja Konversi

Inti konversinya ada di `src/App.tsx`. Ringkasannya: file dibaca, digambar ke Canvas, lalu diekspor sebagai WebP dengan kualitas yang dipilih.

```typescript
const processToWebP = (
  file: File,
  quality: number // 0.1 sampai 1.0
): Promise<{ url: string; size: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal menginisialisasi context 2D'));
          return;
        }

        // Gambar ulang gambar asli ke Canvas
        ctx.drawImage(img, 0, 0);

        // Ekspor Canvas sebagai WebP dengan kualitas target
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal memproses Blob WebP'));
              return;
            }
            const webpUrl = URL.createObjectURL(blob);
            resolve({
              url: webpUrl,
              size: blob.size,
            });
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('File rusak atau tidak didukung'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca gambar'));
    reader.readAsDataURL(file);
  });
};
```

**Soal memori:** tautan sementara dari `URL.createObjectURL` dilepas dengan `URL.revokeObjectURL(url)` setelah gambar diunduh atau dihapus dari antrean, supaya browser tidak menumpuk memori yang tidak terpakai.

---

## Batasan

Karena memakai Canvas, ada beberapa hal yang perlu Anda ketahui:

- **GIF animasi** hanya menghasilkan satu gambar diam (frame pertama).
- **Metadata gambar** (misalnya EXIF seperti lokasi dan info kamera) tidak ikut terbawa ke hasil.
- **Gambar sangat besar** bisa lambat atau gagal diproses, tergantung memori perangkat dan browser.

---

## Tips SEO untuk Gambar

1. **Pakai kualitas 75% sebagai titik awal.** Angka ini adalah nilai bawaan `cwebp`, tool resmi WebP dari Google, dan titik tengah yang aman antara ukuran dan kualitas. Naikkan kalau gambarnya penuh detail halus, turunkan kalau ukuran file jadi prioritas. Selalu cek hasilnya dengan mata sendiri.
2. **Namai file sebelum dikonversi.** Nama file ikut dibaca mesin pencari, jadi buat yang menggambarkan isi gambar, huruf kecil, dan dipisah tanda hubung. Contoh: `manfaat-beras-organik-untuk-diabetes.jpg` akan menjadi `manfaat-beras-organik-untuk-diabetes.webp`. Hindari spasi dan simbol aneh.
3. **Proses banyak gambar sekaligus.** Masukkan beberapa file ke antrean, tunggu sampai berstatus berhasil, lalu klik **UNDUH SEMUA**.
4. **Jangan lupa atribut `alt`, `width`, dan `height`.** Webpify hanya mengonversi format. Teks alternatif dan dimensi gambar tetap perlu Anda isi di halaman web, dan atribut dimensi inilah yang menjaga layout tidak bergeser saat gambar dimuat.

---

## Menjalankan di Lokal

**Prasyarat:** Node.js (disarankan v18 ke atas) dan npm.

Pasang dependensi:
```bash
npm install
```

Jalankan mode pengembangan:
```bash
npm run dev
```
Buka `http://localhost:3000`.

Build untuk produksi:
```bash
npm run build
```
Hasilnya ada di folder `dist/`, berupa file statis yang bisa langsung dipasang di Vercel, Netlify, Cloudflare Pages, atau hosting dan VPS sendiri.

---

## Tampilan

Webpify sengaja dibuat gelap, bersih, dan nyaman dibaca lama, dengan warna yang selaras dengan portfolio pembuatnya:

- **Latar belakang:** abu gelap (`#111827` dan `#1f2937`).
- **Aksen:** hijau (`#4ade80`) untuk angka penting dan tombol aksi.
- **Tipografi:** font sistem untuk teks, dan JetBrains Mono khusus untuk angka dan ukuran file.