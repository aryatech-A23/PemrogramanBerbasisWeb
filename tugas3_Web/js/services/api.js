(function (global) {
  'use strict';

  var DATA_URL = 'data/dataBahanAjar.json';

  // Nama file template -> id elemen <template> yang dipakai komponen
  var TEMPLATES = {
    'tpl-badge': 'templates/status-badge.html',
    'tpl-modal': 'templates/app-modal.html',
    'tpl-stock': 'templates/stock-table.html',
    'tpl-tracking': 'templates/do-tracking.html',
    'tpl-order': 'templates/order-form.html'
  };

  function getText(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) { throw new Error('Gagal memuat ' + url + ' (HTTP ' + res.status + ')'); }
      return res.text();
    });
  }

  function normalisasiTracking(raw) {
    var hasil = [];
    var sudah = {};
    (raw || []).forEach(function (obj) {
      Object.keys(obj).forEach(function (noDO) {
        if (sudah[noDO]) { return; }
        sudah[noDO] = true;
        var d = obj[noDO];
        hasil.push({
          noDO: noDO,
          nim: d.nim,
          nama: d.nama,
          status: d.status,
          ekspedisi: d.ekspedisi,
          tanggalKirim: d.tanggalKirim,
          paket: d.paket,
          total: d.total,
          perjalanan: (d.perjalanan || []).slice()
        });
      });
    });
    return hasil;
  }

  var Api = {
    /** Ambil seluruh data bahan ajar dari file JSON */
    loadData: function () {
      return fetch(DATA_URL).then(function (res) {
        if (!res.ok) { throw new Error('Gagal memuat ' + DATA_URL + ' (HTTP ' + res.status + ')'); }
        return res.json();
      }).then(function (json) {
        json.tracking = normalisasiTracking(json.tracking);
        return json;
      });
    },

    /** Muat semua file template lalu sisipkan sebagai <template id="..."> */
    loadTemplates: function () {
      var ids = Object.keys(TEMPLATES);
      return Promise.all(ids.map(function (id) { return getText(TEMPLATES[id]); }))
        .then(function (isi) {
          ids.forEach(function (id, i) {
            var el = document.createElement('template');
            el.id = id;
            el.innerHTML = isi[i];
            document.body.appendChild(el);
          });
        });
    }
  };

  global.Api = Api;
})(window);
