// Tanggal lokal "YYYY-MM-DD"
function tanggalHariIni() {
  var d = new Date();
  var p = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// Waktu lokal "YYYY-MM-DD HH:mm:ss"
function waktuSekarang() {
  var d = new Date();
  var p = function (n) { return String(n).padStart(2, '0'); };
  return tanggalHariIni() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

// Pabrik objek formulir kosong
function formDOKosong() {
  return { nim: '', nama: '', ekspedisi: '', paket: '', tanggalKirim: tanggalHariIni(), totalHarga: 0 };
}

// "DO2025-0001" dan "DO2025-001" dianggap nomor yang sama (tahun + urutan numerik)
function normalisasiNomor(teks) {
  var t = String(teks || '').trim().toUpperCase();
  var m = t.match(/^DO(\d{4})-(\d+)$/);
  return m ? m[1] + '-' + parseInt(m[2], 10) : t;
}

var app = new Vue({
  el: '#app',

  data: {
    pengirimanList: dataBahanAjar.pengirimanList,
    paketList: dataBahanAjar.paket,
    stok: dataBahanAjar.stok,
    tracking: JSON.parse(JSON.stringify(dataBahanAjar.tracking)), // salinan agar aman diubah

    // Pencarian
    keyword: '',
    activeKey: null,     // nomor DO yang sedang ditampilkan detailnya
    searched: false,
    searchError: '',

    // Formulir DO baru
    form: formDOKosong(),
    touched: {},
    submitted: false,

    // UI
    notif: { text: '', type: 'info' },
    notifTimer: null
  },

  /* ============================ COMPUTED ============================ */
  computed: {
    // Nomor DO otomatis: "DO" + tahun berjalan + urutan 3 digit (urutan terbesar yang ada + 1)
    nomorDOBaru: function () {
      var maks = 0;
      Object.keys(this.tracking).forEach(function (nomor) {
        var m = nomor.match(/-(\d+)$/);
        if (m) maks = Math.max(maks, parseInt(m[1], 10));
      });
      return 'DO' + new Date().getFullYear() + '-' + String(maks + 1).padStart(3, '0');
    },

    // Daftar DO sebagai array (terbaru di atas) untuk v-for
    daftarDO: function () {
      var self = this;
      return Object.keys(this.tracking)
        .map(function (nomor) { return Object.assign({ nomor: nomor }, self.tracking[nomor]); })
        .sort(function (a, b) {
          return (b.tanggalKirim + b.nomor).localeCompare(a.tanggalKirim + a.nomor);
        });
    },

    // Detail DO yang sedang dilacak
    hasilDO: function () {
      if (!this.activeKey || !this.tracking[this.activeKey]) return null;
      return Object.assign({ nomor: this.activeKey }, this.tracking[this.activeKey]);
    },

    // Paket yang dipilih di formulir + rincian isinya
    selectedPaket: function () {
      var kode = this.form.paket;
      return this.paketList.filter(function (p) { return p.kode === kode; })[0] || null;
    },
    isiPaketDetail: function () {
      if (!this.selectedPaket) return [];
      var stok = this.stok;
      return this.selectedPaket.isi.map(function (kode) {
        var s = stok.filter(function (x) { return x.kode === kode; })[0];
        return s
          ? { kode: kode, judul: s.judul, kategori: s.kategori }
          : { kode: kode, judul: '(data stok tidak ditemukan)', kategori: '-' };
      });
    },

    formErrors: function () {
      var f = this.form, e = {};
      var nama = String(f.nama || '').trim();

      if (!f.nim) e.nim = 'NIM wajib diisi.';
      else if (!/^\d{9}$/.test(f.nim)) e.nim = 'NIM harus 9 digit angka.';

      if (!nama) e.nama = 'Nama wajib diisi.';
      else if (nama.length < 3) e.nama = 'Nama minimal 3 karakter.';
      else if (!/^[A-Za-z .'\-]+$/.test(nama)) e.nama = 'Nama hanya boleh berisi huruf, spasi, titik, apostrof, dan strip.';

      if (!f.ekspedisi) e.ekspedisi = 'Pilih layanan ekspedisi.';
      if (!f.paket) e.paket = 'Pilih paket bahan ajar.';

      if (!f.tanggalKirim) e.tanggalKirim = 'Tanggal kirim wajib diisi.';
      else if (isNaN(new Date(f.tanggalKirim).getTime())) e.tanggalKirim = 'Tanggal tidak valid.';
      return e;
    },
    formValid: function () { return Object.keys(this.formErrors).length === 0; }
  },

  /* ============================ WATCHERS ============================ */
  watch: {
    // Watcher 1 — saat mengetik ulang, hasil/pesan pencarian lama dibersihkan
    keyword: function (baru) {
      this.searchError = '';
      if (!this.activeKey || normalisasiNomor(baru) !== normalisasiNomor(this.activeKey)) {
        this.activeKey = null;
        this.searched = false;
      }
    },

    // Watcher 2 — pilih paket => total harga terisi otomatis dari data paket
    'form.paket': function (kode) {
      var p = this.paketList.filter(function (x) { return x.kode === kode; })[0];
      this.form.totalHarga = p ? p.harga : 0;
    },

    // Watcher 3 — NIM hanya angka, maksimal 9 digit (karakter lain dibuang otomatis)
    'form.nim': function (nilai) {
      var bersih = String(nilai).replace(/\D/g, '').slice(0, 9);
      if (bersih !== nilai) this.form.nim = bersih;
    }
  },

  /* ============================ METHODS ============================= */
  methods: {
    rupiah: function (angka) {
      return 'Rp ' + Number(angka).toLocaleString('id-ID');
    },
    namaPaket: function (kode) {
      var p = this.paketList.filter(function (x) { return x.kode === kode; })[0];
      return p ? p.nama : '-';
    },
    notify: function (text, type) {
      var self = this;
      clearTimeout(this.notifTimer);
      this.notif = { text: text, type: type || 'info' };
      this.notifTimer = setTimeout(function () { self.notif.text = ''; }, 4000);
    },

    // ---------- Pencarian ----------
    cariDO: function () {
      var input = this.keyword.trim();
      if (!input) {
        this.searchError = 'Masukkan nomor DO terlebih dahulu.';
        return;
      }
      var target = normalisasiNomor(input);
      var ditemukan = Object.keys(this.tracking).filter(function (k) {
        return normalisasiNomor(k) === target;
      })[0];
      this.searched = true;
      this.activeKey = ditemukan || null;
    },
    lihat: function (nomor) {
      this.keyword = nomor;
      this.searched = true;
      this.activeKey = nomor;
      this.$nextTick(function () {
        var el = document.getElementById('hasil');
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },

    // ---------- Formulir ----------
    showErr: function (field) {
      return (this.touched[field] || this.submitted) ? this.formErrors[field] : '';
    },
    touch: function (field) {
      this.$set(this.touched, field, true);
    },
    setHariIni: function () {
      this.form.tanggalKirim = tanggalHariIni();
    },
    resetForm: function () {
      this.form = formDOKosong();
      this.touched = {};
      this.submitted = false;
    },

    tambahDO: function () {
      this.submitted = true;
      if (!this.formValid) {
        this.notify('Periksa kembali isian formulir yang ditandai merah.', 'error');
        return;
      }
      var f = this.form;
      var nomor = this.nomorDOBaru;
      var layanan = this.pengirimanList.filter(function (x) { return x.kode === f.ekspedisi; })[0];

      // Properti baru pada objek => wajib $set agar reaktif
      this.$set(this.tracking, nomor, {
        nim: f.nim,
        nama: f.nama.trim(),
        status: 'Diproses',
        ekspedisi: 'JNE ' + layanan.nama,
        tanggalKirim: f.tanggalKirim,
        paket: f.paket,
        total: f.totalHarga,
        perjalanan: [
          { waktu: waktuSekarang(), keterangan: 'DO dibuat, menunggu diserahkan ke ekspedisi' }
        ]
      });

      this.notify('DO ' + nomor + ' berhasil dibuat untuk ' + f.nama.trim() + '.', 'success');
      this.resetForm();
      this.lihat(nomor);
    }
  }
});
