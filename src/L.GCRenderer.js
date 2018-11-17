L.Polyline.GCRenderer = L.SVG.extend({

  _initContainer: function () {
    var pane = this.getPane();
    // try to find existing svg instead of creating one more
    if(pane) {
      var container = pane.getElementsByTagName('svg')[0];
      if( container ) {
        this._container = container;
        this._rootGroup = container.getElementsByTagName('g')[0];
      }
    } else {
      this._container = create('svg');

      // makes it possible to click through svg root; we'll reset it back in individual paths
      this._container.setAttribute('pointer-events', 'none');

      this._rootGroup = create('g');
      this._container.appendChild(this._rootGroup);
    }
  },

  _updatePoly: function (poly, closed) {
    L.SVG.prototype._setPath.call(this, poly, this.pointsToPath(poly.getLatLngs(), poly._map, closed));
  },

  pointsToPath: function (latlngs, map, closed) {
    var str = '', i, j, len2, points=[], p;

    latlngs.forEach(function(point, idx){
      if( idx < latlngs.length - 1 ) {
        var next = latlngs[idx+1];
        points.push(map.latLngToLayerPoint(point));
        for( i=0.025;i<=0.975;i+=0.025 ) {
          var gcPoint = point.intermediatePointTo(next,i);
          points.push(map.latLngToLayerPoint(gcPoint));
        }
        points.push(map.latLngToLayerPoint(next));
      } else {
        points.push(map.latLngToLayerPoint(point));
      }
    });

    for (j = 0, len2 = points.length; j < len2; j++) {
      p = points[j];
      str += (j ? 'L' : 'M') + p.x + ' ' + p.y;
    }

    // closes the ring for polygons; "x" is VML syntax
    str += closed ? (Browser.svg ? 'z' : 'x') : '';

    // SVG complains about empty path strings
    return str || 'M0 0';
  }

});