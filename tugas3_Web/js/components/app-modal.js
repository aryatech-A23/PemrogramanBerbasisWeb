Vue.component('app-modal', {
  template: '#tpl-modal',
  data: function () {
    return {
      visible: false,
      mode: 'confirm',
      title: '',
      message: '',
      okText: 'Ya',
      cancelText: 'Batal',
      resolver: null
    };
  },
  methods: {
    show: function (mode, opt) {
      var self = this;
      this.mode = mode;
      this.title = opt.title || 'Konfirmasi';
      this.message = opt.message || '';
      this.okText = opt.okText || (mode === 'confirm' ? 'Ya, lanjutkan' : 'OK');
      this.cancelText = opt.cancelText || 'Batal';
      this.visible = true;
      this.$nextTick(function () {
        if (self.$refs.okBtn) { self.$refs.okBtn.focus(); }
      });
      return new Promise(function (resolve) { self.resolver = resolve; });
    },
    confirm: function (opt) { return this.show('confirm', opt || {}); },
    info: function (opt) { return this.show('info', opt || {}); },
    close: function (hasil) {
      this.visible = false;
      if (this.resolver) { this.resolver(hasil); this.resolver = null; }
    }
  }
});
