// The demo routes. All are made up.
//
// Route 1 (SAMPLE_ROUTE) is what the user runs: a drive across Austin
// (downtown → I-35 N → Mueller), shaped like a Google Routes API computeRoutes
// response so it exercises the same parsing as a real one. Distances and
// durations are consistent with the paths.
//
// DEMO_TRAFFIC is internal: routes held permanently in the airspace grid, each
// placed to show route 1 reacting to traffic in a different way. None starts or
// ends near route 1's takeoff or landing, so route 1 always has a way through.

const line = (coordinates: [number, number][]) => ({
  routes: [{ polyline: { geoJsonLinestring: { type: 'LineString', coordinates } } }],
});

export type DemoTraffic = {
  id: string;
  route: unknown;
  // Defaults to the lowest layer for the route's direction.
  layerAglFt?: number;
};

export const DEMO_TRAFFIC: DemoTraffic[] = [
  // Crosses I-35 about halfway along route 1: route 1 climbs over it.
  {
    id: 'demo-traffic',
    route: line([
      [-97.74, 30.2935],
      [-97.7325, 30.2935],
      [-97.7255, 30.2935],
      [-97.718, 30.2935],
      [-97.71, 30.2935],
    ]),
  },
  // Crosses Congress Ave ~0.6 km after route 1 takes off: an early climb.
  {
    id: 'demo-traffic-congress',
    route: line([
      [-97.752, 30.268],
      [-97.7434, 30.268],
      [-97.736, 30.268],
    ]),
  },
  // Just north of the I-35 crossing, one layer up. With the crossing at 150 ft,
  // route 1 has to reach 250 ft to clear both.
  {
    id: 'demo-traffic-stacked',
    layerAglFt: 200,
    route: line([
      [-97.74, 30.2955],
      [-97.7247, 30.2955],
      [-97.71, 30.2955],
    ]),
  },
  // Rides I-35 northbound right where route 1 does, then carries on north:
  // route 1 holds 200 ft for the whole shared stretch.
  {
    id: 'demo-traffic-i35',
    route: line([
      [-97.7228, 30.3],
      [-97.7203, 30.306],
      [-97.7184, 30.3105],
      [-97.7165, 30.315],
      [-97.7148, 30.3195],
    ]),
  },
  // Crosses E 51st St shortly before route 1 lands: climb and descend late.
  {
    id: 'demo-traffic-51st',
    route: line([
      [-97.708, 30.302],
      [-97.708, 30.3105],
      [-97.708, 30.318],
    ]),
  },
];

export const SAMPLE_ROUTE =
{
  "routes": [
    {
      "legs": [
        {
          "distanceMeters": 9526,
          "duration": "720s",
          "staticDuration": "643s",
          "polyline": {
            "encodedPolyline": "wquwDzyqsQoP_DwQsDwQsDkMkC~CoPrDoP~CgOcVkHcVwGoPsDod@gJsg@sNsg@{Ood@sNc[{JkMoFoFoFvLg^bL_]rIgYzTzEzTzE"
          },
          "startLocation": {
            "latLng": {
              "latitude": 30.2622,
              "longitude": -97.7451
            }
          },
          "endLocation": {
            "latLng": {
              "latitude": 30.301,
              "longitude": -97.7042
            }
          },
          "steps": [
            {
              "distanceMeters": 1274,
              "staticDuration": "114s",
              "polyline": {
                "encodedPolyline": "wquwDzyqsQoP_DwQsDwQsDkMkC"
              },
              "startLocation": {
                "latLng": {
                  "latitude": 30.2622,
                  "longitude": -97.7451
                }
              },
              "endLocation": {
                "latLng": {
                  "latitude": 30.2733,
                  "longitude": -97.7418
                }
              },
              "navigationInstruction": {
                "maneuver": "DEPART",
                "instructions": "Head north on Congress Ave toward W 3rd St"
              },
              "localizedValues": {
                "distance": {
                  "text": "0.8 mi"
                },
                "staticDuration": {
                  "text": "2 mins"
                }
              },
              "travelMode": "DRIVE"
            },
            {
              "distanceMeters": 835,
              "staticDuration": "75s",
              "polyline": {
                "encodedPolyline": "cwwwDfeqsQ~CoPrDoP~CgO"
              },
              "startLocation": {
                "latLng": {
                  "latitude": 30.2733,
                  "longitude": -97.7418
                }
              },
              "endLocation": {
                "latLng": {
                  "latitude": 30.2708,
                  "longitude": -97.7336
                }
              },
              "navigationInstruction": {
                "maneuver": "TURN_RIGHT",
                "instructions": "Turn right onto E 11th St"
              },
              "localizedValues": {
                "distance": {
                  "text": "0.5 mi"
                },
                "staticDuration": {
                  "text": "1 min"
                }
              },
              "travelMode": "DRIVE"
            },
            {
              "distanceMeters": 869,
              "staticDuration": "65s",
              "polyline": {
                "encodedPolyline": "ogwwD~qosQcVkHcVwG"
              },
              "startLocation": {
                "latLng": {
                  "latitude": 30.2708,
                  "longitude": -97.7336
                }
              },
              "endLocation": {
                "latLng": {
                  "latitude": 30.2782,
                  "longitude": -97.7307
                }
              },
              "navigationInstruction": {
                "maneuver": "TURN_LEFT",
                "instructions": "Turn left onto N Interstate 35 Frontage Rd"
              },
              "localizedValues": {
                "distance": {
                  "text": "0.5 mi"
                },
                "staticDuration": {
                  "text": "1 min"
                }
              },
              "travelMode": "DRIVE"
            },
            {
              "distanceMeters": 323,
              "staticDuration": "29s",
              "polyline": {
                "encodedPolyline": "wuxwDz_osQoPsD"
              },
              "startLocation": {
                "latLng": {
                  "latitude": 30.2782,
                  "longitude": -97.7307
                }
              },
              "endLocation": {
                "latLng": {
                  "latitude": 30.281,
                  "longitude": -97.7298
                }
              },
              "navigationInstruction": {
                "maneuver": "RAMP_LEFT",
                "instructions": "Take the ramp onto I-35 N"
              },
              "localizedValues": {
                "distance": {
                  "text": "0.2 mi"
                },
                "staticDuration": {
                  "text": "1 min"
                }
              },
              "travelMode": "DRIVE"
            },
            {
              "distanceMeters": 3460,
              "staticDuration": "129s",
              "polyline": {
                "encodedPolyline": "ggywDfznsQod@gJsg@sNsg@{Ood@sNc[{J"
              },
              "startLocation": {
                "latLng": {
                  "latitude": 30.281,
                  "longitude": -97.7298
                }
              },
              "endLocation": {
                "latLng": {
                  "latitude": 30.3105,
                  "longitude": -97.7184
                }
              },
              "navigationInstruction": {
                "maneuver": "MERGE",
                "instructions": "Merge onto I-35 N"
              },
              "localizedValues": {
                "distance": {
                  "text": "2.1 mi"
                },
                "staticDuration": {
                  "text": "2 mins"
                }
              },
              "travelMode": "DRIVE"
            },
            {
              "distanceMeters": 457,
              "staticDuration": "29s",
              "polyline": {
                "encodedPolyline": "s__xD~rlsQkMoFoFoF"
              },
              "startLocation": {
                "latLng": {
                  "latitude": 30.3105,
                  "longitude": -97.7184
                }
              },
              "endLocation": {
                "latLng": {
                  "latitude": 30.314,
                  "longitude": -97.716
                }
              },
              "navigationInstruction": {
                "maneuver": "RAMP_RIGHT",
                "instructions": "Take exit 237A toward 51st St"
              },
              "localizedValues": {
                "distance": {
                  "text": "0.3 mi"
                },
                "staticDuration": {
                  "text": "1 min"
                }
              },
              "travelMode": "DRIVE"
            },
            {
              "distanceMeters": 1501,
              "staticDuration": "112s",
              "polyline": {
                "encodedPolyline": "ou_xD~clsQvLg^bL_]rIgY"
              },
              "startLocation": {
                "latLng": {
                  "latitude": 30.314,
                  "longitude": -97.716
                }
              },
              "endLocation": {
                "latLng": {
                  "latitude": 30.308,
                  "longitude": -97.702
                }
              },
              "navigationInstruction": {
                "maneuver": "TURN_RIGHT",
                "instructions": "Turn right onto E 51st St"
              },
              "localizedValues": {
                "distance": {
                  "text": "0.9 mi"
                },
                "staticDuration": {
                  "text": "2 mins"
                }
              },
              "travelMode": "DRIVE"
            },
            {
              "distanceMeters": 807,
              "staticDuration": "90s",
              "polyline": {
                "encodedPolyline": "_p~wDnlisQzTzEzTzE"
              },
              "startLocation": {
                "latLng": {
                  "latitude": 30.308,
                  "longitude": -97.702
                }
              },
              "endLocation": {
                "latLng": {
                  "latitude": 30.301,
                  "longitude": -97.7042
                }
              },
              "navigationInstruction": {
                "maneuver": "TURN_RIGHT",
                "instructions": "Turn right onto Aldrich St. Destination will be on the right"
              },
              "localizedValues": {
                "distance": {
                  "text": "0.5 mi"
                },
                "staticDuration": {
                  "text": "2 mins"
                }
              },
              "travelMode": "DRIVE"
            }
          ],
          "localizedValues": {
            "distance": {
              "text": "5.9 mi"
            },
            "duration": {
              "text": "12 mins"
            },
            "staticDuration": {
              "text": "11 mins"
            }
          }
        }
      ],
      "distanceMeters": 9526,
      "duration": "720s",
      "staticDuration": "643s",
      "polyline": {
        "encodedPolyline": "wquwDzyqsQoP_DwQsDwQsDkMkC~CoPrDoP~CgOcVkHcVwGoPsDod@gJsg@sNsg@{Ood@sNc[{JkMoFoFoFvLg^bL_]rIgYzTzEzTzE"
      },
      "description": "I-35 N",
      "viewport": {
        "low": {
          "latitude": 30.2622,
          "longitude": -97.7451
        },
        "high": {
          "latitude": 30.314,
          "longitude": -97.702
        }
      },
      "travelAdvisory": {},
      "localizedValues": {
        "distance": {
          "text": "5.9 mi"
        },
        "duration": {
          "text": "12 mins"
        },
        "staticDuration": {
          "text": "11 mins"
        }
      },
      "routeLabels": [
        "DEFAULT_ROUTE"
      ],
      "polylineDetails": {}
    }
  ]
}
;
