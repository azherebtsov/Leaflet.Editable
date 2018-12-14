# Flight route builder

Visual flight route builder.

## ! ! ! NOT FOR PRODUCTION USE IN ANY AIRLINE OPERATIONS ! ! !

This is a minimal, lightweight, and far from ready-to-use route planner. This is a kind of PoC tool to check how far you can go without backend.

See the [demo UI](https://azherebtsov.github.io/Leaflet.FlightPlanner/example/flight-planner.html).


Design keys:

- Uses [Leaflet](https://github.com/Leaflet/Leaflet) and some its plugins (see the code)
- No back end (except tile providers) 
- Layers - Airports (Clustered), FIRs, Weather, SIGMET, NAV
- Airport METARs and decoded TAFs
- Great circle waypoint connections
- Editable route
- Heading labels
- Waypoint labels, adaptive location
- Editable vertical profile
- Surface elevation profile
- Path waypoints in ARINC format are copied to clipboard after click on the route
- URL parameters "dep" and "arr" creates trivial route connecting two stations. Values must be valid ICAO airport codes (unfortunately list of codes is not current) 
- Flight route corridors, width defined in NM or KM
- Route creation based on ICAO flight plan - just 'paste' flight plan in ICAO format

## Install

Just copy sources JS into into your project, sample html in example/flight-planner.html

# License
This software is released under the WTFPL licence.
