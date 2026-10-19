# Toko Buah Dayat

Website toko buah online: katalog produk, keranjang belanja, checkout, dan nota belanja otomatis yang bisa dikirim ke WhatsApp pemilik atau dicetak.

Pemilik: Resti Firmaneli • WhatsApp: 083193337488

## Struktur Folder

```
Toko_Buah_Dayat/
├── index.html      Beranda (hero, kategori, produk pilihan, cara pesan)
├── about.html      Tentang toko dan profil pemilik
├── services.html   Katalog lengkap (cari, filter, urutkan) dan layanan
├── contact.html    Kontak, formulir WhatsApp, dan FAQ
├── css/
│   └── style.css   Seluruh tampilan (termasuk mode gelap dan cetak nota)
├── js/
│   └── script.js   Katalog, keranjang, checkout, nota, WhatsApp
├── images/         Gambar produk (lihat daftar di bawah)
└── README.md
```

## Daftar Gambar yang Dibutuhkan (folder `images/`)

Nama file harus persis sama, termasuk huruf besar/kecil dan spasi.

| File | Dipakai di |
|------|------------|
| `keranjang-buah.png` | Hero beranda |
| `buah segar.png` | Halaman Tentang |
| `apel.png` | Apel Merah |
| `jeruk import.png` | Jeruk Manis |
| `pisang.png` | Pisang |
| `mangga.png` | Mangga Harum Manis |
| `anggur.png` | Anggur Ungu |
| `Semangka.png` | Semangka |

Jika gambar produk tidak ditemukan, website menampilkan emoji sebagai cadangan.

## Cara Menjalankan

Buka `index.html` di browser (klik dua kali), atau gunakan ekstensi Live Server di VS Code. Tidak perlu instalasi apa pun.

## Cara Mengubah Data Toko

Semua pengaturan ada di bagian atas `js/script.js`.

**Ongkir, gratis ongkir, dan nomor WhatsApp** (`CONFIG`):

```js
const CONFIG = {
    nomorWhatsApp: "6283193337488",
    namaToko: "Toko Buah Dayat",
    ongkir: 5000,
    gratisOngkirDi: 100000
};
```

**Menambah atau mengubah buah** (`PRODUCTS`): tambahkan satu baris baru, lalu letakkan gambarnya di folder `images/`.

```js
{ id: "melon", nama: "Melon", kategori: "lokal", harga: 20000, satuan: "kg",
  step: 0.5, img: "melon.png", emoji: "🍈", tag: "", desc: "Segar dan manis." }
```

- `kategori`: `"lokal"` atau `"impor"`
- `satuan`: `"kg"` atau `"sisir"` (bebas diganti)
- `step`: kelipatan jumlah saat tombol + / − ditekan (0.5 untuk kg, 1 untuk satuan utuh)

## Fitur

- Katalog dengan pencarian, filter kategori, dan urutan harga/nama
- Keranjang belanja yang tersimpan (tidak hilang saat pindah halaman atau refresh)
- Checkout: antar ke alamat atau ambil di toko, pilihan pembayaran (tunai, transfer, QRIS)
- Nota belanja dengan nomor otomatis, bisa dicetak / disimpan PDF, atau dikirim ke WhatsApp
- Mode gelap, tampilan responsif (HP, tablet, desktop)

## Catatan

- Harga di website adalah harga contoh; pemilik mengonfirmasi harga dan ketersediaan lewat WhatsApp.
- Pesanan tidak tersimpan di server. Pesanan resmi dikirim melalui tombol WhatsApp pada nota.
