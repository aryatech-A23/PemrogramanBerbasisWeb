/* SITTA UT */
var $ = function (id) { return document.getElementById(id); };

/*Fungsi bantu*/
function bukaModal(id) { $(id).classList.add("buka"); }
function tutupModal(id) { $(id).classList.remove("buka"); }

function tampilAlert(el, jenis, teks) {
  el.className = "alert " + jenis;
  el.textContent = teks;
  el.hidden = false;
}

// tampilkan / hapus pesan error pada satu input; true jika valid
function cek(input, pesanEl, teksError) {
  input.classList.toggle("salah", !!teksError);
  pesanEl.textContent = teksError || "";
  return !teksError;
}

var reEmail = /^\S+@\S+\.\S+$/;

/*Halaman login*/
function initLogin() {
  $("formLogin").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("email").value.trim();
    var pass = $("password").value;

    var oke = cek($("email"), $("errEmail"),
      !email ? "Email wajib diisi." : !reEmail.test(email) ? "Format email tidak valid." : "");
    var okp = cek($("password"), $("errPass"), !pass ? "Password wajib diisi." : "");
    if (!oke || !okp) return;

    var user = dataPengguna.find(function (u) {
      return u.email === email && u.password === pass;
    });
    if (!user) {
      alert("email/password yang anda masukkan salah");
      return;
    }
    sessionStorage.setItem("sitta_user", JSON.stringify(user));
    location.href = "dashboard.html";
  });

  $("btnLupa").addEventListener("click", function () { bukaModal("modalLupa"); });
  $("btnDaftar").addEventListener("click", function () { bukaModal("modalDaftar"); });

  $("formLupa").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("emailLupa").value.trim();
    var ada = dataPengguna.some(function (u) { return u.email === v; });
    var msg = !v ? "Email wajib diisi." : !reEmail.test(v) ? "Format email tidak valid." :
              !ada ? "Email tidak terdaftar." : "";
    if (!cek($("emailLupa"), $("errLupa"), msg)) return;
    tutupModal("modalLupa");
    alert("Tautan reset password dikirim ke " + v);
  });

  $("formDaftar").addEventListener("submit", function (e) {
    e.preventDefault();
    var nama = $("dNama").value.trim(), em = $("dEmail").value.trim(), pw = $("dPass").value;
    var a = cek($("dNama"), $("errDNama"), nama.length < 3 ? "Nama minimal 3 karakter." : "");
    var b = cek($("dEmail"), $("errDEmail"),
      !reEmail.test(em) ? "Format email tidak valid." :
      dataPengguna.some(function (u) { return u.email === em; }) ? "Email sudah terdaftar." : "");
    var c = cek($("dPass"), $("errDPass"),
      pw.length < 6 || !/\d/.test(pw) ? "Minimal 6 karakter dan memuat angka." : "");
    if (!(a && b && c)) return;

    dataPengguna.push({ id: dataPengguna.length + 1, nama: nama, email: em,
                        password: pw, role: "UPBJJ-UT", lokasi: "-" });
    tutupModal("modalDaftar");
    this.reset();
    alert("Pendaftaran berhasil, silakan lanjut login.");
  });
}

/*Kerangka halaman setelah login*/
function initHalaman() {
  var user = JSON.parse(sessionStorage.getItem("sitta_user") || "null");
  if (!user) { location.href = "index.html"; return null; }

  $("btnKeluar").addEventListener("click", function () {
    if (confirm("Yakin ingin keluar?")) {
      sessionStorage.removeItem("sitta_user");
      location.href = "index.html";
    }
  });

  document.querySelectorAll(".belum").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      alert("Halaman ini belum tersedia.");
    });
  });
  return user;
}

/*Dashboard dan greeting*/
function initDashboard() {
  var user = initHalaman();
  if (!user) return;

  var jam = new Date().getHours();
  var sapa = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" :
             jam < 19 ? "Selamat sore" : "Selamat malam";

  $("greeting").textContent = sapa + ", " + user.nama;
  $("infoUser").textContent = user.role + " - " + user.lokasi;

  var total = dataBahanAjar.reduce(function (s, b) { return s + b.stok; }, 0);
  $("sJudul").textContent = dataBahanAjar.length;
  $("sStock").textContent = total.toLocaleString("id-ID");
  $("sDO").textContent = Object.keys(dataTracking).length;
}

/*Tracking*/
function initTracking() {
  if (!initHalaman()) return;

  $("formTrack").addEventListener("submit", function (e) {
    e.preventDefault();
    var no = $("noDO").value.trim();
    var hasil = $("hasil");
    hasil.innerHTML = "";

    var msg = !no ? "Nomor DO wajib diisi."
            : !/^\d{10}$/.test(no) ? "Nomor DO terdiri dari 10 digit angka." : "";
    if (!cek($("noDO"), $("errDO"), msg)) return;

    var d = dataTracking[no];
    if (!d) {
      alert("Nomor DO " + no + " tidak ditemukan.");
      return;
    } 

    var persen = d.status === "Dikirim" ? 100
               : Math.min(100, Math.round(d.perjalanan.length / 6 * 100));

    var kotak = document.createElement("div");
    kotak.className = "kotak";
    kotak.innerHTML =
      "<h2></h2><span class='status'></span>" +
      "<div class='progress'><div></div></div>" +
      "<p class='detail'></p><ul class='timeline'></ul>";

    kotak.querySelector("h2").textContent = d.nama + " (DO " + d.nomorDO + ")";
    kotak.querySelector(".status").textContent = d.status;
    kotak.querySelector(".progress div").style.width = persen + "%";
    kotak.querySelector(".detail").textContent =
      "Ekspedisi: " + d.ekspedisi + " | Tanggal kirim: " + d.tanggalKirim +
      " | Paket: " + d.paket + " | Total: " + d.total;

    var ul = kotak.querySelector(".timeline");
    d.perjalanan.slice().reverse().forEach(function (p) {
      var li = document.createElement("li");
      var t = document.createElement("time");
      t.textContent = p.waktu;
      li.appendChild(t);
      li.appendChild(document.createTextNode(p.keterangan));
      ul.appendChild(li);
    });
    hasil.appendChild(kotak);
  });
}

/*Stok*/
function tambahBaris(b) {
  var tr = $("tbStock").insertRow();

  var td = tr.insertCell();
  var img = document.createElement("img");
  img.src = b.cover;
  img.alt = "Cover " + b.namaBarang;
  td.appendChild(img);

  [b.kodeLokasi, b.kodeBarang, b.namaBarang, b.jenisBarang, b.edisi].forEach(function (t) {
    tr.insertCell().textContent = t;
  });
  var s = tr.insertCell();
  s.textContent = b.stok;
  if (b.stok < 200) s.className = "rendah";

  tr.addEventListener("click", function () {
    $("dtImg").src = b.cover;
    $("dtImg").alt = "Cover " + b.namaBarang;
    $("dtJudul").textContent = b.namaBarang;
    $("dtInfo").textContent = b.kodeBarang + " | " + b.jenisBarang + " edisi " + b.edisi +
                              " | lokasi " + b.kodeLokasi + " | stok " + b.stok;
    bukaModal("modalDetail");
  });
}

function initStock() {
  if (!initHalaman()) return;
  dataBahanAjar.forEach(tambahBaris);

  $("formStock").addEventListener("submit", function (e) {
    e.preventDefault();
    var lok = $("fLokasi").value.trim().toUpperCase();
    var kode = $("fKode").value.trim().toUpperCase();
    var nama = $("fNama").value.trim();
    var edisi = $("fEdisi").value;
    var stok = $("fStock").value;

    var ok = [
      cek($("fLokasi"), $("eLokasi"), !lok ? "Kode lokasi wajib diisi." : ""),
      cek($("fKode"), $("eKode"),
        !/^[A-Z]{4}\d{4}$/.test(kode) ? "Format: 4 huruf + 4 angka, mis. ASIP4301." :
        dataBahanAjar.some(function (b) { return b.kodeBarang === kode; }) ? "Kode sudah ada." : ""),
      cek($("fNama"), $("eNama"), nama.length < 3 ? "Nama minimal 3 karakter." : ""),
      cek($("fEdisi"), $("eEdisi"), !(edisi >= 1) ? "Edisi minimal 1." : ""),
      cek($("fStock"), $("eStock"),
        stok === "" || +stok < 0 || !Number.isInteger(+stok) ? "Stok harus bilangan bulat >= 0." : "")
    ].every(Boolean);

    if (!ok) {
      tampilAlert($("alertStock"), "err", "Data belum lengkap. Perbaiki kolom bertanda merah.");
      return;
    }
    var baru = { kodeLokasi: lok, kodeBarang: kode, namaBarang: nama, jenisBarang: $("fJenis").value,
                 edisi: edisi, stok: +stok, cover: "img/pengantar_komunikasi.jpg" };
    dataBahanAjar.push(baru);
    tambahBaris(baru);
    this.reset();
    tampilAlert($("alertStock"), "ok", nama + " berhasil ditambahkan.");
  });
}

/*Jalankan sesuai halaman*/
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-tutup]").forEach(function (b) {
    b.addEventListener("click", function () { tutupModal(b.dataset.tutup); });
  });
  document.querySelectorAll(".modal").forEach(function (m) {
    m.addEventListener("click", function (e) { if (e.target === m) m.classList.remove("buka"); });
  });
  var id = document.body.id;
  if (id === "halaman-login") initLogin();
  else if (id === "halaman-dashboard") initDashboard();
  else if (id === "halaman-tracking") initTracking();
  else if (id === "halaman-stock") initStock();
});
