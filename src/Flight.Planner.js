'use strict';
(function (factory, window) {
  /*globals define, module, require*/

  // define an AMD module that relies on 'leaflet'
  if (typeof define === 'function' && define.amd) {
    define(['leaflet','editable'], factory);
    // define a Common JS module that relies on 'xml-js'
  } else if (typeof exports === 'object') {
    module.exports = factory(require(['leaflet','editable']));
  }

  // attach your plugin to the global 'L' variable
  if(typeof window !== 'undefined' && window.L){
    factory(window.L);
  }

}(function (L) {

  const CRUISE_LEVEL = 340;
  const LEVELS = [0, 50, 100, 180, 220, 260, 300, 340, 400];

  L.FlightPlanner = L.Evented.extend({

    onPolyLineClicked: function(layer) {
      if( layer.getLatLngs() !== undefined ) {
        var wpts = waypoints(layer.getLatLngs());
        clipboardCopy(wpts);
        window.localStorage.setItem('flight.planner.selected.waypoints', wpts);
        layer._map._container.setAttribute('data', wpts);
      }
    },
    onPathCreatedForProfile: function (layer, reset = true) {
      if( layer.getLatLngs() !== undefined && layer.getLatLngs().length > 1 ) {
        var map = this;
        var height = map.getContainer().clientHeight;
        var width = map.getContainer().clientWidth;
        var latlngs = layer.getLatLngs();

        if( reset ) {
          var ratio = height * latlngs.length / (width * CRUISE_LEVEL);
          // Recreate everything from scratch
          var wpts = [];

          latlngs.forEach(function (point, idx) {
            // build profile chart
            if (point.alt === undefined) {
              if (idx !== 0 && idx < latlngs.length - 1) {
                point.alt = CRUISE_LEVEL;
              } else {
                point.alt = 0;
              }
            }
            var x = idx;
            if (idx > 0) {
              var distance = 0;
              for (var i = 0; i < latlngs.length - 1; i++) {
                distance += latlngs[i].distanceTo(latlngs[i + 1]);
              }
              x = wpts[idx - 1].lng + latlngs.length * latlngs[idx - 1].distanceTo(latlngs[idx]) / distance;
            }
            var latlng = xy(x, point.alt * ratio);
            wpts.push(latlng);
          });
          var profile = L.polyline(wpts).addTo(map);
          profile.editing.disable();

          LEVELS.forEach(function (level) {
            // levels lines on profile map
            addLevelBaseline(map, level, level * ratio);
          });

          this.setMaxBounds([
            [-CRUISE_LEVEL * ratio / 10, -1],
            [CRUISE_LEVEL * ratio * 2, wpts.length + 2]
          ]);
          this.fitBounds(profile.getBounds());

          profile.on('edit', function () {
            // set altitude value for the points on route map
            latlngs.forEach(function (point, idx) {
                point.alt = wpts[idx].lat / ratio;
              }
            );
            layer.fire('profile:edited', profile);
          });

          profile.snapediting = new L.Handler.PolylineSnap(this, profile, {
            snapDistance: 15, // in pixels
            snapVertices: true
          });
          profile.snapediting.addGuideLayer(levelBaselines);
          profile.editing.newVertexEnabled = false;
          profile.editing.deleteVertexEnabled = false;
          profile.snapediting.enable();

          this.flightPlanner.profile = profile;
        } else {
          // Only updates
          var _profile = this.flightPlanner.profile;
          var _wpts = _profile.getLatLngs();
          latlngs.forEach(function (point, idx) {
            var x = idx;
            if (idx > 0) {
              var distance = 0;
              for (var i = 0; i < latlngs.length - 1; i++) {
                distance += latlngs[i].distanceTo(latlngs[i + 1]);
              }
              x = _wpts[idx - 1].lng + latlngs.length * latlngs[idx - 1].distanceTo(latlngs[idx]) / distance;
            }
            _wpts[idx].lng = x;
          });
          _profile.snapediting.disable();
          _profile.redraw();
          _profile.snapediting.enable();
        }
      }
    },

    onPathEditedForProfile: function (layer) {
      var reset = this.flightPlanner.profile && this.flightPlanner.profile.getLatLngs()
        && layer.getLatLngs() && layer.getLatLngs().length !== this.flightPlanner.profile.getLatLngs().length;
      if( reset ) {
        this.eachLayer(function (layer) {
          this.removeLayer(layer);
        }, this);
        levelBaselines = new L.FeatureGroup();
      }
      this.flightPlanner.onPathCreatedForProfile.call(this, layer, reset);
    }
  });

  L.extend(L.FlightPlanner, {});

  L.Map.mergeOptions({

    // 🍂namespace Map
    // 🍂section Map Options
    // 🍂option editToolsClass: class = L.Editable
    // Class to be used as vertex, for path editing.
    flightPlannerClass: L.FlightPlanner,

    // 🍂option editOptions: hash = {}
    // Options to pass to L.Editable when instantiating.
    flightPlannerOptions: {}

  });

  var levelBaselines = new L.FeatureGroup();

  function addLevelBaseline(map, level, y) {
    var baseline = L.polyline([[y, -1000], [y, 1000]],
      {
        color: '#BBAABB',
        weight: 1
      });
    baseline.addTo(map);
    var levelStr = "FL" + level;
    baseline.setText(levelStr.padEnd(150),
      {
        repeat: true,
        offset: -1,
        attributes: {'font-weight': 'bold', 'font-size': '8', fill: "#BBAABB"}
      });
    levelBaselines.addLayer(baseline);
  }

  L.Map.addInitHook(function () {

    this.whenReady(function () {
      this.flightPlanner = new this.options.flightPlannerClass(this, this.options.flightPlannerOptions);

      if( !this.options.profile ) {
        this.on('path:clicked', this.flightPlanner.onPolyLineClicked);
      } else {
        // profile map
        this.on('path:created', this.flightPlanner.onPathCreatedForProfile);
        this.on('path:edited', this.flightPlanner.onPathEditedForProfile);
      }
    });

  });


  function waypoints(latlngs) {
    var x2js = new X2JS();
    var points=[];
    var distance = 0;
    for (var i = 0; i < latlngs.length - 1; i++) {
      distance += latlngs[i].distanceTo(latlngs[i + 1]);
    }
    distance *= 0.539957 / 1000;
    latlngs.forEach(function (point, idx) {
        distance = Math.round(distance * 1000) / 1000;
        var gd = Math.round((idx > 0 ? latlngs[idx-1].distanceTo(point) : 0) * 0.539957) / 1000;
        var rd = idx < latlngs.length - 1 ? Math.round((distance - gd)*1000) / 1000 : 0;
        var waypoint = {
          _sequenceId: idx + 1,
          Coordinates: {
            _latitude: Math.round(point.lat * 3600),
            _longitude: Math.round(point.lng * 3600)
          },
          Altitude: {
            EstimatedAltitude: {
              Value: {
                _unit: "ft/100",
                __text: Math.round(point.alt)
              }
            }
          },
          GroundDistance: {
            Value: {
              _unit: "NM",
              __text: gd
            }
          },
          AirDistance: {
            Value: {
              _unit: "NM",
              __text: gd
            }
          },
          RemainingGroundDistance: {
            Value: {
              _unit: "NM",
              __text: rd
            }
          },
          RemainingAirDistance: {
            Value: {
              _unit: "NM",
              __text: rd
            }
          }
        };

        /*if( idx < latlngs.length - 1 ) {
          var bearing = L.GeometryUtil.bearing(point, latlngs[idx+1]);
          if(bearing<0) {
            bearing += 360;
          }
          waypoint['Track'] = {
            OutboundTrack: {
              Value: {
                _type: "true",
                  __text: bearing
              }
            }
          };
        }*/

        points.push(waypoint);

        distance -= gd;
      }
    );

    var root = {
      Waypoints : {
        Waypoint : points
      }
    };
    return x2js.json2xml_str(root)
  }

  var yx = L.latLng;

  var xy = function(x, y) {
    if (L.Util.isArray(x)) {    // When doing xy([x, y]);
      return yx(x[1], x[0]);
    }
    return yx(y, x);  // When doing xy(x, y);
  };

}, window));