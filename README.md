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
