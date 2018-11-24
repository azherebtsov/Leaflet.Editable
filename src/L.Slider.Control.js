L.Control.Slider = L.Control.extend({

  _KM_RANGE: {
    'min': [0],
    '60%': [500],
    '75%': [2500],
    'max': [5000],
  },

  _NM_RANGE: {
    'min': [0],
    '60%': [100],
    '75%': [500],
    'max': [3000],
  },

  options: {
    position: 'topright'
  },

  setOpacityLayer: function (layer) {
    opacity_layer = layer;
  },

  onAdd: function (map) {
    var sliderContainer = L.DomUtil.create('div', 'slider_container leaflet-control-layers leaflet-control-layers-expanded leaflet-control');
    var rangeSlider = L.DomUtil.create('div', 'slider_control', sliderContainer);

    noUiSlider.create(rangeSlider, {
      start: [100],
      step: 5,
      orientation: 'vertical',
      direction: 'rtl',
      tooltips: true,
      range: this._NM_RANGE,
      pips: {mode: 'range', density: 4}
    });

    if( this.options.onUpdate ) {
      rangeSlider.noUiSlider.on('update', this.options.onUpdate);
      rangeSlider.noUiSlider.on('set', this.options.onUpdate);
    }

    var nmRadio = L.DomUtil.create('input', '', sliderContainer);
    var nmLabel = L.DomUtil.create('span', '', sliderContainer);
    var kmRadio = L.DomUtil.create('input', '', sliderContainer);
    var kmLabel = L.DomUtil.create('span', '', sliderContainer);

    nmRadio.setAttribute("type", "radio");
    nmRadio.setAttribute("name", "unit");
    nmRadio.setAttribute("value", "9093");
    nmRadio.checked = true;
    nmRadio.range = this._NM_RANGE;
    nmRadio.slider = rangeSlider.noUiSlider;
    nmLabel.textContent = 'NM';

    kmRadio.setAttribute("type", "radio");
    kmRadio.setAttribute("name", "unit");
    kmRadio.setAttribute("value", "9036");
    kmRadio.range = this._KM_RANGE;
    kmRadio.slider = rangeSlider.noUiSlider;
    kmLabel.textContent = 'KM';

    nmRadio.addEventListener('change', this._updateSliderRange);
    kmRadio.addEventListener('change', this._updateSliderRange);

    this.noUiSlider = rangeSlider.noUiSlider;

    return sliderContainer;
  },

  _updateSliderRange: function () {
    this.slider.updateOptions({
      range: this.range
    }, true);
    this.slider.units = this.getAttribute('value');
  }
});