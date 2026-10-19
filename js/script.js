/* =========================================================
   TOKO BUAH DAYAT - JAVASCRIPT
   Dipakai oleh semua halaman (index, about, services, contact).
   Fitur: katalog dinamis, cari/filter/urutkan, keranjang (tersimpan),
   checkout, nota belanja (cetak & WhatsApp), dark mode, animasi.
========================================================= */

/* ---------- Pengaturan toko (ubah di sini) ---------- */
const CONFIG = {
    nomorWhatsApp: "6283193337488",
    namaToko: "Toko Buah Dayat",
    ongkir: 5000,          // ongkos kirim flat (contoh)
    gratisOngkirDi: 100000 // gratis ongkir jika subtotal >= nilai ini
};

/* ---------- Data produk (tambah buah baru di sini) ---------- */
const IMG = "images/";
const PRODUCTS = [
    { id: "apel",    nama: "Apel Merah",         kategori: "impor", harga: 28000, satuan: "kg",    step: 0.5, img: "apel.png",       emoji: "🍎", tag: "Favorit", desc: "Manis dan renyah untuk camilan." },
    { id: "jeruk",   nama: "Jeruk Manis",        kategori: "lokal", harga: 18000, satuan: "kg",    step: 0.5, img: "jeruk import.png", emoji: "🍊", tag: "Segar",   desc: "Rasa segar, cocok untuk jus." },
    { id: "pisang",  nama: "Pisang",             kategori: "lokal", harga: 15000, satuan: "sisir", step: 1,   img: "pisang.png",     emoji: "🍌", tag: "",        desc: "Praktis dan nikmat untuk sarapan." },
    { id: "mangga",  nama: "Mangga Harum Manis", kategori: "lokal", harga: 22000, satuan: "kg",    step: 0.5, img: "mangga.png",     emoji: "🥭", tag: "Manis",   desc: "Daging buah lembut dan harum." },
    { id: "anggur",  nama: "Anggur Ungu",        kategori: "impor", harga: 45000, satuan: "kg",    step: 0.5, img: "anggur.png",     emoji: "🍇", tag: "",        desc: "Manis dengan tekstur yang juicy." },
    { id: "semangka",nama: "Semangka",           kategori: "lokal", harga: 12000, satuan: "kg",    step: 0.5, img: "Semangka.png",   emoji: "🍉", tag: "",        desc: "Segar dan cocok dinikmati bersama." }
];

/* ---------- Elemen ---------- */
const $ = (id) => document.getElementById(id);
const navMenu = $("navMenu");
const productGrid = $("productGrid");
const searchInput = $("searchInput");
const sortSelect = $("sortSelect");
const emptyMessage = $("emptyMessage");
const filterButtons = document.querySelectorAll(".filter-btn");
const overlay = $("overlay");
const drawer = $("cartDrawer");

let kategoriAktif = "semua";
let keranjang = {};       // { idProduk: jumlah }
let notaTerakhir = null;  // data nota yang sedang ditampilkan

/* ---------- Utilitas ---------- */
function formatRupiah(angka) {
    return "Rp" + Math.round(angka).toLocaleString("id-ID");
}
function formatQty(n) {
    return n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}
function escapeHtml(teks) {
    return String(teks).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function cariProduk(id) {
    return PRODUCTS.find((p) => p.id === id);
}

let timerToast;
function tampilkanToast(pesan) {
    const toast = $("toastMessage");
    toast.textContent = pesan;
    toast.classList.add("show");
    clearTimeout(timerToast);
    timerToast = setTimeout(() => toast.classList.remove("show"), 2400);
}

/* Gambar produk dengan cadangan emoji bila file gambar tidak ditemukan */
function buatGambar(p, alt) {
    const img = document.createElement("img");
    img.src = encodeURI(IMG + p.img);
    img.alt = alt || p.nama;
    img.loading = "lazy";
    img.addEventListener("error", function () {
        const span = document.createElement("span");
        span.textContent = p.emoji;
        span.style.fontSize = "64px";
        span.setAttribute("role", "img");
        span.setAttribute("aria-label", p.nama);
        this.replaceWith(span);
    });
    return img;
}

/* ---------- Pengaturan harga di teks ---------- */
["freeShipText", "promoFree"].forEach((id) => {
    const el = $(id);
    if (el) el.textContent = formatRupiah(CONFIG.gratisOngkirDi);
});

/* =========================================================
   NAVIGASI, TEMA, SCROLL
========================================================= */
$("mobileMenu").addEventListener("click", () => navMenu.classList.toggle("show"));

document.querySelectorAll(".nav-menu a").forEach((link) => {
    link.addEventListener("click", () => navMenu.classList.remove("show"));
});

window.addEventListener("scroll", () => {
    $("toTop").classList.toggle("show", window.scrollY > 600);
}, { passive: true });
$("toTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

/* Mode gelap (tersimpan) */
function terapkanTema(gelap) {
    document.documentElement.setAttribute("data-theme", gelap ? "dark" : "light");
    $("themeButton").textContent = gelap ? "☀️" : "🌙";
}
let temaGelap = false;
try { temaGelap = localStorage.getItem("dayat-tema") === "dark"; } catch (e) { /* abaikan */ }
terapkanTema(temaGelap);
$("themeButton").addEventListener("click", () => {
    temaGelap = !temaGelap;
    terapkanTema(temaGelap);
    try { localStorage.setItem("dayat-tema", temaGelap ? "dark" : "light"); } catch (e) { /* abaikan */ }
});

/* Animasi muncul saat di-scroll */
if ("IntersectionObserver" in window) {
    const pengamat = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                pengamat.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach((el) => pengamat.observe(el));
} else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
}

/* =========================================================
   KATALOG PRODUK: cari, filter, urutkan
========================================================= */
function tampilkanProduk() {
    if (!productGrid) return;
    const kata = searchInput ? searchInput.value.toLowerCase().trim() : "";
    let daftar = PRODUCTS.filter((p) =>
        p.nama.toLowerCase().includes(kata) && (kategoriAktif === "semua" || p.kategori === kategoriAktif)
    );

    const urut = sortSelect ? sortSelect.value : "default";
    if (urut === "termurah") daftar = daftar.slice().sort((a, b) => a.harga - b.harga);
    if (urut === "termahal") daftar = daftar.slice().sort((a, b) => b.harga - a.harga);
    if (urut === "nama") daftar = daftar.slice().sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    const batas = Number(productGrid.dataset.limit) || 0;
    if (batas) daftar = daftar.slice(0, batas);

    productGrid.innerHTML = "";
    daftar.forEach((p) => {
        const kartu = document.createElement("article");
        kartu.className = "product-card";
        kartu.innerHTML =
            '<div class="product-image">' + (p.tag ? '<span class="product-tag">' + escapeHtml(p.tag) + "</span>" : "") + "</div>" +
            '<div class="product-info">' +
                '<p class="product-category">' + (p.kategori === "impor" ? "Buah Impor" : "Buah Lokal") + "</p>" +
                "<h3>" + escapeHtml(p.nama) + "</h3>" +
                '<p class="product-desc">' + escapeHtml(p.desc) + "</p>" +
                '<div class="product-bottom">' +
                    '<div class="product-price"><strong>' + formatRupiah(p.harga) + "</strong><small>per " + p.satuan + "</small></div>" +
                    '<button class="add-button" type="button" data-id="' + p.id + '" aria-label="Tambah ' + escapeHtml(p.nama) + ' ke keranjang">＋ Tambah</button>' +
                "</div>" +
            "</div>";
        kartu.querySelector(".product-image").prepend(buatGambar(p));
        productGrid.appendChild(kartu);
    });

    if (emptyMessage) emptyMessage.hidden = daftar.length !== 0;
}

function setKategori(kat) {
    kategoriAktif = kat;
    filterButtons.forEach((b) => b.classList.toggle("active", b.dataset.category === kat));
    tampilkanProduk();
}

if (searchInput) searchInput.addEventListener("input", tampilkanProduk);
if (sortSelect) sortSelect.addEventListener("change", tampilkanProduk);
filterButtons.forEach((b) => b.addEventListener("click", () => setKategori(b.dataset.category)));
if (productGrid) productGrid.addEventListener("click", (e) => {
    const tombol = e.target.closest(".add-button");
    if (!tombol) return;
    const p = cariProduk(tombol.dataset.id);
    tambahKeKeranjang(p.id, p.step);
    tampilkanToast(p.nama + " ditambahkan ke keranjang");
});

/* Pilihan buah di formulir kontak */
(function isiPilihanBuah() {
    const sel = $("buahPilihan");
    if (!sel) return;
    sel.innerHTML = '<option value="">Pilih buah</option>' +
        PRODUCTS.map((p) => "<option>" + escapeHtml(p.nama) + "</option>").join("") +
        "<option>Buah lainnya</option>";
})();

/* =========================================================
   KERANJANG
========================================================= */
function simpanKeranjang() {
    try { localStorage.setItem("dayat-keranjang", JSON.stringify(keranjang)); } catch (e) { /* abaikan */ }
}
function muatKeranjang() {
    try {
        const data = JSON.parse(localStorage.getItem("dayat-keranjang") || "{}");
        Object.keys(data).forEach((id) => {
            if (cariProduk(id) && Number(data[id]) > 0) keranjang[id] = Number(data[id]);
        });
    } catch (e) { keranjang = {}; }
}

function tambahKeKeranjang(id, jumlah) {
    keranjang[id] = Math.round(((keranjang[id] || 0) + jumlah) * 10) / 10;
    perbaruiKeranjang();
    const btn = $("openCart");
    btn.classList.remove("bump");
    void btn.offsetWidth;
    btn.classList.add("bump");
}
function ubahJumlah(id, arah) {
    const p = cariProduk(id);
    const baru = Math.round(((keranjang[id] || 0) + arah * p.step) * 10) / 10;
    if (baru <= 0) delete keranjang[id];
    else keranjang[id] = baru;
    perbaruiKeranjang();
}
function hapusItem(id) {
    delete keranjang[id];
    perbaruiKeranjang();
}

function hitungSubtotal() {
    return Object.keys(keranjang).reduce((total, id) => total + Math.round(cariProduk(id).harga * keranjang[id]), 0);
}
function hitungOngkir(subtotal, metode) {
    if (metode === "ambil" || subtotal === 0) return 0;
    return subtotal >= CONFIG.gratisOngkirDi ? 0 : CONFIG.ongkir;
}
function jumlahItem() {
    return Object.keys(keranjang).length;
}

function perbaruiKeranjang() {
    simpanKeranjang();
    const ids = Object.keys(keranjang);
    $("cartBadge").textContent = ids.length;

    const isi = $("cartItems");
    if (ids.length === 0) {
        isi.innerHTML = '<div class="cart-empty"><span>🧺</span><strong>Keranjang masih kosong</strong><p>Yuk pilih buah segar favoritmu!</p></div>';
        $("cartFoot").hidden = true;
    } else {
        $("cartFoot").hidden = false;
        isi.innerHTML = "";
        ids.forEach((id) => {
            const p = cariProduk(id);
            const qty = keranjang[id];
            const baris = document.createElement("div");
            baris.className = "cart-item";
            baris.innerHTML =
                '<div class="cart-thumb"></div>' +
                '<div class="cart-meta"><strong>' + escapeHtml(p.nama) + "</strong>" +
                    "<small>" + formatRupiah(p.harga) + " / " + p.satuan + "</small>" +
                    '<div class="qty">' +
                        '<button type="button" data-act="kurang" data-id="' + id + '" aria-label="Kurangi">−</button>' +
                        "<span>" + formatQty(qty) + " " + p.satuan + "</span>" +
                        '<button type="button" data-act="tambah" data-id="' + id + '" aria-label="Tambah">+</button>' +
                    "</div></div>" +
                '<div class="cart-side"><strong>' + formatRupiah(p.harga * qty) + "</strong>" +
                    '<button class="remove-btn" type="button" data-act="hapus" data-id="' + id + '">Hapus</button></div>';
            baris.querySelector(".cart-thumb").appendChild(buatGambar(p));
            isi.appendChild(baris);
        });

        const subtotal = hitungSubtotal();
        $("cartSubtotal").textContent = formatRupiah(subtotal);
        const kurang = CONFIG.gratisOngkirDi - subtotal;
        $("shipHint").textContent = kurang > 0
            ? "Belanja " + formatRupiah(kurang) + " lagi untuk gratis ongkir."
            : "🎉 Selamat, kamu mendapat gratis ongkir!";
    }
}

$("cartItems").addEventListener("click", (e) => {
    const tombol = e.target.closest("button[data-act]");
    if (!tombol) return;
    const id = tombol.dataset.id;
    if (tombol.dataset.act === "tambah") ubahJumlah(id, 1);
    if (tombol.dataset.act === "kurang") ubahJumlah(id, -1);
    if (tombol.dataset.act === "hapus") hapusItem(id);
});

$("clearCart").addEventListener("click", () => {
    if (confirm("Kosongkan seluruh isi keranjang?")) {
        keranjang = {};
        perbaruiKeranjang();
    }
});

/* Buka / tutup laci keranjang */
function bukaKeranjang() {
    drawer.classList.add("open");
    overlay.classList.add("show");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
}
function tutupKeranjang() {
    drawer.classList.remove("open");
    overlay.classList.remove("show");
    drawer.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".modal.open")) document.body.classList.remove("no-scroll");
}
$("openCart").addEventListener("click", bukaKeranjang);
$("closeCart").addEventListener("click", tutupKeranjang);
overlay.addEventListener("click", tutupKeranjang);

/* =========================================================
   MODAL (checkout & nota)
========================================================= */
function bukaModal(id) {
    const modal = $(id);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
}
function tutupModal(id) {
    const modal = $(id);
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".modal.open") && !drawer.classList.contains("open")) {
        document.body.classList.remove("no-scroll");
    }
}
document.querySelectorAll("[data-close]").forEach((b) => {
    b.addEventListener("click", () => tutupModal(b.dataset.close));
});
document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => { if (e.target === m) tutupModal(m.id); });
});
document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".modal.open").forEach((m) => tutupModal(m.id));
    tutupKeranjang();
});

/* =========================================================
   CHECKOUT
========================================================= */
function nilaiRadio(nama) {
    return document.querySelector('input[name="' + nama + '"]:checked').value;
}

function perbaruiRingkasan() {
    const metode = nilaiRadio("delivery");
    const subtotal = hitungSubtotal();
    const ongkir = hitungOngkir(subtotal, metode);

    $("summaryItems").innerHTML = Object.keys(keranjang).map((id) => {
        const p = cariProduk(id);
        const qty = keranjang[id];
        return '<div class="summary-item"><span>' + escapeHtml(p.nama) +
            "<small>" + formatQty(qty) + " " + p.satuan + " × " + formatRupiah(p.harga) + "</small></span><span>" +
            formatRupiah(p.harga * qty) + "</span></div>";
    }).join("");

    $("sumSubtotal").textContent = formatRupiah(subtotal);
    $("sumShipping").textContent = metode === "ambil" ? "Gratis (ambil)" : (ongkir === 0 ? "Gratis" : formatRupiah(ongkir));
    $("sumTotal").textContent = formatRupiah(subtotal + ongkir);
    $("addressGroup").hidden = metode === "ambil";
}

$("checkoutButton").addEventListener("click", () => {
    if (jumlahItem() === 0) { tampilkanToast("Keranjang masih kosong."); return; }
    tutupKeranjang();
    $("checkoutNote").textContent = "";
    perbaruiRingkasan();
    bukaModal("checkoutModal");
});
document.querySelectorAll('input[name="delivery"]').forEach((r) => r.addEventListener("change", perbaruiRingkasan));

$("checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const note = $("checkoutNote");
    const nama = $("coNama").value.trim();
    const hp = $("coHp").value.trim();
    const metode = nilaiRadio("delivery");
    const alamat = $("coAlamat").value.trim();

    if (jumlahItem() === 0) { note.textContent = "Keranjang kosong."; return; }
    if (nama.length < 2) { note.textContent = "Nama harus diisi minimal 2 karakter."; $("coNama").focus(); return; }
    if (!/^[0-9+\-\s]{9,16}$/.test(hp)) { note.textContent = "Periksa kembali nomor HP (9–16 digit)."; $("coHp").focus(); return; }
    if (metode === "antar" && alamat.length < 8) { note.textContent = "Alamat pengantaran belum lengkap."; $("coAlamat").focus(); return; }
    note.textContent = "";

    const subtotal = hitungSubtotal();
    const ongkir = hitungOngkir(subtotal, metode);
    notaTerakhir = {
        nomor: buatNomorNota(),
        waktu: new Date(),
        nama: nama,
        hp: hp,
        metode: metode,
        alamat: alamat,
        pembayaran: nilaiRadio("payment"),
        catatan: $("coCatatan").value.trim(),
        subtotal: subtotal,
        ongkir: ongkir,
        total: subtotal + ongkir,
        items: Object.keys(keranjang).map((id) => {
            const p = cariProduk(id);
            return { nama: p.nama, harga: p.harga, satuan: p.satuan, qty: keranjang[id], jumlah: Math.round(p.harga * keranjang[id]) };
        })
    };

    tampilkanNota(notaTerakhir);
    tutupModal("checkoutModal");
    bukaModal("receiptModal");
});

/* =========================================================
   NOTA BELANJA
========================================================= */
function buatNomorNota() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const acak = String(Math.floor(1000 + Math.random() * 9000));
    return "DYT-" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + acak;
}

function tampilkanNota(n) {
    const tanggal = n.waktu.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const jam = n.waktu.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");

    const baris = [
        ["No. Nota", n.nomor],
        ["Tanggal", tanggal + ", " + jam],
        ["Pemesan", n.nama],
        ["No. HP", n.hp],
        ["Pengambilan", n.metode === "antar" ? "Diantar" : "Ambil di toko"]
    ];
    if (n.metode === "antar") baris.push(["Alamat", n.alamat]);
    baris.push(["Pembayaran", n.pembayaran]);
    if (n.catatan) baris.push(["Catatan", n.catatan]);

    $("receiptMeta").innerHTML = baris.map((b) =>
        "<div><span>" + escapeHtml(b[0]) + "</span><span>" + escapeHtml(b[1]) + "</span></div>"
    ).join("");

    $("receiptRows").innerHTML = n.items.map((it) =>
        "<tr><td>" + escapeHtml(it.nama) + '</td><td class="num">' + formatRupiah(it.harga) + '</td><td class="num">' +
        formatQty(it.qty) + " " + escapeHtml(it.satuan) + '</td><td class="num">' + formatRupiah(it.jumlah) + "</td></tr>"
    ).join("");

    $("receiptTotals").innerHTML =
        "<div><span>Subtotal</span><span>" + formatRupiah(n.subtotal) + "</span></div>" +
        "<div><span>Ongkos kirim</span><span>" + (n.metode === "ambil" ? "-" : (n.ongkir === 0 ? "Gratis" : formatRupiah(n.ongkir))) + "</span></div>" +
        '<div class="grand"><span>TOTAL</span><span>' + formatRupiah(n.total) + "</span></div>";
}

function teksNotaWhatsApp(n) {
    const tgl = n.waktu.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    let t = "*PESANAN " + CONFIG.namaToko.toUpperCase() + "*\n";
    t += "No. Nota: " + n.nomor + "\nTanggal: " + tgl + "\n\n";
    t += "Nama: " + n.nama + "\nNo. HP: " + n.hp + "\n";
    t += "Pengambilan: " + (n.metode === "antar" ? "Diantar" : "Ambil di toko") + "\n";
    if (n.metode === "antar") t += "Alamat: " + n.alamat + "\n";
    t += "Pembayaran: " + n.pembayaran + "\n\n*Daftar belanja:*\n";
    n.items.forEach((it, i) => {
        t += (i + 1) + ". " + it.nama + " - " + formatQty(it.qty) + " " + it.satuan + " x " + formatRupiah(it.harga) + " = " + formatRupiah(it.jumlah) + "\n";
    });
    t += "\nSubtotal: " + formatRupiah(n.subtotal);
    t += "\nOngkir: " + (n.metode === "ambil" ? "-" : (n.ongkir === 0 ? "Gratis" : formatRupiah(n.ongkir)));
    t += "\n*TOTAL: " + formatRupiah(n.total) + "*";
    if (n.catatan) t += "\n\nCatatan: " + n.catatan;
    t += "\n\nMohon konfirmasi ketersediaan dan harga. Terima kasih!";
    return t;
}

$("sendWa").addEventListener("click", () => {
    if (!notaTerakhir) return;
    window.open("https://wa.me/" + CONFIG.nomorWhatsApp + "?text=" + encodeURIComponent(teksNotaWhatsApp(notaTerakhir)), "_blank", "noopener");
});

$("printReceipt").addEventListener("click", () => {
    const judulAsli = document.title;
    if (notaTerakhir) document.title = "Nota-" + notaTerakhir.nomor;
    window.print();
    document.title = judulAsli;
});

$("newOrder").addEventListener("click", () => {
    keranjang = {};
    perbaruiKeranjang();
    $("checkoutForm").reset();
    tutupModal("receiptModal");
    notaTerakhir = null;
    tampilkanToast("Keranjang dikosongkan. Selamat berbelanja lagi!");
    if (productGrid && !productGrid.dataset.limit) {
        $("products").scrollIntoView({ behavior: "smooth" });
    } else {
        window.location.href = "services.html#products";
    }
});

/* =========================================================
   FORMULIR KONTAK
========================================================= */
if ($("contactForm")) $("contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const nama = $("nama").value.trim();
    const telepon = $("telepon").value.trim();
    const buah = $("buahPilihan").value;
    const pesan = $("pesan").value.trim();
    const note = $("formNote");
    note.classList.add("error");

    if (nama.length < 2) { note.textContent = "Nama harus diisi minimal 2 karakter."; return; }
    if (!/^[0-9+\-\s]{9,16}$/.test(telepon)) { note.textContent = "Periksa kembali nomor HP yang kamu masukkan."; return; }
    if (!buah || pesan.length < 3) { note.textContent = "Silakan pilih buah dan isi pesan."; return; }

    note.classList.remove("error");
    note.textContent = "Data sudah diperiksa. WhatsApp akan dibuka untuk mengirim pesan.";
    const isi = "Halo " + CONFIG.namaToko + ", saya ingin bertanya/memesan.\n" +
        "Nama: " + nama + "\nNomor HP: " + telepon + "\nBuah: " + buah + "\nPesan/Jumlah: " + pesan;
    window.open("https://wa.me/" + CONFIG.nomorWhatsApp + "?text=" + encodeURIComponent(isi), "_blank", "noopener");
});

/* =========================================================
   MULAI
========================================================= */
muatKeranjang();
const kategoriUrl = new URLSearchParams(window.location.search).get("kategori");
if (["lokal", "impor"].indexOf(kategoriUrl) !== -1) kategoriAktif = kategoriUrl;
setKategori(kategoriAktif);
perbaruiKeranjang();
