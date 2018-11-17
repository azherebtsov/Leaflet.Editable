# Flight route builder

Visual flight route builder.

##NOT FOR PRODUCTION USE IN ANY AIRLINE OPERATIONS  ! ! !

This is a minimal, lightweight, and far from ready-to-use route planner. This is a kind of PoC tool to check how far you can go without backend.

See the [demo UI](https://azherebtsov.github.io/Leaflet.FlightPlanner/example/flight-planner.html).


Design keys:

- Uses [Leaflet](https://github.com/Leaflet/Leaflet) and some its plugins (see the code)
- No back end (except tile providers) 
- Layers - Airports, FIRs, Weather, NAV
- Great circle waypoint connections
- Editable route
- Heading labels
- Waypoint labels, adaptive location
- Editable vertical profile
- Path waypoints in ARINC format are copied to clipboard after click on the route

## Install

Just copy sources JS into into your project, sample html in example/flight-planner.html

#License
This software is released under the WTFPL licence.