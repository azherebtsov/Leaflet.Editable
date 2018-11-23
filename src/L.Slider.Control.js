L.Control.Slider = L.Control.extend({

  options: {
    position: 'topright'
  },

  setOpacityLayer: function (layer) {
    opacity_layer = layer;
  },

  onAdd: function (map) {
    var sliderContainer = L.DomUtil.create('div', 'slider_container leaflet-control-layers leaflet-control-layers-expanded leaflet-control');
    var rangeSlider = L.DomUtil.create('div', 'slider_control');
    sliderContainer.appendChild(rangeSlider);

    noUiSlider.create(rangeSlider, {
      start: [100],
      step: 5,
      orientation: 'vertical',
      direction: 'rtl',
      range: {
        'min': [1],
        '60%': [500],
        '75%': [2500],
        'max': [5000],
      },
      pips: {mode: 'range', density: 4}
    });

    if( this.options.onUpdate ) {
      rangeSlider.noUiSlider.on('update', this.options.onUpdate);
    }

    this.noUiSlider = rangeSlider.noUiSlider;

    return sliderContainer;
  }
});