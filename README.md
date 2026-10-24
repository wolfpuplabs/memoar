# memoar

Kamera sekali pakai digital untuk acara. Host membuat acara, tamu memindai QR dan memotret langsung dari browser dengan tampilan film racikan memoar. Jepretan dibatasi per tamu, foto disembunyikan sampai waktu "cuci", lalu semua terbuka bersamaan dan bisa diunduh sebagai ZIP.

## Fitur

- **Buat acara tanpa akun** — host mendapat link pengelola rahasia (`/k/<slug>/<token>`).
- **Undangan + QR** — kode QR siap unduh dan kartu meja siap cetak.
- **Kamera browser** — kamera depan/belakang, 7 tampilan film, cap tanggal oranye, unggah dari galeri (opsional).
- **Batas jepretan & tamu** — ditegakkan di server.
- **Jadwal cuci foto** — langsung, saat acara selesai, atau ditunda N jam; host bisa "cuci sekarang".
- **Album** — filter per tamu, lightbox, pilih & unduh, ekspor ZIP.
- **Dashboard host** — statistik, daftar tamu, sembunyikan/hapus foto, ubah pengaturan, ganti sampul, hapus acara.
- **Dua bahasa** — Indonesia & English.

## Pembayaran download (Midtrans)

Album bisa dilihat gratis; download resolusi penuh dibayar lewat Midtrans Snap (QRIS & GoPay):

- **Paket acara** menentukan batas tamu dan harga buka-download host:
  Coba (10 tamu, gratis penuh), Intim (50 tamu, Rp 99.000), Pesta (150 tamu, Rp 249.000),
  Gala (300 tamu, Rp 499.000). Harga bisa diubah lewat `EVENT_PACKAGE_PRICES`.
- **Host** membuka download untuk semua orang dengan membayar harga paketnya.
- **Tamu/pengunjung** bisa membuka download untuk dirinya sendiri (`PRICE_UNLOCK_PERSON`, default Rp 15.000).
- **Gratis:** paket Coba gratis penuh; di paket lain setiap orang bisa download 3 foto pertama gratis (`FREE_DOWNLOADS_PER_PERSON`).
- Sebelum download dibuka, browser hanya menerima pratinjau kecil — file resolusi penuh hanya lewat proxy download yang memeriksa pembayaran.

Setup:
1. Isi `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` di Vercel (Sandbox dulu), lalu redeploy.
2. Di dashboard Midtrans → Settings → Payment → Notification URL, isi `https://<domain>/api/midtrans/notify`.
3. Setelah diuji, ganti ke key Production dan set `MIDTRANS_IS_PRODUCTION=true`.

Tanpa key, paywall nonaktif dan download gratis. Status juga dicek langsung ke Midtrans selama halaman menunggu, jadi tetap jalan walau webhook terlambat.

## Stack

Next.js 16 (App Router) · Neon Postgres · Vercel Blob · tanpa framework CSS.

Filter film diproses di perangkat tamu (canvas), jadi server hanya menyimpan JPEG jadi + thumbnail.

## Deploy ke Vercel

1. Import repo ini di Vercel (framework terdeteksi otomatis: Next.js).
2. **Storage → Create → Blob** lalu hubungkan ke project (mengisi `BLOB_READ_WRITE_TOKEN`).
3. **Storage → Create → Neon (Postgres)** lalu hubungkan ke project (mengisi `DATABASE_URL`).
4. Redeploy. Tabel database dibuat otomatis pada request pertama.

Opsional: `NEXT_PUBLIC_SITE_URL` (domain kustom untuk link & QR), `MAX_GUESTS_LIMIT` (default 300).

## Pengembangan lokal

```bash
npm install
LOCAL_DEV=1 npm run dev
```

`LOCAL_DEV=1` memakai PGlite dan penyimpanan file lokal di `.local-data/`, jadi tidak perlu Neon/Blob. Kamera butuh `localhost` atau HTTPS.

## Struktur

```
app/(site)/          landing, cara kerja, buat acara, dashboard host
app/e/[slug]/        undangan, kamera, album (tamu)
app/api/             REST API (acara, gabung, foto, admin)
lib/                 db, storage, auth, filter film, i18n
```

## Filter AR

Tamu bisa memasang aksesori AR di kamera (kacamata, topi pesta, mahkota, kumis, kelinci,
mahkota bunga, kilau jari, hati, dasi kupu-kupu, sayap). Tracking wajah/tangan/badan memakai
MediaPipe Tasks Vision (Apache-2.0) yang berjalan di browser; runtime WASM disalin dari
`node_modules` ke `public/mediapipe/wasm` saat build (`scripts/copy-mediapipe.mjs`) dan model
disimpan di `public/mediapipe/models` (diunduh oleh workflow `mediapipe-models`). Model hanya
dimuat saat tamu menyalakan efek. Aksesori ikut tercetak di foto dan mendapat film look yang sama.

## Guardrails & ROI

- **Security headers** for every response (`next.config.mjs`): nosniff, frame-ancestors none, HSTS, strict referrer, camera only on our own origin; secret `/k/…` and `/ops` links send no referrer.
- **Rate limits** (`lib/guard.ts`, table `rate_limits`, hashed addresses): create, join, upload, pay, payment polling, downloads.
- **Uploads** must be real JPEGs (magic bytes) and the exposure is reserved with an atomic counter before anything is stored, so parallel uploads can never go past the roll.
- **Metrics log** (table `metrics`): created, joined, photo (bytes), paywall, paid, refunded, download — kept even after albums are deleted.
- **`/ops?key=OPS_KEY`**: 7/30/90-day funnel, revenue, estimated costs, ROI and the GO / HOLD / NO-GO signal used by the decision document.
