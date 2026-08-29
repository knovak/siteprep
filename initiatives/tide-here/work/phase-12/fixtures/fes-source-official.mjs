// Generated from the checksum-recorded FES2022b native-grid atlas.
// Do not hand-edit; the extraction and preparation equality tests enforce provenance.
export const fesSourceOfficial = Object.freeze({
  "schema": "tide-here/fes-source-extract/v1",
  "dataset": {
    "id": "fes2022b-native-validation",
    "version": "2026-02-03",
    "schema": "tide-here/fes-prepared-dataset/v1",
    "preparedAt": "2026-08-29T00:00:00.000Z",
    "displayName": "FES2022b native-grid validation points",
    "dataClass": "licensed-source",
    "model": "FES2022b native non-structured ocean tide atlas",
    "isFes2022": true,
    "attribution": "FES2022 Tide product funded by CNES and produced by LEGOS, NOVELTIS and CLS; transformed by Tide Here into native-mesh harmonic points.",
    "sourceUrl": "https://doi.org/10.24400/527896/A01-2024.004",
    "licenceUrl": "https://www.aviso.altimetry.fr/fileadmin/documents/data/License_Aviso.pdf",
    "licenceReference": "AVISO License, Issue 20 (August 2026): https://www.aviso.altimetry.fr/fileadmin/documents/data/License_Aviso.pdf",
    "disclaimer": "Transformed FES2022b model output; the selected coastal points use bounded native-mesh extrapolation. AVISO provides the source as-is; Tide Here adds no navigation or safety warranty.",
    "engine": "PyFES 2026.5.2 native-grid interpolation/extrapolation; Tide Here runtime uses @neaps/tide-predictor 0.11.0 with Schureman nodal corrections",
    "sourceFiles": [
      {
        "name": "FES2022b_OceanTide_NSgrid.nc",
        "bytes": 3953139340,
        "sha256": "6479dbd9acdfb63405ff15de1265154c4659b1f7112b8dfb1cabef945a481a23"
      }
    ]
  },
  "tiles": [
    {
      "id": "australia-east-validation",
      "bounds": {
        "south": -27,
        "west": 152.1,
        "north": -24.5,
        "east": 153.4
      },
      "points": [
        {
          "id": "fes2022-maroochydore",
          "name": "FES2022 near Maroochydore",
          "country": "AU",
          "latitude": -26.66008,
          "longitude": 153.09953,
          "timeZone": "Australia/Brisbane",
          "maximumDistanceKm": 20,
          "datum": "FES2022 mean sea level harmonic datum",
          "units": "cm",
          "water": true,
          "interpolationQuality": -30,
          "interpolationMethod": "extrapolated",
          "constituentRoundTripMaxErrorCm": 0.000004,
          "constituents": [
            {
              "name": "2N2",
              "amplitude": 1.928692,
              "phase": 282.156343
            },
            {
              "name": "EPS2",
              "amplitude": 0.579243,
              "phase": 256.909469
            },
            {
              "name": "J1",
              "amplitude": 1.244937,
              "phase": 11.704969
            },
            {
              "name": "K1",
              "amplitude": 19.290517,
              "phase": 357.739159
            },
            {
              "name": "K2",
              "amplitude": 4.65237,
              "phase": 299.123737
            },
            {
              "name": "L2",
              "amplitude": 1.503779,
              "phase": 305.884953
            },
            {
              "name": "LAMBDA2",
              "amplitude": 0.518144,
              "phase": 308.761603
            },
            {
              "name": "M2",
              "amplitude": 54.191126,
              "phase": 300.261284
            },
            {
              "name": "M3",
              "amplitude": 0.004764,
              "phase": 142.944383
            },
            {
              "name": "M4",
              "amplitude": 0.308524,
              "phase": 279.666223
            },
            {
              "name": "M6",
              "amplitude": 0.179632,
              "phase": 353.458007
            },
            {
              "name": "M8",
              "amplitude": 0.053873,
              "phase": 297.162585
            },
            {
              "name": "MKS2",
              "amplitude": 0.109531,
              "phase": 6.602751
            },
            {
              "name": "MN4",
              "amplitude": 0.113596,
              "phase": 224.787183
            },
            {
              "name": "MS4",
              "amplitude": 0.268495,
              "phase": 2.75923
            },
            {
              "name": "MSF",
              "amplitude": 0.039975,
              "phase": 354.309944
            },
            {
              "name": "MF",
              "amplitude": 0.403945,
              "phase": 14.021957
            },
            {
              "name": "MM",
              "amplitude": 0.235158,
              "phase": 16.735588
            },
            {
              "name": "MSQM",
              "amplitude": 0.005807,
              "phase": 123.055557
            },
            {
              "name": "MTM",
              "amplitude": 0.068387,
              "phase": 28.760191
            },
            {
              "name": "MU2",
              "amplitude": 1.800027,
              "phase": 288.609131
            },
            {
              "name": "N2",
              "amplitude": 11.497597,
              "phase": 292.533091
            },
            {
              "name": "N4",
              "amplitude": 0.040898,
              "phase": 129.78346
            },
            {
              "name": "NU2",
              "amplitude": 2.14903,
              "phase": 289.821859
            },
            {
              "name": "O1",
              "amplitude": 10.480109,
              "phase": 327.770291
            },
            {
              "name": "P1",
              "amplitude": 5.634374,
              "phase": 350.357059
            },
            {
              "name": "Q1",
              "amplitude": 2.102795,
              "phase": 306.26685
            },
            {
              "name": "R2",
              "amplitude": 0.177018,
              "phase": 284.346998
            },
            {
              "name": "S1",
              "amplitude": 0.398306,
              "phase": 263.58921
            },
            {
              "name": "S2",
              "amplitude": 16.146855,
              "phase": 307.692123
            },
            {
              "name": "S4",
              "amplitude": 0.040584,
              "phase": 21.389607
            },
            {
              "name": "SA",
              "amplitude": 0.031195,
              "phase": 157.976215
            },
            {
              "name": "SSA",
              "amplitude": 0.236596,
              "phase": 3.445086
            },
            {
              "name": "T2",
              "amplitude": 0.891428,
              "phase": 278.855557
            }
          ]
        },
        {
          "id": "fes2022-bundaberg",
          "name": "FES2022 near Bundaberg",
          "country": "AU",
          "latitude": -24.7666666667,
          "longitude": 152.3666666667,
          "timeZone": "Australia/Brisbane",
          "maximumDistanceKm": 20,
          "datum": "FES2022 mean sea level harmonic datum",
          "units": "cm",
          "water": true,
          "interpolationQuality": -39,
          "interpolationMethod": "extrapolated",
          "constituentRoundTripMaxErrorCm": 0.000003,
          "constituents": [
            {
              "name": "2N2",
              "amplitude": 2.980819,
              "phase": 296.794651
            },
            {
              "name": "EPS2",
              "amplitude": 0.743928,
              "phase": 283.893379
            },
            {
              "name": "J1",
              "amplitude": 1.502401,
              "phase": 19.368346
            },
            {
              "name": "K1",
              "amplitude": 23.080156,
              "phase": 6.067841
            },
            {
              "name": "K2",
              "amplitude": 8.299874,
              "phase": 306.883639
            },
            {
              "name": "L2",
              "amplitude": 2.611812,
              "phase": 304.121603
            },
            {
              "name": "LAMBDA2",
              "amplitude": 0.910716,
              "phase": 299.573016
            },
            {
              "name": "M2",
              "amplitude": 84.13227,
              "phase": 312.55061
            },
            {
              "name": "M3",
              "amplitude": 0.168388,
              "phase": 175.302155
            },
            {
              "name": "M4",
              "amplitude": 0.75011,
              "phase": 247.53955
            },
            {
              "name": "M6",
              "amplitude": 0.576102,
              "phase": 235.764064
            },
            {
              "name": "M8",
              "amplitude": 0.042679,
              "phase": 86.706239
            },
            {
              "name": "MKS2",
              "amplitude": 0.366722,
              "phase": 64.739332
            },
            {
              "name": "MN4",
              "amplitude": 0.282028,
              "phase": 307.813553
            },
            {
              "name": "MS4",
              "amplitude": 0.076003,
              "phase": 212.719352
            },
            {
              "name": "MSF",
              "amplitude": 0.109707,
              "phase": 354.797436
            },
            {
              "name": "MF",
              "amplitude": 0.499764,
              "phase": 8.554322
            },
            {
              "name": "MM",
              "amplitude": 0.360568,
              "phase": 13.577319
            },
            {
              "name": "MSQM",
              "amplitude": 0.014431,
              "phase": 73.59965
            },
            {
              "name": "MTM",
              "amplitude": 0.093067,
              "phase": 14.396707
            },
            {
              "name": "MU2",
              "amplitude": 2.502375,
              "phase": 313.668199
            },
            {
              "name": "N2",
              "amplitude": 19.020975,
              "phase": 305.238858
            },
            {
              "name": "N4",
              "amplitude": 0.145067,
              "phase": 250.693724
            },
            {
              "name": "NU2",
              "amplitude": 3.642301,
              "phase": 300.260916
            },
            {
              "name": "O1",
              "amplitude": 12.259427,
              "phase": 336.899074
            },
            {
              "name": "P1",
              "amplitude": 6.786753,
              "phase": 359.494086
            },
            {
              "name": "Q1",
              "amplitude": 2.374512,
              "phase": 315.452903
            },
            {
              "name": "R2",
              "amplitude": 0.323172,
              "phase": 302.63955
            },
            {
              "name": "S1",
              "amplitude": 0.643683,
              "phase": 291.704229
            },
            {
              "name": "S2",
              "amplitude": 28.039906,
              "phase": 314.081963
            },
            {
              "name": "S4",
              "amplitude": 0.054313,
              "phase": 141.366727
            },
            {
              "name": "SA",
              "amplitude": 0.030593,
              "phase": 159.214632
            },
            {
              "name": "SSA",
              "amplitude": 0.306195,
              "phase": 4.620465
            },
            {
              "name": "T2",
              "amplitude": 1.802202,
              "phase": 293.835206
            }
          ]
        }
      ]
    },
    {
      "id": "europe-west-validation",
      "bounds": {
        "south": 48.2,
        "west": -9.5,
        "north": 53.6,
        "east": -4.2
      },
      "points": [
        {
          "id": "fes2022-brest",
          "name": "FES2022 near Brest",
          "country": "FR",
          "latitude": 48.383,
          "longitude": -4.495,
          "timeZone": "Europe/Paris",
          "maximumDistanceKm": 20,
          "datum": "FES2022 mean sea level harmonic datum",
          "units": "cm",
          "water": true,
          "interpolationQuality": -30,
          "interpolationMethod": "extrapolated",
          "constituentRoundTripMaxErrorCm": 0.000003,
          "constituents": [
            {
              "name": "2N2",
              "amplitude": 7.092113,
              "phase": 69.97467
            },
            {
              "name": "EPS2",
              "amplitude": 1.478365,
              "phase": 68.020158
            },
            {
              "name": "J1",
              "amplitude": 0.248382,
              "phase": 115.911922
            },
            {
              "name": "K1",
              "amplitude": 6.103265,
              "phase": 71.382555
            },
            {
              "name": "K2",
              "amplitude": 22.231798,
              "phase": 136.399118
            },
            {
              "name": "L2",
              "amplitude": 6.157809,
              "phase": 103.61314
            },
            {
              "name": "LAMBDA2",
              "amplitude": 2.177404,
              "phase": 77.501999
            },
            {
              "name": "M2",
              "amplitude": 218.856914,
              "phase": 100.595945
            },
            {
              "name": "M3",
              "amplitude": 0.037951,
              "phase": 167.433
            },
            {
              "name": "M4",
              "amplitude": 15.556462,
              "phase": 84.629216
            },
            {
              "name": "M6",
              "amplitude": 4.269839,
              "phase": 320.648135
            },
            {
              "name": "M8",
              "amplitude": 0.581922,
              "phase": 28.62455
            },
            {
              "name": "MKS2",
              "amplitude": 1.181759,
              "phase": 223.844079
            },
            {
              "name": "MN4",
              "amplitude": 2.429424,
              "phase": 119.107582
            },
            {
              "name": "MS4",
              "amplitude": 6.702336,
              "phase": 179.392771
            },
            {
              "name": "MSF",
              "amplitude": 0.357697,
              "phase": 253.333448
            },
            {
              "name": "MF",
              "amplitude": 0.95717,
              "phase": 189.121068
            },
            {
              "name": "MM",
              "amplitude": 0.538692,
              "phase": 190.369713
            },
            {
              "name": "MSQM",
              "amplitude": 0.008076,
              "phase": 94.218595
            },
            {
              "name": "MTM",
              "amplitude": 0.147271,
              "phase": 180.321401
            },
            {
              "name": "MU2",
              "amplitude": 7.885401,
              "phase": 105.637924
            },
            {
              "name": "N2",
              "amplitude": 43.10745,
              "phase": 82.297905
            },
            {
              "name": "N4",
              "amplitude": 0.456403,
              "phase": 137.29576
            },
            {
              "name": "NU2",
              "amplitude": 7.827092,
              "phase": 79.265418
            },
            {
              "name": "O1",
              "amplitude": 6.059336,
              "phase": 326.534665
            },
            {
              "name": "P1",
              "amplitude": 1.930914,
              "phase": 65.897029
            },
            {
              "name": "Q1",
              "amplitude": 1.949866,
              "phase": 280.023167
            },
            {
              "name": "R2",
              "amplitude": 0.684144,
              "phase": 145.508932
            },
            {
              "name": "S1",
              "amplitude": 0.506218,
              "phase": 37.593264
            },
            {
              "name": "S2",
              "amplitude": 81.213642,
              "phase": 138.856133
            },
            {
              "name": "S4",
              "amplitude": 1.231069,
              "phase": 232.960853
            },
            {
              "name": "SA",
              "amplitude": 0.034331,
              "phase": 144.478974
            },
            {
              "name": "SSA",
              "amplitude": 0.608166,
              "phase": 181.621314
            },
            {
              "name": "T2",
              "amplitude": 4.455648,
              "phase": 141.344725
            }
          ]
        },
        {
          "id": "fes2022-galway",
          "name": "FES2022 near Galway",
          "country": "IE",
          "latitude": 53.27,
          "longitude": -9.05,
          "timeZone": "Europe/Dublin",
          "maximumDistanceKm": 20,
          "datum": "FES2022 mean sea level harmonic datum",
          "units": "cm",
          "water": true,
          "interpolationQuality": -33,
          "interpolationMethod": "extrapolated",
          "constituentRoundTripMaxErrorCm": 0.000002,
          "constituents": [
            {
              "name": "2N2",
              "amplitude": 4.317042,
              "phase": 98.219789
            },
            {
              "name": "EPS2",
              "amplitude": 1.227454,
              "phase": 78.001706
            },
            {
              "name": "J1",
              "amplitude": 0.435779,
              "phase": 108.97011
            },
            {
              "name": "K1",
              "amplitude": 10.755806,
              "phase": 69.720272
            },
            {
              "name": "K2",
              "amplitude": 15.816775,
              "phase": 171.551453
            },
            {
              "name": "L2",
              "amplitude": 3.543174,
              "phase": 163.488054
            },
            {
              "name": "LAMBDA2",
              "amplitude": 0.951688,
              "phase": 156.879966
            },
            {
              "name": "M2",
              "amplitude": 152.332919,
              "phase": 140.854108
            },
            {
              "name": "M3",
              "amplitude": 0.107283,
              "phase": 104.165276
            },
            {
              "name": "M4",
              "amplitude": 3.458791,
              "phase": 13.350583
            },
            {
              "name": "M6",
              "amplitude": 0.887759,
              "phase": 79.041243
            },
            {
              "name": "M8",
              "amplitude": 1.284218,
              "phase": 219.659856
            },
            {
              "name": "MKS2",
              "amplitude": 0.133218,
              "phase": 73.888095
            },
            {
              "name": "MN4",
              "amplitude": 0.328242,
              "phase": 307.953519
            },
            {
              "name": "MS4",
              "amplitude": 2.827017,
              "phase": 56.980331
            },
            {
              "name": "MSF",
              "amplitude": 0.24948,
              "phase": 231.222472
            },
            {
              "name": "MF",
              "amplitude": 1.250252,
              "phase": 192.763625
            },
            {
              "name": "MM",
              "amplitude": 0.856697,
              "phase": 192.56054
            },
            {
              "name": "MSQM",
              "amplitude": 0.038357,
              "phase": 159.045541
            },
            {
              "name": "MTM",
              "amplitude": 0.210608,
              "phase": 183.050211
            },
            {
              "name": "MU2",
              "amplitude": 5.214346,
              "phase": 92.424845
            },
            {
              "name": "N2",
              "amplitude": 31.557983,
              "phase": 119.016054
            },
            {
              "name": "N4",
              "amplitude": 0.026149,
              "phase": 114.853173
            },
            {
              "name": "NU2",
              "amplitude": 5.962036,
              "phase": 123.759422
            },
            {
              "name": "O1",
              "amplitude": 7.176168,
              "phase": 319.876483
            },
            {
              "name": "P1",
              "amplitude": 3.377006,
              "phase": 63.572673
            },
            {
              "name": "Q1",
              "amplitude": 2.180662,
              "phase": 264.475199
            },
            {
              "name": "R2",
              "amplitude": 0.479114,
              "phase": 165.63681
            },
            {
              "name": "S1",
              "amplitude": 0.716356,
              "phase": 37.414318
            },
            {
              "name": "S2",
              "amplitude": 55.369949,
              "phase": 173.565687
            },
            {
              "name": "S4",
              "amplitude": 0.517675,
              "phase": 135.162602
            },
            {
              "name": "SA",
              "amplitude": 0.029166,
              "phase": 141.25102
            },
            {
              "name": "SSA",
              "amplitude": 0.78941,
              "phase": 182.711411
            },
            {
              "name": "T2",
              "amplitude": 3.279794,
              "phase": 165.423932
            }
          ]
        }
      ]
    },
    {
      "id": "south-africa-validation",
      "bounds": {
        "south": -34.2,
        "west": 18.1,
        "north": -33.6,
        "east": 18.8
      },
      "points": [
        {
          "id": "fes2022-cape-town",
          "name": "FES2022 near Cape Town",
          "country": "ZA",
          "latitude": -33.92,
          "longitude": 18.42,
          "timeZone": "Africa/Johannesburg",
          "maximumDistanceKm": 20,
          "datum": "FES2022 mean sea level harmonic datum",
          "units": "cm",
          "water": true,
          "interpolationQuality": -33,
          "interpolationMethod": "extrapolated",
          "constituentRoundTripMaxErrorCm": 0.000002,
          "constituents": [
            {
              "name": "2N2",
              "amplitude": 1.677728,
              "phase": 5.360798
            },
            {
              "name": "EPS2",
              "amplitude": 0.454022,
              "phase": 355.668662
            },
            {
              "name": "J1",
              "amplitude": 0.524815,
              "phase": 128.703886
            },
            {
              "name": "K1",
              "amplitude": 5.753234,
              "phase": 108.850191
            },
            {
              "name": "K2",
              "amplitude": 6.153373,
              "phase": 51.039784
            },
            {
              "name": "L2",
              "amplitude": 1.310186,
              "phase": 36.438398
            },
            {
              "name": "LAMBDA2",
              "amplitude": 0.380424,
              "phase": 25.520501
            },
            {
              "name": "M2",
              "amplitude": 50.276455,
              "phase": 33.432529
            },
            {
              "name": "M3",
              "amplitude": 0.001548,
              "phase": 347.708565
            },
            {
              "name": "M4",
              "amplitude": 0.43221,
              "phase": 45.892929
            },
            {
              "name": "M6",
              "amplitude": 0.07505,
              "phase": 288.739707
            },
            {
              "name": "M8",
              "amplitude": 0.129393,
              "phase": 33.350244
            },
            {
              "name": "MKS2",
              "amplitude": 0.036682,
              "phase": 38.234658
            },
            {
              "name": "MN4",
              "amplitude": 0.23009,
              "phase": 317.13629
            },
            {
              "name": "MS4",
              "amplitude": 0.291475,
              "phase": 128.031875
            },
            {
              "name": "MSF",
              "amplitude": 0.01534,
              "phase": 239.538929
            },
            {
              "name": "MF",
              "amplitude": 0.260117,
              "phase": 353.148871
            },
            {
              "name": "MM",
              "amplitude": 0.067467,
              "phase": 296.062445
            },
            {
              "name": "MSQM",
              "amplitude": 0.008029,
              "phase": 34.956905
            },
            {
              "name": "MTM",
              "amplitude": 0.064187,
              "phase": 22.996165
            },
            {
              "name": "MU2",
              "amplitude": 1.909157,
              "phase": 9.728037
            },
            {
              "name": "N2",
              "amplitude": 11.106981,
              "phase": 25.641651
            },
            {
              "name": "N4",
              "amplitude": 0.050742,
              "phase": 227.387596
            },
            {
              "name": "NU2",
              "amplitude": 1.984702,
              "phase": 25.545732
            },
            {
              "name": "O1",
              "amplitude": 1.56675,
              "phase": 231.654696
            },
            {
              "name": "P1",
              "amplitude": 1.457395,
              "phase": 104.223277
            },
            {
              "name": "Q1",
              "amplitude": 0.94697,
              "phase": 219.311072
            },
            {
              "name": "R2",
              "amplitude": 0.188671,
              "phase": 50.926276
            },
            {
              "name": "S1",
              "amplitude": 0.432691,
              "phase": 335.171067
            },
            {
              "name": "S2",
              "amplitude": 22.145897,
              "phase": 53.487716
            },
            {
              "name": "S4",
              "amplitude": 0.031599,
              "phase": 202.909304
            },
            {
              "name": "SA",
              "amplitude": 0.031463,
              "phase": 154.72978
            },
            {
              "name": "SSA",
              "amplitude": 0.024084,
              "phase": 211.544899
            },
            {
              "name": "T2",
              "amplitude": 1.333734,
              "phase": 50.346481
            }
          ]
        }
      ]
    }
  ]
});
