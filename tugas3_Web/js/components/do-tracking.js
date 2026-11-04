Vue.component('do-tracking', {
  template: '#tpl-tracking',
  props: {
    data: { type: Array, required: true },
    paket: { type: Array, default: function () { return []; } }
  },
  data: function () {
    return {
      query: '',          // isi kolom pencarian (diketik pengguna)
      applied: '',        // kata kunci yang sudah di-submit dengan Enter / tombol Cari
      terpilih: null,     // noDO yang detailnya sedang dibuka
      keterangan: '',     // input progres perjalanan baru
      errorProgres: ''
    };
  },
  computed: {
    hasil: function () {
      var q = this.applied.trim().toLowerCase();
      if (!q) { return this.data; }
      return this.data.filter(function (d) {
        return d.noDO.toLowerCase().indexOf(q) !== -1 || String(d.nim).toLowerCase().indexOf(q) !== -1;
      });
    },
    detail: function () {
      var no = this.terpilih;
      return this.data.find(function (d) { return d.noDO === no; }) || null;
    },
    namaPaket: function () {
      if (!this.detail) { return ''; }
      var kode = this.detail.paket;
      var p = this.paket.find(function (x) { return x.kode === kode; });
      return p ? p.nama : kode;
    },
    // Perjalanan diurutkan dari yang terbaru di atas
    perjalananUrut: function () {
      if (!this.detail) { return []; }
      return this.detail.perjalanan.slice().reverse();
    }
  },
  watch: {
    // Watcher 1: kolom dikosongkan -> otomatis tampilkan semua DO lagi
    query: function (val) {
      if (val === '') { this.applied = ''; }
    },
    // Watcher 2: ganti DO terpilih -> bersihkan input progres sebelumnya
    terpilih: function () {
      this.keterangan = '';
      this.errorProgres = '';
    },
    // Watcher 3: bila DO terpilih tidak ada lagi di hasil pencarian, tutup detail
    hasil: function (baru) {
      var no = this.terpilih;
      if (no && !baru.some(function (d) { return d.noDO === no; })) { this.terpilih = null; }
    }
  },
  methods: {
    cari: function () {
      this.applied = this.query;
      if (this.hasil.length === 1) { this.terpilih = this.hasil[0].noDO; }
    },
    bersihkan: function () {
      this.query = '';
      this.applied = '';
      this.terpilih = null;
    },
    pilih: function (noDO) {
      this.terpilih = this.terpilih === noDO ? null : noDO;
    },
    // Waktu lokal dari objek Date -> "YYYY-MM-DD HH:mm:ss"
    waktuSekarang: function () {
      var d = new Date();
      var p = function (n) { return n < 10 ? '0' + n : '' + n; };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
             p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    },
    tambahProgres: function () {
      var ket = this.keterangan.trim();
      if (ket.length < 3) {
        this.errorProgres = 'Keterangan minimal 3 karakter.';
        return;
      }
      this.errorProgres = '';
      this.$emit('add-progress', { noDO: this.terpilih, waktu: this.waktuSekarang(), keterangan: ket });
      this.keterangan = '';
    },
    // Fokus ke DO tertentu (dipanggil dari root setelah DO baru dibuat)
    fokusKe: function (noDO) {
      this.query = noDO;
      this.applied = noDO;
      this.terpilih = noDO;
    }
  }
});
