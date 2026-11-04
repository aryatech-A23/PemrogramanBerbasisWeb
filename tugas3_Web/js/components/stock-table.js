Vue.component('ba-stock-table', {
  template: '#tpl-stock',
  props: {
    items: { type: Array, required: true },
    upbjjList: { type: Array, required: true },
    kategoriList: { type: Array, required: true }
  },
  data: function () {
    return {
      // ---- filter & sort ----
      filterUpbjj: '',
      filterKategori: '',
      filterStok: 'semua',   // semua | reorder | kosong
      sortKey: 'judul',      // judul | qty | harga
      sortDir: 'asc',
      // ---- tooltip catatan ----
      hoverKode: null,
      // ---- form tambah/ubah ----
      showForm: false,
      mode: 'tambah',        // tambah | ubah
      form: this.formKosong(),
      errors: {}
    };
  },
  computed: {
    // Kategori yang tersedia hanya yang ada pada UT-Daerah terpilih (dependent options)
    kategoriTersedia: function () {
      var up = this.filterUpbjj;
      var ada = {};
      this.items.forEach(function (it) { if (it.upbjj === up) { ada[it.kategori] = true; } });
      return this.kategoriList.filter(function (k) { return ada[k]; });
    },
    // Hasil filter + sort di-cache oleh computed; hanya dihitung ulang jika dependensinya berubah
    daftarTampil: function () {
      var self = this;
      var hasil = this.items.filter(function (it) {
        if (self.filterUpbjj && it.upbjj !== self.filterUpbjj) { return false; }
        if (self.filterUpbjj && self.filterKategori && it.kategori !== self.filterKategori) { return false; }
        if (self.filterStok === 'reorder' && !(it.qty < it.safety)) { return false; }
        if (self.filterStok === 'kosong' && it.qty !== 0) { return false; }
        return true;
      });
      var key = this.sortKey;
      var arah = this.sortDir === 'asc' ? 1 : -1;
      return hasil.slice().sort(function (a, b) {
        var x = a[key], y = b[key];
        if (typeof x === 'string') { return x.localeCompare(y) * arah; }
        return (x - y) * arah;
      });
    },
    ringkasan: function () {
      var menipis = 0, kosong = 0;
      this.items.forEach(function (it) {
        if (it.qty === 0) { kosong++; } else if (it.qty < it.safety) { menipis++; }
      });
      return { total: this.items.length, menipis: menipis, kosong: kosong };
    },
    adaFilterAktif: function () {
      return !!(this.filterUpbjj || this.filterKategori || this.filterStok !== 'semua' ||
                this.sortKey !== 'judul' || this.sortDir !== 'asc');
    }
  },
  watch: {
    // Watcher 1: ganti UT-Daerah -> filter kategori di-reset karena opsinya berubah
    filterUpbjj: function () {
      this.filterKategori = '';
    },
    // Watcher 3: validasi ulang otomatis setelah ada error agar pesan hilang saat diperbaiki
    form: {
      deep: true,
      handler: function () {
        if (Object.keys(this.errors).length) { this.validasi(); }
      }
    },
    // Watcher 2: bila item yang sedang dihover hilang dari daftar, tutup tooltip
    daftarTampil: function (baru) {
      var kode = this.hoverKode;
      if (kode && !baru.some(function (it) { return it.kode === kode; })) { this.hoverKode = null; }
    }
  },
  methods: {
    formKosong: function () {
      return { kode: '', judul: '', kategori: '', upbjj: '', lokasiRak: '', harga: '', qty: '', safety: '', catatanHTML: '' };
    },
    resetFilter: function () {
      this.filterUpbjj = '';
      this.filterKategori = '';
      this.filterStok = 'semua';
      this.sortKey = 'judul';
      this.sortDir = 'asc';
    },
    toggleArah: function () {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    },
    bukaTambah: function () {
      this.mode = 'tambah';
      this.form = this.formKosong();
      this.errors = {};
      this.showForm = true;
      this.fokusForm();
    },
    bukaUbah: function (it) {
      this.mode = 'ubah';
      this.form = Object.assign({}, it);
      this.errors = {};
      this.showForm = true;
      this.fokusForm();
    },
    tutupForm: function () {
      this.showForm = false;
    },
    fokusForm: function () {
      var self = this;
      this.$nextTick(function () {
        var el = self.$refs.fokusAwal;
        if (el) { el.focus(); }
      });
    },
    validasi: function () {
      var f = this.form, e = {};
      var kode = String(f.kode).trim();
      if (!kode) { e.kode = 'Kode wajib diisi.'; }
      else if (!/^[A-Za-z0-9-]+$/.test(kode)) { e.kode = 'Kode hanya huruf, angka, dan tanda minus.'; }
      else if (this.mode === 'tambah' && this.items.some(function (it) { return it.kode.toUpperCase() === kode.toUpperCase(); })) {
        e.kode = 'Kode sudah terdaftar.';
      }
      if (!String(f.judul).trim()) { e.judul = 'Judul wajib diisi.'; }
      if (!f.kategori) { e.kategori = 'Pilih kategori.'; }
      if (!f.upbjj) { e.upbjj = 'Pilih UT-Daerah.'; }
      if (!String(f.lokasiRak).trim()) { e.lokasiRak = 'Lokasi rak wajib diisi.'; }
      if (f.harga === '' || isNaN(Number(f.harga)) || Number(f.harga) <= 0) { e.harga = 'Harga harus angka lebih dari 0.'; }
      if (f.qty === '' || isNaN(Number(f.qty)) || Number(f.qty) < 0 || !Number.isInteger(Number(f.qty))) { e.qty = 'Qty harus bilangan bulat >= 0.'; }
      if (f.safety === '' || isNaN(Number(f.safety)) || Number(f.safety) < 0 || !Number.isInteger(Number(f.safety))) { e.safety = 'Safety stock harus bilangan bulat >= 0.'; }
      this.errors = e;
      return Object.keys(e).length === 0;
    },
    simpan: function () {
      if (!this.validasi()) { return; }
      var f = this.form;
      var data = {
        kode: String(f.kode).trim().toUpperCase(),
        judul: String(f.judul).trim(),
        kategori: f.kategori,
        upbjj: f.upbjj,
        lokasiRak: String(f.lokasiRak).trim().toUpperCase(),
        harga: Number(f.harga),
        qty: Number(f.qty),
        safety: Number(f.safety),
        catatanHTML: String(f.catatanHTML || '').trim()
      };
      this.$emit(this.mode === 'tambah' ? 'create' : 'update', data);
      this.showForm = false;
    },
    hapus: function (it) {
      this.$emit('remove', it);
    }
  }
});
