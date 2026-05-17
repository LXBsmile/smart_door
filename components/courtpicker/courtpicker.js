Component({
  options:{multipleSlots: true},
  properties: {
    courtName: {
      type: String,
      value: ''
    },
    courts: {
      type: Array,
      value: []
    },
    index: {
      type: Number,
      value: 0
    },
    showPicker: {
      type: Boolean,
      value: true
    },
    subText: {
      type: String,
      value: ''
    },
    buttonText: {
      type: String,
      value: '切换小区'
    }
  },
  data: {
  },
  methods: {
    onPickerChange(e) {
      this.triggerEvent('change', e.detail)
    }
  }
})
