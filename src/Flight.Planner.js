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

  L.FlightPlanner = L.Evented.extend({

    onPolyLineClicked: function(layer) {
      if( layer.getLatLngs != undefined ) {
        var wpts = waypoints(layer.getLatLngs());
        clipboardCopy(wpts);
        window.localStorage.setItem('flight.planner.selected.waypoints', wpts);
      }
    },
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

  L.Map.addInitHook(function () {

    this.whenReady(function () {
      this.flightPlanner = new this.options.flightPlannerClass(this, this.options.flightPlannerOptions);

      this.on('path:clicked', this.flightPlanner.onPolyLineClicked);
    });

  });


  function waypoints(latlngs) {
    var x2js = new X2JS();
    var points=[];
    latlngs.forEach(function (point, idx) {
        var waypoint = {
          _sequenceId: idx + 1,
          Coordinates: {
            _latitude: Math.round(point.lat * 3600),
            _longitude: Math.round(point.lng * 3600)
          }
        };
        points.push(waypoint);
      }
    );

    var root = {
      Waypoints : {
        Waypoint : points
      }
    };
    return x2js.json2xml_str(root)
  }

}, window));