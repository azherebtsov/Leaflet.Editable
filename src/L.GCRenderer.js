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
  },

  /**
   * Creates buffer around the route
   *
   * Experimental, ArcGIS server returns horrible buffers
   *
   * @param poly
   * @param radius
   */
  buffer: function (poly, radius = 25) {
    var latlngs = poly.getLatLngs(), ring=[];
    latlngs.forEach(function(point, idx){
      ring.push([point.lat, point.lng]);
      if( idx < latlngs.length - 1 ) {
        var next = latlngs[idx+1], ip;
        for(var i=0.1;i<1;i+=0.1) {
          ip = point.intermediatePointTo(next, i);
          ring.push([ip.lat, ip.lng]);
        }
      }
    });

    var xhr = new XMLHttpRequest();
    var requestURL = 'https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer/buffer';
    var params = {
      f: "json",
      unit: 9093,
      unionResults: false,
      geodesic: true,
      geometries: JSON.stringify({"geometryType":"esriGeometryPolyline","geometries":[{"paths":[ring],"spatialReference":{"wkid":3857}}]}),
      inSR: 4326,
      distances: [radius],
      outSR: 4326,
      bufferSR: 3857
    };

    xhr.open('GET', requestURL + this._formatParams(params), true );
    // Specify the http content-type as json
    xhr.setRequestHeader('Accept', '*/*');

    // Response handlers
    xhr.onload = function() {
      var responseText = xhr.responseText;
      var response = JSON.parse(responseText);
      new L.Polyline(response.geometries[0].rings[0],
        {
          stroke: true,
          color: "#bb44bb",
          weight: 2,
          opacity: 0.9,
          fill: false,
          clickable: false
        }).addTo(map);
    };

    xhr.onerror = function() {
      console.log('There was an error!');
    };
    xhr.send();
  },

  _formatParams: function( params ){
    return "?" + Object
      .keys(params)
      .map(function(key){
        return key+"="+encodeURIComponent(params[key])
      })
      .join("&")
  }


});