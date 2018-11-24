let startPoint = [52.17333304, 20.98416353];

const CRS_WEB_MERCATOR = 102100;
const color = '#bb44bb';

let routeDefaultOptions = {
  stroke: true,
  color: color,
  weight: 6,
  opacity: 0.8,
  fill: false,
  clickable: true,
  renderer: new L.Polyline.GCRenderer(),
  gcpoly: true
};

const map = L.map('map',{
  center: startPoint,
  zoom: 6
});
const profile = L.map('profile', {
  crs: L.CRS.Simple,
  profile: true,
  minZoom: -5,
  maxBounds: [
    [-2, -5],
    [1000, 1000]
  ]
}).setView([-2,-5], -5);

let showCoord = L.control.coordinates({
  position:"bottomleft",
  useDMS:true,
  useLatLngOrder:true
});
showCoord.addTo(map);

tilelayer = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: 'Data \u00a9 <a href="http://www.openstreetmap.org/copyright"> OpenStreetMap Contributors </a> Tiles \u00a9 <a href="http://carto.com">CARTO</a>'
  }).addTo(map);

// NAV layers
let subdomains = 'abc';
let navLayer = L.tileLayer('https://{s}.gis.flightplandatabase.com/tile/nav/{z}/{x}/{y}.png', {
  subdomains: subdomains,
  attribution: '',
  minZoom: 5,
  maxNativeZoom: 15
});
navLayer.addTo(map);
// FIR borders
let firBorders = L.tileLayer.wms('https://gis.icao.int/ArcGIS/rest/services/FIRMSD/MapServer/export?dpi=96&bboxSR=102100&imageSR=102100&f=image',
  {
    layers: 'FIR',
    format: 'png32',
    transparent: true,
    attribution: "ICAO",
    crs: L.CRS.EPSG3857
  });
firBorders.addTo(map);

// Airports
let airports = L.esri.Cluster.featureLayer({
  showCoverageOnHover: false,
  url: "https://services1.arcgis.com/vHnIGBHHqDR6y0CR/arcgis/rest/services/World_Airport_Locations/FeatureServer/0",
  pointToLayer: function (airportPoint, latlng) {
    let airport = L.circleMarker(latlng,
      {
        radius: 3,
        fillColor: "#ca7049",
        fillOpacity: 0.4,
        color: "#000",
        weight: 1
      }
    );
    airport.bindTooltip(
      "<h3>"+airportPoint.properties.ICAO+" "+"<span style='color:red'>"+airportPoint.properties.IATA+
      "</span></h3>"+airportPoint.properties["Airport_Name"]+
      "<br><small>"+airportPoint.properties.City+"<small>",
      { opacity: 0.8 }).openTooltip();
    return airport;
  }
});
airports.addTo(map);

/**
 * Handling dep and arr URL parameters. Could be better - two codes could be handled by one request
 */
window.onload = function () {
  let url = new URL(window.location.href);
  let dep = url.searchParams.get("dep"), arr = url.searchParams.get("arr");
  let points = [];
  let where = "ICAO IN ('"+dep+"', '"+arr+"')";
  //airports.setWhere(where);
  airports.query()
    .where(where)
    .run(function(error, featureCollection){
      if( featureCollection.features.length > 0  ) {
        let coords_0 = featureCollection.features[0].geometry.coordinates,
          coords_1 = featureCollection.features[1].geometry.coordinates;
        points[0] = new L.LatLng(coords_0[1], coords_0[0]);
        points[3] = new L.LatLng(coords_1[1], coords_1[0]);
        points[1] = points[0].intermediatePointTo(points[3], 0.1);
        points[2] = points[0].intermediatePointTo(points[3], 0.9);
        let route = new L.Polyline(points, routeDefaultOptions);
        modifyPolyToRoute(route).addTo(map);
        map.fitBounds(points);
      }
    });
};

var buffer = function (poly, radius, units, onSuccess){};

require([
  "esri/geometry/webMercatorUtils",
  "dojo/domReady!"
], function(
  webMercatorUtils
) {

  function bufferImpl(latlngs, radius = 250, units = 9093, onSuccess){
    //Pull first layer from the webmap and use it as input for the buffer operation
    //Use GeometryEngine geodesicBuffer
    //buffers will have correct distance no matter what the spatial reference of the map is.

    if(radius < 1) {
      onSuccess([]);
    }

    let ring=[], points=[];
    latlngs.forEach(function(point, idx){
      ring.push([point.lat, point.lng]);
      if( idx < latlngs.length - 1 ) {
        let next = latlngs[idx+1], ip;
        for(let i=0;i<1;i+=0.1) {
          ip = point.intermediatePointTo(next, i);
          let p = [ip.lat, ip.lng];
          let m = webMercatorUtils.lngLatToXY(ip.lng, ip.lat);
          ring.push(p);
          points.push(//{
            [m[0], m[1]]
          );
        }
      }
    });

    let polylineJson = {
       "paths":[points],
       "spatialReference":{"wkid": CRS_WEB_MERCATOR}
    };

    let xhr = new XMLHttpRequest();
    let requestURL = 'https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer/buffer';
    let params = {
      f: "json",
      unit: units,
      unionResults: false,
      geodesic: true,
      geometries: JSON.stringify({"geometryType":"esriGeometryPolyline","geometries":[polylineJson]}),
      inSR: CRS_WEB_MERCATOR,
      distances: [radius],
      outSR: CRS_WEB_MERCATOR,
      bufferSR: CRS_WEB_MERCATOR
    };

    xhr.open('GET', requestURL + this._formatParams(params), true );
    // Specify the http content-type as json
    xhr.setRequestHeader('Accept', '*/*');

    // Response handlers
    let buffers = [];
    xhr.onload = function() {
      let responseText = xhr.responseText;
      let response = JSON.parse(responseText);

      response.geometries.forEach(function (geometry) {
        let points=[];
        let rings = geometry.rings;
        rings.forEach(function(ring){
          let _points = [];
          ring.forEach(function (point) {
            let m = webMercatorUtils.xyToLngLat(point[0], point[1]);
            _points.push([m[1], m[0]]);
          });
          points.push(_points);
        });

        buffers.push(new L.polygon(points,
          {
            stroke: true,
            color: color,
            weight: 2,
            opacity: 0.9,
            fill: false,
            clickable: false
          }));
      });

      onSuccess(buffers);
    };

    xhr.onerror = function() {
      console.log('There was an error!');
    };
    xhr.send();
  }

  window.buffer = bufferImpl;
});

// Weather layers
const d = new Date();
let cacheBypass = d.toJSON().split('T')[0] + '-' + (~~(d.getUTCHours() / 6) * 6).toFixed(0);
let tempLayer = L.tileLayer('https://{s}.gis.flightplandatabase.com/tile/temperature/{z}/{x}/{y}.png?c=' + cacheBypass, {
  subdomains: subdomains,
  attribution: '',
  maxNativeZoom: 10,
  opacity: 0.7
});
let windsLayer = L.tileLayer('https://{s}.gis.flightplandatabase.com/tile/winds/{z}/{x}/{y}.png?c=' + cacheBypass, {
  subdomains: subdomains,
  attribution: '',
  maxNativeZoom: 10
});
let cloudsLayer = L.tileLayer('https://{s}.gis.flightplandatabase.com/tile/clouds/{z}/{x}/{y}.png?c=' + cacheBypass, {
  subdomains: subdomains,
  attribution: '',
  maxNativeZoom: 10
});
let precipLayer = L.tileLayer('https://{s}.gis.flightplandatabase.com/tile/precip/{z}/{x}/{y}.png?c=' + cacheBypass, {
  subdomains: subdomains,
  attribution: '',
  maxNativeZoom: 10
});

L.control.layers(null, {
  "Temperature": tempLayer,
  "Clouds": cloudsLayer,
  "Precipitation": precipLayer,
  "Winds": windsLayer,
  "Nav": navLayer,
  "FIR": firBorders,
  "Airports": airports
}, {
  collapsed: false
}).addTo(map);

// Scale
L.control.scale().addTo(map, {
  maxWidth: 200
});

let corridorWidthControl = new L.Control.Slider().addTo(map);

function ensurePrecision(val, precision) {
  let str = '' + val;
  if (precision > 0) {
    let pointIdx = str.indexOf('.');
    if (pointIdx > 0) {
      str = str.padEnd(precision - (str.length - pointIdx) + 1, '0');
    } else {
      str = str + '.' + '0'.repeat(precision);
    }
  }
  return str;
}

function latLabel(lat, precision = 0, NW = true) {
  let latStr = ensurePrecision( NW ? Math.abs(lat) : lat, precision);
  return latStr + (NW?(lat < 0 ? "S" : "N") : "°");
}

function lngLabel(lng, precision = 0, NW = true) {
  let lngStr = ensurePrecision(NW ? Math.abs(lng) : lng, precision);
  return lngStr + (NW?(lng < 0 ? "W" : "E") : "°");
}

function pointLatLngLabel(point, precision = 3, NW = true) {
  let lat = latLabel(_round(point.lat, precision), NW);
  let lng = lngLabel(_round(point.lng, precision), NW);
  return lat +(NW?"":":")+ lng;
}

// current location
map.on('mousemove', function(event){
  document.getElementById("currentloc").innerHTML = pointLatLngLabel(event.latlng);
});
map.on('mouseout', function(){
  document.getElementById("currentloc").innerHTML = "";
});

// FeatureGroup is to store editable layers
let drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
  draw : {
    polygon: false,
    marker: false,
    rectangle: false,
    circle: false,
    circlemarker: false,
    polyline: {
      shapeOptions: routeDefaultOptions
    }
  },
  edit: {
    featureGroup: drawnItems,
    remove: false,
    edit: false
  }
});
map.addControl(drawControl);

// Truncate value based on number of decimals
let _round = function(num, len) {
  return Math.round(num*(Math.pow(10, len)))/(Math.pow(10, len));
};

// Generate popup content based on layer type
// - Returns HTML string, or null if unknown object
let getPopupContent = function(layer) {
  if (layer instanceof L.Polyline) {
    let latlngs = layer._defaultShape ? layer._defaultShape() : layer.getLatLngs(),
      distance = 0;
    if (latlngs.length < 2) {
      return "Distance: N/A";
    } else {
      for (let i = 0; i < latlngs.length-1; i++) {
        distance += latlngs[i].distanceTo(latlngs[i+1]);
      }
      return "Distance: "+_round(distance/1000, 2)+" km (" + _round(distance * 0.539957 / 1000, 2) + "NM)" +
        "<br><sub>Click to copy waypoints into clipboard</sub>";
    }
  }
  return null;
};

function resetTooltip(layer) {
  let content = getPopupContent(layer);
  if (content !== null) {
    layer.bindTooltip(content);
  }

  if (layer instanceof L.Polyline) {
    resetHeadings(layer);
    resetWaypointLabels(layer);
  }

  return content;
}

function resetHeadings(layer) {
  let headings = layer.editing.headings || [];
  let svg = map._renderer._container;
  headings.forEach(function(heading) {
    svg.removeChild(heading);
  });
  headings = [];
  let latlngs = layer.getLatLngs();
  latlngs.forEach(function(point, idx){
    if(idx===latlngs.length - 1) {
      return;
    }

    let next = latlngs[idx+1];
    let currPnt = map.latLngToLayerPoint(point), nextPnt = map.latLngToLayerPoint(next);
    if( currPnt.distanceTo(nextPnt) < 120 ) {
      // points to close one to each other with current zoom, skip to next iteration
      return;
    }

    let headingLoc = point.intermediatePointTo(next, 0.2);
    let headingLocAngleAnchor = point.intermediatePointTo(next, 0.275);

    let distance = point.distanceTo(next);
    let bearing = L.GeometryUtil.bearing(point, next);
    if(bearing<0) {
      bearing += 360;
    }
    let angle = L.GeometryUtil.angle(map, headingLoc, headingLocAngleAnchor) - 90;
    let text = (""+Math.round(bearing)).padStart(3,'0') + "° "+_round(distance * 0.539957 / 1000, 2) +"NM";

    let textNode = L.SVG.create('text'),
      rect = L.SVG.create('rect'),
      g = L.SVG.create('g');

    textNode.appendChild(document.createTextNode(text));
    textNode.setAttribute('font-size', '11px');
    textNode.setAttribute('y', '4');

    rect.setAttribute("width", "96px");
    rect.setAttribute("height", "16px");
    rect.setAttribute("fill", "white");
    rect.setAttribute("stroke", color);
    rect.setAttribute("stroke-width", "2");
    rect.setAttribute("rx", "8");
    rect.setAttribute("ry", "8");
    rect.setAttribute("y", "-8");

    if(angle>90) {
      angle-=180;
      textNode.setAttribute('x', '-93');
      rect.setAttribute("x", "-98");
    } else {
      textNode.setAttribute('x', '-3');
      rect.setAttribute("x", "-8");
    }

    g.appendChild(rect);
    g.appendChild(textNode);
    headingLoc = map.latLngToLayerPoint(headingLoc);
    g.setAttribute('transform', 'translate('+headingLoc.x+' '+headingLoc.y+') rotate('+angle+')');
    svg.appendChild(g);
    headings.push(g);
  });
  layer.editing.headings = headings;
}

function resetWaypointLabels(layer) {
  let waypointLabels = layer.editing.waypointLabels || [];
  let svg = map._renderer._container;
  waypointLabels.forEach(function(label) {
    svg.removeChild(label);
  });
  waypointLabels = [];
  let latlngs = layer.getLatLngs();

  function coordLabelNode(node, coord) {
    node.appendChild(document.createTextNode(coord.padStart(7, '0')));
    node.setAttribute('font-size', '10px');
    node.setAttribute('x', '2');
    return node;
  }

  latlngs.forEach(function(point, idx){
    let currPnt = map.latLngToLayerPoint(point);
    currPnt.y -= 36;

    // rotate point where label will be placed in order to place it "outside" of the route turns
    if( idx < latlngs.length - 1 ) {
      let next = latlngs[idx+1];
      let nb = L.GeometryUtil.bearing(point, next);
      if( nb < 0) {
        nb += 360;
      }
      if( idx > 0 ) {
        let pb = L.GeometryUtil.bearing(point, latlngs[idx-1]);
        if( pb < 0) {
          pb += 360;
        }
        let bearing;
        let bd = nb - pb;
        if( bd < 0 ) {
          bearing = bd >- 180 ? nb - (360 + bd) / 2 : nb - bd / 2;
        } else {
          bearing = bd > 180 ? pb + bd / 2 : pb - (360 - bd) / 2;
        }

        currPnt = map.latLngToLayerPoint(L.GeometryUtil.rotatePoint(map, map.layerPointToLatLng(currPnt), bearing, point));
      } else {
        // route start
        currPnt = map.latLngToLayerPoint(L.GeometryUtil.rotatePoint(map, map.layerPointToLatLng(currPnt), nb - 180, point));
      }
    } else {
      // route end
      let _pb = L.GeometryUtil.bearing(point, latlngs[idx-1]);
      if( _pb < 0) {
        _pb += 360;
      }
      currPnt = map.latLngToLayerPoint(L.GeometryUtil.rotatePoint(map, map.layerPointToLatLng(currPnt), _pb - 180, point));
    }

    let textNode = L.SVG.create('text'),
      latNode = L.SVG.create('tspan'),
      lngNode = L.SVG.create('tspan'),
      flNode = L.SVG.create('tspan'),
      rect = L.SVG.create('rect'),
      g = L.SVG.create('g');

    coordLabelNode(latNode, latLabel(_round(point.lat, 2), 2)).setAttribute('y', '11');
    coordLabelNode(lngNode, lngLabel(_round(point.lng, 2), 2)).setAttribute('y', '22');

    flNode.appendChild(document.createTextNode((''+Math.round(point.alt)).padStart(3, '0')));
    flNode.setAttribute('writing-mode','tb');
    flNode.setAttribute('glyph-orientation-vertical','90');
    flNode.setAttribute('font-size', '10px');
    flNode.setAttribute('font-weight', 'bold');
    flNode.setAttribute('letter-spacing', '1');
    flNode.setAttribute('y', '4');
    flNode.setAttribute('x', '47');

    textNode.appendChild(latNode);
    textNode.appendChild(lngNode);
    textNode.appendChild(flNode);

    textNode.setAttribute('x', '0');
    textNode.setAttribute('y', '0');

    rect.setAttribute("width", "55px");
    rect.setAttribute("height", "26px");
    rect.setAttribute("fill", "white");
    rect.setAttribute("stroke", color);
    rect.setAttribute("stroke-width", "2");
    rect.setAttribute("rx", "4");
    rect.setAttribute("ry", "4");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");


    g.appendChild(rect);
    g.appendChild(textNode);
    g.setAttribute('transform', 'translate('+(currPnt.x-27)+' '+(currPnt.y-13)+')');
    svg.appendChild(g);
    waypointLabels.push(g);
  });
  layer.editing.waypointLabels = waypointLabels;
}

function modifyPolyToRoute(layer) {
  profile.fire('path:created', layer);
  resetTooltip(layer);
  layer.editing.enable();
  addRouteCorridor(layer);
  layer.on('edit', function () {
    resetTooltip(layer);
    profile.fire('path:edited', layer);
    resetBuffer(layer);
  });
  layer.on('editdrag', function () {
    resetHeadings(layer);
    resetWaypointLabels(layer);
    profile.fire('path:edited', layer);
    resetBuffer(layer);
  });
  layer.on('click', function () {
    map.fire('path:clicked', layer);
    profile.fire('path:clicked', layer);
  });
  layer.on('profile:edited', function () {
    resetWaypointLabels(layer);
  });
  drawnItems.addLayer(layer);
  return layer;
}

function addRouteCorridor(route) {
  buffer(route.getLatLngs(), corridorWidthControl.noUiSlider.get(), corridorWidthControl.noUiSlider.units, function (corridorGeoms) {
    let corridorMapObjects = [];
    corridorGeoms.forEach(function(geom){
      corridorMapObjects.push(geom.addTo(map));
    });
    route.editing.corridor = corridorMapObjects;
    corridorWidthControl.noUiSlider.on('set', function() {
      resetBuffer(route);
    });
  });
}

resetBuffer = debounce(function (route) {
  let radius = corridorWidthControl.noUiSlider.get();
  let units = corridorWidthControl.noUiSlider.units;
  if( radius < 1 ) {
    route.editing.corridor.forEach(function (geom) {
      map.removeLayer(geom);
    });
    route.editing.corridor = [];
  } else {
    try {
      buffer(route.getLatLngs(), radius, units, function (newBuffer) {
        let newMapObjects = [];
        newBuffer.forEach(function (geom) {
          newMapObjects.push(geom.addTo(map));
        });
        route.editing.corridor.forEach(function (geom) {
          map.removeLayer(geom);
        });
        route.editing.corridor = newMapObjects;
      });
    } catch (e) {
      console.log("Error while buffering " + e);
    }
  }
}, 100);

// Object created - bind popup to layer, add to feature group
map.on(L.Draw.Event.CREATED, function(event) {
  modifyPolyToRoute(event.layer);
});

map.on('zoom resize viewreset profile:edited', function() {
  drawnItems.eachLayer(function (layer) {
    if (layer instanceof L.Polyline) {
      resetHeadings(layer);
      resetWaypointLabels(layer);
    }
  });
});

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    let context = this, args = arguments;
    let later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    let callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function _formatParams( params ){
  return "?" + Object
    .keys(params)
    .map(function(key){
      return key+"="+encodeURIComponent(params[key])
    })
    .join("&")
}