Vue.component('status-badge', {
  template: '#tpl-badge',
  props: {
    qty: { type: Number, required: true },
    safety: { type: Number, required: true }
  },
  computed: {
    // Kosong diperiksa lebih dulu karena qty = 0 juga memenuhi qty < safety
    level: function () {
      if (this.qty === 0) { return 'kosong'; }
      if (this.qty < this.safety) { return 'menipis'; }
      return 'aman';
    }
  }
});
