// The demo pair. Both are made up.
//
// Route 1 (SAMPLE_ROUTE) is what the user runs: a drive across Austin
// (downtown → I-35 N → Mueller), shaped like a Google Routes API computeRoutes
// response so it exercises the same parsing as a real one. Distances and
// durations are consistent with the paths.
//
// Route 2 (DEMO_TRAFFIC_ROUTE) is internal: an east–west crossing that cuts
// I-35 at 30.2935 N, about halfway along route 1. It's held permanently at the
// lowest layer, so route 1 has to climb over it there and come back down.

export const DEMO_TRAFFIC_ROUTE = {
  routes: [
    {
      polyline: {
        geoJsonLinestring: {
          type: 'LineString',
          coordinates: [
            [-97.74, 30.2935],
            [-97.7325, 30.2935],
            [-97.7255, 30.2935],
            [-97.718, 30.2935],
            [-97.71, 30.2935],
          ],
        },
      },
    },
  ],
};

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
