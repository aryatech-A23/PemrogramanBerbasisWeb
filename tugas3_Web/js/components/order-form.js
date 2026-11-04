Vue.component('order-form', {
  template: '#tpl-order',
  props: {
    paket: { type: Array, required: true },
    ekspedisi: { type: Array, required: true },
    nextNo: { type: String, required: true }
  },
  data: function () {
    return {
      form: this.formBaru(),
      errors: {}
    };
  },
  computed: {
    paketTerpilih: function () {
      var kode = this.form.paketKode;
      return this.paket.find(function (p) { return p.kode === kode; }) || null;
    },
    ekspedisiTerpilih: function () {
      var kode = this.form.ekspedisiKode;
      return this.ekspedisi.find(function (e) { return e.kode === kode; }) || null;
    },
    totalHarga: function () {
      return this.paketTerpilih ? this.paketTerpilih.harga : 0;
    }
  },
  watch: {
    // Watcher 1: paket berganti -> hapus pesan error paket
    'form.paketKode': function () {
      this.$delete(this.errors, 'paketKode');
    },
    // Watcher 3: setelah ada error, validasi ulang otomatis agar pesan hilang saat input diperbaiki
    form: {
      deep: true,
      handler: function () {
        if (Object.keys(this.errors).length) { this.validasi(); }
      }
    },
    // Watcher 2: NIM hanya boleh angka -> buang karakter non-angka saat mengetik
    'form.nim': function (val) {
      var bersih = String(val).replace(/\D/g, '');
      if (bersih !== val) { this.form.nim = bersih; }
    }
  },
  methods: {
    // Tanggal lokal hari ini "YYYY-MM-DD" memakai objek Date
    hariIni: function () {
      var d = new Date();
      var p = function (n) { return n < 10 ? '0' + n : '' + n; };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    },
    formBaru: function () {
      return { nim: '', nama: '', ekspedisiKode: '', paketKode: '', tanggalKirim: this.hariIni() };
    },
    validasi: function () {
      var f = this.form, e = {};
      if (!f.nim) { e.nim = 'NIM wajib diisi.'; }
      else if (f.nim.length < 8 || f.nim.length > 12) { e.nim = 'NIM harus 8-12 digit angka.'; }
      if (!f.nama.trim()) { e.nama = 'Nama wajib diisi.'; }
      else if (f.nama.trim().length < 3) { e.nama = 'Nama minimal 3 karakter.'; }
      if (!f.ekspedisiKode) { e.ekspedisiKode = 'Pilih ekspedisi.'; }
      if (!f.paketKode) { e.paketKode = 'Pilih paket bahan ajar.'; }
      if (!f.tanggalKirim) { e.tanggalKirim = 'Tanggal kirim wajib diisi.'; }
      this.errors = e;
      return Object.keys(e).length === 0;
    },
    simpan: function () {
      if (!this.validasi()) { return; }
      var f = this.form;
      var d = new Date();
      var p = function (n) { return n < 10 ? '0' + n : '' + n; };
      var waktu = this.hariIni() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
      this.$emit('created', {
        noDO: this.nextNo,
        nim: f.nim,
        nama: f.nama.trim(),
        status: 'Diproses',
        ekspedisi: this.ekspedisiTerpilih.nama,
        tanggalKirim: f.tanggalKirim,
        paket: this.paketTerpilih.kode,
        total: this.totalHarga,
        perjalanan: [{ waktu: waktu, keterangan: 'Pesanan dibuat, menunggu pengambilan oleh ekspedisi' }]
      });
      this.form = this.formBaru();
      this.errors = {};
    },
    reset: function () {
      this.form = this.formBaru();
      this.errors = {};
    }
  }
});
