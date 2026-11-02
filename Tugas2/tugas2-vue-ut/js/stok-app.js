// Pabrik objek formulir kosong (dipakai saat awal & saat reset)
function formKosong() {
  return {
    kode: '', judul: '', kategori: '', upbjj: '', lokasiRak: '',
    harga: '', qty: '', safety: '', catatanHTML: ''
  };
}

// Kunci unik satu baris stok: kode yang sama boleh ada di UT-Daerah berbeda
function kunciItem(item) {
  return item.kode + '|' + item.upbjj;
}

var app = new Vue({
  el: '#app',

  data: {
    // --- Data master (dibaca dari dataBahanAjar.js, disalin agar aman diubah) ---
    upbjjList: dataBahanAjar.upbjjList,
    kategoriList: dataBahanAjar.kategoriList,
    stok: dataBahanAjar.stok.map(function (item) { return Object.assign({}, item); }),

    // State filter & sort
    filter: { upbjj: '', kategori: '', reorderOnly: false, keyword: '' },
    sort: { by: '', dir: 'asc' },

    // --- Formulir tambah ---
    showForm: false,
    form: formKosong(),
    touched: {},
    submitted: false,

    // Formulir edit (modal) 
    editingKey: null,
    editForm: formKosong(),

    // --- UI ---
    notif: { text: '', type: 'info' },
    notifTimer: null,
    lastUpdated: '-'
  },

  /*COMPUTED */
  computed: {
    // Daftar kategori yang benar-benar ada di UT-Daerah terpilih 
    kategoriTersedia: function () {
      var daerah = this.filter.upbjj;
      if (!daerah) return [];
      var hitung = {};
      this.stok.forEach(function (s) {
        if (s.upbjj === daerah) hitung[s.kategori] = (hitung[s.kategori] || 0) + 1;
      });
      return this.kategoriList
        .filter(function (k) { return hitung[k]; })
        .map(function (k) { return { nama: k, jumlah: hitung[k] }; });
    },

    // Hasil filter + sort. Karena computed di-cache, daftar tidak dihitung ulang
    // selama filter/sort/stok tidak berubah (render ulang biasa tidak memicunya).
    filteredStok: function () {
      var f = this.filter;
      var kw = f.keyword.trim().toLowerCase();

      var hasil = this.stok.filter(function (s) {
        if (f.upbjj && s.upbjj !== f.upbjj) return false;
        // filter kategori hanya berlaku setelah UT-Daerah dipilih
        if (f.upbjj && f.kategori && s.kategori !== f.kategori) return false;
        // butuh re-order: stok kosong ATAU di bawah safety stock
        if (f.reorderOnly && !(s.qty === 0 || s.qty < s.safety)) return false;
        if (kw && (s.kode + ' ' + s.judul).toLowerCase().indexOf(kw) === -1) return false;
        return true;
      });

      if (this.sort.by) {
        var by = this.sort.by;
        var arah = this.sort.dir === 'asc' ? 1 : -1;
        hasil.sort(function (a, b) {
          var selisih = by === 'judul' ? a.judul.localeCompare(b.judul, 'id') : a[by] - b[by];
          return selisih * arah;
        });
      }
      return hasil;
    },

    // Ringkasan status seluruh stok
    ringkasan: function () {
      var r = { total: this.stok.length, aman: 0, menipis: 0, kosong: 0 };
      this.stok.forEach(function (s) {
        if (s.qty === 0) r.kosong++;
        else if (s.qty < s.safety) r.menipis++;
        else r.aman++;
      });
      return r;
    },

    filterAktif: function () {
      var f = this.filter;
      return !!(f.upbjj || f.kategori || f.reorderOnly || f.keyword.trim() || this.sort.by);
    },

    // Validasi live untuk formulir tambah & edit
    formErrors: function () { return this.validateItem(this.form, null); },
    editErrors: function () { return this.validateItem(this.editForm, this.editingKey); },
    formValid: function () { return Object.keys(this.formErrors).length === 0; }
  },

  /*WATCHERS */
  watch: {
    // Watcher 1 — ganti UT-Daerah => kategori lama mungkin tidak ada di daerah baru
    'filter.upbjj': function () {
      this.filter.kategori = '';
    },

    // Watcher 2 — beri tahu pengguna saat mode "perlu re-order" diubah
    'filter.reorderOnly': function (aktif) {
      if (aktif) {
        this.notify(this.filteredStok.length + ' bahan ajar perlu di-reorder (stok < safety atau kosong).', 'warn');
      }
    },

    // Watcher 3 — setiap data stok berubah (tambah/edit), catat waktu pembaruan
    stok: {
      deep: true,
      handler: function () {
        this.lastUpdated = new Date().toLocaleTimeString('id-ID');
      }
    }
  },

  /* METHODS  */
  methods: {
    // ---------- Tampilan ----------
    rupiah: function (angka) {
      return 'Rp ' + Number(angka).toLocaleString('id-ID');
    },
    persenStok: function (item) {
      if (!item.safety) return 100;
      return Math.min(100, Math.round((item.qty / item.safety) * 100));
    },
    kunci: kunciItem,

    notify: function (text, type) {
      var self = this;
      clearTimeout(this.notifTimer);
      this.notif = { text: text, type: type || 'info' };
      this.notifTimer = setTimeout(function () { self.notif.text = ''; }, 4000);
    },

    //  Filter & sort 
    resetFilter: function () {
      this.filter = { upbjj: '', kategori: '', reorderOnly: false, keyword: '' };
      this.sort = { by: '', dir: 'asc' };
    },

    //  Validasi 
    isInt: function (v) {
      return v !== null && v !== undefined && String(v).trim() !== '' && Number.isInteger(Number(v));
    },

    // Mengembalikan objek { namaField: 'pesan error' }; kosong bila semua valid.
    // `kunciDiedit` = kunci baris yang sedang diedit (dikecualikan dari cek duplikat).
    validateItem: function (f, kunciDiedit) {
      var e = {};
      var kode = String(f.kode || '').trim().toUpperCase();
      var judul = String(f.judul || '').trim();
      var rak = String(f.lokasiRak || '').trim().toUpperCase();

      if (!kode) e.kode = 'Kode mata kuliah wajib diisi.';
      else if (!/^[A-Z]{3,6}\d{4}$/.test(kode)) e.kode = 'Format kode: 3–6 huruf + 4 angka, contoh EKMA4116.';

      if (!judul) e.judul = 'Judul wajib diisi.';
      else if (judul.length < 3) e.judul = 'Judul minimal 3 karakter.';
      else if (judul.length > 80) e.judul = 'Judul maksimal 80 karakter.';

      if (!f.kategori) e.kategori = 'Pilih kategori mata kuliah.';
      if (!f.upbjj) e.upbjj = 'Pilih UT-Daerah.';

      if (!e.kode && !e.upbjj) {
        var duplikat = this.stok.some(function (s) {
          return s.kode === kode && s.upbjj === f.upbjj && kunciItem(s) !== kunciDiedit;
        });
        if (duplikat) e.kode = 'Kode ini sudah terdaftar di UT-Daerah tersebut.';
      }

      if (!rak) e.lokasiRak = 'Lokasi rak wajib diisi.';
      else if (!/^R\d{1,2}-[A-Z]\d{1,2}$/.test(rak)) e.lokasiRak = 'Format rak: R1-A3 (R + angka, strip, huruf + angka).';

      if (!this.isInt(f.harga) || Number(f.harga) < 1) e.harga = 'Harga harus bilangan bulat ≥ 1.';
      else if (Number(f.harga) > 10000000) e.harga = 'Harga maksimal Rp 10.000.000.';

      if (!this.isInt(f.qty) || Number(f.qty) < 0) e.qty = 'Jumlah stok harus bilangan bulat ≥ 0.';
      else if (Number(f.qty) > 100000) e.qty = 'Jumlah stok maksimal 100.000.';

      if (!this.isInt(f.safety) || Number(f.safety) < 0) e.safety = 'Safety stock harus bilangan bulat ≥ 0.';
      else if (Number(f.safety) > 100000) e.safety = 'Safety stock maksimal 100.000.';

      if (String(f.catatanHTML || '').length > 200) e.catatanHTML = 'Catatan maksimal 200 karakter.';
      return e;
    },

    // Error baru tampil setelah field disentuh atau formulir dikirim
    showErr: function (field) {
      return (this.touched[field] || this.submitted) ? this.formErrors[field] : '';
    },
    touch: function (field) {
      this.$set(this.touched, field, true);
    },

    // Catatan memakai v-html => escape semua tag kecuali tag format sederhana,
    // supaya input pengguna tidak bisa menyisipkan <script> (XSS).
    sanitize: function (html) {
      var s = String(html || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return s
        .replace(/&lt;(\/?)(em|strong|b|i|u)&gt;/gi, '<$1$2>')
        .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
    },

    // Ubah isi formulir menjadi objek stok yang rapi
    susunItem: function (f) {
      return {
        kode: String(f.kode).trim().toUpperCase(),
        judul: String(f.judul).trim(),
        kategori: f.kategori,
        upbjj: f.upbjj,
        lokasiRak: String(f.lokasiRak).trim().toUpperCase(),
        harga: Number(f.harga),
        qty: Number(f.qty),
        safety: Number(f.safety),
        catatanHTML: this.sanitize(f.catatanHTML)
      };
    },

    //Tambah 
    tambahItem: function () {
      this.submitted = true;
      if (!this.formValid) {
        this.notify('Periksa kembali isian formulir yang ditandai merah.', 'error');
        return;
      }
      var item = this.susunItem(this.form);
      this.stok.push(item);
      var tersembunyi = this.filteredStok.indexOf(item) === -1;
      this.notify(
        'Bahan ajar ' + item.kode + ' berhasil ditambahkan.' +
        (tersembunyi ? ' (Tidak terlihat karena filter aktif — klik Reset.)' : ''),
        'success'
      );
      this.batalTambah(true);
    },
    batalTambah: function (tutup) {
      this.form = formKosong();
      this.touched = {};
      this.submitted = false;
      if (tutup) this.showForm = false;
    },

    // Edit
    mulaiEdit: function (item) {
      this.editingKey = kunciItem(item);
      this.editForm = Object.assign({}, item);
    },
    tutupEdit: function () {
      this.editingKey = null;
    },
    simpanEdit: function () {
      if (Object.keys(this.editErrors).length) {
        this.notify('Perbaiki isian yang salah sebelum menyimpan.', 'error');
        return;
      }
      var key = this.editingKey;
      var target = this.stok.filter(function (s) { return kunciItem(s) === key; })[0];
      if (!target) { this.tutupEdit(); return; }
      Object.assign(target, this.susunItem(this.editForm));
      this.notify('Data ' + target.kode + ' (' + target.upbjj + ') berhasil diperbarui.', 'success');
      this.tutupEdit();
    }
  },

  mounted: function () {
    var self = this;
    // Tombol Esc menutup modal edit
    window.addEventListener('keyup', function (ev) {
      if (ev.key === 'Escape' && self.editingKey) self.tutupEdit();
    });
  }
});
