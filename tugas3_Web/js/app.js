(function () {
  'use strict';

  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
               'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Filter (formatting teks)
  Vue.filter('rupiah', function (v) {
    var n = Number(v) || 0;
    return 'Rp ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  });

  // 28 -> "28 buah"
  Vue.filter('buah', function (v) {
    return (Number(v) || 0) + ' buah';
  });

  // "2025-08-25" -> "25 Agustus 2025"
  Vue.filter('tanggal', function (v) {
    if (!v) { return ''; }
    var b = String(v).substring(0, 10).split('-');
    if (b.length !== 3) { return v; }
    return parseInt(b[2], 10) + ' ' + BULAN[parseInt(b[1], 10) - 1] + ' ' + b[0];
  });

  // "2025-08-25 10:12:20" -> "25 Agustus 2025, 10:12:20"
  Vue.filter('waktu', function (v) {
    if (!v) { return ''; }
    var bagian = String(v).split(' ');
    var tgl = Vue.filter('tanggal')(bagian[0]);
    return bagian[1] ? tgl + ', ' + bagian[1] : tgl;
  });

  // ---------- Root ----------
  function mulai(data) {
    var boot = document.getElementById('boot');
    if (boot) { boot.parentNode.removeChild(boot); }
    return new Vue({
      el: '#app',
      data: {
        tab: 'stok',                 // 'stok' | 'tracking' | 'order'
        state: {
          stok: data.stok,
          paket: data.paket,
          pengirimanList: data.pengirimanList,
          upbjjList: data.upbjjList,
          kategoriList: data.kategoriList,
          tracking: data.tracking
        },
        toast: { tampil: false, teks: '' },
        toastTimer: null
      },
      computed: {
        // Nomor DO otomatis: "DO" + tahun berjalan + "-" + urutan 3 digit (DO2025-001)
        nextNo: function () {
          var tahun = new Date().getFullYear();
          var prefix = 'DO' + tahun + '-';
          var maks = 0;
          this.state.tracking.forEach(function (d) {
            if (d.noDO.indexOf(prefix) === 0) {
              var n = parseInt(d.noDO.substring(prefix.length), 10);
              if (n > maks) { maks = n; }
            }
          });
          var urut = String(maks + 1);
          while (urut.length < 3) { urut = '0' + urut; }
          return prefix + urut;
        },
        jumlahPerhatian: function () {
          return this.state.stok.filter(function (s) { return s.qty < s.safety; }).length;
        }
      },
      watch: {
        // Watcher: judul tab browser mengikuti halaman aktif
        tab: function (t) {
          var nama = { stok: 'Stok Bahan Ajar', tracking: 'Tracking DO', order: 'Buat DO' };
          document.title = nama[t] + ' - SITTA UT';
        }
      },
      methods: {
        notif: function (teks) {
          var self = this;
          this.toast.teks = teks;
          this.toast.tampil = true;
          clearTimeout(this.toastTimer);
          this.toastTimer = setTimeout(function () { self.toast.tampil = false; }, 3000);
        },
        // ----- Stok -----
        tambahStok: function (item) {
          var ada = this.state.stok.some(function (s) { return s.kode === item.kode; });
          if (ada) { return; }
          this.state.stok.push(item);
          this.notif('Stok ' + item.kode + ' berhasil ditambahkan.');
        },
        ubahStok: function (item) {
          var idx = this.state.stok.findIndex(function (s) { return s.kode === item.kode; });
          if (idx === -1) { return; }
          this.$set(this.state.stok, idx, item);
          this.notif('Stok ' + item.kode + ' berhasil diperbarui.');
        },
        hapusStok: function (item) {
          var self = this;
          this.$refs.modal.confirm({
            title: 'Hapus Stok?',
            message: 'Stok "' + item.kode + ' - ' + item.judul + '" akan dihapus dari daftar. Tindakan ini tidak dapat dibatalkan.',
            okText: 'Ya, hapus'
          }).then(function (ya) {
            if (!ya) { return; }
            var idx = self.state.stok.findIndex(function (s) { return s.kode === item.kode; });
            if (idx !== -1) { self.state.stok.splice(idx, 1); }
            self.notif('Stok ' + item.kode + ' dihapus.');
          });
        },
        // ----- Delivery Order -----
        handleNewDO: function (dataDO) {
          var self = this;
          this.state.tracking.push(dataDO);
          this.tab = 'tracking';
          this.notif('DO ' + dataDO.noDO + ' berhasil dibuat.');
          this.$nextTick(function () {
            if (self.$refs.tracking) { self.$refs.tracking.fokusKe(dataDO.noDO); }
          });
        },
        tambahProgres: function (p) {
          var d = this.state.tracking.find(function (x) { return x.noDO === p.noDO; });
          if (!d) { return; }
          d.perjalanan.push({ waktu: p.waktu, keterangan: p.keterangan });
          if (d.status === 'Diproses') { d.status = 'Dalam Perjalanan'; }
          this.notif('Progres perjalanan ditambahkan.');
        }
      }
    });
  }

  // Muat template + data lebih dulu, baru mount Vue
  Promise.all([Api.loadTemplates(), Api.loadData()])
    .then(function (hasil) { mulai(hasil[1]); })
    .catch(function (err) {
      var boot = document.getElementById('boot');
      boot.className = 'boot error';
      boot.innerHTML =
        '<h3>Gagal memuat aplikasi</h3><p>' + err.message + '</p>' +
        '<p>Jalankan lewat server lokal (mis. <code>python -m http.server</code> atau Live Server di VS Code), ' +
        'bukan dengan membuka file index.html langsung.</p>';
    });
})();
