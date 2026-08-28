// Generated from fes-source-sample.mjs by prepareFesDataset.
// Do not hand-edit; the preparation equality test enforces reproducibility.
export const fesPreparedSample = Object.freeze(
{
  "schema": "tide-here/fes-prepared-dataset/v1",
  "dataset": {
    "id": "fes-shaped-global-sample",
    "version": "2026-08-27",
    "schema": "tide-here/fes-prepared-dataset/v1",
    "preparedAt": "2026-08-27T18:00:00.000Z",
    "displayName": "Synthetic FES-shaped Stage 4 fixture",
    "dataClass": "test-fixture",
    "model": "Synthetic FES-shaped harmonic fixture with one TICON-3 validation point",
    "isFes2022": false,
    "attribution": "Synthetic Tide Here fixture; the Brest point is TICON-3 data from the official PyFES example. No FES2022 atlas values are included.",
    "sourceUrl": "https://cnes.github.io/aviso-fes/auto_examples/ex_constituents_prediction.html",
    "licenceReference": "No FES2022 licence applies to this synthetic fixture.",
    "engine": "@neaps/tide-predictor 0.11.0 with Schureman nodal corrections"
  },
  "tileIndex": {
    "schema": "tide-here/fes-tile-index/v1",
    "dataset": {
      "id": "fes-shaped-global-sample",
      "version": "2026-08-27"
    },
    "inventory": [
      {
        "id": "europe-west",
        "objectName": "tile-europe-west",
        "bounds": {
          "south": 48.25,
          "west": -4.65,
          "north": 48.55,
          "east": -4.3
        },
        "maximumDistanceKm": 20,
        "pointCount": 1,
        "bytes": 3044,
        "sha256": "aa1f65b751a00730657a345494607cf88eea72fd1d95e1468212f81242c323ec"
      },
      {
        "id": "north-atlantic",
        "objectName": "tile-north-atlantic",
        "bounds": {
          "south": 52.9,
          "west": -9.4,
          "north": 53.5,
          "east": -8.7
        },
        "maximumDistanceKm": 40,
        "pointCount": 1,
        "bytes": 3152,
        "sha256": "46fbf87ab1d02ca52c4163c50377eab29e19a6c45d83d5dd474e42227b9fa9ba"
      },
      {
        "id": "south-atlantic",
        "objectName": "tile-south-atlantic",
        "bounds": {
          "south": -34.2,
          "west": 18.1,
          "north": -33.6,
          "east": 18.8
        },
        "maximumDistanceKm": 40,
        "pointCount": 1,
        "bytes": 3267,
        "sha256": "9ced8f9d792d481dda721d2e73b4240271417b85b50b36d81cad2110ae2c9cc5"
      }
    ]
  },
  "tiles": {
    "tile-europe-west": {
      "schema": "tide-here/harmonic-tile/v1",
      "dataset": {
        "id": "fes-shaped-global-sample",
        "version": "2026-08-27",
        "schema": "tide-here/fes-prepared-dataset/v1",
        "preparedAt": "2026-08-27T18:00:00.000Z",
        "displayName": "Synthetic FES-shaped Stage 4 fixture",
        "dataClass": "test-fixture",
        "model": "Synthetic FES-shaped harmonic fixture with one TICON-3 validation point",
        "isFes2022": false,
        "attribution": "Synthetic Tide Here fixture; the Brest point is TICON-3 data from the official PyFES example. No FES2022 atlas values are included.",
        "sourceUrl": "https://cnes.github.io/aviso-fes/auto_examples/ex_constituents_prediction.html",
        "licenceReference": "No FES2022 licence applies to this synthetic fixture.",
        "engine": "@neaps/tide-predictor 0.11.0 with Schureman nodal corrections"
      },
      "tile": {
        "id": "europe-west",
        "bounds": {
          "south": 48.25,
          "west": -4.65,
          "north": 48.55,
          "east": -4.3
        },
        "points": [
          {
            "id": "brest-ticon3-stage-four",
            "name": "Brest Stage 4 validation point",
            "latitude": 48.383,
            "longitude": -4.495,
            "timeZone": "Europe/Paris",
            "maximumDistanceKm": 20,
            "datum": "relative harmonic datum from TICON-3 fixture",
            "units": "cm",
            "water": true,
            "constituents": [
              {
                "name": "M2",
                "amplitude": 205.113,
                "phase": 109.006
              },
              {
                "name": "K1",
                "amplitude": 6.434,
                "phase": 75.067
              },
              {
                "name": "N2",
                "amplitude": 41.695,
                "phase": 90.633
              },
              {
                "name": "O1",
                "amplitude": 6.587,
                "phase": 327.857
              },
              {
                "name": "P1",
                "amplitude": 2.252,
                "phase": 63.658
              },
              {
                "name": "Q1",
                "amplitude": 2.04,
                "phase": 281.362
              },
              {
                "name": "K2",
                "amplitude": 21.361,
                "phase": 145.892
              },
              {
                "name": "S2",
                "amplitude": 74.876,
                "phase": 148.283
              },
              {
                "name": "S1",
                "amplitude": 0.797,
                "phase": 11.441
              },
              {
                "name": "SA",
                "amplitude": 4.905,
                "phase": 322.761
              },
              {
                "name": "T2",
                "amplitude": 4.171,
                "phase": 138.535
              },
              {
                "name": "MF",
                "amplitude": 1.031,
                "phase": 175.663
              },
              {
                "name": "MM",
                "amplitude": 0.425,
                "phase": 199.741
              },
              {
                "name": "2N2",
                "amplitude": 5.699,
                "phase": 72.786
              },
              {
                "name": "M4",
                "amplitude": 5.437,
                "phase": 105.94
              },
              {
                "name": "J1",
                "amplitude": 0.241,
                "phase": 123.005
              },
              {
                "name": "SSA",
                "amplitude": 2.047,
                "phase": 98.898
              },
              {
                "name": "MSF",
                "amplitude": 0.356,
                "phase": 24.98
              },
              {
                "name": "MSQM",
                "amplitude": 0.115,
                "phase": 254.934
              },
              {
                "name": "EPS2",
                "amplitude": 1.968,
                "phase": 89.471
              },
              {
                "name": "L2",
                "amplitude": 6.392,
                "phase": 102.91
              },
              {
                "name": "M3",
                "amplitude": 1.977,
                "phase": 15.86
              },
              {
                "name": "R2",
                "amplitude": 0.534,
                "phase": 158.066
              },
              {
                "name": "MU2",
                "amplitude": 8.566,
                "phase": 105.087
              },
              {
                "name": "MTM",
                "amplitude": 0.11,
                "phase": 142.031
              },
              {
                "name": "NU2",
                "amplitude": 7.78,
                "phase": 86.614
              },
              {
                "name": "LAMBDA2",
                "amplitude": 2.625,
                "phase": 75.845
              },
              {
                "name": "MN4",
                "amplitude": 1.937,
                "phase": 60.491
              },
              {
                "name": "MS4",
                "amplitude": 3.258,
                "phase": 181.835
              },
              {
                "name": "MKS2",
                "amplitude": 0.758,
                "phase": 173.969
              },
              {
                "name": "N4",
                "amplitude": 0.291,
                "phase": 9.263
              },
              {
                "name": "M6",
                "amplitude": 3.153,
                "phase": 354.764
              },
              {
                "name": "M8",
                "amplitude": 0.231,
                "phase": 231.883
              },
              {
                "name": "S4",
                "amplitude": 0.217,
                "phase": 289.151
              },
              {
                "name": "2Q1",
                "amplitude": 0.376,
                "phase": 234.893
              },
              {
                "name": "OO1",
                "amplitude": 0.136,
                "phase": 213.353
              },
              {
                "name": "S3",
                "amplitude": 0.308,
                "phase": 149.13
              },
              {
                "name": "MA2",
                "amplitude": 1.106,
                "phase": 39.588
              },
              {
                "name": "MB2",
                "amplitude": 1.252,
                "phase": 101.029
              },
              {
                "name": "M1",
                "amplitude": 0.535,
                "phase": 83.038
              }
            ]
          }
        ]
      }
    },
    "tile-north-atlantic": {
      "schema": "tide-here/harmonic-tile/v1",
      "dataset": {
        "id": "fes-shaped-global-sample",
        "version": "2026-08-27",
        "schema": "tide-here/fes-prepared-dataset/v1",
        "preparedAt": "2026-08-27T18:00:00.000Z",
        "displayName": "Synthetic FES-shaped Stage 4 fixture",
        "dataClass": "test-fixture",
        "model": "Synthetic FES-shaped harmonic fixture with one TICON-3 validation point",
        "isFes2022": false,
        "attribution": "Synthetic Tide Here fixture; the Brest point is TICON-3 data from the official PyFES example. No FES2022 atlas values are included.",
        "sourceUrl": "https://cnes.github.io/aviso-fes/auto_examples/ex_constituents_prediction.html",
        "licenceReference": "No FES2022 licence applies to this synthetic fixture.",
        "engine": "@neaps/tide-predictor 0.11.0 with Schureman nodal corrections"
      },
      "tile": {
        "id": "north-atlantic",
        "bounds": {
          "south": 52.9,
          "west": -9.4,
          "north": 53.5,
          "east": -8.7
        },
        "points": [
          {
            "id": "galway-synthetic-stage-four",
            "name": "Galway synthetic model point",
            "latitude": 53.27,
            "longitude": -9.05,
            "timeZone": "Europe/Dublin",
            "maximumDistanceKm": 40,
            "datum": "synthetic harmonic datum",
            "units": "cm",
            "water": true,
            "constituents": [
              {
                "name": "M2",
                "amplitude": 112.81215,
                "phase": 127.006
              },
              {
                "name": "K1",
                "amplitude": 3.5387,
                "phase": 93.067
              },
              {
                "name": "N2",
                "amplitude": 22.93225,
                "phase": 108.633
              },
              {
                "name": "O1",
                "amplitude": 3.62285,
                "phase": 345.857
              },
              {
                "name": "P1",
                "amplitude": 1.2386,
                "phase": 81.658
              },
              {
                "name": "Q1",
                "amplitude": 1.122,
                "phase": 299.362
              },
              {
                "name": "K2",
                "amplitude": 11.74855,
                "phase": 163.892
              },
              {
                "name": "S2",
                "amplitude": 41.1818,
                "phase": 166.283
              },
              {
                "name": "S1",
                "amplitude": 0.43835,
                "phase": 29.441000000000003
              },
              {
                "name": "SA",
                "amplitude": 2.69775,
                "phase": 340.761
              },
              {
                "name": "T2",
                "amplitude": 2.29405,
                "phase": 156.535
              },
              {
                "name": "MF",
                "amplitude": 0.56705,
                "phase": 193.663
              },
              {
                "name": "MM",
                "amplitude": 0.23375,
                "phase": 217.741
              },
              {
                "name": "2N2",
                "amplitude": 3.13445,
                "phase": 90.786
              },
              {
                "name": "M4",
                "amplitude": 2.99035,
                "phase": 123.94
              },
              {
                "name": "J1",
                "amplitude": 0.13255,
                "phase": 141.005
              },
              {
                "name": "SSA",
                "amplitude": 1.12585,
                "phase": 116.898
              },
              {
                "name": "MSF",
                "amplitude": 0.1958,
                "phase": 42.980000000000004
              },
              {
                "name": "MSQM",
                "amplitude": 0.06325,
                "phase": 272.93399999999997
              },
              {
                "name": "EPS2",
                "amplitude": 1.0824,
                "phase": 107.471
              },
              {
                "name": "L2",
                "amplitude": 3.5156,
                "phase": 120.91
              },
              {
                "name": "M3",
                "amplitude": 1.08735,
                "phase": 33.86
              },
              {
                "name": "R2",
                "amplitude": 0.2937,
                "phase": 176.066
              },
              {
                "name": "MU2",
                "amplitude": 4.7113,
                "phase": 123.087
              },
              {
                "name": "MTM",
                "amplitude": 0.0605,
                "phase": 160.031
              },
              {
                "name": "NU2",
                "amplitude": 4.279,
                "phase": 104.614
              },
              {
                "name": "LAMBDA2",
                "amplitude": 1.44375,
                "phase": 93.845
              },
              {
                "name": "MN4",
                "amplitude": 1.06535,
                "phase": 78.491
              },
              {
                "name": "MS4",
                "amplitude": 1.7919,
                "phase": 199.835
              },
              {
                "name": "MKS2",
                "amplitude": 0.4169,
                "phase": 191.969
              },
              {
                "name": "N4",
                "amplitude": 0.16005,
                "phase": 27.262999999999998
              },
              {
                "name": "M6",
                "amplitude": 1.73415,
                "phase": 12.76400000000001
              },
              {
                "name": "M8",
                "amplitude": 0.12705,
                "phase": 249.883
              },
              {
                "name": "S4",
                "amplitude": 0.11935,
                "phase": 307.151
              },
              {
                "name": "2Q1",
                "amplitude": 0.2068,
                "phase": 252.893
              },
              {
                "name": "OO1",
                "amplitude": 0.0748,
                "phase": 231.353
              },
              {
                "name": "S3",
                "amplitude": 0.1694,
                "phase": 167.13
              },
              {
                "name": "MA2",
                "amplitude": 0.6083,
                "phase": 57.588
              },
              {
                "name": "MB2",
                "amplitude": 0.6886,
                "phase": 119.029
              },
              {
                "name": "M1",
                "amplitude": 0.29425,
                "phase": 101.038
              }
            ]
          }
        ]
      }
    },
    "tile-south-atlantic": {
      "schema": "tide-here/harmonic-tile/v1",
      "dataset": {
        "id": "fes-shaped-global-sample",
        "version": "2026-08-27",
        "schema": "tide-here/fes-prepared-dataset/v1",
        "preparedAt": "2026-08-27T18:00:00.000Z",
        "displayName": "Synthetic FES-shaped Stage 4 fixture",
        "dataClass": "test-fixture",
        "model": "Synthetic FES-shaped harmonic fixture with one TICON-3 validation point",
        "isFes2022": false,
        "attribution": "Synthetic Tide Here fixture; the Brest point is TICON-3 data from the official PyFES example. No FES2022 atlas values are included.",
        "sourceUrl": "https://cnes.github.io/aviso-fes/auto_examples/ex_constituents_prediction.html",
        "licenceReference": "No FES2022 licence applies to this synthetic fixture.",
        "engine": "@neaps/tide-predictor 0.11.0 with Schureman nodal corrections"
      },
      "tile": {
        "id": "south-atlantic",
        "bounds": {
          "south": -34.2,
          "west": 18.1,
          "north": -33.6,
          "east": 18.8
        },
        "points": [
          {
            "id": "cape-town-synthetic-stage-four",
            "name": "Cape Town synthetic model point",
            "latitude": -33.92,
            "longitude": 18.42,
            "timeZone": "Africa/Johannesburg",
            "maximumDistanceKm": 40,
            "datum": "synthetic harmonic datum",
            "units": "cm",
            "water": true,
            "constituents": [
              {
                "name": "M2",
                "amplitude": 77.94294,
                "phase": 254.006
              },
              {
                "name": "K1",
                "amplitude": 2.44492,
                "phase": 220.067
              },
              {
                "name": "N2",
                "amplitude": 15.8441,
                "phase": 235.63299999999998
              },
              {
                "name": "O1",
                "amplitude": 2.50306,
                "phase": 112.85700000000003
              },
              {
                "name": "P1",
                "amplitude": 0.85576,
                "phase": 208.65800000000002
              },
              {
                "name": "Q1",
                "amplitude": 0.7752,
                "phase": 66.36200000000002
              },
              {
                "name": "K2",
                "amplitude": 8.11718,
                "phase": 290.892
              },
              {
                "name": "S2",
                "amplitude": 28.45288,
                "phase": 293.283
              },
              {
                "name": "S1",
                "amplitude": 0.30286,
                "phase": 156.441
              },
              {
                "name": "SA",
                "amplitude": 1.8639,
                "phase": 107.76100000000002
              },
              {
                "name": "T2",
                "amplitude": 1.58498,
                "phase": 283.53499999999997
              },
              {
                "name": "MF",
                "amplitude": 0.39178,
                "phase": 320.663
              },
              {
                "name": "MM",
                "amplitude": 0.1615,
                "phase": 344.741
              },
              {
                "name": "2N2",
                "amplitude": 2.16562,
                "phase": 217.786
              },
              {
                "name": "M4",
                "amplitude": 2.06606,
                "phase": 250.94
              },
              {
                "name": "J1",
                "amplitude": 0.09158,
                "phase": 268.005
              },
              {
                "name": "SSA",
                "amplitude": 0.77786,
                "phase": 243.898
              },
              {
                "name": "MSF",
                "amplitude": 0.13528,
                "phase": 169.98
              },
              {
                "name": "MSQM",
                "amplitude": 0.0437,
                "phase": 39.93399999999997
              },
              {
                "name": "EPS2",
                "amplitude": 0.74784,
                "phase": 234.471
              },
              {
                "name": "L2",
                "amplitude": 2.42896,
                "phase": 247.91
              },
              {
                "name": "M3",
                "amplitude": 0.75126,
                "phase": 160.86
              },
              {
                "name": "R2",
                "amplitude": 0.20292,
                "phase": 303.06600000000003
              },
              {
                "name": "MU2",
                "amplitude": 3.25508,
                "phase": 250.087
              },
              {
                "name": "MTM",
                "amplitude": 0.0418,
                "phase": 287.031
              },
              {
                "name": "NU2",
                "amplitude": 2.9564,
                "phase": 231.614
              },
              {
                "name": "LAMBDA2",
                "amplitude": 0.9975,
                "phase": 220.845
              },
              {
                "name": "MN4",
                "amplitude": 0.73606,
                "phase": 205.49099999999999
              },
              {
                "name": "MS4",
                "amplitude": 1.23804,
                "phase": 326.83500000000004
              },
              {
                "name": "MKS2",
                "amplitude": 0.28804,
                "phase": 318.969
              },
              {
                "name": "N4",
                "amplitude": 0.11058,
                "phase": 154.263
              },
              {
                "name": "M6",
                "amplitude": 1.19814,
                "phase": 139.764
              },
              {
                "name": "M8",
                "amplitude": 0.08778,
                "phase": 16.883000000000038
              },
              {
                "name": "S4",
                "amplitude": 0.08246,
                "phase": 74.15100000000001
              },
              {
                "name": "2Q1",
                "amplitude": 0.14288,
                "phase": 19.89300000000003
              },
              {
                "name": "OO1",
                "amplitude": 0.05168,
                "phase": 358.353
              },
              {
                "name": "S3",
                "amplitude": 0.11704,
                "phase": 294.13
              },
              {
                "name": "MA2",
                "amplitude": 0.42028,
                "phase": 184.588
              },
              {
                "name": "MB2",
                "amplitude": 0.47576,
                "phase": 246.029
              },
              {
                "name": "M1",
                "amplitude": 0.2033,
                "phase": 228.038
              }
            ]
          }
        ]
      }
    }
  }
}
);
