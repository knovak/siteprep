(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/qrcode/lib/can-promise.js
  var require_can_promise = __commonJS({
    "node_modules/qrcode/lib/can-promise.js"(exports, module) {
      module.exports = function() {
        return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
      };
    }
  });

  // node_modules/qrcode/lib/core/utils.js
  var require_utils = __commonJS({
    "node_modules/qrcode/lib/core/utils.js"(exports) {
      var toSJISFunction;
      var CODEWORDS_COUNT = [
        0,
        // Not used
        26,
        44,
        70,
        100,
        134,
        172,
        196,
        242,
        292,
        346,
        404,
        466,
        532,
        581,
        655,
        733,
        815,
        901,
        991,
        1085,
        1156,
        1258,
        1364,
        1474,
        1588,
        1706,
        1828,
        1921,
        2051,
        2185,
        2323,
        2465,
        2611,
        2761,
        2876,
        3034,
        3196,
        3362,
        3532,
        3706
      ];
      exports.getSymbolSize = function getSymbolSize(version) {
        if (!version) throw new Error('"version" cannot be null or undefined');
        if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40');
        return version * 4 + 17;
      };
      exports.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
        return CODEWORDS_COUNT[version];
      };
      exports.getBCHDigit = function(data) {
        let digit = 0;
        while (data !== 0) {
          digit++;
          data >>>= 1;
        }
        return digit;
      };
      exports.setToSJISFunction = function setToSJISFunction(f) {
        if (typeof f !== "function") {
          throw new Error('"toSJISFunc" is not a valid function.');
        }
        toSJISFunction = f;
      };
      exports.isKanjiModeEnabled = function() {
        return typeof toSJISFunction !== "undefined";
      };
      exports.toSJIS = function toSJIS(kanji) {
        return toSJISFunction(kanji);
      };
    }
  });

  // node_modules/qrcode/lib/core/error-correction-level.js
  var require_error_correction_level = __commonJS({
    "node_modules/qrcode/lib/core/error-correction-level.js"(exports) {
      exports.L = { bit: 1 };
      exports.M = { bit: 0 };
      exports.Q = { bit: 3 };
      exports.H = { bit: 2 };
      function fromString(string) {
        if (typeof string !== "string") {
          throw new Error("Param is not a string");
        }
        const lcStr = string.toLowerCase();
        switch (lcStr) {
          case "l":
          case "low":
            return exports.L;
          case "m":
          case "medium":
            return exports.M;
          case "q":
          case "quartile":
            return exports.Q;
          case "h":
          case "high":
            return exports.H;
          default:
            throw new Error("Unknown EC Level: " + string);
        }
      }
      exports.isValid = function isValid(level) {
        return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
      };
      exports.from = function from(value, defaultValue) {
        if (exports.isValid(value)) {
          return value;
        }
        try {
          return fromString(value);
        } catch (e) {
          return defaultValue;
        }
      };
    }
  });

  // node_modules/qrcode/lib/core/bit-buffer.js
  var require_bit_buffer = __commonJS({
    "node_modules/qrcode/lib/core/bit-buffer.js"(exports, module) {
      function BitBuffer() {
        this.buffer = [];
        this.length = 0;
      }
      BitBuffer.prototype = {
        get: function(index) {
          const bufIndex = Math.floor(index / 8);
          return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
        },
        put: function(num, length2) {
          for (let i = 0; i < length2; i++) {
            this.putBit((num >>> length2 - i - 1 & 1) === 1);
          }
        },
        getLengthInBits: function() {
          return this.length;
        },
        putBit: function(bit) {
          const bufIndex = Math.floor(this.length / 8);
          if (this.buffer.length <= bufIndex) {
            this.buffer.push(0);
          }
          if (bit) {
            this.buffer[bufIndex] |= 128 >>> this.length % 8;
          }
          this.length++;
        }
      };
      module.exports = BitBuffer;
    }
  });

  // node_modules/qrcode/lib/core/bit-matrix.js
  var require_bit_matrix = __commonJS({
    "node_modules/qrcode/lib/core/bit-matrix.js"(exports, module) {
      function BitMatrix(size) {
        if (!size || size < 1) {
          throw new Error("BitMatrix size must be defined and greater than 0");
        }
        this.size = size;
        this.data = new Uint8Array(size * size);
        this.reservedBit = new Uint8Array(size * size);
      }
      BitMatrix.prototype.set = function(row, col, value, reserved) {
        const index = row * this.size + col;
        this.data[index] = value;
        if (reserved) this.reservedBit[index] = true;
      };
      BitMatrix.prototype.get = function(row, col) {
        return this.data[row * this.size + col];
      };
      BitMatrix.prototype.xor = function(row, col, value) {
        this.data[row * this.size + col] ^= value;
      };
      BitMatrix.prototype.isReserved = function(row, col) {
        return this.reservedBit[row * this.size + col];
      };
      module.exports = BitMatrix;
    }
  });

  // node_modules/qrcode/lib/core/alignment-pattern.js
  var require_alignment_pattern = __commonJS({
    "node_modules/qrcode/lib/core/alignment-pattern.js"(exports) {
      var getSymbolSize = require_utils().getSymbolSize;
      exports.getRowColCoords = function getRowColCoords(version) {
        if (version === 1) return [];
        const posCount = Math.floor(version / 7) + 2;
        const size = getSymbolSize(version);
        const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
        const positions = [size - 7];
        for (let i = 1; i < posCount - 1; i++) {
          positions[i] = positions[i - 1] - intervals;
        }
        positions.push(6);
        return positions.reverse();
      };
      exports.getPositions = function getPositions(version) {
        const coords = [];
        const pos = exports.getRowColCoords(version);
        const posLength = pos.length;
        for (let i = 0; i < posLength; i++) {
          for (let j = 0; j < posLength; j++) {
            if (i === 0 && j === 0 || // top-left
            i === 0 && j === posLength - 1 || // bottom-left
            i === posLength - 1 && j === 0) {
              continue;
            }
            coords.push([pos[i], pos[j]]);
          }
        }
        return coords;
      };
    }
  });

  // node_modules/qrcode/lib/core/finder-pattern.js
  var require_finder_pattern = __commonJS({
    "node_modules/qrcode/lib/core/finder-pattern.js"(exports) {
      var getSymbolSize = require_utils().getSymbolSize;
      var FINDER_PATTERN_SIZE = 7;
      exports.getPositions = function getPositions(version) {
        const size = getSymbolSize(version);
        return [
          // top-left
          [0, 0],
          // top-right
          [size - FINDER_PATTERN_SIZE, 0],
          // bottom-left
          [0, size - FINDER_PATTERN_SIZE]
        ];
      };
    }
  });

  // node_modules/qrcode/lib/core/mask-pattern.js
  var require_mask_pattern = __commonJS({
    "node_modules/qrcode/lib/core/mask-pattern.js"(exports) {
      exports.Patterns = {
        PATTERN000: 0,
        PATTERN001: 1,
        PATTERN010: 2,
        PATTERN011: 3,
        PATTERN100: 4,
        PATTERN101: 5,
        PATTERN110: 6,
        PATTERN111: 7
      };
      var PenaltyScores = {
        N1: 3,
        N2: 3,
        N3: 40,
        N4: 10
      };
      exports.isValid = function isValid(mask) {
        return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
      };
      exports.from = function from(value) {
        return exports.isValid(value) ? parseInt(value, 10) : void 0;
      };
      exports.getPenaltyN1 = function getPenaltyN1(data) {
        const size = data.size;
        let points = 0;
        let sameCountCol = 0;
        let sameCountRow = 0;
        let lastCol = null;
        let lastRow = null;
        for (let row = 0; row < size; row++) {
          sameCountCol = sameCountRow = 0;
          lastCol = lastRow = null;
          for (let col = 0; col < size; col++) {
            let module2 = data.get(row, col);
            if (module2 === lastCol) {
              sameCountCol++;
            } else {
              if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
              lastCol = module2;
              sameCountCol = 1;
            }
            module2 = data.get(col, row);
            if (module2 === lastRow) {
              sameCountRow++;
            } else {
              if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
              lastRow = module2;
              sameCountRow = 1;
            }
          }
          if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
          if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
        }
        return points;
      };
      exports.getPenaltyN2 = function getPenaltyN2(data) {
        const size = data.size;
        let points = 0;
        for (let row = 0; row < size - 1; row++) {
          for (let col = 0; col < size - 1; col++) {
            const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
            if (last === 4 || last === 0) points++;
          }
        }
        return points * PenaltyScores.N2;
      };
      exports.getPenaltyN3 = function getPenaltyN3(data) {
        const size = data.size;
        let points = 0;
        let bitsCol = 0;
        let bitsRow = 0;
        for (let row = 0; row < size; row++) {
          bitsCol = bitsRow = 0;
          for (let col = 0; col < size; col++) {
            bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
            if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
            bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
            if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
          }
        }
        return points * PenaltyScores.N3;
      };
      exports.getPenaltyN4 = function getPenaltyN4(data) {
        let darkCount = 0;
        const modulesCount = data.data.length;
        for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
        const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
        return k * PenaltyScores.N4;
      };
      function getMaskAt(maskPattern, i, j) {
        switch (maskPattern) {
          case exports.Patterns.PATTERN000:
            return (i + j) % 2 === 0;
          case exports.Patterns.PATTERN001:
            return i % 2 === 0;
          case exports.Patterns.PATTERN010:
            return j % 3 === 0;
          case exports.Patterns.PATTERN011:
            return (i + j) % 3 === 0;
          case exports.Patterns.PATTERN100:
            return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
          case exports.Patterns.PATTERN101:
            return i * j % 2 + i * j % 3 === 0;
          case exports.Patterns.PATTERN110:
            return (i * j % 2 + i * j % 3) % 2 === 0;
          case exports.Patterns.PATTERN111:
            return (i * j % 3 + (i + j) % 2) % 2 === 0;
          default:
            throw new Error("bad maskPattern:" + maskPattern);
        }
      }
      exports.applyMask = function applyMask(pattern, data) {
        const size = data.size;
        for (let col = 0; col < size; col++) {
          for (let row = 0; row < size; row++) {
            if (data.isReserved(row, col)) continue;
            data.xor(row, col, getMaskAt(pattern, row, col));
          }
        }
      };
      exports.getBestMask = function getBestMask(data, setupFormatFunc) {
        const numPatterns = Object.keys(exports.Patterns).length;
        let bestPattern = 0;
        let lowerPenalty = Infinity;
        for (let p = 0; p < numPatterns; p++) {
          setupFormatFunc(p);
          exports.applyMask(p, data);
          const penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
          exports.applyMask(p, data);
          if (penalty < lowerPenalty) {
            lowerPenalty = penalty;
            bestPattern = p;
          }
        }
        return bestPattern;
      };
    }
  });

  // node_modules/qrcode/lib/core/error-correction-code.js
  var require_error_correction_code = __commonJS({
    "node_modules/qrcode/lib/core/error-correction-code.js"(exports) {
      var ECLevel = require_error_correction_level();
      var EC_BLOCKS_TABLE = [
        // L  M  Q  H
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        1,
        2,
        2,
        4,
        1,
        2,
        4,
        4,
        2,
        4,
        4,
        4,
        2,
        4,
        6,
        5,
        2,
        4,
        6,
        6,
        2,
        5,
        8,
        8,
        4,
        5,
        8,
        8,
        4,
        5,
        8,
        11,
        4,
        8,
        10,
        11,
        4,
        9,
        12,
        16,
        4,
        9,
        16,
        16,
        6,
        10,
        12,
        18,
        6,
        10,
        17,
        16,
        6,
        11,
        16,
        19,
        6,
        13,
        18,
        21,
        7,
        14,
        21,
        25,
        8,
        16,
        20,
        25,
        8,
        17,
        23,
        25,
        9,
        17,
        23,
        34,
        9,
        18,
        25,
        30,
        10,
        20,
        27,
        32,
        12,
        21,
        29,
        35,
        12,
        23,
        34,
        37,
        12,
        25,
        34,
        40,
        13,
        26,
        35,
        42,
        14,
        28,
        38,
        45,
        15,
        29,
        40,
        48,
        16,
        31,
        43,
        51,
        17,
        33,
        45,
        54,
        18,
        35,
        48,
        57,
        19,
        37,
        51,
        60,
        19,
        38,
        53,
        63,
        20,
        40,
        56,
        66,
        21,
        43,
        59,
        70,
        22,
        45,
        62,
        74,
        24,
        47,
        65,
        77,
        25,
        49,
        68,
        81
      ];
      var EC_CODEWORDS_TABLE = [
        // L  M  Q  H
        7,
        10,
        13,
        17,
        10,
        16,
        22,
        28,
        15,
        26,
        36,
        44,
        20,
        36,
        52,
        64,
        26,
        48,
        72,
        88,
        36,
        64,
        96,
        112,
        40,
        72,
        108,
        130,
        48,
        88,
        132,
        156,
        60,
        110,
        160,
        192,
        72,
        130,
        192,
        224,
        80,
        150,
        224,
        264,
        96,
        176,
        260,
        308,
        104,
        198,
        288,
        352,
        120,
        216,
        320,
        384,
        132,
        240,
        360,
        432,
        144,
        280,
        408,
        480,
        168,
        308,
        448,
        532,
        180,
        338,
        504,
        588,
        196,
        364,
        546,
        650,
        224,
        416,
        600,
        700,
        224,
        442,
        644,
        750,
        252,
        476,
        690,
        816,
        270,
        504,
        750,
        900,
        300,
        560,
        810,
        960,
        312,
        588,
        870,
        1050,
        336,
        644,
        952,
        1110,
        360,
        700,
        1020,
        1200,
        390,
        728,
        1050,
        1260,
        420,
        784,
        1140,
        1350,
        450,
        812,
        1200,
        1440,
        480,
        868,
        1290,
        1530,
        510,
        924,
        1350,
        1620,
        540,
        980,
        1440,
        1710,
        570,
        1036,
        1530,
        1800,
        570,
        1064,
        1590,
        1890,
        600,
        1120,
        1680,
        1980,
        630,
        1204,
        1770,
        2100,
        660,
        1260,
        1860,
        2220,
        720,
        1316,
        1950,
        2310,
        750,
        1372,
        2040,
        2430
      ];
      exports.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
        switch (errorCorrectionLevel) {
          case ECLevel.L:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
          case ECLevel.M:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
          case ECLevel.Q:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
          case ECLevel.H:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
          default:
            return void 0;
        }
      };
      exports.getTotalCodewordsCount = function getTotalCodewordsCount(version, errorCorrectionLevel) {
        switch (errorCorrectionLevel) {
          case ECLevel.L:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
          case ECLevel.M:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
          case ECLevel.Q:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
          case ECLevel.H:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
          default:
            return void 0;
        }
      };
    }
  });

  // node_modules/qrcode/lib/core/galois-field.js
  var require_galois_field = __commonJS({
    "node_modules/qrcode/lib/core/galois-field.js"(exports) {
      var EXP_TABLE = new Uint8Array(512);
      var LOG_TABLE = new Uint8Array(256);
      (function initTables() {
        let x = 1;
        for (let i = 0; i < 255; i++) {
          EXP_TABLE[i] = x;
          LOG_TABLE[x] = i;
          x <<= 1;
          if (x & 256) {
            x ^= 285;
          }
        }
        for (let i = 255; i < 512; i++) {
          EXP_TABLE[i] = EXP_TABLE[i - 255];
        }
      })();
      exports.log = function log(n) {
        if (n < 1) throw new Error("log(" + n + ")");
        return LOG_TABLE[n];
      };
      exports.exp = function exp(n) {
        return EXP_TABLE[n];
      };
      exports.mul = function mul(x, y) {
        if (x === 0 || y === 0) return 0;
        return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
      };
    }
  });

  // node_modules/qrcode/lib/core/polynomial.js
  var require_polynomial = __commonJS({
    "node_modules/qrcode/lib/core/polynomial.js"(exports) {
      var GF = require_galois_field();
      exports.mul = function mul(p1, p2) {
        const coeff = new Uint8Array(p1.length + p2.length - 1);
        for (let i = 0; i < p1.length; i++) {
          for (let j = 0; j < p2.length; j++) {
            coeff[i + j] ^= GF.mul(p1[i], p2[j]);
          }
        }
        return coeff;
      };
      exports.mod = function mod(divident, divisor) {
        let result = new Uint8Array(divident);
        while (result.length - divisor.length >= 0) {
          const coeff = result[0];
          for (let i = 0; i < divisor.length; i++) {
            result[i] ^= GF.mul(divisor[i], coeff);
          }
          let offset = 0;
          while (offset < result.length && result[offset] === 0) offset++;
          result = result.slice(offset);
        }
        return result;
      };
      exports.generateECPolynomial = function generateECPolynomial(degree) {
        let poly = new Uint8Array([1]);
        for (let i = 0; i < degree; i++) {
          poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
        }
        return poly;
      };
    }
  });

  // node_modules/qrcode/lib/core/reed-solomon-encoder.js
  var require_reed_solomon_encoder = __commonJS({
    "node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports, module) {
      var Polynomial = require_polynomial();
      function ReedSolomonEncoder(degree) {
        this.genPoly = void 0;
        this.degree = degree;
        if (this.degree) this.initialize(this.degree);
      }
      ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
        this.degree = degree;
        this.genPoly = Polynomial.generateECPolynomial(this.degree);
      };
      ReedSolomonEncoder.prototype.encode = function encode(data) {
        if (!this.genPoly) {
          throw new Error("Encoder not initialized");
        }
        const paddedData = new Uint8Array(data.length + this.degree);
        paddedData.set(data);
        const remainder = Polynomial.mod(paddedData, this.genPoly);
        const start = this.degree - remainder.length;
        if (start > 0) {
          const buff = new Uint8Array(this.degree);
          buff.set(remainder, start);
          return buff;
        }
        return remainder;
      };
      module.exports = ReedSolomonEncoder;
    }
  });

  // node_modules/qrcode/lib/core/version-check.js
  var require_version_check = __commonJS({
    "node_modules/qrcode/lib/core/version-check.js"(exports) {
      exports.isValid = function isValid(version) {
        return !isNaN(version) && version >= 1 && version <= 40;
      };
    }
  });

  // node_modules/qrcode/lib/core/regex.js
  var require_regex = __commonJS({
    "node_modules/qrcode/lib/core/regex.js"(exports) {
      var numeric = "[0-9]+";
      var alphanumeric = "[A-Z $%*+\\-./:]+";
      var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
      kanji = kanji.replace(/u/g, "\\u");
      var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
      exports.KANJI = new RegExp(kanji, "g");
      exports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
      exports.BYTE = new RegExp(byte, "g");
      exports.NUMERIC = new RegExp(numeric, "g");
      exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");
      var TEST_KANJI = new RegExp("^" + kanji + "$");
      var TEST_NUMERIC = new RegExp("^" + numeric + "$");
      var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
      exports.testKanji = function testKanji(str) {
        return TEST_KANJI.test(str);
      };
      exports.testNumeric = function testNumeric(str) {
        return TEST_NUMERIC.test(str);
      };
      exports.testAlphanumeric = function testAlphanumeric(str) {
        return TEST_ALPHANUMERIC.test(str);
      };
    }
  });

  // node_modules/qrcode/lib/core/mode.js
  var require_mode = __commonJS({
    "node_modules/qrcode/lib/core/mode.js"(exports) {
      var VersionCheck = require_version_check();
      var Regex = require_regex();
      exports.NUMERIC = {
        id: "Numeric",
        bit: 1 << 0,
        ccBits: [10, 12, 14]
      };
      exports.ALPHANUMERIC = {
        id: "Alphanumeric",
        bit: 1 << 1,
        ccBits: [9, 11, 13]
      };
      exports.BYTE = {
        id: "Byte",
        bit: 1 << 2,
        ccBits: [8, 16, 16]
      };
      exports.KANJI = {
        id: "Kanji",
        bit: 1 << 3,
        ccBits: [8, 10, 12]
      };
      exports.MIXED = {
        bit: -1
      };
      exports.getCharCountIndicator = function getCharCountIndicator(mode, version) {
        if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
        if (!VersionCheck.isValid(version)) {
          throw new Error("Invalid version: " + version);
        }
        if (version >= 1 && version < 10) return mode.ccBits[0];
        else if (version < 27) return mode.ccBits[1];
        return mode.ccBits[2];
      };
      exports.getBestModeForData = function getBestModeForData(dataStr) {
        if (Regex.testNumeric(dataStr)) return exports.NUMERIC;
        else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC;
        else if (Regex.testKanji(dataStr)) return exports.KANJI;
        else return exports.BYTE;
      };
      exports.toString = function toString(mode) {
        if (mode && mode.id) return mode.id;
        throw new Error("Invalid mode");
      };
      exports.isValid = function isValid(mode) {
        return mode && mode.bit && mode.ccBits;
      };
      function fromString(string) {
        if (typeof string !== "string") {
          throw new Error("Param is not a string");
        }
        const lcStr = string.toLowerCase();
        switch (lcStr) {
          case "numeric":
            return exports.NUMERIC;
          case "alphanumeric":
            return exports.ALPHANUMERIC;
          case "kanji":
            return exports.KANJI;
          case "byte":
            return exports.BYTE;
          default:
            throw new Error("Unknown mode: " + string);
        }
      }
      exports.from = function from(value, defaultValue) {
        if (exports.isValid(value)) {
          return value;
        }
        try {
          return fromString(value);
        } catch (e) {
          return defaultValue;
        }
      };
    }
  });

  // node_modules/qrcode/lib/core/version.js
  var require_version = __commonJS({
    "node_modules/qrcode/lib/core/version.js"(exports) {
      var Utils = require_utils();
      var ECCode = require_error_correction_code();
      var ECLevel = require_error_correction_level();
      var Mode = require_mode();
      var VersionCheck = require_version_check();
      var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
      var G18_BCH = Utils.getBCHDigit(G18);
      function getBestVersionForDataLength(mode, length2, errorCorrectionLevel) {
        for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
          if (length2 <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
            return currentVersion;
          }
        }
        return void 0;
      }
      function getReservedBitsCount(mode, version) {
        return Mode.getCharCountIndicator(mode, version) + 4;
      }
      function getTotalBitsFromDataArray(segments, version) {
        let totalBits = 0;
        segments.forEach(function(data) {
          const reservedBits = getReservedBitsCount(data.mode, version);
          totalBits += reservedBits + data.getBitsLength();
        });
        return totalBits;
      }
      function getBestVersionForMixedData(segments, errorCorrectionLevel) {
        for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
          const length2 = getTotalBitsFromDataArray(segments, currentVersion);
          if (length2 <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
            return currentVersion;
          }
        }
        return void 0;
      }
      exports.from = function from(value, defaultValue) {
        if (VersionCheck.isValid(value)) {
          return parseInt(value, 10);
        }
        return defaultValue;
      };
      exports.getCapacity = function getCapacity(version, errorCorrectionLevel, mode) {
        if (!VersionCheck.isValid(version)) {
          throw new Error("Invalid QR Code version");
        }
        if (typeof mode === "undefined") mode = Mode.BYTE;
        const totalCodewords = Utils.getSymbolTotalCodewords(version);
        const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
        const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
        if (mode === Mode.MIXED) return dataTotalCodewordsBits;
        const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
        switch (mode) {
          case Mode.NUMERIC:
            return Math.floor(usableBits / 10 * 3);
          case Mode.ALPHANUMERIC:
            return Math.floor(usableBits / 11 * 2);
          case Mode.KANJI:
            return Math.floor(usableBits / 13);
          case Mode.BYTE:
          default:
            return Math.floor(usableBits / 8);
        }
      };
      exports.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
        let seg;
        const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
        if (Array.isArray(data)) {
          if (data.length > 1) {
            return getBestVersionForMixedData(data, ecl);
          }
          if (data.length === 0) {
            return 1;
          }
          seg = data[0];
        } else {
          seg = data;
        }
        return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
      };
      exports.getEncodedBits = function getEncodedBits(version) {
        if (!VersionCheck.isValid(version) || version < 7) {
          throw new Error("Invalid QR Code version");
        }
        let d = version << 12;
        while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
          d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
        }
        return version << 12 | d;
      };
    }
  });

  // node_modules/qrcode/lib/core/format-info.js
  var require_format_info = __commonJS({
    "node_modules/qrcode/lib/core/format-info.js"(exports) {
      var Utils = require_utils();
      var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
      var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
      var G15_BCH = Utils.getBCHDigit(G15);
      exports.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
        const data = errorCorrectionLevel.bit << 3 | mask;
        let d = data << 10;
        while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
          d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
        }
        return (data << 10 | d) ^ G15_MASK;
      };
    }
  });

  // node_modules/qrcode/lib/core/numeric-data.js
  var require_numeric_data = __commonJS({
    "node_modules/qrcode/lib/core/numeric-data.js"(exports, module) {
      var Mode = require_mode();
      function NumericData(data) {
        this.mode = Mode.NUMERIC;
        this.data = data.toString();
      }
      NumericData.getBitsLength = function getBitsLength(length2) {
        return 10 * Math.floor(length2 / 3) + (length2 % 3 ? length2 % 3 * 3 + 1 : 0);
      };
      NumericData.prototype.getLength = function getLength() {
        return this.data.length;
      };
      NumericData.prototype.getBitsLength = function getBitsLength() {
        return NumericData.getBitsLength(this.data.length);
      };
      NumericData.prototype.write = function write(bitBuffer) {
        let i, group, value;
        for (i = 0; i + 3 <= this.data.length; i += 3) {
          group = this.data.substr(i, 3);
          value = parseInt(group, 10);
          bitBuffer.put(value, 10);
        }
        const remainingNum = this.data.length - i;
        if (remainingNum > 0) {
          group = this.data.substr(i);
          value = parseInt(group, 10);
          bitBuffer.put(value, remainingNum * 3 + 1);
        }
      };
      module.exports = NumericData;
    }
  });

  // node_modules/qrcode/lib/core/alphanumeric-data.js
  var require_alphanumeric_data = __commonJS({
    "node_modules/qrcode/lib/core/alphanumeric-data.js"(exports, module) {
      var Mode = require_mode();
      var ALPHA_NUM_CHARS = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
        " ",
        "$",
        "%",
        "*",
        "+",
        "-",
        ".",
        "/",
        ":"
      ];
      function AlphanumericData(data) {
        this.mode = Mode.ALPHANUMERIC;
        this.data = data;
      }
      AlphanumericData.getBitsLength = function getBitsLength(length2) {
        return 11 * Math.floor(length2 / 2) + 6 * (length2 % 2);
      };
      AlphanumericData.prototype.getLength = function getLength() {
        return this.data.length;
      };
      AlphanumericData.prototype.getBitsLength = function getBitsLength() {
        return AlphanumericData.getBitsLength(this.data.length);
      };
      AlphanumericData.prototype.write = function write(bitBuffer) {
        let i;
        for (i = 0; i + 2 <= this.data.length; i += 2) {
          let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
          value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
          bitBuffer.put(value, 11);
        }
        if (this.data.length % 2) {
          bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
        }
      };
      module.exports = AlphanumericData;
    }
  });

  // node_modules/qrcode/lib/core/byte-data.js
  var require_byte_data = __commonJS({
    "node_modules/qrcode/lib/core/byte-data.js"(exports, module) {
      var Mode = require_mode();
      function ByteData(data) {
        this.mode = Mode.BYTE;
        if (typeof data === "string") {
          this.data = new TextEncoder().encode(data);
        } else {
          this.data = new Uint8Array(data);
        }
      }
      ByteData.getBitsLength = function getBitsLength(length2) {
        return length2 * 8;
      };
      ByteData.prototype.getLength = function getLength() {
        return this.data.length;
      };
      ByteData.prototype.getBitsLength = function getBitsLength() {
        return ByteData.getBitsLength(this.data.length);
      };
      ByteData.prototype.write = function(bitBuffer) {
        for (let i = 0, l = this.data.length; i < l; i++) {
          bitBuffer.put(this.data[i], 8);
        }
      };
      module.exports = ByteData;
    }
  });

  // node_modules/qrcode/lib/core/kanji-data.js
  var require_kanji_data = __commonJS({
    "node_modules/qrcode/lib/core/kanji-data.js"(exports, module) {
      var Mode = require_mode();
      var Utils = require_utils();
      function KanjiData(data) {
        this.mode = Mode.KANJI;
        this.data = data;
      }
      KanjiData.getBitsLength = function getBitsLength(length2) {
        return length2 * 13;
      };
      KanjiData.prototype.getLength = function getLength() {
        return this.data.length;
      };
      KanjiData.prototype.getBitsLength = function getBitsLength() {
        return KanjiData.getBitsLength(this.data.length);
      };
      KanjiData.prototype.write = function(bitBuffer) {
        let i;
        for (i = 0; i < this.data.length; i++) {
          let value = Utils.toSJIS(this.data[i]);
          if (value >= 33088 && value <= 40956) {
            value -= 33088;
          } else if (value >= 57408 && value <= 60351) {
            value -= 49472;
          } else {
            throw new Error(
              "Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8"
            );
          }
          value = (value >>> 8 & 255) * 192 + (value & 255);
          bitBuffer.put(value, 13);
        }
      };
      module.exports = KanjiData;
    }
  });

  // node_modules/dijkstrajs/dijkstra.js
  var require_dijkstra = __commonJS({
    "node_modules/dijkstrajs/dijkstra.js"(exports, module) {
      "use strict";
      var dijkstra = {
        single_source_shortest_paths: function(graph, s, d) {
          var predecessors = {};
          var costs = {};
          costs[s] = 0;
          var open = dijkstra.PriorityQueue.make();
          open.push(s, 0);
          var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
          while (!open.empty()) {
            closest = open.pop();
            u = closest.value;
            cost_of_s_to_u = closest.cost;
            adjacent_nodes = graph[u] || {};
            for (v in adjacent_nodes) {
              if (adjacent_nodes.hasOwnProperty(v)) {
                cost_of_e = adjacent_nodes[v];
                cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
                cost_of_s_to_v = costs[v];
                first_visit = typeof costs[v] === "undefined";
                if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                  costs[v] = cost_of_s_to_u_plus_cost_of_e;
                  open.push(v, cost_of_s_to_u_plus_cost_of_e);
                  predecessors[v] = u;
                }
              }
            }
          }
          if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
            var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
            throw new Error(msg);
          }
          return predecessors;
        },
        extract_shortest_path_from_predecessor_list: function(predecessors, d) {
          var nodes = [];
          var u = d;
          var predecessor;
          while (u) {
            nodes.push(u);
            predecessor = predecessors[u];
            u = predecessors[u];
          }
          nodes.reverse();
          return nodes;
        },
        find_path: function(graph, s, d) {
          var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
          return dijkstra.extract_shortest_path_from_predecessor_list(
            predecessors,
            d
          );
        },
        /**
         * A very naive priority queue implementation.
         */
        PriorityQueue: {
          make: function(opts) {
            var T = dijkstra.PriorityQueue, t = {}, key;
            opts = opts || {};
            for (key in T) {
              if (T.hasOwnProperty(key)) {
                t[key] = T[key];
              }
            }
            t.queue = [];
            t.sorter = opts.sorter || T.default_sorter;
            return t;
          },
          default_sorter: function(a, b) {
            return a.cost - b.cost;
          },
          /**
           * Add a new item to the queue and ensure the highest priority element
           * is at the front of the queue.
           */
          push: function(value, cost) {
            var item = { value, cost };
            this.queue.push(item);
            this.queue.sort(this.sorter);
          },
          /**
           * Return the highest priority element in the queue.
           */
          pop: function() {
            return this.queue.shift();
          },
          empty: function() {
            return this.queue.length === 0;
          }
        }
      };
      if (typeof module !== "undefined") {
        module.exports = dijkstra;
      }
    }
  });

  // node_modules/qrcode/lib/core/segments.js
  var require_segments = __commonJS({
    "node_modules/qrcode/lib/core/segments.js"(exports) {
      var Mode = require_mode();
      var NumericData = require_numeric_data();
      var AlphanumericData = require_alphanumeric_data();
      var ByteData = require_byte_data();
      var KanjiData = require_kanji_data();
      var Regex = require_regex();
      var Utils = require_utils();
      var dijkstra = require_dijkstra();
      function getStringByteLength(str) {
        return unescape(encodeURIComponent(str)).length;
      }
      function getSegments(regex, mode, str) {
        const segments = [];
        let result;
        while ((result = regex.exec(str)) !== null) {
          segments.push({
            data: result[0],
            index: result.index,
            mode,
            length: result[0].length
          });
        }
        return segments;
      }
      function getSegmentsFromString(dataStr) {
        const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
        const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
        let byteSegs;
        let kanjiSegs;
        if (Utils.isKanjiModeEnabled()) {
          byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
          kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
        } else {
          byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
          kanjiSegs = [];
        }
        const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
        return segs.sort(function(s1, s2) {
          return s1.index - s2.index;
        }).map(function(obj) {
          return {
            data: obj.data,
            mode: obj.mode,
            length: obj.length
          };
        });
      }
      function getSegmentBitsLength(length2, mode) {
        switch (mode) {
          case Mode.NUMERIC:
            return NumericData.getBitsLength(length2);
          case Mode.ALPHANUMERIC:
            return AlphanumericData.getBitsLength(length2);
          case Mode.KANJI:
            return KanjiData.getBitsLength(length2);
          case Mode.BYTE:
            return ByteData.getBitsLength(length2);
        }
      }
      function mergeSegments(segs) {
        return segs.reduce(function(acc, curr) {
          const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
          if (prevSeg && prevSeg.mode === curr.mode) {
            acc[acc.length - 1].data += curr.data;
            return acc;
          }
          acc.push(curr);
          return acc;
        }, []);
      }
      function buildNodes(segs) {
        const nodes = [];
        for (let i = 0; i < segs.length; i++) {
          const seg = segs[i];
          switch (seg.mode) {
            case Mode.NUMERIC:
              nodes.push([
                seg,
                { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
                { data: seg.data, mode: Mode.BYTE, length: seg.length }
              ]);
              break;
            case Mode.ALPHANUMERIC:
              nodes.push([
                seg,
                { data: seg.data, mode: Mode.BYTE, length: seg.length }
              ]);
              break;
            case Mode.KANJI:
              nodes.push([
                seg,
                { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
              ]);
              break;
            case Mode.BYTE:
              nodes.push([
                { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
              ]);
          }
        }
        return nodes;
      }
      function buildGraph(nodes, version) {
        const table = {};
        const graph = { start: {} };
        let prevNodeIds = ["start"];
        for (let i = 0; i < nodes.length; i++) {
          const nodeGroup = nodes[i];
          const currentNodeIds = [];
          for (let j = 0; j < nodeGroup.length; j++) {
            const node = nodeGroup[j];
            const key = "" + i + j;
            currentNodeIds.push(key);
            table[key] = { node, lastCount: 0 };
            graph[key] = {};
            for (let n = 0; n < prevNodeIds.length; n++) {
              const prevNodeId = prevNodeIds[n];
              if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
                graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
                table[prevNodeId].lastCount += node.length;
              } else {
                if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
                graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version);
              }
            }
          }
          prevNodeIds = currentNodeIds;
        }
        for (let n = 0; n < prevNodeIds.length; n++) {
          graph[prevNodeIds[n]].end = 0;
        }
        return { map: graph, table };
      }
      function buildSingleSegment(data, modesHint) {
        let mode;
        const bestMode = Mode.getBestModeForData(data);
        mode = Mode.from(modesHint, bestMode);
        if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
          throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
        }
        if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
          mode = Mode.BYTE;
        }
        switch (mode) {
          case Mode.NUMERIC:
            return new NumericData(data);
          case Mode.ALPHANUMERIC:
            return new AlphanumericData(data);
          case Mode.KANJI:
            return new KanjiData(data);
          case Mode.BYTE:
            return new ByteData(data);
        }
      }
      exports.fromArray = function fromArray(array) {
        return array.reduce(function(acc, seg) {
          if (typeof seg === "string") {
            acc.push(buildSingleSegment(seg, null));
          } else if (seg.data) {
            acc.push(buildSingleSegment(seg.data, seg.mode));
          }
          return acc;
        }, []);
      };
      exports.fromString = function fromString(data, version) {
        const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
        const nodes = buildNodes(segs);
        const graph = buildGraph(nodes, version);
        const path = dijkstra.find_path(graph.map, "start", "end");
        const optimizedSegs = [];
        for (let i = 1; i < path.length - 1; i++) {
          optimizedSegs.push(graph.table[path[i]].node);
        }
        return exports.fromArray(mergeSegments(optimizedSegs));
      };
      exports.rawSplit = function rawSplit(data) {
        return exports.fromArray(
          getSegmentsFromString(data, Utils.isKanjiModeEnabled())
        );
      };
    }
  });

  // node_modules/qrcode/lib/core/qrcode.js
  var require_qrcode = __commonJS({
    "node_modules/qrcode/lib/core/qrcode.js"(exports) {
      var Utils = require_utils();
      var ECLevel = require_error_correction_level();
      var BitBuffer = require_bit_buffer();
      var BitMatrix = require_bit_matrix();
      var AlignmentPattern = require_alignment_pattern();
      var FinderPattern = require_finder_pattern();
      var MaskPattern = require_mask_pattern();
      var ECCode = require_error_correction_code();
      var ReedSolomonEncoder = require_reed_solomon_encoder();
      var Version = require_version();
      var FormatInfo = require_format_info();
      var Mode = require_mode();
      var Segments = require_segments();
      function setupFinderPattern(matrix, version) {
        const size = matrix.size;
        const pos = FinderPattern.getPositions(version);
        for (let i = 0; i < pos.length; i++) {
          const row = pos[i][0];
          const col = pos[i][1];
          for (let r = -1; r <= 7; r++) {
            if (row + r <= -1 || size <= row + r) continue;
            for (let c = -1; c <= 7; c++) {
              if (col + c <= -1 || size <= col + c) continue;
              if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
                matrix.set(row + r, col + c, true, true);
              } else {
                matrix.set(row + r, col + c, false, true);
              }
            }
          }
        }
      }
      function setupTimingPattern(matrix) {
        const size = matrix.size;
        for (let r = 8; r < size - 8; r++) {
          const value = r % 2 === 0;
          matrix.set(r, 6, value, true);
          matrix.set(6, r, value, true);
        }
      }
      function setupAlignmentPattern(matrix, version) {
        const pos = AlignmentPattern.getPositions(version);
        for (let i = 0; i < pos.length; i++) {
          const row = pos[i][0];
          const col = pos[i][1];
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
                matrix.set(row + r, col + c, true, true);
              } else {
                matrix.set(row + r, col + c, false, true);
              }
            }
          }
        }
      }
      function setupVersionInfo(matrix, version) {
        const size = matrix.size;
        const bits = Version.getEncodedBits(version);
        let row, col, mod;
        for (let i = 0; i < 18; i++) {
          row = Math.floor(i / 3);
          col = i % 3 + size - 8 - 3;
          mod = (bits >> i & 1) === 1;
          matrix.set(row, col, mod, true);
          matrix.set(col, row, mod, true);
        }
      }
      function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
        const size = matrix.size;
        const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
        let i, mod;
        for (i = 0; i < 15; i++) {
          mod = (bits >> i & 1) === 1;
          if (i < 6) {
            matrix.set(i, 8, mod, true);
          } else if (i < 8) {
            matrix.set(i + 1, 8, mod, true);
          } else {
            matrix.set(size - 15 + i, 8, mod, true);
          }
          if (i < 8) {
            matrix.set(8, size - i - 1, mod, true);
          } else if (i < 9) {
            matrix.set(8, 15 - i - 1 + 1, mod, true);
          } else {
            matrix.set(8, 15 - i - 1, mod, true);
          }
        }
        matrix.set(size - 8, 8, 1, true);
      }
      function setupData(matrix, data) {
        const size = matrix.size;
        let inc = -1;
        let row = size - 1;
        let bitIndex = 7;
        let byteIndex = 0;
        for (let col = size - 1; col > 0; col -= 2) {
          if (col === 6) col--;
          while (true) {
            for (let c = 0; c < 2; c++) {
              if (!matrix.isReserved(row, col - c)) {
                let dark = false;
                if (byteIndex < data.length) {
                  dark = (data[byteIndex] >>> bitIndex & 1) === 1;
                }
                matrix.set(row, col - c, dark);
                bitIndex--;
                if (bitIndex === -1) {
                  byteIndex++;
                  bitIndex = 7;
                }
              }
            }
            row += inc;
            if (row < 0 || size <= row) {
              row -= inc;
              inc = -inc;
              break;
            }
          }
        }
      }
      function createData(version, errorCorrectionLevel, segments) {
        const buffer = new BitBuffer();
        segments.forEach(function(data) {
          buffer.put(data.mode.bit, 4);
          buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
          data.write(buffer);
        });
        const totalCodewords = Utils.getSymbolTotalCodewords(version);
        const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
        const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
        if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
          buffer.put(0, 4);
        }
        while (buffer.getLengthInBits() % 8 !== 0) {
          buffer.putBit(0);
        }
        const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
        for (let i = 0; i < remainingByte; i++) {
          buffer.put(i % 2 ? 17 : 236, 8);
        }
        return createCodewords(buffer, version, errorCorrectionLevel);
      }
      function createCodewords(bitBuffer, version, errorCorrectionLevel) {
        const totalCodewords = Utils.getSymbolTotalCodewords(version);
        const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
        const dataTotalCodewords = totalCodewords - ecTotalCodewords;
        const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
        const blocksInGroup2 = totalCodewords % ecTotalBlocks;
        const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
        const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
        const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
        const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
        const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
        const rs = new ReedSolomonEncoder(ecCount);
        let offset = 0;
        const dcData = new Array(ecTotalBlocks);
        const ecData = new Array(ecTotalBlocks);
        let maxDataSize = 0;
        const buffer = new Uint8Array(bitBuffer.buffer);
        for (let b = 0; b < ecTotalBlocks; b++) {
          const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
          dcData[b] = buffer.slice(offset, offset + dataSize);
          ecData[b] = rs.encode(dcData[b]);
          offset += dataSize;
          maxDataSize = Math.max(maxDataSize, dataSize);
        }
        const data = new Uint8Array(totalCodewords);
        let index = 0;
        let i, r;
        for (i = 0; i < maxDataSize; i++) {
          for (r = 0; r < ecTotalBlocks; r++) {
            if (i < dcData[r].length) {
              data[index++] = dcData[r][i];
            }
          }
        }
        for (i = 0; i < ecCount; i++) {
          for (r = 0; r < ecTotalBlocks; r++) {
            data[index++] = ecData[r][i];
          }
        }
        return data;
      }
      function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
        let segments;
        if (Array.isArray(data)) {
          segments = Segments.fromArray(data);
        } else if (typeof data === "string") {
          let estimatedVersion = version;
          if (!estimatedVersion) {
            const rawSegments = Segments.rawSplit(data);
            estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
          }
          segments = Segments.fromString(data, estimatedVersion || 40);
        } else {
          throw new Error("Invalid data");
        }
        const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
        if (!bestVersion) {
          throw new Error("The amount of data is too big to be stored in a QR Code");
        }
        if (!version) {
          version = bestVersion;
        } else if (version < bestVersion) {
          throw new Error(
            "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
          );
        }
        const dataBits = createData(version, errorCorrectionLevel, segments);
        const moduleCount = Utils.getSymbolSize(version);
        const modules = new BitMatrix(moduleCount);
        setupFinderPattern(modules, version);
        setupTimingPattern(modules);
        setupAlignmentPattern(modules, version);
        setupFormatInfo(modules, errorCorrectionLevel, 0);
        if (version >= 7) {
          setupVersionInfo(modules, version);
        }
        setupData(modules, dataBits);
        if (isNaN(maskPattern)) {
          maskPattern = MaskPattern.getBestMask(
            modules,
            setupFormatInfo.bind(null, modules, errorCorrectionLevel)
          );
        }
        MaskPattern.applyMask(maskPattern, modules);
        setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
        return {
          modules,
          version,
          errorCorrectionLevel,
          maskPattern,
          segments
        };
      }
      exports.create = function create(data, options) {
        if (typeof data === "undefined" || data === "") {
          throw new Error("No input text");
        }
        let errorCorrectionLevel = ECLevel.M;
        let version;
        let mask;
        if (typeof options !== "undefined") {
          errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
          version = Version.from(options.version);
          mask = MaskPattern.from(options.maskPattern);
          if (options.toSJISFunc) {
            Utils.setToSJISFunction(options.toSJISFunc);
          }
        }
        return createSymbol(data, version, errorCorrectionLevel, mask);
      };
    }
  });

  // node_modules/qrcode/lib/renderer/utils.js
  var require_utils2 = __commonJS({
    "node_modules/qrcode/lib/renderer/utils.js"(exports) {
      function hex2rgba(hex) {
        if (typeof hex === "number") {
          hex = hex.toString();
        }
        if (typeof hex !== "string") {
          throw new Error("Color should be defined as hex string");
        }
        let hexCode = hex.slice().replace("#", "").split("");
        if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
          throw new Error("Invalid hex color: " + hex);
        }
        if (hexCode.length === 3 || hexCode.length === 4) {
          hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
            return [c, c];
          }));
        }
        if (hexCode.length === 6) hexCode.push("F", "F");
        const hexValue = parseInt(hexCode.join(""), 16);
        return {
          r: hexValue >> 24 & 255,
          g: hexValue >> 16 & 255,
          b: hexValue >> 8 & 255,
          a: hexValue & 255,
          hex: "#" + hexCode.slice(0, 6).join("")
        };
      }
      exports.getOptions = function getOptions(options) {
        if (!options) options = {};
        if (!options.color) options.color = {};
        const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
        const width = options.width && options.width >= 21 ? options.width : void 0;
        const scale = options.scale || 4;
        return {
          width,
          scale: width ? 4 : scale,
          margin,
          color: {
            dark: hex2rgba(options.color.dark || "#000000ff"),
            light: hex2rgba(options.color.light || "#ffffffff")
          },
          type: options.type,
          rendererOpts: options.rendererOpts || {}
        };
      };
      exports.getScale = function getScale(qrSize, opts) {
        return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
      };
      exports.getImageWidth = function getImageWidth(qrSize, opts) {
        const scale = exports.getScale(qrSize, opts);
        return Math.floor((qrSize + opts.margin * 2) * scale);
      };
      exports.qrToImageData = function qrToImageData(imgData, qr, opts) {
        const size = qr.modules.size;
        const data = qr.modules.data;
        const scale = exports.getScale(size, opts);
        const symbolSize = Math.floor((size + opts.margin * 2) * scale);
        const scaledMargin = opts.margin * scale;
        const palette = [opts.color.light, opts.color.dark];
        for (let i = 0; i < symbolSize; i++) {
          for (let j = 0; j < symbolSize; j++) {
            let posDst = (i * symbolSize + j) * 4;
            let pxColor = opts.color.light;
            if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
              const iSrc = Math.floor((i - scaledMargin) / scale);
              const jSrc = Math.floor((j - scaledMargin) / scale);
              pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
            }
            imgData[posDst++] = pxColor.r;
            imgData[posDst++] = pxColor.g;
            imgData[posDst++] = pxColor.b;
            imgData[posDst] = pxColor.a;
          }
        }
      };
    }
  });

  // node_modules/qrcode/lib/renderer/canvas.js
  var require_canvas = __commonJS({
    "node_modules/qrcode/lib/renderer/canvas.js"(exports) {
      var Utils = require_utils2();
      function clearCanvas(ctx, canvas, size) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!canvas.style) canvas.style = {};
        canvas.height = size;
        canvas.width = size;
        canvas.style.height = size + "px";
        canvas.style.width = size + "px";
      }
      function getCanvasElement() {
        try {
          return document.createElement("canvas");
        } catch (e) {
          throw new Error("You need to specify a canvas element");
        }
      }
      exports.render = function render2(qrData, canvas, options) {
        let opts = options;
        let canvasEl = canvas;
        if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
          opts = canvas;
          canvas = void 0;
        }
        if (!canvas) {
          canvasEl = getCanvasElement();
        }
        opts = Utils.getOptions(opts);
        const size = Utils.getImageWidth(qrData.modules.size, opts);
        const ctx = canvasEl.getContext("2d");
        const image = ctx.createImageData(size, size);
        Utils.qrToImageData(image.data, qrData, opts);
        clearCanvas(ctx, canvasEl, size);
        ctx.putImageData(image, 0, 0);
        return canvasEl;
      };
      exports.renderToDataURL = function renderToDataURL(qrData, canvas, options) {
        let opts = options;
        if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
          opts = canvas;
          canvas = void 0;
        }
        if (!opts) opts = {};
        const canvasEl = exports.render(qrData, canvas, opts);
        const type = opts.type || "image/png";
        const rendererOpts = opts.rendererOpts || {};
        return canvasEl.toDataURL(type, rendererOpts.quality);
      };
    }
  });

  // node_modules/qrcode/lib/renderer/svg-tag.js
  var require_svg_tag = __commonJS({
    "node_modules/qrcode/lib/renderer/svg-tag.js"(exports) {
      var Utils = require_utils2();
      function getColorAttrib(color, attrib) {
        const alpha = color.a / 255;
        const str = attrib + '="' + color.hex + '"';
        return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
      }
      function svgCmd(cmd, x, y) {
        let str = cmd + x;
        if (typeof y !== "undefined") str += " " + y;
        return str;
      }
      function qrToPath(data, size, margin) {
        let path = "";
        let moveBy = 0;
        let newRow = false;
        let lineLength = 0;
        for (let i = 0; i < data.length; i++) {
          const col = Math.floor(i % size);
          const row = Math.floor(i / size);
          if (!col && !newRow) newRow = true;
          if (data[i]) {
            lineLength++;
            if (!(i > 0 && col > 0 && data[i - 1])) {
              path += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
              moveBy = 0;
              newRow = false;
            }
            if (!(col + 1 < size && data[i + 1])) {
              path += svgCmd("h", lineLength);
              lineLength = 0;
            }
          } else {
            moveBy++;
          }
        }
        return path;
      }
      exports.render = function render2(qrData, options, cb) {
        const opts = Utils.getOptions(options);
        const size = qrData.modules.size;
        const data = qrData.modules.data;
        const qrcodesize = size + opts.margin * 2;
        const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
        const path = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
        const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
        const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
        const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + "</svg>\n";
        if (typeof cb === "function") {
          cb(null, svgTag);
        }
        return svgTag;
      };
    }
  });

  // node_modules/qrcode/lib/browser.js
  var require_browser = __commonJS({
    "node_modules/qrcode/lib/browser.js"(exports) {
      var canPromise = require_can_promise();
      var QRCode2 = require_qrcode();
      var CanvasRenderer = require_canvas();
      var SvgRenderer = require_svg_tag();
      function renderCanvas2(renderFunc, canvas, text, opts, cb) {
        const args = [].slice.call(arguments, 1);
        const argsNum = args.length;
        const isLastArgCb = typeof args[argsNum - 1] === "function";
        if (!isLastArgCb && !canPromise()) {
          throw new Error("Callback required as last argument");
        }
        if (isLastArgCb) {
          if (argsNum < 2) {
            throw new Error("Too few arguments provided");
          }
          if (argsNum === 2) {
            cb = text;
            text = canvas;
            canvas = opts = void 0;
          } else if (argsNum === 3) {
            if (canvas.getContext && typeof cb === "undefined") {
              cb = opts;
              opts = void 0;
            } else {
              cb = opts;
              opts = text;
              text = canvas;
              canvas = void 0;
            }
          }
        } else {
          if (argsNum < 1) {
            throw new Error("Too few arguments provided");
          }
          if (argsNum === 1) {
            text = canvas;
            canvas = opts = void 0;
          } else if (argsNum === 2 && !canvas.getContext) {
            opts = text;
            text = canvas;
            canvas = void 0;
          }
          return new Promise(function(resolve, reject) {
            try {
              const data = QRCode2.create(text, opts);
              resolve(renderFunc(data, canvas, opts));
            } catch (e) {
              reject(e);
            }
          });
        }
        try {
          const data = QRCode2.create(text, opts);
          cb(null, renderFunc(data, canvas, opts));
        } catch (e) {
          cb(e);
        }
      }
      exports.create = QRCode2.create;
      exports.toCanvas = renderCanvas2.bind(null, CanvasRenderer.render);
      exports.toDataURL = renderCanvas2.bind(null, CanvasRenderer.renderToDataURL);
      exports.toString = renderCanvas2.bind(null, function(data, _, opts) {
        return SvgRenderer.render(data, opts);
      });
    }
  });

  // fixtures/renderer-scene.json
  var renderer_scene_default = {
    schemaVersion: 1,
    scene: {
      id: "scene:phase-2-projection-comparison",
      title: "How world views change",
      summary: "Compare a small, rights-safe country population fixture and a point-event fixture without changing their pinned data revisions.",
      period: "2023",
      projection: "equal-earth",
      camera: { center: [0, 8], zoom: 1, pan: [0, 0] },
      selectedId: "country:FRA",
      citations: [
        {
          id: "citation:population",
          label: "UN World Population Prospects 2024, processed by Our World in Data",
          url: "https://ourworldindata.org/grapher/population",
          rights: "CC BY 3.0 IGO",
          revision: "2024-07-15"
        },
        {
          id: "citation:fixture",
          label: "Siteprep Phase 2 instructional geometry and point fixture",
          url: "https://github.com/knovak/siteprep",
          rights: "Project-authored test fixture",
          revision: "phase-2-v1"
        }
      ]
    },
    datasets: [
      {
        id: "dataset:population",
        title: "Population by country",
        profile: "place-time-series",
        revision: "dataset:owid-population-2023@2024-07-15",
        period: "2023",
        measure: "Population",
        unit: "people",
        encoding: "fixed population classes",
        projections: ["equal-earth", "airocean", "population-cartogram"],
        citationIds: ["citation:population", "citation:fixture"],
        legend: [
          { id: "small", label: "Under 70 million", min: 0, max: 7e7, color: "#5cc8ff" },
          { id: "medium", label: "70\u2013150 million", min: 7e7, max: 15e7, color: "#635bff" },
          { id: "large", label: "More than 150 million", min: 15e7, max: null, color: "#f36f9b" },
          { id: "missing", label: "Missing", status: "missing", color: "#475569" }
        ]
      },
      {
        id: "dataset:learning-centres",
        title: "Learning centres",
        profile: "points-events",
        revision: "dataset:phase-2-learning-centres@fixture-1",
        period: "2023",
        measure: "Recorded centre",
        unit: "location",
        encoding: "point symbols",
        projections: ["equal-earth", "airocean"],
        citationIds: ["citation:fixture"],
        legend: [
          { id: "observed", label: "Recorded fixture point", status: "measured", color: "#ffcc66" },
          { id: "missing", label: "Location unavailable", status: "missing", color: "#475569" }
        ]
      }
    ],
    layers: [
      { id: "layer:population", datasetId: "dataset:population", profile: "place-time-series", projections: ["equal-earth", "airocean", "population-cartogram"] },
      { id: "layer:learning-centres", datasetId: "dataset:learning-centres", profile: "points-events", projections: ["equal-earth", "airocean"] },
      { id: "layer:reference-raster", datasetId: "dataset:reference-raster", profile: "raster-frame", projections: ["equal-earth"], title: "Conventional-grid reference raster" }
    ],
    geography: {
      id: "geography:phase-2-instructional-world",
      title: "Simplified instructional country geometry",
      version: "phase-2-v1",
      caveat: "Project-authored simplified polygons are for projection behavior tests, not authoritative boundaries.",
      features: [
        { type: "Feature", id: "country:FRA", properties: { label: "France", value: 66438828, status: "measured", uncertainty: "Recorded fixture value" }, geometry: { type: "Polygon", coordinates: [[[-5, 42], [-5, 51], [8, 51], [8, 42], [-5, 42]]] } },
        { type: "Feature", id: "country:DEU", properties: { label: "Germany", value: 84548233, status: "measured", uncertainty: "Recorded fixture value" }, geometry: { type: "Polygon", coordinates: [[[5, 47], [5, 55], [15, 55], [15, 47], [5, 47]]] } },
        { type: "Feature", id: "country:GBR", properties: { label: "United Kingdom", value: 68682965, status: "measured", uncertainty: "Recorded fixture value" }, geometry: { type: "Polygon", coordinates: [[[-8, 50], [-8, 59], [2, 59], [2, 50], [-8, 50]]] } },
        { type: "Feature", id: "country:BRA", properties: { label: "Brazil", value: 211998573, status: "measured", uncertainty: "Illustrative WPP-derived fixture value" }, geometry: { type: "Polygon", coordinates: [[[-74, -34], [-74, -8], [-60, 12], [-35, 5], [-35, -34], [-74, -34]]] } },
        { type: "Feature", id: "country:AUS", properties: { label: "Australia", value: 26451e3, status: "measured", uncertainty: "Illustrative fixture value" }, geometry: { type: "Polygon", coordinates: [[[113, -44], [113, -22], [129, -10], [154, -10], [154, -44], [113, -44]]] } },
        { type: "Feature", id: "country:UNK", properties: { label: "No reported value", value: null, status: "missing", uncertainty: "Missing by design" }, geometry: { type: "Polygon", coordinates: [[[20, 5], [20, 18], [37, 18], [37, 5], [20, 5]]] } }
      ]
    },
    points: [
      { id: "point:paris", label: "Paris learning centre", coordinates: [2.35, 48.86], value: 1, status: "measured", uncertainty: "Rounded city coordinate" },
      { id: "point:nairobi", label: "Nairobi learning centre", coordinates: [36.82, -1.29], value: 1, status: "measured", uncertainty: "Rounded city coordinate" },
      { id: "point:seoul", label: "Seoul learning centre", coordinates: [126.98, 37.57], value: 1, status: "measured", uncertainty: "Rounded city coordinate" },
      { id: "point:lima", label: "Lima learning centre", coordinates: [-77.04, -12.05], value: 1, status: "measured", uncertainty: "Rounded city coordinate" },
      { id: "point:suva", label: "Suva learning centre", coordinates: [178.45, -18.14], value: 1, status: "measured", uncertainty: "Rounded city coordinate" }
    ],
    cartogram: {
      id: "cartogram:population-2023-fixture",
      source: "UN World Population Prospects 2024",
      year: "2023",
      geometryVersion: "phase-2-fixed-v1",
      caveat: "Fixed instructional rectangles preserve region colors but are not calculated cartogram boundaries.",
      cells: [
        { id: "country:GBR", x: 0.29, y: 0.2, width: 0.12, height: 0.18 },
        { id: "country:FRA", x: 0.42, y: 0.28, width: 0.13, height: 0.2 },
        { id: "country:DEU", x: 0.56, y: 0.18, width: 0.15, height: 0.23 },
        { id: "country:BRA", x: 0.18, y: 0.54, width: 0.26, height: 0.32 },
        { id: "country:AUS", x: 0.69, y: 0.6, width: 0.18, height: 0.17 },
        { id: "country:UNK", x: 0.54, y: 0.48, width: 0.1, height: 0.12 }
      ]
    }
  };

  // fixtures/temporal-scene.json
  var temporal_scene_default = {
    schemaVersion: 1,
    sceneId: "scene:phase-3-time-and-movement",
    projection: "equal-earth",
    timeline: ["2022", "2023-06", "2024"],
    layers: [
      {
        id: "layer:population-through-time",
        title: "Population field",
        kind: "scalar",
        unit: "people",
        revision: "fixture:population-time-v1",
        projections: ["equal-earth", "airocean", "population-cartogram"],
        defaultActive: true,
        alignment: { method: "nearest", maxDays: 370 },
        observations: [
          { period: "2022", records: [{ id: "country:FRA", value: 655e5, status: "measured" }, { id: "country:DEU", value: 837e5, status: "measured" }, { id: "country:UNK", value: null, status: "suppressed" }] },
          { period: "2023", records: [{ id: "country:FRA", value: 66438828, status: "measured" }, { id: "country:DEU", value: 84548233, status: "measured" }, { id: "country:UNK", value: 0, status: "zero" }] },
          { period: "2024", records: [{ id: "country:FRA", value: 668e5, status: "measured" }, { id: "country:DEU", value: null, status: "unavailable" }, { id: "country:UNK", value: null, status: "filtered" }] }
        ]
      },
      {
        id: "layer:education-index",
        title: "Education access index",
        kind: "scalar",
        unit: "index points",
        revision: "fixture:education-index-v1",
        color: "#ffcc66",
        overlay: true,
        projections: ["equal-earth", "airocean", "population-cartogram"],
        defaultActive: true,
        alignment: { method: "interpolate" },
        observations: [
          { period: "2022", records: [{ id: "country:FRA", value: 71, status: "measured" }, { id: "country:DEU", value: 74, status: "measured" }] },
          { period: "2024", records: [{ id: "country:FRA", value: 75, status: "measured" }, { id: "country:DEU", value: 78, status: "measured" }] }
        ]
      },
      {
        id: "layer:learner-movement",
        title: "Learner movement",
        kind: "flow",
        unit: "people",
        revision: "fixture:learner-flow-v1",
        color: "#f36f9b",
        projections: ["equal-earth", "airocean"],
        defaultActive: true,
        alignment: { method: "nearest", maxDays: 400 },
        observations: [
          { period: "2023-05-15", records: [{ id: "flow:paris-berlin", from: "country:FRA", to: "country:DEU", fromCoordinates: [2.35, 48.86], toCoordinates: [13.4, 52.52], value: 36, status: "measured" }, { id: "flow:london-paris", from: "country:GBR", to: "country:FRA", fromCoordinates: [-0.13, 51.51], toCoordinates: [2.35, 48.86], value: 0, status: "zero" }, { id: "flow:unknown", from: "country:UNK", to: "country:FRA", fromCoordinates: [28, 11], toCoordinates: [2.35, 48.86], value: null, status: "missing" }] },
          { period: "2024-04-10", records: [{ id: "flow:paris-berlin", from: "country:FRA", to: "country:DEU", fromCoordinates: [2.35, 48.86], toCoordinates: [13.4, 52.52], value: 49, status: "measured" }] }
        ]
      },
      {
        id: "layer:temporary-centres",
        title: "Temporary learning centres",
        kind: "points",
        unit: "locations",
        revision: "fixture:temporary-centres-v1",
        color: "#7fe2ff",
        projections: ["equal-earth", "airocean"],
        defaultActive: true,
        records: [
          { id: "point:paris-summer", label: "Paris summer centre", coordinates: [2.35, 48.86], start: "2023-05", end: "2023-09", value: 1, status: "measured" },
          { id: "point:nairobi-2024", label: "Nairobi 2024 centre", coordinates: [36.82, -1.29], start: "2024-01", end: "2024-12", value: 1, status: "measured" }
        ]
      },
      {
        id: "layer:sea-temperature-frame",
        title: "Sea-temperature raster frame",
        kind: "raster",
        unit: "degrees Celsius",
        revision: "fixture:noaa-raster-frame-v1",
        projections: ["equal-earth"],
        defaultActive: false,
        observations: [
          { period: "2023-06", frameId: "raster:2023-06", records: [{ id: "cell:west", value: 17, status: "measured", color: "#154f73" }, { id: "cell:central", value: 21, status: "measured", color: "#287da1" }, { id: "cell:east", value: null, status: "unavailable", color: "#475569" }] }
        ]
      }
    ]
  };

  // fixtures/educational-scenes.json
  var educational_scenes_default = {
    schemaVersion: 1,
    catalogue: [
      {
        id: "layer:population-field",
        seriesId: "series:population",
        title: "Population field",
        kind: "scalar",
        revision: "dataset:population@2023",
        releaseOrder: 1,
        period: "2023",
        geographyRef: "geography:instructional-world-v1",
        unit: "people",
        transformationRef: "transform:recorded-values-v1",
        projections: ["equal-earth", "airocean", "population-cartogram"],
        assetId: "asset:population-2023",
        rights: { status: "redistributable", limitation: "Attribution required" },
        citation: { title: "UN World Population Prospects 2024, processed by Our World in Data", url: "https://ourworldindata.org/grapher/population", revision: "2024-07-15", rights: "CC BY 3.0 IGO" }
      },
      {
        id: "layer:population-field",
        seriesId: "series:population",
        title: "Population field",
        kind: "scalar",
        revision: "dataset:population@2024",
        releaseOrder: 2,
        period: "2024",
        geographyRef: "geography:instructional-world-v2",
        unit: "people",
        transformationRef: "transform:recorded-values-v2",
        projections: ["equal-earth", "airocean", "population-cartogram"],
        assetId: "asset:population-2024",
        rights: { status: "redistributable", limitation: "Attribution required" },
        citation: { title: "UN World Population Prospects 2024, processed by Our World in Data", url: "https://ourworldindata.org/grapher/population", revision: "2025-07-11", rights: "CC BY 3.0 IGO" }
      },
      {
        id: "layer:education-index",
        seriesId: "series:education",
        title: "Education access index",
        kind: "scalar",
        revision: "dataset:education@2022-2024",
        releaseOrder: 1,
        period: "2023-06",
        geographyRef: "geography:instructional-world-v1",
        unit: "index points",
        transformationRef: "transform:linear-interpolation-v1",
        formula: { resultUnit: "index points" },
        projections: ["equal-earth", "airocean", "population-cartogram"],
        assetId: "asset:education",
        rights: { status: "redistributable", limitation: "Project-authored instructional fixture" },
        citation: { title: "Siteprep instructional education fixture", url: "https://github.com/knovak/siteprep", revision: "phase-4-v1", rights: "Project-authored test fixture" }
      },
      {
        id: "layer:learner-movement",
        seriesId: "series:movement",
        title: "Learner movement",
        kind: "flow",
        revision: "dataset:movement@2023-05-15",
        releaseOrder: 1,
        period: "2023-05-15",
        geographyRef: "geography:instructional-world-v1",
        unit: "people",
        transformationRef: "transform:nearest-400-days-v1",
        projections: ["equal-earth", "airocean"],
        assetId: "asset:movement-live",
        rights: { status: "reference-only", limitation: "Classroom access token required; live data is not redistributed", expiresAt: "2026-12-31T23:59:59.000Z" },
        citation: { title: "Siteprep learner movement fixture", url: "https://github.com/knovak/siteprep", revision: "phase-3-v1", rights: "Reference only" }
      }
    ],
    assets: [
      { id: "asset:population-2023", mediaType: "application/json", bytes: "eyJwZXJpb2QiOiIyMDIzIiwidmFsdWVzIjpbNjY0Mzg4MjgsODQ1NDgyMzNdfQ==" },
      { id: "asset:population-2024", mediaType: "application/json", bytes: "eyJwZXJpb2QiOiIyMDI0IiwidmFsdWVzIjpbNjY4MDAwMDAsODQ2MDAwMDBdfQ==" },
      { id: "asset:education", mediaType: "application/json", bytes: "eyJwZXJpb2QiOiIyMDIzLTA2IiwidmFsdWVzIjpbNzMsNzZdfQ==" },
      { id: "asset:movement-live", mediaType: "application/json", url: "https://provider.invalid/classroom/movement" }
    ],
    scenes: [
      {
        sceneId: "scene:population-question",
        title: "Where do population patterns stand out?",
        summary: "A scalar scene for comparing recorded country population values.",
        projection: "equal-earth",
        layers: [{ layerId: "layer:population-field", datasetRevision: "dataset:population@2023", period: "2023" }],
        definitions: ["Population is the recorded number of residents in the selected period."],
        caveats: ["Simplified instructional geometry is not an authoritative boundary product."],
        discussionPrompts: ["Which differences are visible, and which require the exact-value table?"],
        presentationStops: [{ order: 1, title: "Read the measure", focus: "legend", presenterNote: "Name the measure, unit, period, and source before asking learners to compare places." }, { order: 2, title: "Compare France and Germany", focus: "country:FRA", presenterNote: "Pause for estimates, then use the exact-value table to check what the shapes alone do not show." }],
        claims: [{ text: "Projection changes area and shape, not the pinned values.", sources: [{ title: "D3 geographic projections", url: "https://d3js.org/d3-geo/projection" }] }],
        app: { datasetId: "dataset:population", time: "2023-06", layerIds: ["layer:population-through-time"] }
      },
      {
        sceneId: "scene:population-and-education",
        title: "Population and education access",
        summary: "Compatible scalar layers with their actual source periods kept visible.",
        projection: "equal-earth",
        layers: [{ layerId: "layer:population-field", datasetRevision: "dataset:population@2023", period: "2023-06", alignmentRule: "nearest" }, { layerId: "layer:education-index", datasetRevision: "dataset:education@2022-2024", period: "2023-06" }],
        definitions: ["An index combines selected observations into a comparable score."],
        caveats: ["The education index is interpolated between 2022 and 2024 fixture values."],
        discussionPrompts: ["What can two differently scaled layers suggest, and what can they not establish?"],
        presentationStops: [{ order: 1, title: "Check actual periods", focus: "periods", presenterNote: "Ask which source periods each layer actually uses before discussing their apparent relationship." }, { order: 2, title: "Compare encodings", focus: "legend", presenterNote: "Separate what the two encodings show from any causal claim the map cannot support." }],
        claims: [{ text: "Correlation in a layered map does not establish causation.", sources: [{ title: "NIST uncertainty guidance", url: "https://www.nist.gov/pml/owm/si-units-information" }] }],
        app: { datasetId: "dataset:population", time: "2023-06", layerIds: ["layer:population-through-time", "layer:education-index"] }
      },
      {
        sceneId: "scene:learner-flow",
        title: "How learners move across a population field",
        summary: "Directional movement over a static population field without implying synchronized measurement.",
        projection: "equal-earth",
        layers: [{ layerId: "layer:population-field", datasetRevision: "dataset:population@2023", period: "2023-06", alignmentRule: "nearest" }, { layerId: "layer:learner-movement", datasetRevision: "dataset:movement@2023-05-15", period: "2023-06", alignmentRule: "nearest" }],
        definitions: ["A flow connects an origin and destination; line direction and width encode direction and magnitude."],
        caveats: ["Movement is a reference-only classroom fixture and is not bundled for redistribution."],
        discussionPrompts: ["How would a missing route differ from a route with zero recorded movement?"],
        presentationStops: [{ order: 1, title: "Read direction and magnitude", focus: "layer:learner-movement", presenterNote: "Trace one arrow from origin to destination and distinguish width from direction." }, { order: 2, title: "Separate zero from missing", focus: "flow:london-paris", presenterNote: "Use the legend and exact table to distinguish a recorded zero from absent evidence." }],
        claims: [{ text: "The layers have different actual periods.", sources: [{ title: "Recorded Phase 3 fixture", url: "https://github.com/knovak/siteprep" }] }],
        app: { datasetId: "dataset:population", time: "2023-06", layerIds: ["layer:population-through-time", "layer:learner-movement"] }
      }
    ]
  };

  // app/app.mjs
  var import_qrcode = __toESM(require_browser(), 1);

  // app/session-link.mjs
  function socketUrl(relayUrl, role, secret, connectionId) {
    const url = new URL(relayUrl);
    url.searchParams.set("role", role);
    url.searchParams.set("secret", secret);
    url.searchParams.set("connection", connectionId);
    return url.toString();
  }
  var BrowserSessionLink = class {
    constructor({ role, sessionId: sessionId2, secret, relayUrl = null, onMessage, onStatus }) {
      this.role = role;
      this.sessionId = sessionId2;
      this.secret = secret;
      this.relayUrl = relayUrl;
      this.onMessage = onMessage;
      this.onStatus = onStatus;
      this.connectionId = crypto.randomUUID();
      this.snapshot = null;
      this.transport = null;
    }
    connect(snapshot = null) {
      this.snapshot = snapshot;
      if (this.relayUrl) this.#connectWebSocket();
      else this.#connectSameBrowser();
    }
    #connectSameBrowser() {
      this.transport = new BroadcastChannel(`egm-controller:${this.secret}`);
      this.transport.addEventListener("message", ({ data }) => {
        if (this.role === "display" && data.type === "join") {
          this.publish(this.snapshot);
        } else if (this.role === "display" && data.type === "intent") {
          this.onMessage(data);
        } else if (this.role === "controller" && data.type === "snapshot") {
          this.snapshot = data.snapshot;
          this.onStatus("Connected \xB7 same-browser fallback");
          this.onMessage(data);
        } else if (this.role === "controller" && data.type === "ended") {
          this.onStatus("Session ended");
        }
      });
      this.onStatus(this.role === "display" ? "Ready \xB7 same-browser fallback" : "Joining\u2026");
      if (this.role === "controller") this.transport.postMessage({ type: "join", sessionId: this.sessionId });
    }
    #connectWebSocket() {
      this.transport = new WebSocket(socketUrl(this.relayUrl, this.role, this.secret, this.connectionId));
      this.transport.addEventListener("open", () => {
        this.onStatus("Connected \xB7 reference relay");
        if (this.role === "display") this.transport.send(JSON.stringify({ type: "start", snapshot: this.snapshot }));
      });
      this.transport.addEventListener("message", ({ data }) => {
        const message = JSON.parse(data);
        if (message.snapshot) this.snapshot = message.snapshot;
        if (["joined", "snapshot", "forward"].includes(message.status) || message.type === "intent") this.onMessage(message);
        if (message.status === "expired" || message.status === "ended") this.onStatus(`Session ${message.status}`);
      });
      this.transport.addEventListener("close", () => this.onStatus("Disconnected \xB7 display continues locally"));
      this.transport.addEventListener("error", () => this.onStatus("Relay unavailable \xB7 display continues locally"));
    }
    publish(snapshot) {
      this.snapshot = snapshot;
      const message = { type: "snapshot", snapshot };
      if (this.relayUrl) {
        if (this.transport.readyState === WebSocket.OPEN) this.transport.send(JSON.stringify(message));
      } else {
        this.transport.postMessage(message);
      }
    }
    sendIntent(intent) {
      const message = { type: "intent", sessionId: this.sessionId, intent };
      if (this.relayUrl) {
        if (this.transport.readyState === WebSocket.OPEN) this.transport.send(JSON.stringify(message));
      } else {
        this.transport.postMessage(message);
      }
    }
    end() {
      const message = { type: "end", sessionId: this.sessionId };
      if (this.relayUrl) {
        if (this.transport.readyState === WebSocket.OPEN) this.transport.send(JSON.stringify(message));
        this.transport.close();
      } else {
        this.transport.postMessage({ type: "ended", sessionId: this.sessionId });
        this.transport.close();
      }
    }
  };

  // node_modules/d3-array/src/fsum.js
  var Adder = class {
    constructor() {
      this._partials = new Float64Array(32);
      this._n = 0;
    }
    add(x) {
      const p = this._partials;
      let i = 0;
      for (let j = 0; j < this._n && j < 32; j++) {
        const y = p[j], hi = x + y, lo = Math.abs(x) < Math.abs(y) ? x - (hi - y) : y - (hi - x);
        if (lo) p[i++] = lo;
        x = hi;
      }
      p[i] = x;
      this._n = i + 1;
      return this;
    }
    valueOf() {
      const p = this._partials;
      let n = this._n, x, y, lo, hi = 0;
      if (n > 0) {
        hi = p[--n];
        while (n > 0) {
          x = hi;
          y = p[--n];
          hi = x + y;
          lo = y - (hi - x);
          if (lo) break;
        }
        if (n > 0 && (lo < 0 && p[n - 1] < 0 || lo > 0 && p[n - 1] > 0)) {
          y = lo * 2;
          x = hi + y;
          if (y == x - hi) hi = x;
        }
      }
      return hi;
    }
  };

  // node_modules/d3-array/src/merge.js
  function* flatten(arrays) {
    for (const array of arrays) {
      yield* array;
    }
  }
  function merge(arrays) {
    return Array.from(flatten(arrays));
  }

  // node_modules/d3-array/src/range.js
  function range(start, stop, step) {
    start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;
    var i = -1, n = Math.max(0, Math.ceil((stop - start) / step)) | 0, range3 = new Array(n);
    while (++i < n) {
      range3[i] = start + i * step;
    }
    return range3;
  }

  // node_modules/d3-geo/src/math.js
  var epsilon = 1e-6;
  var epsilon2 = 1e-12;
  var pi = Math.PI;
  var halfPi = pi / 2;
  var quarterPi = pi / 4;
  var tau = pi * 2;
  var degrees = 180 / pi;
  var radians = pi / 180;
  var abs = Math.abs;
  var atan = Math.atan;
  var atan2 = Math.atan2;
  var cos = Math.cos;
  var ceil = Math.ceil;
  var hypot = Math.hypot;
  var sin = Math.sin;
  var sign = Math.sign || function(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  };
  var sqrt = Math.sqrt;
  function acos(x) {
    return x > 1 ? 0 : x < -1 ? pi : Math.acos(x);
  }
  function asin(x) {
    return x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x);
  }
  function haversin(x) {
    return (x = sin(x / 2)) * x;
  }

  // node_modules/d3-geo/src/noop.js
  function noop() {
  }

  // node_modules/d3-geo/src/stream.js
  function streamGeometry(geometry, stream) {
    if (geometry && streamGeometryType.hasOwnProperty(geometry.type)) {
      streamGeometryType[geometry.type](geometry, stream);
    }
  }
  var streamObjectType = {
    Feature: function(object2, stream) {
      streamGeometry(object2.geometry, stream);
    },
    FeatureCollection: function(object2, stream) {
      var features = object2.features, i = -1, n = features.length;
      while (++i < n) streamGeometry(features[i].geometry, stream);
    }
  };
  var streamGeometryType = {
    Sphere: function(object2, stream) {
      stream.sphere();
    },
    Point: function(object2, stream) {
      object2 = object2.coordinates;
      stream.point(object2[0], object2[1], object2[2]);
    },
    MultiPoint: function(object2, stream) {
      var coordinates2 = object2.coordinates, i = -1, n = coordinates2.length;
      while (++i < n) object2 = coordinates2[i], stream.point(object2[0], object2[1], object2[2]);
    },
    LineString: function(object2, stream) {
      streamLine(object2.coordinates, stream, 0);
    },
    MultiLineString: function(object2, stream) {
      var coordinates2 = object2.coordinates, i = -1, n = coordinates2.length;
      while (++i < n) streamLine(coordinates2[i], stream, 0);
    },
    Polygon: function(object2, stream) {
      streamPolygon(object2.coordinates, stream);
    },
    MultiPolygon: function(object2, stream) {
      var coordinates2 = object2.coordinates, i = -1, n = coordinates2.length;
      while (++i < n) streamPolygon(coordinates2[i], stream);
    },
    GeometryCollection: function(object2, stream) {
      var geometries = object2.geometries, i = -1, n = geometries.length;
      while (++i < n) streamGeometry(geometries[i], stream);
    }
  };
  function streamLine(coordinates2, stream, closed) {
    var i = -1, n = coordinates2.length - closed, coordinate;
    stream.lineStart();
    while (++i < n) coordinate = coordinates2[i], stream.point(coordinate[0], coordinate[1], coordinate[2]);
    stream.lineEnd();
  }
  function streamPolygon(coordinates2, stream) {
    var i = -1, n = coordinates2.length;
    stream.polygonStart();
    while (++i < n) streamLine(coordinates2[i], stream, 1);
    stream.polygonEnd();
  }
  function stream_default(object2, stream) {
    if (object2 && streamObjectType.hasOwnProperty(object2.type)) {
      streamObjectType[object2.type](object2, stream);
    } else {
      streamGeometry(object2, stream);
    }
  }

  // node_modules/d3-geo/src/area.js
  var areaRingSum = new Adder();
  var areaSum = new Adder();
  var lambda00;
  var phi00;
  var lambda0;
  var cosPhi0;
  var sinPhi0;
  var areaStream = {
    point: noop,
    lineStart: noop,
    lineEnd: noop,
    polygonStart: function() {
      areaRingSum = new Adder();
      areaStream.lineStart = areaRingStart;
      areaStream.lineEnd = areaRingEnd;
    },
    polygonEnd: function() {
      var areaRing = +areaRingSum;
      areaSum.add(areaRing < 0 ? tau + areaRing : areaRing);
      this.lineStart = this.lineEnd = this.point = noop;
    },
    sphere: function() {
      areaSum.add(tau);
    }
  };
  function areaRingStart() {
    areaStream.point = areaPointFirst;
  }
  function areaRingEnd() {
    areaPoint(lambda00, phi00);
  }
  function areaPointFirst(lambda, phi) {
    areaStream.point = areaPoint;
    lambda00 = lambda, phi00 = phi;
    lambda *= radians, phi *= radians;
    lambda0 = lambda, cosPhi0 = cos(phi = phi / 2 + quarterPi), sinPhi0 = sin(phi);
  }
  function areaPoint(lambda, phi) {
    lambda *= radians, phi *= radians;
    phi = phi / 2 + quarterPi;
    var dLambda = lambda - lambda0, sdLambda = dLambda >= 0 ? 1 : -1, adLambda = sdLambda * dLambda, cosPhi = cos(phi), sinPhi = sin(phi), k = sinPhi0 * sinPhi, u = cosPhi0 * cosPhi + k * cos(adLambda), v = k * sdLambda * sin(adLambda);
    areaRingSum.add(atan2(v, u));
    lambda0 = lambda, cosPhi0 = cosPhi, sinPhi0 = sinPhi;
  }
  function area_default(object2) {
    areaSum = new Adder();
    stream_default(object2, areaStream);
    return areaSum * 2;
  }

  // node_modules/d3-geo/src/cartesian.js
  function spherical(cartesian3) {
    return [atan2(cartesian3[1], cartesian3[0]), asin(cartesian3[2])];
  }
  function cartesian(spherical3) {
    var lambda = spherical3[0], phi = spherical3[1], cosPhi = cos(phi);
    return [cosPhi * cos(lambda), cosPhi * sin(lambda), sin(phi)];
  }
  function cartesianDot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function cartesianCross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function cartesianAddInPlace(a, b) {
    a[0] += b[0], a[1] += b[1], a[2] += b[2];
  }
  function cartesianScale(vector, k) {
    return [vector[0] * k, vector[1] * k, vector[2] * k];
  }
  function cartesianNormalizeInPlace(d) {
    var l = sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
    d[0] /= l, d[1] /= l, d[2] /= l;
  }

  // node_modules/d3-geo/src/bounds.js
  var lambda02;
  var phi0;
  var lambda1;
  var phi1;
  var lambda2;
  var lambda002;
  var phi002;
  var p0;
  var deltaSum;
  var ranges;
  var range2;
  var boundsStream = {
    point: boundsPoint,
    lineStart: boundsLineStart,
    lineEnd: boundsLineEnd,
    polygonStart: function() {
      boundsStream.point = boundsRingPoint;
      boundsStream.lineStart = boundsRingStart;
      boundsStream.lineEnd = boundsRingEnd;
      deltaSum = new Adder();
      areaStream.polygonStart();
    },
    polygonEnd: function() {
      areaStream.polygonEnd();
      boundsStream.point = boundsPoint;
      boundsStream.lineStart = boundsLineStart;
      boundsStream.lineEnd = boundsLineEnd;
      if (areaRingSum < 0) lambda02 = -(lambda1 = 180), phi0 = -(phi1 = 90);
      else if (deltaSum > epsilon) phi1 = 90;
      else if (deltaSum < -epsilon) phi0 = -90;
      range2[0] = lambda02, range2[1] = lambda1;
    },
    sphere: function() {
      lambda02 = -(lambda1 = 180), phi0 = -(phi1 = 90);
    }
  };
  function boundsPoint(lambda, phi) {
    ranges.push(range2 = [lambda02 = lambda, lambda1 = lambda]);
    if (phi < phi0) phi0 = phi;
    if (phi > phi1) phi1 = phi;
  }
  function linePoint(lambda, phi) {
    var p = cartesian([lambda * radians, phi * radians]);
    if (p0) {
      var normal = cartesianCross(p0, p), equatorial = [normal[1], -normal[0], 0], inflection = cartesianCross(equatorial, normal);
      cartesianNormalizeInPlace(inflection);
      inflection = spherical(inflection);
      var delta = lambda - lambda2, sign3 = delta > 0 ? 1 : -1, lambdai = inflection[0] * degrees * sign3, phii, antimeridian = abs(delta) > 180;
      if (antimeridian ^ (sign3 * lambda2 < lambdai && lambdai < sign3 * lambda)) {
        phii = inflection[1] * degrees;
        if (phii > phi1) phi1 = phii;
      } else if (lambdai = (lambdai + 360) % 360 - 180, antimeridian ^ (sign3 * lambda2 < lambdai && lambdai < sign3 * lambda)) {
        phii = -inflection[1] * degrees;
        if (phii < phi0) phi0 = phii;
      } else {
        if (phi < phi0) phi0 = phi;
        if (phi > phi1) phi1 = phi;
      }
      if (antimeridian) {
        if (lambda < lambda2) {
          if (angle(lambda02, lambda) > angle(lambda02, lambda1)) lambda1 = lambda;
        } else {
          if (angle(lambda, lambda1) > angle(lambda02, lambda1)) lambda02 = lambda;
        }
      } else {
        if (lambda1 >= lambda02) {
          if (lambda < lambda02) lambda02 = lambda;
          if (lambda > lambda1) lambda1 = lambda;
        } else {
          if (lambda > lambda2) {
            if (angle(lambda02, lambda) > angle(lambda02, lambda1)) lambda1 = lambda;
          } else {
            if (angle(lambda, lambda1) > angle(lambda02, lambda1)) lambda02 = lambda;
          }
        }
      }
    } else {
      ranges.push(range2 = [lambda02 = lambda, lambda1 = lambda]);
    }
    if (phi < phi0) phi0 = phi;
    if (phi > phi1) phi1 = phi;
    p0 = p, lambda2 = lambda;
  }
  function boundsLineStart() {
    boundsStream.point = linePoint;
  }
  function boundsLineEnd() {
    range2[0] = lambda02, range2[1] = lambda1;
    boundsStream.point = boundsPoint;
    p0 = null;
  }
  function boundsRingPoint(lambda, phi) {
    if (p0) {
      var delta = lambda - lambda2;
      deltaSum.add(abs(delta) > 180 ? delta + (delta > 0 ? 360 : -360) : delta);
    } else {
      lambda002 = lambda, phi002 = phi;
    }
    areaStream.point(lambda, phi);
    linePoint(lambda, phi);
  }
  function boundsRingStart() {
    areaStream.lineStart();
  }
  function boundsRingEnd() {
    boundsRingPoint(lambda002, phi002);
    areaStream.lineEnd();
    if (abs(deltaSum) > epsilon) lambda02 = -(lambda1 = 180);
    range2[0] = lambda02, range2[1] = lambda1;
    p0 = null;
  }
  function angle(lambda04, lambda12) {
    return (lambda12 -= lambda04) < 0 ? lambda12 + 360 : lambda12;
  }
  function rangeCompare(a, b) {
    return a[0] - b[0];
  }
  function rangeContains(range3, x) {
    return range3[0] <= range3[1] ? range3[0] <= x && x <= range3[1] : x < range3[0] || range3[1] < x;
  }
  function bounds_default(feature) {
    var i, n, a, b, merged, deltaMax, delta;
    phi1 = lambda1 = -(lambda02 = phi0 = Infinity);
    ranges = [];
    stream_default(feature, boundsStream);
    if (n = ranges.length) {
      ranges.sort(rangeCompare);
      for (i = 1, a = ranges[0], merged = [a]; i < n; ++i) {
        b = ranges[i];
        if (rangeContains(a, b[0]) || rangeContains(a, b[1])) {
          if (angle(a[0], b[1]) > angle(a[0], a[1])) a[1] = b[1];
          if (angle(b[0], a[1]) > angle(a[0], a[1])) a[0] = b[0];
        } else {
          merged.push(a = b);
        }
      }
      for (deltaMax = -Infinity, n = merged.length - 1, i = 0, a = merged[n]; i <= n; a = b, ++i) {
        b = merged[i];
        if ((delta = angle(a[1], b[0])) > deltaMax) deltaMax = delta, lambda02 = b[0], lambda1 = a[1];
      }
    }
    ranges = range2 = null;
    return lambda02 === Infinity || phi0 === Infinity ? [[NaN, NaN], [NaN, NaN]] : [[lambda02, phi0], [lambda1, phi1]];
  }

  // node_modules/d3-geo/src/centroid.js
  var W0;
  var W1;
  var X0;
  var Y0;
  var Z0;
  var X1;
  var Y1;
  var Z1;
  var X2;
  var Y2;
  var Z2;
  var lambda003;
  var phi003;
  var x0;
  var y0;
  var z0;
  var centroidStream = {
    sphere: noop,
    point: centroidPoint,
    lineStart: centroidLineStart,
    lineEnd: centroidLineEnd,
    polygonStart: function() {
      centroidStream.lineStart = centroidRingStart;
      centroidStream.lineEnd = centroidRingEnd;
    },
    polygonEnd: function() {
      centroidStream.lineStart = centroidLineStart;
      centroidStream.lineEnd = centroidLineEnd;
    }
  };
  function centroidPoint(lambda, phi) {
    lambda *= radians, phi *= radians;
    var cosPhi = cos(phi);
    centroidPointCartesian(cosPhi * cos(lambda), cosPhi * sin(lambda), sin(phi));
  }
  function centroidPointCartesian(x, y, z) {
    ++W0;
    X0 += (x - X0) / W0;
    Y0 += (y - Y0) / W0;
    Z0 += (z - Z0) / W0;
  }
  function centroidLineStart() {
    centroidStream.point = centroidLinePointFirst;
  }
  function centroidLinePointFirst(lambda, phi) {
    lambda *= radians, phi *= radians;
    var cosPhi = cos(phi);
    x0 = cosPhi * cos(lambda);
    y0 = cosPhi * sin(lambda);
    z0 = sin(phi);
    centroidStream.point = centroidLinePoint;
    centroidPointCartesian(x0, y0, z0);
  }
  function centroidLinePoint(lambda, phi) {
    lambda *= radians, phi *= radians;
    var cosPhi = cos(phi), x = cosPhi * cos(lambda), y = cosPhi * sin(lambda), z = sin(phi), w = atan2(sqrt((w = y0 * z - z0 * y) * w + (w = z0 * x - x0 * z) * w + (w = x0 * y - y0 * x) * w), x0 * x + y0 * y + z0 * z);
    W1 += w;
    X1 += w * (x0 + (x0 = x));
    Y1 += w * (y0 + (y0 = y));
    Z1 += w * (z0 + (z0 = z));
    centroidPointCartesian(x0, y0, z0);
  }
  function centroidLineEnd() {
    centroidStream.point = centroidPoint;
  }
  function centroidRingStart() {
    centroidStream.point = centroidRingPointFirst;
  }
  function centroidRingEnd() {
    centroidRingPoint(lambda003, phi003);
    centroidStream.point = centroidPoint;
  }
  function centroidRingPointFirst(lambda, phi) {
    lambda003 = lambda, phi003 = phi;
    lambda *= radians, phi *= radians;
    centroidStream.point = centroidRingPoint;
    var cosPhi = cos(phi);
    x0 = cosPhi * cos(lambda);
    y0 = cosPhi * sin(lambda);
    z0 = sin(phi);
    centroidPointCartesian(x0, y0, z0);
  }
  function centroidRingPoint(lambda, phi) {
    lambda *= radians, phi *= radians;
    var cosPhi = cos(phi), x = cosPhi * cos(lambda), y = cosPhi * sin(lambda), z = sin(phi), cx = y0 * z - z0 * y, cy = z0 * x - x0 * z, cz = x0 * y - y0 * x, m = hypot(cx, cy, cz), w = asin(m), v = m && -w / m;
    X2.add(v * cx);
    Y2.add(v * cy);
    Z2.add(v * cz);
    W1 += w;
    X1 += w * (x0 + (x0 = x));
    Y1 += w * (y0 + (y0 = y));
    Z1 += w * (z0 + (z0 = z));
    centroidPointCartesian(x0, y0, z0);
  }
  function centroid_default(object2) {
    W0 = W1 = X0 = Y0 = Z0 = X1 = Y1 = Z1 = 0;
    X2 = new Adder();
    Y2 = new Adder();
    Z2 = new Adder();
    stream_default(object2, centroidStream);
    var x = +X2, y = +Y2, z = +Z2, m = hypot(x, y, z);
    if (m < epsilon2) {
      x = X1, y = Y1, z = Z1;
      if (W1 < epsilon) x = X0, y = Y0, z = Z0;
      m = hypot(x, y, z);
      if (m < epsilon2) return [NaN, NaN];
    }
    return [atan2(y, x) * degrees, asin(z / m) * degrees];
  }

  // node_modules/d3-geo/src/compose.js
  function compose_default(a, b) {
    function compose(x, y) {
      return x = a(x, y), b(x[0], x[1]);
    }
    if (a.invert && b.invert) compose.invert = function(x, y) {
      return x = b.invert(x, y), x && a.invert(x[0], x[1]);
    };
    return compose;
  }

  // node_modules/d3-geo/src/rotation.js
  function rotationIdentity(lambda, phi) {
    if (abs(lambda) > pi) lambda -= Math.round(lambda / tau) * tau;
    return [lambda, phi];
  }
  rotationIdentity.invert = rotationIdentity;
  function rotateRadians(deltaLambda, deltaPhi, deltaGamma) {
    return (deltaLambda %= tau) ? deltaPhi || deltaGamma ? compose_default(rotationLambda(deltaLambda), rotationPhiGamma(deltaPhi, deltaGamma)) : rotationLambda(deltaLambda) : deltaPhi || deltaGamma ? rotationPhiGamma(deltaPhi, deltaGamma) : rotationIdentity;
  }
  function forwardRotationLambda(deltaLambda) {
    return function(lambda, phi) {
      lambda += deltaLambda;
      if (abs(lambda) > pi) lambda -= Math.round(lambda / tau) * tau;
      return [lambda, phi];
    };
  }
  function rotationLambda(deltaLambda) {
    var rotation = forwardRotationLambda(deltaLambda);
    rotation.invert = forwardRotationLambda(-deltaLambda);
    return rotation;
  }
  function rotationPhiGamma(deltaPhi, deltaGamma) {
    var cosDeltaPhi = cos(deltaPhi), sinDeltaPhi = sin(deltaPhi), cosDeltaGamma = cos(deltaGamma), sinDeltaGamma = sin(deltaGamma);
    function rotation(lambda, phi) {
      var cosPhi = cos(phi), x = cos(lambda) * cosPhi, y = sin(lambda) * cosPhi, z = sin(phi), k = z * cosDeltaPhi + x * sinDeltaPhi;
      return [
        atan2(y * cosDeltaGamma - k * sinDeltaGamma, x * cosDeltaPhi - z * sinDeltaPhi),
        asin(k * cosDeltaGamma + y * sinDeltaGamma)
      ];
    }
    rotation.invert = function(lambda, phi) {
      var cosPhi = cos(phi), x = cos(lambda) * cosPhi, y = sin(lambda) * cosPhi, z = sin(phi), k = z * cosDeltaGamma - y * sinDeltaGamma;
      return [
        atan2(y * cosDeltaGamma + z * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi),
        asin(k * cosDeltaPhi - x * sinDeltaPhi)
      ];
    };
    return rotation;
  }

  // node_modules/d3-geo/src/circle.js
  function circleStream(stream, radius, delta, direction, t0, t1) {
    if (!delta) return;
    var cosRadius = cos(radius), sinRadius = sin(radius), step = direction * delta;
    if (t0 == null) {
      t0 = radius + direction * tau;
      t1 = radius - step / 2;
    } else {
      t0 = circleRadius(cosRadius, t0);
      t1 = circleRadius(cosRadius, t1);
      if (direction > 0 ? t0 < t1 : t0 > t1) t0 += direction * tau;
    }
    for (var point, t = t0; direction > 0 ? t > t1 : t < t1; t -= step) {
      point = spherical([cosRadius, -sinRadius * cos(t), -sinRadius * sin(t)]);
      stream.point(point[0], point[1]);
    }
  }
  function circleRadius(cosRadius, point) {
    point = cartesian(point), point[0] -= cosRadius;
    cartesianNormalizeInPlace(point);
    var radius = acos(-point[1]);
    return ((-point[2] < 0 ? -radius : radius) + tau - epsilon) % tau;
  }

  // node_modules/d3-geo/src/clip/buffer.js
  function buffer_default() {
    var lines = [], line;
    return {
      point: function(x, y, m) {
        line.push([x, y, m]);
      },
      lineStart: function() {
        lines.push(line = []);
      },
      lineEnd: noop,
      rejoin: function() {
        if (lines.length > 1) lines.push(lines.pop().concat(lines.shift()));
      },
      result: function() {
        var result = lines;
        lines = [];
        line = null;
        return result;
      }
    };
  }

  // node_modules/d3-geo/src/pointEqual.js
  function pointEqual_default(a, b) {
    return abs(a[0] - b[0]) < epsilon && abs(a[1] - b[1]) < epsilon;
  }

  // node_modules/d3-geo/src/clip/rejoin.js
  function Intersection(point, points, other, entry) {
    this.x = point;
    this.z = points;
    this.o = other;
    this.e = entry;
    this.v = false;
    this.n = this.p = null;
  }
  function rejoin_default(segments, compareIntersection3, startInside, interpolate2, stream) {
    var subject = [], clip = [], i, n;
    segments.forEach(function(segment) {
      if ((n2 = segment.length - 1) <= 0) return;
      var n2, p02 = segment[0], p1 = segment[n2], x;
      if (pointEqual_default(p02, p1)) {
        if (!p02[2] && !p1[2]) {
          stream.lineStart();
          for (i = 0; i < n2; ++i) stream.point((p02 = segment[i])[0], p02[1]);
          stream.lineEnd();
          return;
        }
        p1[0] += 2 * epsilon;
      }
      subject.push(x = new Intersection(p02, segment, null, true));
      clip.push(x.o = new Intersection(p02, null, x, false));
      subject.push(x = new Intersection(p1, segment, null, false));
      clip.push(x.o = new Intersection(p1, null, x, true));
    });
    if (!subject.length) return;
    clip.sort(compareIntersection3);
    link(subject);
    link(clip);
    for (i = 0, n = clip.length; i < n; ++i) {
      clip[i].e = startInside = !startInside;
    }
    var start = subject[0], points, point;
    while (1) {
      var current = start, isSubject = true;
      while (current.v) if ((current = current.n) === start) return;
      points = current.z;
      stream.lineStart();
      do {
        current.v = current.o.v = true;
        if (current.e) {
          if (isSubject) {
            for (i = 0, n = points.length; i < n; ++i) stream.point((point = points[i])[0], point[1]);
          } else {
            interpolate2(current.x, current.n.x, 1, stream);
          }
          current = current.n;
        } else {
          if (isSubject) {
            points = current.p.z;
            for (i = points.length - 1; i >= 0; --i) stream.point((point = points[i])[0], point[1]);
          } else {
            interpolate2(current.x, current.p.x, -1, stream);
          }
          current = current.p;
        }
        current = current.o;
        points = current.z;
        isSubject = !isSubject;
      } while (!current.v);
      stream.lineEnd();
    }
  }
  function link(array) {
    if (!(n = array.length)) return;
    var n, i = 0, a = array[0], b;
    while (++i < n) {
      a.n = b = array[i];
      b.p = a;
      a = b;
    }
    a.n = b = array[0];
    b.p = a;
  }

  // node_modules/d3-geo/src/polygonContains.js
  function longitude(point) {
    return abs(point[0]) <= pi ? point[0] : sign(point[0]) * ((abs(point[0]) + pi) % tau - pi);
  }
  function polygonContains_default(polygon, point) {
    var lambda = longitude(point), phi = point[1], sinPhi = sin(phi), normal = [sin(lambda), -cos(lambda), 0], angle3 = 0, winding = 0;
    var sum = new Adder();
    if (sinPhi === 1) phi = halfPi + epsilon;
    else if (sinPhi === -1) phi = -halfPi - epsilon;
    for (var i = 0, n = polygon.length; i < n; ++i) {
      if (!(m = (ring = polygon[i]).length)) continue;
      var ring, m, point0 = ring[m - 1], lambda04 = longitude(point0), phi02 = point0[1] / 2 + quarterPi, sinPhi03 = sin(phi02), cosPhi03 = cos(phi02);
      for (var j = 0; j < m; ++j, lambda04 = lambda12, sinPhi03 = sinPhi1, cosPhi03 = cosPhi1, point0 = point1) {
        var point1 = ring[j], lambda12 = longitude(point1), phi12 = point1[1] / 2 + quarterPi, sinPhi1 = sin(phi12), cosPhi1 = cos(phi12), delta = lambda12 - lambda04, sign3 = delta >= 0 ? 1 : -1, absDelta = sign3 * delta, antimeridian = absDelta > pi, k = sinPhi03 * sinPhi1;
        sum.add(atan2(k * sign3 * sin(absDelta), cosPhi03 * cosPhi1 + k * cos(absDelta)));
        angle3 += antimeridian ? delta + sign3 * tau : delta;
        if (antimeridian ^ lambda04 >= lambda ^ lambda12 >= lambda) {
          var arc = cartesianCross(cartesian(point0), cartesian(point1));
          cartesianNormalizeInPlace(arc);
          var intersection = cartesianCross(normal, arc);
          cartesianNormalizeInPlace(intersection);
          var phiArc = (antimeridian ^ delta >= 0 ? -1 : 1) * asin(intersection[2]);
          if (phi > phiArc || phi === phiArc && (arc[0] || arc[1])) {
            winding += antimeridian ^ delta >= 0 ? 1 : -1;
          }
        }
      }
    }
    return (angle3 < -epsilon || angle3 < epsilon && sum < -epsilon2) ^ winding & 1;
  }

  // node_modules/d3-geo/src/clip/index.js
  function clip_default(pointVisible, clipLine2, interpolate2, start) {
    return function(sink) {
      var line = clipLine2(sink), ringBuffer = buffer_default(), ringSink = clipLine2(ringBuffer), polygonStarted = false, polygon, segments, ring;
      var clip = {
        point,
        lineStart,
        lineEnd,
        polygonStart: function() {
          clip.point = pointRing;
          clip.lineStart = ringStart;
          clip.lineEnd = ringEnd;
          segments = [];
          polygon = [];
        },
        polygonEnd: function() {
          clip.point = point;
          clip.lineStart = lineStart;
          clip.lineEnd = lineEnd;
          segments = merge(segments);
          var startInside = polygonContains_default(polygon, start);
          if (segments.length) {
            if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
            rejoin_default(segments, compareIntersection, startInside, interpolate2, sink);
          } else if (startInside) {
            if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
            sink.lineStart();
            interpolate2(null, null, 1, sink);
            sink.lineEnd();
          }
          if (polygonStarted) sink.polygonEnd(), polygonStarted = false;
          segments = polygon = null;
        },
        sphere: function() {
          sink.polygonStart();
          sink.lineStart();
          interpolate2(null, null, 1, sink);
          sink.lineEnd();
          sink.polygonEnd();
        }
      };
      function point(lambda, phi) {
        if (pointVisible(lambda, phi)) sink.point(lambda, phi);
      }
      function pointLine(lambda, phi) {
        line.point(lambda, phi);
      }
      function lineStart() {
        clip.point = pointLine;
        line.lineStart();
      }
      function lineEnd() {
        clip.point = point;
        line.lineEnd();
      }
      function pointRing(lambda, phi) {
        ring.push([lambda, phi]);
        ringSink.point(lambda, phi);
      }
      function ringStart() {
        ringSink.lineStart();
        ring = [];
      }
      function ringEnd() {
        pointRing(ring[0][0], ring[0][1]);
        ringSink.lineEnd();
        var clean = ringSink.clean(), ringSegments2 = ringBuffer.result(), i, n = ringSegments2.length, m, segment, point2;
        ring.pop();
        polygon.push(ring);
        ring = null;
        if (!n) return;
        if (clean & 1) {
          segment = ringSegments2[0];
          if ((m = segment.length - 1) > 0) {
            if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
            sink.lineStart();
            for (i = 0; i < m; ++i) sink.point((point2 = segment[i])[0], point2[1]);
            sink.lineEnd();
          }
          return;
        }
        if (n > 1 && clean & 2) ringSegments2.push(ringSegments2.pop().concat(ringSegments2.shift()));
        segments.push(ringSegments2.filter(validSegment));
      }
      return clip;
    };
  }
  function validSegment(segment) {
    return segment.length > 1;
  }
  function compareIntersection(a, b) {
    return ((a = a.x)[0] < 0 ? a[1] - halfPi - epsilon : halfPi - a[1]) - ((b = b.x)[0] < 0 ? b[1] - halfPi - epsilon : halfPi - b[1]);
  }

  // node_modules/d3-geo/src/clip/antimeridian.js
  var antimeridian_default = clip_default(
    function() {
      return true;
    },
    clipAntimeridianLine,
    clipAntimeridianInterpolate,
    [-pi, -halfPi]
  );
  function clipAntimeridianLine(stream) {
    var lambda04 = NaN, phi02 = NaN, sign0 = NaN, clean;
    return {
      lineStart: function() {
        stream.lineStart();
        clean = 1;
      },
      point: function(lambda12, phi12) {
        var sign1 = lambda12 > 0 ? pi : -pi, delta = abs(lambda12 - lambda04);
        if (abs(delta - pi) < epsilon) {
          stream.point(lambda04, phi02 = (phi02 + phi12) / 2 > 0 ? halfPi : -halfPi);
          stream.point(sign0, phi02);
          stream.lineEnd();
          stream.lineStart();
          stream.point(sign1, phi02);
          stream.point(lambda12, phi02);
          clean = 0;
        } else if (sign0 !== sign1 && delta >= pi) {
          if (abs(lambda04 - sign0) < epsilon) lambda04 -= sign0 * epsilon;
          if (abs(lambda12 - sign1) < epsilon) lambda12 -= sign1 * epsilon;
          phi02 = clipAntimeridianIntersect(lambda04, phi02, lambda12, phi12);
          stream.point(sign0, phi02);
          stream.lineEnd();
          stream.lineStart();
          stream.point(sign1, phi02);
          clean = 0;
        }
        stream.point(lambda04 = lambda12, phi02 = phi12);
        sign0 = sign1;
      },
      lineEnd: function() {
        stream.lineEnd();
        lambda04 = phi02 = NaN;
      },
      clean: function() {
        return 2 - clean;
      }
    };
  }
  function clipAntimeridianIntersect(lambda04, phi02, lambda12, phi12) {
    var cosPhi03, cosPhi1, sinLambda0Lambda1 = sin(lambda04 - lambda12);
    return abs(sinLambda0Lambda1) > epsilon ? atan((sin(phi02) * (cosPhi1 = cos(phi12)) * sin(lambda12) - sin(phi12) * (cosPhi03 = cos(phi02)) * sin(lambda04)) / (cosPhi03 * cosPhi1 * sinLambda0Lambda1)) : (phi02 + phi12) / 2;
  }
  function clipAntimeridianInterpolate(from, to, direction, stream) {
    var phi;
    if (from == null) {
      phi = direction * halfPi;
      stream.point(-pi, phi);
      stream.point(0, phi);
      stream.point(pi, phi);
      stream.point(pi, 0);
      stream.point(pi, -phi);
      stream.point(0, -phi);
      stream.point(-pi, -phi);
      stream.point(-pi, 0);
      stream.point(-pi, phi);
    } else if (abs(from[0] - to[0]) > epsilon) {
      var lambda = from[0] < to[0] ? pi : -pi;
      phi = direction * lambda / 2;
      stream.point(-lambda, phi);
      stream.point(0, phi);
      stream.point(lambda, phi);
    } else {
      stream.point(to[0], to[1]);
    }
  }

  // node_modules/d3-geo/src/clip/circle.js
  function circle_default(radius) {
    var cr = cos(radius), delta = 2 * radians, smallRadius = cr > 0, notHemisphere = abs(cr) > epsilon;
    function interpolate2(from, to, direction, stream) {
      circleStream(stream, radius, delta, direction, from, to);
    }
    function visible2(lambda, phi) {
      return cos(lambda) * cos(phi) > cr;
    }
    function clipLine2(stream) {
      var point0, c0, v0, v00, clean;
      return {
        lineStart: function() {
          v00 = v0 = false;
          clean = 1;
        },
        point: function(lambda, phi) {
          var point1 = [lambda, phi], point2, v = visible2(lambda, phi), c = smallRadius ? v ? 0 : code(lambda, phi) : v ? code(lambda + (lambda < 0 ? pi : -pi), phi) : 0;
          if (!point0 && (v00 = v0 = v)) stream.lineStart();
          if (v !== v0) {
            point2 = intersect2(point0, point1);
            if (!point2 || pointEqual_default(point0, point2) || pointEqual_default(point1, point2))
              point1[2] = 1;
          }
          if (v !== v0) {
            clean = 0;
            if (v) {
              stream.lineStart();
              point2 = intersect2(point1, point0);
              stream.point(point2[0], point2[1]);
            } else {
              point2 = intersect2(point0, point1);
              stream.point(point2[0], point2[1], 2);
              stream.lineEnd();
            }
            point0 = point2;
          } else if (notHemisphere && point0 && smallRadius ^ v) {
            var t;
            if (!(c & c0) && (t = intersect2(point1, point0, true))) {
              clean = 0;
              if (smallRadius) {
                stream.lineStart();
                stream.point(t[0][0], t[0][1]);
                stream.point(t[1][0], t[1][1]);
                stream.lineEnd();
              } else {
                stream.point(t[1][0], t[1][1]);
                stream.lineEnd();
                stream.lineStart();
                stream.point(t[0][0], t[0][1], 3);
              }
            }
          }
          if (v && (!point0 || !pointEqual_default(point0, point1))) {
            stream.point(point1[0], point1[1]);
          }
          point0 = point1, v0 = v, c0 = c;
        },
        lineEnd: function() {
          if (v0) stream.lineEnd();
          point0 = null;
        },
        // Rejoin first and last segments if there were intersections and the first
        // and last points were visible.
        clean: function() {
          return clean | (v00 && v0) << 1;
        }
      };
    }
    function intersect2(a, b, two) {
      var pa = cartesian(a), pb = cartesian(b);
      var n1 = [1, 0, 0], n2 = cartesianCross(pa, pb), n2n2 = cartesianDot(n2, n2), n1n2 = n2[0], determinant = n2n2 - n1n2 * n1n2;
      if (!determinant) return !two && a;
      var c1 = cr * n2n2 / determinant, c2 = -cr * n1n2 / determinant, n1xn2 = cartesianCross(n1, n2), A = cartesianScale(n1, c1), B = cartesianScale(n2, c2);
      cartesianAddInPlace(A, B);
      var u = n1xn2, w = cartesianDot(A, u), uu = cartesianDot(u, u), t2 = w * w - uu * (cartesianDot(A, A) - 1);
      if (t2 < 0) return;
      var t = sqrt(t2), q = cartesianScale(u, (-w - t) / uu);
      cartesianAddInPlace(q, A);
      q = spherical(q);
      if (!two) return q;
      var lambda04 = a[0], lambda12 = b[0], phi02 = a[1], phi12 = b[1], z;
      if (lambda12 < lambda04) z = lambda04, lambda04 = lambda12, lambda12 = z;
      var delta2 = lambda12 - lambda04, polar = abs(delta2 - pi) < epsilon, meridian = polar || delta2 < epsilon;
      if (!polar && phi12 < phi02) z = phi02, phi02 = phi12, phi12 = z;
      if (meridian ? polar ? phi02 + phi12 > 0 ^ q[1] < (abs(q[0] - lambda04) < epsilon ? phi02 : phi12) : phi02 <= q[1] && q[1] <= phi12 : delta2 > pi ^ (lambda04 <= q[0] && q[0] <= lambda12)) {
        var q1 = cartesianScale(u, (-w + t) / uu);
        cartesianAddInPlace(q1, A);
        return [q, spherical(q1)];
      }
    }
    function code(lambda, phi) {
      var r = smallRadius ? radius : pi - radius, code2 = 0;
      if (lambda < -r) code2 |= 1;
      else if (lambda > r) code2 |= 2;
      if (phi < -r) code2 |= 4;
      else if (phi > r) code2 |= 8;
      return code2;
    }
    return clip_default(visible2, clipLine2, interpolate2, smallRadius ? [0, -radius] : [-pi, radius - pi]);
  }

  // node_modules/d3-geo/src/clip/line.js
  function line_default(a, b, x06, y06, x12, y12) {
    var ax = a[0], ay = a[1], bx = b[0], by = b[1], t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay, r;
    r = x06 - ax;
    if (!dx && r > 0) return;
    r /= dx;
    if (dx < 0) {
      if (r < t0) return;
      if (r < t1) t1 = r;
    } else if (dx > 0) {
      if (r > t1) return;
      if (r > t0) t0 = r;
    }
    r = x12 - ax;
    if (!dx && r < 0) return;
    r /= dx;
    if (dx < 0) {
      if (r > t1) return;
      if (r > t0) t0 = r;
    } else if (dx > 0) {
      if (r < t0) return;
      if (r < t1) t1 = r;
    }
    r = y06 - ay;
    if (!dy && r > 0) return;
    r /= dy;
    if (dy < 0) {
      if (r < t0) return;
      if (r < t1) t1 = r;
    } else if (dy > 0) {
      if (r > t1) return;
      if (r > t0) t0 = r;
    }
    r = y12 - ay;
    if (!dy && r < 0) return;
    r /= dy;
    if (dy < 0) {
      if (r > t1) return;
      if (r > t0) t0 = r;
    } else if (dy > 0) {
      if (r < t0) return;
      if (r < t1) t1 = r;
    }
    if (t0 > 0) a[0] = ax + t0 * dx, a[1] = ay + t0 * dy;
    if (t1 < 1) b[0] = ax + t1 * dx, b[1] = ay + t1 * dy;
    return true;
  }

  // node_modules/d3-geo/src/clip/rectangle.js
  var clipMax = 1e9;
  var clipMin = -clipMax;
  function clipRectangle(x06, y06, x12, y12) {
    function visible2(x, y) {
      return x06 <= x && x <= x12 && y06 <= y && y <= y12;
    }
    function interpolate2(from, to, direction, stream) {
      var a = 0, a1 = 0;
      if (from == null || (a = corner(from, direction)) !== (a1 = corner(to, direction)) || comparePoint(from, to) < 0 ^ direction > 0) {
        do
          stream.point(a === 0 || a === 3 ? x06 : x12, a > 1 ? y12 : y06);
        while ((a = (a + direction + 4) % 4) !== a1);
      } else {
        stream.point(to[0], to[1]);
      }
    }
    function corner(p, direction) {
      return abs(p[0] - x06) < epsilon ? direction > 0 ? 0 : 3 : abs(p[0] - x12) < epsilon ? direction > 0 ? 2 : 1 : abs(p[1] - y06) < epsilon ? direction > 0 ? 1 : 0 : direction > 0 ? 3 : 2;
    }
    function compareIntersection3(a, b) {
      return comparePoint(a.x, b.x);
    }
    function comparePoint(a, b) {
      var ca = corner(a, 1), cb = corner(b, 1);
      return ca !== cb ? ca - cb : ca === 0 ? b[1] - a[1] : ca === 1 ? a[0] - b[0] : ca === 2 ? a[1] - b[1] : b[0] - a[0];
    }
    return function(stream) {
      var activeStream = stream, bufferStream = buffer_default(), segments, polygon, ring, x__, y__, v__, x_, y_, v_, first, clean;
      var clipStream = {
        point,
        lineStart,
        lineEnd,
        polygonStart,
        polygonEnd
      };
      function point(x, y) {
        if (visible2(x, y)) activeStream.point(x, y);
      }
      function polygonInside() {
        var winding = 0;
        for (var i = 0, n = polygon.length; i < n; ++i) {
          for (var ring2 = polygon[i], j = 1, m = ring2.length, point2 = ring2[0], a0, a1, b0 = point2[0], b1 = point2[1]; j < m; ++j) {
            a0 = b0, a1 = b1, point2 = ring2[j], b0 = point2[0], b1 = point2[1];
            if (a1 <= y12) {
              if (b1 > y12 && (b0 - a0) * (y12 - a1) > (b1 - a1) * (x06 - a0)) ++winding;
            } else {
              if (b1 <= y12 && (b0 - a0) * (y12 - a1) < (b1 - a1) * (x06 - a0)) --winding;
            }
          }
        }
        return winding;
      }
      function polygonStart() {
        activeStream = bufferStream, segments = [], polygon = [], clean = true;
      }
      function polygonEnd() {
        var startInside = polygonInside(), cleanInside = clean && startInside, visible3 = (segments = merge(segments)).length;
        if (cleanInside || visible3) {
          stream.polygonStart();
          if (cleanInside) {
            stream.lineStart();
            interpolate2(null, null, 1, stream);
            stream.lineEnd();
          }
          if (visible3) {
            rejoin_default(segments, compareIntersection3, startInside, interpolate2, stream);
          }
          stream.polygonEnd();
        }
        activeStream = stream, segments = polygon = ring = null;
      }
      function lineStart() {
        clipStream.point = linePoint2;
        if (polygon) polygon.push(ring = []);
        first = true;
        v_ = false;
        x_ = y_ = NaN;
      }
      function lineEnd() {
        if (segments) {
          linePoint2(x__, y__);
          if (v__ && v_) bufferStream.rejoin();
          segments.push(bufferStream.result());
        }
        clipStream.point = point;
        if (v_) activeStream.lineEnd();
      }
      function linePoint2(x, y) {
        var v = visible2(x, y);
        if (polygon) ring.push([x, y]);
        if (first) {
          x__ = x, y__ = y, v__ = v;
          first = false;
          if (v) {
            activeStream.lineStart();
            activeStream.point(x, y);
          }
        } else {
          if (v && v_) activeStream.point(x, y);
          else {
            var a = [x_ = Math.max(clipMin, Math.min(clipMax, x_)), y_ = Math.max(clipMin, Math.min(clipMax, y_))], b = [x = Math.max(clipMin, Math.min(clipMax, x)), y = Math.max(clipMin, Math.min(clipMax, y))];
            if (line_default(a, b, x06, y06, x12, y12)) {
              if (!v_) {
                activeStream.lineStart();
                activeStream.point(a[0], a[1]);
              }
              activeStream.point(b[0], b[1]);
              if (!v) activeStream.lineEnd();
              clean = false;
            } else if (v) {
              activeStream.lineStart();
              activeStream.point(x, y);
              clean = false;
            }
          }
        }
        x_ = x, y_ = y, v_ = v;
      }
      return clipStream;
    };
  }

  // node_modules/d3-geo/src/length.js
  var lengthSum;
  var lambda03;
  var sinPhi02;
  var cosPhi02;
  var lengthStream = {
    sphere: noop,
    point: noop,
    lineStart: lengthLineStart,
    lineEnd: noop,
    polygonStart: noop,
    polygonEnd: noop
  };
  function lengthLineStart() {
    lengthStream.point = lengthPointFirst;
    lengthStream.lineEnd = lengthLineEnd;
  }
  function lengthLineEnd() {
    lengthStream.point = lengthStream.lineEnd = noop;
  }
  function lengthPointFirst(lambda, phi) {
    lambda *= radians, phi *= radians;
    lambda03 = lambda, sinPhi02 = sin(phi), cosPhi02 = cos(phi);
    lengthStream.point = lengthPoint;
  }
  function lengthPoint(lambda, phi) {
    lambda *= radians, phi *= radians;
    var sinPhi = sin(phi), cosPhi = cos(phi), delta = abs(lambda - lambda03), cosDelta = cos(delta), sinDelta = sin(delta), x = cosPhi * sinDelta, y = cosPhi02 * sinPhi - sinPhi02 * cosPhi * cosDelta, z = sinPhi02 * sinPhi + cosPhi02 * cosPhi * cosDelta;
    lengthSum.add(atan2(sqrt(x * x + y * y), z));
    lambda03 = lambda, sinPhi02 = sinPhi, cosPhi02 = cosPhi;
  }
  function length_default(object2) {
    lengthSum = new Adder();
    stream_default(object2, lengthStream);
    return +lengthSum;
  }

  // node_modules/d3-geo/src/distance.js
  var coordinates = [null, null];
  var object = { type: "LineString", coordinates };
  function distance_default(a, b) {
    coordinates[0] = a;
    coordinates[1] = b;
    return length_default(object);
  }

  // node_modules/d3-geo/src/contains.js
  var containsObjectType = {
    Feature: function(object2, point) {
      return containsGeometry(object2.geometry, point);
    },
    FeatureCollection: function(object2, point) {
      var features = object2.features, i = -1, n = features.length;
      while (++i < n) if (containsGeometry(features[i].geometry, point)) return true;
      return false;
    }
  };
  var containsGeometryType = {
    Sphere: function() {
      return true;
    },
    Point: function(object2, point) {
      return containsPoint(object2.coordinates, point);
    },
    MultiPoint: function(object2, point) {
      var coordinates2 = object2.coordinates, i = -1, n = coordinates2.length;
      while (++i < n) if (containsPoint(coordinates2[i], point)) return true;
      return false;
    },
    LineString: function(object2, point) {
      return containsLine(object2.coordinates, point);
    },
    MultiLineString: function(object2, point) {
      var coordinates2 = object2.coordinates, i = -1, n = coordinates2.length;
      while (++i < n) if (containsLine(coordinates2[i], point)) return true;
      return false;
    },
    Polygon: function(object2, point) {
      return containsPolygon(object2.coordinates, point);
    },
    MultiPolygon: function(object2, point) {
      var coordinates2 = object2.coordinates, i = -1, n = coordinates2.length;
      while (++i < n) if (containsPolygon(coordinates2[i], point)) return true;
      return false;
    },
    GeometryCollection: function(object2, point) {
      var geometries = object2.geometries, i = -1, n = geometries.length;
      while (++i < n) if (containsGeometry(geometries[i], point)) return true;
      return false;
    }
  };
  function containsGeometry(geometry, point) {
    return geometry && containsGeometryType.hasOwnProperty(geometry.type) ? containsGeometryType[geometry.type](geometry, point) : false;
  }
  function containsPoint(coordinates2, point) {
    return distance_default(coordinates2, point) === 0;
  }
  function containsLine(coordinates2, point) {
    var ao, bo, ab;
    for (var i = 0, n = coordinates2.length; i < n; i++) {
      bo = distance_default(coordinates2[i], point);
      if (bo === 0) return true;
      if (i > 0) {
        ab = distance_default(coordinates2[i], coordinates2[i - 1]);
        if (ab > 0 && ao <= ab && bo <= ab && (ao + bo - ab) * (1 - Math.pow((ao - bo) / ab, 2)) < epsilon2 * ab)
          return true;
      }
      ao = bo;
    }
    return false;
  }
  function containsPolygon(coordinates2, point) {
    return !!polygonContains_default(coordinates2.map(ringRadians), pointRadians(point));
  }
  function ringRadians(ring) {
    return ring = ring.map(pointRadians), ring.pop(), ring;
  }
  function pointRadians(point) {
    return [point[0] * radians, point[1] * radians];
  }
  function contains_default(object2, point) {
    return (object2 && containsObjectType.hasOwnProperty(object2.type) ? containsObjectType[object2.type] : containsGeometry)(object2, point);
  }

  // node_modules/d3-geo/src/graticule.js
  function graticuleX(y06, y12, dy) {
    var y = range(y06, y12 - epsilon, dy).concat(y12);
    return function(x) {
      return y.map(function(y2) {
        return [x, y2];
      });
    };
  }
  function graticuleY(x06, x12, dx) {
    var x = range(x06, x12 - epsilon, dx).concat(x12);
    return function(y) {
      return x.map(function(x2) {
        return [x2, y];
      });
    };
  }
  function graticule() {
    var x12, x06, X13, X03, y12, y06, Y13, Y03, dx = 10, dy = dx, DX = 90, DY = 360, x, y, X, Y, precision = 2.5;
    function graticule2() {
      return { type: "MultiLineString", coordinates: lines() };
    }
    function lines() {
      return range(ceil(X03 / DX) * DX, X13, DX).map(X).concat(range(ceil(Y03 / DY) * DY, Y13, DY).map(Y)).concat(range(ceil(x06 / dx) * dx, x12, dx).filter(function(x2) {
        return abs(x2 % DX) > epsilon;
      }).map(x)).concat(range(ceil(y06 / dy) * dy, y12, dy).filter(function(y2) {
        return abs(y2 % DY) > epsilon;
      }).map(y));
    }
    graticule2.lines = function() {
      return lines().map(function(coordinates2) {
        return { type: "LineString", coordinates: coordinates2 };
      });
    };
    graticule2.outline = function() {
      return {
        type: "Polygon",
        coordinates: [
          X(X03).concat(
            Y(Y13).slice(1),
            X(X13).reverse().slice(1),
            Y(Y03).reverse().slice(1)
          )
        ]
      };
    };
    graticule2.extent = function(_) {
      if (!arguments.length) return graticule2.extentMinor();
      return graticule2.extentMajor(_).extentMinor(_);
    };
    graticule2.extentMajor = function(_) {
      if (!arguments.length) return [[X03, Y03], [X13, Y13]];
      X03 = +_[0][0], X13 = +_[1][0];
      Y03 = +_[0][1], Y13 = +_[1][1];
      if (X03 > X13) _ = X03, X03 = X13, X13 = _;
      if (Y03 > Y13) _ = Y03, Y03 = Y13, Y13 = _;
      return graticule2.precision(precision);
    };
    graticule2.extentMinor = function(_) {
      if (!arguments.length) return [[x06, y06], [x12, y12]];
      x06 = +_[0][0], x12 = +_[1][0];
      y06 = +_[0][1], y12 = +_[1][1];
      if (x06 > x12) _ = x06, x06 = x12, x12 = _;
      if (y06 > y12) _ = y06, y06 = y12, y12 = _;
      return graticule2.precision(precision);
    };
    graticule2.step = function(_) {
      if (!arguments.length) return graticule2.stepMinor();
      return graticule2.stepMajor(_).stepMinor(_);
    };
    graticule2.stepMajor = function(_) {
      if (!arguments.length) return [DX, DY];
      DX = +_[0], DY = +_[1];
      return graticule2;
    };
    graticule2.stepMinor = function(_) {
      if (!arguments.length) return [dx, dy];
      dx = +_[0], dy = +_[1];
      return graticule2;
    };
    graticule2.precision = function(_) {
      if (!arguments.length) return precision;
      precision = +_;
      x = graticuleX(y06, y12, 90);
      y = graticuleY(x06, x12, precision);
      X = graticuleX(Y03, Y13, 90);
      Y = graticuleY(X03, X13, precision);
      return graticule2;
    };
    return graticule2.extentMajor([[-180, -90 + epsilon], [180, 90 - epsilon]]).extentMinor([[-180, -80 - epsilon], [180, 80 + epsilon]]);
  }
  function graticule10() {
    return graticule()();
  }

  // node_modules/d3-geo/src/interpolate.js
  function interpolate_default(a, b) {
    var x06 = a[0] * radians, y06 = a[1] * radians, x12 = b[0] * radians, y12 = b[1] * radians, cy0 = cos(y06), sy0 = sin(y06), cy1 = cos(y12), sy1 = sin(y12), kx0 = cy0 * cos(x06), ky0 = cy0 * sin(x06), kx1 = cy1 * cos(x12), ky1 = cy1 * sin(x12), d = 2 * asin(sqrt(haversin(y12 - y06) + cy0 * cy1 * haversin(x12 - x06))), k = sin(d);
    var interpolate2 = d ? function(t) {
      var B = sin(t *= d) / k, A = sin(d - t) / k, x = A * kx0 + B * kx1, y = A * ky0 + B * ky1, z = A * sy0 + B * sy1;
      return [
        atan2(y, x) * degrees,
        atan2(z, sqrt(x * x + y * y)) * degrees
      ];
    } : function() {
      return [x06 * degrees, y06 * degrees];
    };
    interpolate2.distance = d;
    return interpolate2;
  }

  // node_modules/d3-geo/src/identity.js
  var identity_default = (x) => x;

  // node_modules/d3-geo/src/path/area.js
  var areaSum2 = new Adder();
  var areaRingSum2 = new Adder();
  var x00;
  var y00;
  var x02;
  var y02;
  var areaStream2 = {
    point: noop,
    lineStart: noop,
    lineEnd: noop,
    polygonStart: function() {
      areaStream2.lineStart = areaRingStart2;
      areaStream2.lineEnd = areaRingEnd2;
    },
    polygonEnd: function() {
      areaStream2.lineStart = areaStream2.lineEnd = areaStream2.point = noop;
      areaSum2.add(abs(areaRingSum2));
      areaRingSum2 = new Adder();
    },
    result: function() {
      var area = areaSum2 / 2;
      areaSum2 = new Adder();
      return area;
    }
  };
  function areaRingStart2() {
    areaStream2.point = areaPointFirst2;
  }
  function areaPointFirst2(x, y) {
    areaStream2.point = areaPoint2;
    x00 = x02 = x, y00 = y02 = y;
  }
  function areaPoint2(x, y) {
    areaRingSum2.add(y02 * x - x02 * y);
    x02 = x, y02 = y;
  }
  function areaRingEnd2() {
    areaPoint2(x00, y00);
  }
  var area_default2 = areaStream2;

  // node_modules/d3-geo/src/path/bounds.js
  var x03 = Infinity;
  var y03 = x03;
  var x1 = -x03;
  var y1 = x1;
  var boundsStream2 = {
    point: boundsPoint2,
    lineStart: noop,
    lineEnd: noop,
    polygonStart: noop,
    polygonEnd: noop,
    result: function() {
      var bounds = [[x03, y03], [x1, y1]];
      x1 = y1 = -(y03 = x03 = Infinity);
      return bounds;
    }
  };
  function boundsPoint2(x, y) {
    if (x < x03) x03 = x;
    if (x > x1) x1 = x;
    if (y < y03) y03 = y;
    if (y > y1) y1 = y;
  }
  var bounds_default2 = boundsStream2;

  // node_modules/d3-geo/src/path/centroid.js
  var X02 = 0;
  var Y02 = 0;
  var Z02 = 0;
  var X12 = 0;
  var Y12 = 0;
  var Z12 = 0;
  var X22 = 0;
  var Y22 = 0;
  var Z22 = 0;
  var x002;
  var y002;
  var x04;
  var y04;
  var centroidStream2 = {
    point: centroidPoint2,
    lineStart: centroidLineStart2,
    lineEnd: centroidLineEnd2,
    polygonStart: function() {
      centroidStream2.lineStart = centroidRingStart2;
      centroidStream2.lineEnd = centroidRingEnd2;
    },
    polygonEnd: function() {
      centroidStream2.point = centroidPoint2;
      centroidStream2.lineStart = centroidLineStart2;
      centroidStream2.lineEnd = centroidLineEnd2;
    },
    result: function() {
      var centroid = Z22 ? [X22 / Z22, Y22 / Z22] : Z12 ? [X12 / Z12, Y12 / Z12] : Z02 ? [X02 / Z02, Y02 / Z02] : [NaN, NaN];
      X02 = Y02 = Z02 = X12 = Y12 = Z12 = X22 = Y22 = Z22 = 0;
      return centroid;
    }
  };
  function centroidPoint2(x, y) {
    X02 += x;
    Y02 += y;
    ++Z02;
  }
  function centroidLineStart2() {
    centroidStream2.point = centroidPointFirstLine;
  }
  function centroidPointFirstLine(x, y) {
    centroidStream2.point = centroidPointLine;
    centroidPoint2(x04 = x, y04 = y);
  }
  function centroidPointLine(x, y) {
    var dx = x - x04, dy = y - y04, z = sqrt(dx * dx + dy * dy);
    X12 += z * (x04 + x) / 2;
    Y12 += z * (y04 + y) / 2;
    Z12 += z;
    centroidPoint2(x04 = x, y04 = y);
  }
  function centroidLineEnd2() {
    centroidStream2.point = centroidPoint2;
  }
  function centroidRingStart2() {
    centroidStream2.point = centroidPointFirstRing;
  }
  function centroidRingEnd2() {
    centroidPointRing(x002, y002);
  }
  function centroidPointFirstRing(x, y) {
    centroidStream2.point = centroidPointRing;
    centroidPoint2(x002 = x04 = x, y002 = y04 = y);
  }
  function centroidPointRing(x, y) {
    var dx = x - x04, dy = y - y04, z = sqrt(dx * dx + dy * dy);
    X12 += z * (x04 + x) / 2;
    Y12 += z * (y04 + y) / 2;
    Z12 += z;
    z = y04 * x - x04 * y;
    X22 += z * (x04 + x);
    Y22 += z * (y04 + y);
    Z22 += z * 3;
    centroidPoint2(x04 = x, y04 = y);
  }
  var centroid_default2 = centroidStream2;

  // node_modules/d3-geo/src/path/context.js
  function PathContext(context) {
    this._context = context;
  }
  PathContext.prototype = {
    _radius: 4.5,
    pointRadius: function(_) {
      return this._radius = _, this;
    },
    polygonStart: function() {
      this._line = 0;
    },
    polygonEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._point = 0;
    },
    lineEnd: function() {
      if (this._line === 0) this._context.closePath();
      this._point = NaN;
    },
    point: function(x, y) {
      switch (this._point) {
        case 0: {
          this._context.moveTo(x, y);
          this._point = 1;
          break;
        }
        case 1: {
          this._context.lineTo(x, y);
          break;
        }
        default: {
          this._context.moveTo(x + this._radius, y);
          this._context.arc(x, y, this._radius, 0, tau);
          break;
        }
      }
    },
    result: noop
  };

  // node_modules/d3-geo/src/path/measure.js
  var lengthSum2 = new Adder();
  var lengthRing;
  var x003;
  var y003;
  var x05;
  var y05;
  var lengthStream2 = {
    point: noop,
    lineStart: function() {
      lengthStream2.point = lengthPointFirst2;
    },
    lineEnd: function() {
      if (lengthRing) lengthPoint2(x003, y003);
      lengthStream2.point = noop;
    },
    polygonStart: function() {
      lengthRing = true;
    },
    polygonEnd: function() {
      lengthRing = null;
    },
    result: function() {
      var length2 = +lengthSum2;
      lengthSum2 = new Adder();
      return length2;
    }
  };
  function lengthPointFirst2(x, y) {
    lengthStream2.point = lengthPoint2;
    x003 = x05 = x, y003 = y05 = y;
  }
  function lengthPoint2(x, y) {
    x05 -= x, y05 -= y;
    lengthSum2.add(sqrt(x05 * x05 + y05 * y05));
    x05 = x, y05 = y;
  }
  var measure_default = lengthStream2;

  // node_modules/d3-geo/src/path/string.js
  var cacheDigits;
  var cacheAppend;
  var cacheRadius;
  var cacheCircle;
  var PathString = class {
    constructor(digits) {
      this._append = digits == null ? append : appendRound(digits);
      this._radius = 4.5;
      this._ = "";
    }
    pointRadius(_) {
      this._radius = +_;
      return this;
    }
    polygonStart() {
      this._line = 0;
    }
    polygonEnd() {
      this._line = NaN;
    }
    lineStart() {
      this._point = 0;
    }
    lineEnd() {
      if (this._line === 0) this._ += "Z";
      this._point = NaN;
    }
    point(x, y) {
      switch (this._point) {
        case 0: {
          this._append`M${x},${y}`;
          this._point = 1;
          break;
        }
        case 1: {
          this._append`L${x},${y}`;
          break;
        }
        default: {
          this._append`M${x},${y}`;
          if (this._radius !== cacheRadius || this._append !== cacheAppend) {
            const r = this._radius;
            const s = this._;
            this._ = "";
            this._append`m0,${r}a${r},${r} 0 1,1 0,${-2 * r}a${r},${r} 0 1,1 0,${2 * r}z`;
            cacheRadius = r;
            cacheAppend = this._append;
            cacheCircle = this._;
            this._ = s;
          }
          this._ += cacheCircle;
          break;
        }
      }
    }
    result() {
      const result = this._;
      this._ = "";
      return result.length ? result : null;
    }
  };
  function append(strings) {
    let i = 1;
    this._ += strings[0];
    for (const j = strings.length; i < j; ++i) {
      this._ += arguments[i] + strings[i];
    }
  }
  function appendRound(digits) {
    const d = Math.floor(digits);
    if (!(d >= 0)) throw new RangeError(`invalid digits: ${digits}`);
    if (d > 15) return append;
    if (d !== cacheDigits) {
      const k = 10 ** d;
      cacheDigits = d;
      cacheAppend = function append2(strings) {
        let i = 1;
        this._ += strings[0];
        for (const j = strings.length; i < j; ++i) {
          this._ += Math.round(arguments[i] * k) / k + strings[i];
        }
      };
    }
    return cacheAppend;
  }

  // node_modules/d3-geo/src/path/index.js
  function path_default(projection2, context) {
    let digits = 3, pointRadius = 4.5, projectionStream, contextStream;
    function path(object2) {
      if (object2) {
        if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
        stream_default(object2, projectionStream(contextStream));
      }
      return contextStream.result();
    }
    path.area = function(object2) {
      stream_default(object2, projectionStream(area_default2));
      return area_default2.result();
    };
    path.measure = function(object2) {
      stream_default(object2, projectionStream(measure_default));
      return measure_default.result();
    };
    path.bounds = function(object2) {
      stream_default(object2, projectionStream(bounds_default2));
      return bounds_default2.result();
    };
    path.centroid = function(object2) {
      stream_default(object2, projectionStream(centroid_default2));
      return centroid_default2.result();
    };
    path.projection = function(_) {
      if (!arguments.length) return projection2;
      projectionStream = _ == null ? (projection2 = null, identity_default) : (projection2 = _).stream;
      return path;
    };
    path.context = function(_) {
      if (!arguments.length) return context;
      contextStream = _ == null ? (context = null, new PathString(digits)) : new PathContext(context = _);
      if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
      return path;
    };
    path.pointRadius = function(_) {
      if (!arguments.length) return pointRadius;
      pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
      return path;
    };
    path.digits = function(_) {
      if (!arguments.length) return digits;
      if (_ == null) digits = null;
      else {
        const d = Math.floor(_);
        if (!(d >= 0)) throw new RangeError(`invalid digits: ${_}`);
        digits = d;
      }
      if (context === null) contextStream = new PathString(digits);
      return path;
    };
    return path.projection(projection2).digits(digits).context(context);
  }

  // node_modules/d3-geo/src/transform.js
  function transformer(methods) {
    return function(stream) {
      var s = new TransformStream();
      for (var key in methods) s[key] = methods[key];
      s.stream = stream;
      return s;
    };
  }
  function TransformStream() {
  }
  TransformStream.prototype = {
    constructor: TransformStream,
    point: function(x, y) {
      this.stream.point(x, y);
    },
    sphere: function() {
      this.stream.sphere();
    },
    lineStart: function() {
      this.stream.lineStart();
    },
    lineEnd: function() {
      this.stream.lineEnd();
    },
    polygonStart: function() {
      this.stream.polygonStart();
    },
    polygonEnd: function() {
      this.stream.polygonEnd();
    }
  };

  // node_modules/d3-geo/src/projection/fit.js
  function fit(projection2, fitBounds, object2) {
    var clip = projection2.clipExtent && projection2.clipExtent();
    projection2.scale(150).translate([0, 0]);
    if (clip != null) projection2.clipExtent(null);
    stream_default(object2, projection2.stream(bounds_default2));
    fitBounds(bounds_default2.result());
    if (clip != null) projection2.clipExtent(clip);
    return projection2;
  }
  function fitExtent(projection2, extent, object2) {
    return fit(projection2, function(b) {
      var w = extent[1][0] - extent[0][0], h = extent[1][1] - extent[0][1], k = Math.min(w / (b[1][0] - b[0][0]), h / (b[1][1] - b[0][1])), x = +extent[0][0] + (w - k * (b[1][0] + b[0][0])) / 2, y = +extent[0][1] + (h - k * (b[1][1] + b[0][1])) / 2;
      projection2.scale(150 * k).translate([x, y]);
    }, object2);
  }
  function fitSize(projection2, size, object2) {
    return fitExtent(projection2, [[0, 0], size], object2);
  }
  function fitWidth(projection2, width, object2) {
    return fit(projection2, function(b) {
      var w = +width, k = w / (b[1][0] - b[0][0]), x = (w - k * (b[1][0] + b[0][0])) / 2, y = -k * b[0][1];
      projection2.scale(150 * k).translate([x, y]);
    }, object2);
  }
  function fitHeight(projection2, height, object2) {
    return fit(projection2, function(b) {
      var h = +height, k = h / (b[1][1] - b[0][1]), x = -k * b[0][0], y = (h - k * (b[1][1] + b[0][1])) / 2;
      projection2.scale(150 * k).translate([x, y]);
    }, object2);
  }

  // node_modules/d3-geo/src/projection/resample.js
  var maxDepth = 16;
  var cosMinDistance = cos(30 * radians);
  function resample_default(project, delta2) {
    return +delta2 ? resample(project, delta2) : resampleNone(project);
  }
  function resampleNone(project) {
    return transformer({
      point: function(x, y) {
        x = project(x, y);
        this.stream.point(x[0], x[1]);
      }
    });
  }
  function resample(project, delta2) {
    function resampleLineTo(x06, y06, lambda04, a0, b0, c0, x12, y12, lambda12, a1, b1, c1, depth, stream) {
      var dx = x12 - x06, dy = y12 - y06, d2 = dx * dx + dy * dy;
      if (d2 > 4 * delta2 && depth--) {
        var a = a0 + a1, b = b0 + b1, c = c0 + c1, m = sqrt(a * a + b * b + c * c), phi2 = asin(c /= m), lambda22 = abs(abs(c) - 1) < epsilon || abs(lambda04 - lambda12) < epsilon ? (lambda04 + lambda12) / 2 : atan2(b, a), p = project(lambda22, phi2), x2 = p[0], y2 = p[1], dx2 = x2 - x06, dy2 = y2 - y06, dz = dy * dx2 - dx * dy2;
        if (dz * dz / d2 > delta2 || abs((dx * dx2 + dy * dy2) / d2 - 0.5) > 0.3 || a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) {
          resampleLineTo(x06, y06, lambda04, a0, b0, c0, x2, y2, lambda22, a /= m, b /= m, c, depth, stream);
          stream.point(x2, y2);
          resampleLineTo(x2, y2, lambda22, a, b, c, x12, y12, lambda12, a1, b1, c1, depth, stream);
        }
      }
    }
    return function(stream) {
      var lambda004, x004, y004, a00, b00, c00, lambda04, x06, y06, a0, b0, c0;
      var resampleStream = {
        point,
        lineStart,
        lineEnd,
        polygonStart: function() {
          stream.polygonStart();
          resampleStream.lineStart = ringStart;
        },
        polygonEnd: function() {
          stream.polygonEnd();
          resampleStream.lineStart = lineStart;
        }
      };
      function point(x, y) {
        x = project(x, y);
        stream.point(x[0], x[1]);
      }
      function lineStart() {
        x06 = NaN;
        resampleStream.point = linePoint2;
        stream.lineStart();
      }
      function linePoint2(lambda, phi) {
        var c = cartesian([lambda, phi]), p = project(lambda, phi);
        resampleLineTo(x06, y06, lambda04, a0, b0, c0, x06 = p[0], y06 = p[1], lambda04 = lambda, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
        stream.point(x06, y06);
      }
      function lineEnd() {
        resampleStream.point = point;
        stream.lineEnd();
      }
      function ringStart() {
        lineStart();
        resampleStream.point = ringPoint;
        resampleStream.lineEnd = ringEnd;
      }
      function ringPoint(lambda, phi) {
        linePoint2(lambda004 = lambda, phi), x004 = x06, y004 = y06, a00 = a0, b00 = b0, c00 = c0;
        resampleStream.point = linePoint2;
      }
      function ringEnd() {
        resampleLineTo(x06, y06, lambda04, a0, b0, c0, x004, y004, lambda004, a00, b00, c00, maxDepth, stream);
        resampleStream.lineEnd = lineEnd;
        lineEnd();
      }
      return resampleStream;
    };
  }

  // node_modules/d3-geo/src/projection/index.js
  var transformRadians = transformer({
    point: function(x, y) {
      this.stream.point(x * radians, y * radians);
    }
  });
  function transformRotate(rotate) {
    return transformer({
      point: function(x, y) {
        var r = rotate(x, y);
        return this.stream.point(r[0], r[1]);
      }
    });
  }
  function scaleTranslate(k, dx, dy, sx, sy) {
    function transform(x, y) {
      x *= sx;
      y *= sy;
      return [dx + k * x, dy - k * y];
    }
    transform.invert = function(x, y) {
      return [(x - dx) / k * sx, (dy - y) / k * sy];
    };
    return transform;
  }
  function scaleTranslateRotate(k, dx, dy, sx, sy, alpha) {
    if (!alpha) return scaleTranslate(k, dx, dy, sx, sy);
    var cosAlpha = cos(alpha), sinAlpha = sin(alpha), a = cosAlpha * k, b = sinAlpha * k, ai = cosAlpha / k, bi = sinAlpha / k, ci = (sinAlpha * dy - cosAlpha * dx) / k, fi = (sinAlpha * dx + cosAlpha * dy) / k;
    function transform(x, y) {
      x *= sx;
      y *= sy;
      return [a * x - b * y + dx, dy - b * x - a * y];
    }
    transform.invert = function(x, y) {
      return [sx * (ai * x - bi * y + ci), sy * (fi - bi * x - ai * y)];
    };
    return transform;
  }
  function projection(project) {
    return projectionMutator(function() {
      return project;
    })();
  }
  function projectionMutator(projectAt) {
    var project, k = 150, x = 480, y = 250, lambda = 0, phi = 0, deltaLambda = 0, deltaPhi = 0, deltaGamma = 0, rotate, alpha = 0, sx = 1, sy = 1, theta = null, preclip = antimeridian_default, x06 = null, y06, x12, y12, postclip = identity_default, delta2 = 0.5, projectResample, projectTransform, projectRotateTransform, cache, cacheStream;
    function projection2(point) {
      return projectRotateTransform(point[0] * radians, point[1] * radians);
    }
    function invert(point) {
      point = projectRotateTransform.invert(point[0], point[1]);
      return point && [point[0] * degrees, point[1] * degrees];
    }
    projection2.stream = function(stream) {
      return cache && cacheStream === stream ? cache : cache = transformRadians(transformRotate(rotate)(preclip(projectResample(postclip(cacheStream = stream)))));
    };
    projection2.preclip = function(_) {
      return arguments.length ? (preclip = _, theta = void 0, reset()) : preclip;
    };
    projection2.postclip = function(_) {
      return arguments.length ? (postclip = _, x06 = y06 = x12 = y12 = null, reset()) : postclip;
    };
    projection2.clipAngle = function(_) {
      return arguments.length ? (preclip = +_ ? circle_default(theta = _ * radians) : (theta = null, antimeridian_default), reset()) : theta * degrees;
    };
    projection2.clipExtent = function(_) {
      return arguments.length ? (postclip = _ == null ? (x06 = y06 = x12 = y12 = null, identity_default) : clipRectangle(x06 = +_[0][0], y06 = +_[0][1], x12 = +_[1][0], y12 = +_[1][1]), reset()) : x06 == null ? null : [[x06, y06], [x12, y12]];
    };
    projection2.scale = function(_) {
      return arguments.length ? (k = +_, recenter()) : k;
    };
    projection2.translate = function(_) {
      return arguments.length ? (x = +_[0], y = +_[1], recenter()) : [x, y];
    };
    projection2.center = function(_) {
      return arguments.length ? (lambda = _[0] % 360 * radians, phi = _[1] % 360 * radians, recenter()) : [lambda * degrees, phi * degrees];
    };
    projection2.rotate = function(_) {
      return arguments.length ? (deltaLambda = _[0] % 360 * radians, deltaPhi = _[1] % 360 * radians, deltaGamma = _.length > 2 ? _[2] % 360 * radians : 0, recenter()) : [deltaLambda * degrees, deltaPhi * degrees, deltaGamma * degrees];
    };
    projection2.angle = function(_) {
      return arguments.length ? (alpha = _ % 360 * radians, recenter()) : alpha * degrees;
    };
    projection2.reflectX = function(_) {
      return arguments.length ? (sx = _ ? -1 : 1, recenter()) : sx < 0;
    };
    projection2.reflectY = function(_) {
      return arguments.length ? (sy = _ ? -1 : 1, recenter()) : sy < 0;
    };
    projection2.precision = function(_) {
      return arguments.length ? (projectResample = resample_default(projectTransform, delta2 = _ * _), reset()) : sqrt(delta2);
    };
    projection2.fitExtent = function(extent, object2) {
      return fitExtent(projection2, extent, object2);
    };
    projection2.fitSize = function(size, object2) {
      return fitSize(projection2, size, object2);
    };
    projection2.fitWidth = function(width, object2) {
      return fitWidth(projection2, width, object2);
    };
    projection2.fitHeight = function(height, object2) {
      return fitHeight(projection2, height, object2);
    };
    function recenter() {
      var center = scaleTranslateRotate(k, 0, 0, sx, sy, alpha).apply(null, project(lambda, phi)), transform = scaleTranslateRotate(k, x - center[0], y - center[1], sx, sy, alpha);
      rotate = rotateRadians(deltaLambda, deltaPhi, deltaGamma);
      projectTransform = compose_default(project, transform);
      projectRotateTransform = compose_default(rotate, projectTransform);
      projectResample = resample_default(projectTransform, delta2);
      return reset();
    }
    function reset() {
      cache = cacheStream = null;
      return projection2;
    }
    return function() {
      project = projectAt.apply(this, arguments);
      projection2.invert = project.invert && invert;
      return recenter();
    };
  }

  // node_modules/d3-geo/src/projection/azimuthal.js
  function azimuthalInvert(angle3) {
    return function(x, y) {
      var z = sqrt(x * x + y * y), c = angle3(z), sc = sin(c), cc = cos(c);
      return [
        atan2(x * sc, z * cc),
        asin(z && y * sc / z)
      ];
    };
  }

  // node_modules/d3-geo/src/projection/equalEarth.js
  var A1 = 1.340264;
  var A2 = -0.081106;
  var A3 = 893e-6;
  var A4 = 3796e-6;
  var M = sqrt(3) / 2;
  var iterations = 12;
  function equalEarthRaw(lambda, phi) {
    var l = asin(M * sin(phi)), l2 = l * l, l6 = l2 * l2 * l2;
    return [
      lambda * cos(l) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2))),
      l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2))
    ];
  }
  equalEarthRaw.invert = function(x, y) {
    var l = y, l2 = l * l, l6 = l2 * l2 * l2;
    for (var i = 0, delta, fy, fpy; i < iterations; ++i) {
      fy = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)) - y;
      fpy = A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2);
      l -= delta = fy / fpy, l2 = l * l, l6 = l2 * l2 * l2;
      if (abs(delta) < epsilon2) break;
    }
    return [
      M * x * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)) / cos(l),
      asin(sin(l) / M)
    ];
  };
  function equalEarth_default() {
    return projection(equalEarthRaw).scale(177.158);
  }

  // node_modules/d3-geo/src/projection/gnomonic.js
  function gnomonicRaw(x, y) {
    var cy = cos(y), k = cos(x) * cy;
    return [cy * sin(x) / k, sin(y) / k];
  }
  gnomonicRaw.invert = azimuthalInvert(atan);
  function gnomonic_default() {
    return projection(gnomonicRaw).scale(144.049).clipAngle(60);
  }

  // node_modules/d3-geo-polygon/src/noop.js
  function noop2() {
  }

  // node_modules/d3-geo-polygon/src/clip/buffer.js
  function buffer_default2() {
    let lines = [];
    let line;
    return {
      point: function(x, y, i, t) {
        const point = [x, y];
        if (arguments.length > 2) {
          point.index = i;
          point.t = t;
        }
        line.push(point);
      },
      lineStart: function() {
        lines.push(line = []);
      },
      lineEnd: noop2,
      rejoin: function() {
        if (lines.length > 1) lines.push(lines.pop().concat(lines.shift()));
      },
      result: function() {
        const result = lines;
        lines = [];
        line = null;
        return result;
      }
    };
  }

  // node_modules/d3-geo-polygon/src/pointEqual.js
  function pointEqual(a, b) {
    return a && b && a[0] === b[0] && a[1] === b[1];
  }

  // node_modules/d3-geo-polygon/src/clip/rejoin.js
  function Intersection2(point, points, other, entry) {
    this.x = point;
    this.z = points;
    this.o = other;
    this.e = entry;
    this.v = false;
    this.n = this.p = null;
  }
  function rejoin_default2(segments, compareIntersection3, startInside, interpolate2, stream) {
    const subject = [];
    const clip = [];
    segments.forEach((segment) => {
      let n;
      if ((n = segment.length - 1) <= 0) return;
      let p02 = segment[0];
      const p1 = segment[n];
      if (pointEqual(p02, p1)) {
        stream.lineStart();
        for (let i = 0; i < n; ++i) stream.point((p02 = segment[i])[0], p02[1]);
        stream.lineEnd();
        return;
      }
      let x;
      subject.push(x = new Intersection2(p02, segment, null, true));
      clip.push(x.o = new Intersection2(p02, null, x, false));
      subject.push(x = new Intersection2(p1, segment, null, false));
      clip.push(x.o = new Intersection2(p1, null, x, true));
    });
    if (!subject.length) return;
    clip.sort(compareIntersection3);
    link2(subject);
    link2(clip);
    for (let i = 0, n = clip.length; i < n; ++i) {
      clip[i].e = startInside = !startInside;
    }
    let start = subject[0], points, point;
    while (1) {
      let current = start, isSubject = true;
      while (current.v) if ((current = current.n) === start) return;
      points = current.z;
      stream.lineStart();
      do {
        current.v = current.o.v = true;
        if (current.e) {
          if (isSubject) {
            for (let i = 0, n = points.length; i < n; ++i) stream.point((point = points[i])[0], point[1]);
          } else {
            interpolate2(current.x, current.n.x, 1, stream);
          }
          current = current.n;
        } else {
          if (isSubject) {
            points = current.p.z;
            for (let i = points.length - 1; i >= 0; --i) stream.point((point = points[i])[0], point[1]);
          } else {
            interpolate2(current.x, current.p.x, -1, stream);
          }
          current = current.p;
        }
        current = current.o;
        points = current.z;
        isSubject = !isSubject;
      } while (!current.v);
      stream.lineEnd();
    }
  }
  function link2(array) {
    const n = array.length;
    if (!n) return;
    let i = 0, a = array[0], b;
    while (++i < n) {
      a.n = b = array[i];
      b.p = a;
      a = b;
    }
    a.n = b = array[0];
    b.p = a;
  }

  // node_modules/d3-geo-polygon/src/math.js
  var abs2 = Math.abs;
  var atan3 = Math.atan;
  var atan22 = Math.atan2;
  var cos2 = Math.cos;
  var hypot2 = Math.hypot;
  var max = Math.max;
  var min = Math.min;
  var sign2 = Math.sign || function(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  };
  var sin2 = Math.sin;
  var epsilon3 = 1e-6;
  var epsilon22 = 1e-12;
  var pi2 = Math.PI;
  var halfPi2 = pi2 / 2;
  var quarterPi2 = pi2 / 4;
  var sqrt2 = sqrt3(2);
  var sqrtPi = sqrt3(pi2);
  var tau2 = pi2 * 2;
  var degrees2 = 180 / pi2;
  var radians2 = pi2 / 180;
  function asin2(x) {
    return x > 1 ? halfPi2 : x < -1 ? -halfPi2 : Math.asin(x);
  }
  function acos2(x) {
    return x > 1 ? 0 : x < -1 ? pi2 : Math.acos(x);
  }
  function sqrt3(x) {
    return x > 0 ? Math.sqrt(x) : 0;
  }

  // node_modules/d3-geo-polygon/src/cartesian.js
  function spherical2(cartesian3) {
    return [atan22(cartesian3[1], cartesian3[0]), asin2(cartesian3[2])];
  }
  function cartesian2(spherical3) {
    const lambda = spherical3[0], phi = spherical3[1], cosPhi = cos2(phi);
    return [cosPhi * cos2(lambda), cosPhi * sin2(lambda), sin2(phi)];
  }
  function cartesianDot2(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function cartesianCross2(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function cartesianNormalize(d) {
    const l = hypot2(d[0], d[1], d[2]);
    return [d[0] / l, d[1] / l, d[2] / l];
  }
  function cartesianEqual(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    return dx * dx + dy * dy + dz * dz < epsilon22 * epsilon22;
  }

  // node_modules/d3-geo-polygon/src/polygonContains.js
  function polygonContains_default2(polygon, point) {
    const lambda = point[0];
    const phi = point[1];
    const normal = [sin2(lambda), -cos2(lambda), 0];
    let angle3 = 0;
    let winding = 0;
    const sum = new Adder();
    for (let i = 0, n = polygon.length; i < n; ++i) {
      if (!(m = (ring = polygon[i]).length)) continue;
      var ring, m, point0 = ring[m - 1], lambda04 = point0[0], phi02 = point0[1] / 2 + quarterPi2, sinPhi03 = sin2(phi02), cosPhi03 = cos2(phi02);
      for (let j = 0; j < m; ++j, lambda04 = lambda12, sinPhi03 = sinPhi1, cosPhi03 = cosPhi1, point0 = point1) {
        var point1 = ring[j], lambda12 = point1[0], phi12 = point1[1] / 2 + quarterPi2, sinPhi1 = sin2(phi12), cosPhi1 = cos2(phi12), delta = lambda12 - lambda04, sign3 = delta >= 0 ? 1 : -1, absDelta = sign3 * delta, antimeridian = absDelta > pi2, k = sinPhi03 * sinPhi1;
        sum.add(atan22(k * sign3 * sin2(absDelta), cosPhi03 * cosPhi1 + k * cos2(absDelta)));
        angle3 += antimeridian ? delta + sign3 * tau2 : delta;
        if (antimeridian ^ lambda04 >= lambda ^ lambda12 >= lambda) {
          const arc = cartesianNormalize(cartesianCross2(cartesian2(point0), cartesian2(point1)));
          const intersection = cartesianNormalize(cartesianCross2(normal, arc));
          const phiArc = (antimeridian ^ delta >= 0 ? -1 : 1) * asin2(intersection[2]);
          if (phi > phiArc || phi === phiArc && (arc[0] || arc[1])) {
            winding += antimeridian ^ delta >= 0 ? 1 : -1;
          }
        }
      }
    }
    return (angle3 < -epsilon3 || angle3 < epsilon3 && +sum < -epsilon3) ^ winding & 1;
  }

  // node_modules/d3-geo-polygon/src/clip/index.js
  function clip_default2(pointVisible, clipLine2, interpolate2, start, sort, { clipPoint = false } = {}) {
    if (typeof sort === "undefined") sort = compareIntersection2;
    return function(sink) {
      const line = clipLine2(sink);
      const ringBuffer = buffer_default2();
      const ringSink = clipLine2(ringBuffer);
      let polygonStarted = false, polygon, segments, ring;
      const clip = {
        point,
        lineStart,
        lineEnd,
        polygonStart: function() {
          clip.point = pointRing;
          clip.lineStart = ringStart;
          clip.lineEnd = ringEnd;
          segments = [];
          polygon = [];
        },
        polygonEnd: function() {
          clip.point = point;
          clip.lineStart = lineStart;
          clip.lineEnd = lineEnd;
          segments = merge(segments);
          const startInside = polygonContains_default2(polygon, start);
          if (segments.length) {
            if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
            rejoin_default2(segments, sort, startInside, interpolate2, sink);
          } else if (startInside) {
            if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
            interpolate2(null, null, 1, sink);
          }
          if (polygonStarted) sink.polygonEnd(), polygonStarted = false;
          segments = polygon = null;
        },
        sphere: () => interpolate2(null, null, 1, sink)
      };
      function point(lambda, phi) {
        if (!clipPoint && !ring || pointVisible(lambda, phi)) sink.point(lambda, phi);
      }
      function pointLine(lambda, phi) {
        line.point(lambda, phi);
      }
      function lineStart() {
        clip.point = pointLine;
        line.lineStart();
      }
      function lineEnd() {
        clip.point = point;
        line.lineEnd();
      }
      function pointRing(lambda, phi, close) {
        ring.push([lambda, phi]);
        ringSink.point(lambda, phi, close);
      }
      function ringStart() {
        ringSink.lineStart();
        ring = [];
      }
      function ringEnd() {
        pointRing(ring[0][0], ring[0][1], true);
        ringSink.lineEnd();
        const clean = ringSink.clean();
        const ringSegments2 = ringBuffer.result();
        const n = ringSegments2.length;
        let m, segment, point2;
        ring.pop();
        polygon.push(ring);
        ring = null;
        if (!n) return;
        if (clean & 1) {
          segment = ringSegments2[0];
          if ((m = segment.length - 1) > 0) {
            if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
            sink.lineStart();
            for (let i = 0; i < m; ++i) sink.point((point2 = segment[i])[0], point2[1]);
            sink.lineEnd();
          }
          return;
        }
        if (n > 1 && clean & 2) ringSegments2.push(ringSegments2.pop().concat(ringSegments2.shift()));
        segments.push(ringSegments2.filter(validSegment2));
      }
      return clip;
    };
  }
  function validSegment2(segment) {
    return segment.length > 1;
  }
  function compareIntersection2(a, b) {
    return ((a = a.x)[0] < 0 ? a[1] - halfPi2 - epsilon3 : halfPi2 - a[1]) - ((b = b.x)[0] < 0 ? b[1] - halfPi2 - epsilon3 : halfPi2 - b[1]);
  }

  // node_modules/d3-geo-polygon/src/intersect.js
  var intersectSegment = class {
    constructor(from, to) {
      this.from = from, this.to = to;
      this.normal = cartesianCross2(from, to);
      this.fromNormal = cartesianCross2(this.normal, from);
      this.toNormal = cartesianCross2(this.normal, to);
      this.l = acos2(cartesianDot2(from, to));
    }
  };
  function intersect(a, b) {
    if (cartesianEqual(a.from, b.from) || cartesianEqual(a.from, b.to)) return a.from;
    if (cartesianEqual(a.to, b.from) || cartesianEqual(a.to, b.to)) return a.to;
    const lc = a.l + b.l < pi2 ? cos2(a.l + b.l) - epsilon3 : -1;
    if (cartesianDot2(a.from, b.from) < lc || cartesianDot2(a.from, b.to) < lc || cartesianDot2(a.to, b.from) < lc || cartesianDot2(a.to, b.to) < lc)
      return;
    const axb = cartesianNormalize(cartesianCross2(a.normal, b.normal));
    const a0 = cartesianDot2(axb, a.fromNormal);
    const a1 = cartesianDot2(axb, a.toNormal);
    const b0 = cartesianDot2(axb, b.fromNormal);
    const b1 = cartesianDot2(axb, b.toNormal);
    if (a0 >= 0 && a1 <= 0 && b0 >= 0 && b1 <= 0)
      return axb;
    if (a0 <= 0 && a1 >= 0 && b0 <= 0 && b1 >= 0)
      return axb.map((d) => -d);
  }
  function intersectPointOnLine(p, a) {
    const a0 = cartesianDot2(p, a.fromNormal);
    const a1 = cartesianDot2(p, a.toNormal);
    p = cartesianDot2(p, a.normal);
    return abs2(p) < epsilon22 && (a0 > -epsilon22 && a1 < epsilon22 || a0 < epsilon22 && a1 > -epsilon22);
  }
  var intersectCoincident = {};

  // node_modules/d3-geo-polygon/src/clip/polygon.js
  var clipNone = (stream) => stream;
  function polygon_default(geometry) {
    let clipPoint = true;
    function clipGeometry(geometry2) {
      if (geometry2.type === "Polygon") geometry2 = { type: "MultiPolygon", coordinates: [geometry2.coordinates] };
      if (geometry2.type !== "MultiPolygon") return clipNone;
      const clips = geometry2.coordinates.map((polygon) => {
        polygon = polygon.map(ringRadians2);
        const pointVisible = visible(polygon);
        const segments = ringSegments(polygon[0]);
        return clip_default2(
          pointVisible,
          clipLine(segments, pointVisible),
          interpolate(segments, polygon),
          polygon[0][0],
          clipPolygonSort,
          { clipPoint }
        );
      });
      function clipPolygon(stream) {
        const clipstream = clips.map((clip) => clip(stream));
        return {
          point(lambda, phi) {
            clipstream.forEach((clip) => clip.point(lambda, phi));
          },
          lineStart() {
            clipstream.forEach((clip) => clip.lineStart());
          },
          lineEnd() {
            clipstream.forEach((clip) => clip.lineEnd());
          },
          polygonStart() {
            clipstream.forEach((clip) => clip.polygonStart());
          },
          polygonEnd() {
            clipstream.forEach((clip) => clip.polygonEnd());
          },
          sphere() {
            clipstream.forEach((clip) => clip.sphere());
          }
        };
      }
      clipPolygon.polygon = (_) => _ !== void 0 ? clipGeometry(geometry2 = _) : geometry2;
      clipPolygon.clipPoint = (_) => _ !== void 0 ? (clipPoint = !!_, clipGeometry(geometry2)) : clipPoint;
      return clipPolygon;
    }
    return clipGeometry(geometry);
  }
  function ringRadians2(ring) {
    return ring.map((point) => [point[0] * radians2, point[1] * radians2]);
  }
  function ringSegments(ring) {
    const segments = [];
    let c0;
    ring.forEach((point, i) => {
      const c = cartesian2(point);
      if (i) segments.push(new intersectSegment(c0, c));
      c0 = c;
      return point;
    });
    return segments;
  }
  function clipPolygonSort(a, b) {
    a = a.x, b = b.x;
    return a.index - b.index || a.t - b.t;
  }
  function interpolate(segments, polygon) {
    return (from, to, direction, stream) => {
      if (from == null) {
        stream.polygonStart();
        polygon.forEach((ring) => {
          stream.lineStart();
          ring.forEach((point) => stream.point(point[0], point[1]));
          stream.lineEnd();
        });
        stream.polygonEnd();
      } else if (from.index !== to.index && from.index != null && to.index != null) {
        for (let i = from.index; i !== to.index; i = (i + direction + segments.length) % segments.length) {
          const segment = segments[i];
          const point = spherical2(direction > 0 ? segment.to : segment.from);
          stream.point(point[0], point[1]);
        }
      } else if (from.index === to.index && from.t > to.t && from.index != null && to.index != null) {
        for (let i = 0; i < segments.length; ++i) {
          const segment = segments[(from.index + i * direction + segments.length) % segments.length];
          const point = spherical2(direction > 0 ? segment.to : segment.from);
          stream.point(point[0], point[1]);
        }
      }
    };
  }
  function clipPolygonDistance(a, b) {
    const axb = cartesianCross2(a, b);
    return atan22(sqrt3(cartesianDot2(axb, axb)), cartesianDot2(a, b));
  }
  function visible(polygon) {
    return (lambda, phi) => polygonContains_default2(polygon, [lambda, phi]);
  }
  function randsign(i, j) {
    return sign2(sin2(100 * i + j));
  }
  function clipLine(segments, pointVisible) {
    return function(stream) {
      let point0, lambda004, phi004, v00, v0, clean, line, lines = [];
      return {
        lineStart() {
          point0 = null;
          clean = 1;
          line = [];
        },
        lineEnd() {
          if (v0) lines.push(line);
          lines.forEach((line2) => {
            stream.lineStart();
            line2.forEach((point) => stream.point(...point));
            stream.lineEnd();
          });
          lines = [];
        },
        point(lambda, phi, close) {
          if (cos2(lambda) == -1) lambda -= sign2(sin2(lambda)) * 1e-5;
          if (close) lambda = lambda004, phi = phi004;
          let point = cartesian2([lambda * 0.9999999999, phi + 1e-14]);
          let v = v0;
          if (point0) {
            const intersections = [];
            let segment = new intersectSegment(point0, point);
            for (let i = 0, j = 100; i < segments.length && j > 0; ++i) {
              const s = segments[i];
              const intersection = intersect(segment, s);
              if (intersection) {
                if (intersection === intersectCoincident || cartesianEqual(intersection, point0) || cartesianEqual(intersection, point) || cartesianEqual(intersection, s.from) || cartesianEqual(intersection, s.to)) {
                  const t = 1e-4;
                  lambda = (lambda + 3 * pi2 + randsign(i, j) * t) % (2 * pi2) - pi2;
                  phi = min(pi2 / 2 - t, max(t - pi2 / 2, phi + randsign(i, j) * t));
                  segment = new intersectSegment(point0, point = cartesian2([lambda, phi]));
                  i = -1, --j;
                  intersections.length = 0;
                  continue;
                }
                const sph = spherical2(intersection);
                intersection.distance = clipPolygonDistance(point0, intersection);
                intersection.index = i;
                intersection.t = clipPolygonDistance(s.from, intersection);
                intersection[0] = sph[0];
                intersection[1] = sph[1];
                delete intersection[2];
                intersections.push(intersection);
              }
            }
            if (intersections.length) {
              clean = 0;
              intersections.sort((a, b) => a.distance - b.distance);
              for (let i = 0; i < intersections.length; ++i) {
                const intersection = intersections[i];
                v = !v;
                if (v) {
                  line = [];
                  line.push([
                    intersection[0],
                    intersection[1],
                    intersection.index,
                    intersection.t
                  ]);
                } else {
                  line.push([
                    intersection[0],
                    intersection[1],
                    intersection.index,
                    intersection.t
                  ]);
                  lines.push(line);
                }
              }
            }
            if (v) line.push([lambda, phi]);
          } else {
            for (let i = 0, j = 100; i < segments.length && j > 0; ++i) {
              const s = segments[i];
              if (intersectPointOnLine(point, s)) {
                const t = 1e-4;
                lambda = (lambda + 3 * pi2 + randsign(i, j) * t) % (2 * pi2) - pi2;
                phi = min(
                  pi2 / 2 - 1e-4,
                  max(1e-4 - pi2 / 2, phi + randsign(i, j) * t)
                );
                point = cartesian2([lambda, phi]);
                i = -1, --j;
              }
            }
            v00 = v = pointVisible(lambda004 = lambda, phi004 = phi);
            if (v) line = [], line.push([lambda, phi]);
          }
          point0 = point;
          v0 = v;
        },
        // Rejoin first and last segments if there were intersections and the first
        // and last points were visible.
        clean() {
          return clean | (v00 && v0) << 1;
        }
      };
    };
  }

  // node_modules/d3-geo-polygon/src/polyhedral/matrix.js
  function matrix_default(a, b) {
    const u = subtract(a[1], a[0]);
    const v = subtract(b[1], b[0]);
    const phi = angle2(u, v);
    const s = length(u) / length(v);
    return multiply([
      1,
      0,
      a[0][0],
      0,
      1,
      a[0][1]
    ], multiply([
      s,
      0,
      0,
      0,
      s,
      0
    ], multiply([
      cos2(phi),
      sin2(phi),
      0,
      -sin2(phi),
      cos2(phi),
      0
    ], [
      1,
      0,
      -b[0][0],
      0,
      1,
      -b[0][1]
    ])));
  }
  function inverse(m) {
    const k = 1 / (m[0] * m[4] - m[1] * m[3]);
    return [
      k * m[4],
      -k * m[1],
      k * (m[1] * m[5] - m[2] * m[4]),
      -k * m[3],
      k * m[0],
      k * (m[2] * m[3] - m[0] * m[5])
    ];
  }
  function multiply(a, b) {
    return [
      a[0] * b[0] + a[1] * b[3],
      a[0] * b[1] + a[1] * b[4],
      a[0] * b[2] + a[1] * b[5] + a[2],
      a[3] * b[0] + a[4] * b[3],
      a[3] * b[1] + a[4] * b[4],
      a[3] * b[2] + a[4] * b[5] + a[5]
    ];
  }
  function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1]];
  }
  function length(v) {
    return sqrt3(v[0] * v[0] + v[1] * v[1]);
  }
  function angle2(a, b) {
    return atan22(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
  }

  // node_modules/d3-geo-polygon/src/polyhedral/index.js
  function polyhedral_default(tree, face) {
    recurse(tree, { transform: null });
    function recurse(node, parent) {
      node.edges = faceEdges(node.face);
      if (parent.face) {
        const shared = node.shared = sharedEdge(node.face, parent.face);
        const m = matrix_default(shared.map(parent.project), shared.map(node.project));
        node.transform = parent.transform ? multiply(parent.transform, m) : m;
        let edges = parent.edges;
        for (let i = 0, n = edges.length; i < n; ++i) {
          if (pointEqual(shared[0], edges[i][1]) && pointEqual(shared[1], edges[i][0])) edges[i] = node;
          if (pointEqual(shared[0], edges[i][0]) && pointEqual(shared[1], edges[i][1])) edges[i] = node;
        }
        edges = node.edges;
        for (let i = 0, n = edges.length; i < n; ++i) {
          if (pointEqual(shared[0], edges[i][0]) && pointEqual(shared[1], edges[i][1])) edges[i] = parent;
          if (pointEqual(shared[0], edges[i][1]) && pointEqual(shared[1], edges[i][0])) edges[i] = parent;
        }
      } else {
        node.transform = parent.transform;
      }
      if (node.children) node.children.forEach((child) => recurse(child, node));
      return node;
    }
    function forward(lambda, phi) {
      const node = face(lambda, phi);
      const point = node.project([lambda * degrees2, phi * degrees2]);
      const t = node.transform;
      return t ? [t[0] * point[0] + t[1] * point[1] + t[2], -(t[3] * point[0] + t[4] * point[1] + t[5])] : [point[0], -point[1]];
    }
    if (hasInverse(tree)) forward.invert = function(x, y) {
      const coordinates2 = faceInvert(tree, [x, -y]);
      return coordinates2 && (coordinates2[0] *= radians2, coordinates2[1] *= radians2, coordinates2);
    };
    function faceInvert(node, coordinates2) {
      const invert = node.project.invert;
      let point = coordinates2;
      let p2;
      let t = node.transform;
      if (t) {
        t = inverse(t);
        point = [t[0] * point[0] + t[1] * point[1] + t[2], t[3] * point[0] + t[4] * point[1] + t[5]];
      }
      if (invert && node === faceDegrees(p2 = invert(point))) return p2;
      const children = node.children;
      for (let i = 0, n = children && children.length; i < n; ++i) {
        p2 = faceInvert(children[i], coordinates2);
        if (p2) return p2;
      }
    }
    function faceDegrees(coordinates2) {
      return face(coordinates2[0] * radians2, coordinates2[1] * radians2);
    }
    const proj = projection(forward);
    const p = [];
    const geometry = { type: "MultiPolygon", coordinates: [[p]] };
    outline({ point: (lambda, phi) => p.push([lambda, phi]) }, tree);
    p.push(p[0]);
    proj.preclip(polygon_default(geometry).clipPoint(area_default(geometry) < 4 * Math.PI - 0.1));
    proj.tree = function() {
      return tree;
    };
    return proj;
  }
  function outline(stream, node, parent) {
    let point, edges = node.edges, n = edges.length, edge, multiPoint = { type: "MultiPoint", coordinates: node.face }, notPoles = node.face.filter(function(d) {
      return abs2(d[1]) !== 90;
    }), b = bounds_default({ type: "MultiPoint", coordinates: notPoles }), inside = false, j = -1, dx = b[1][0] - b[0][0];
    node.centroid = dx === 180 || dx === 360 ? [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2] : centroid_default(multiPoint);
    if (parent) while (++j < n) {
      if (edges[j] === parent) break;
    }
    ++j;
    for (let i = 0; i < n; ++i) {
      edge = edges[(i + j) % n];
      if (Array.isArray(edge)) {
        if (!inside) {
          stream.point((point = interpolate_default(edge[0], node.centroid)(epsilon3))[0], point[1]);
          inside = true;
        }
        stream.point((point = interpolate_default(edge[1], node.centroid)(epsilon3))[0], point[1]);
      } else {
        inside = false;
        if (edge !== parent) outline(stream, edge, node);
      }
    }
  }
  function sharedEdge(a, b) {
    const n = a.length;
    let x, y, found = null;
    for (let i = 0; i < n; ++i) {
      x = a[i];
      for (let j = b.length; --j >= 0; ) {
        y = b[j];
        if (x[0] === y[0] && x[1] === y[1]) {
          if (found) return [found, x];
          found = x;
        }
      }
    }
  }
  function faceEdges(face) {
    const n = face.length;
    const edges = [];
    for (let i = 0, a = face[n - 1]; i < n; ++i) edges.push([a, a = face[i]]);
    return edges;
  }
  function hasInverse(node) {
    return node.project.invert || node.children && node.children.some(hasInverse);
  }

  // node_modules/d3-geo-polygon/src/grayfuller.js
  function GrayFullerRaw() {
    const SQRT_3 = sqrt3(3);
    const Z = sqrt3(5 + 2 * sqrt3(5)) / sqrt3(15);
    const el = sqrt3(8) / sqrt3(5 + sqrt3(5));
    const dve = sqrt3(3 + sqrt3(5)) / sqrt3(5 + sqrt3(5));
    const grayfuller = function(lambda, phi) {
      const cosPhi = cos2(phi), s = Z / (cosPhi * cos2(lambda)), x = cosPhi * sin2(lambda) * s, y = sin2(phi) * s, a1p = atan22(2 * y / SQRT_3 + el / 3 - el / 2, dve), a2p = atan22(x - y / SQRT_3 + el / 3 - el / 2, dve), a3p = atan22(el / 3 - x - y / SQRT_3 - el / 2, dve);
      return [SQRT_3 * (a2p - a3p), 2 * a1p - a2p - a3p];
    };
    grayfuller.invert = function(x, y) {
      if (x * x + y * y > 5) return [0, 3];
      const R = 2.9309936378128416;
      const p = gnomonicRaw.invert(x / R, y / R);
      let j = 0, dx, dy;
      do {
        const f = grayfuller(p[0], p[1]);
        dx = x - f[0], dy = y - f[1];
        p[0] += 0.2 * dx;
        p[1] += 0.2 * dy;
      } while (j++ < 30 && abs2(dx) + abs2(dy) > epsilon3);
      return p;
    };
    return grayfuller;
  }

  // node_modules/d3-geo-polygon/src/airocean.js
  function airoceanRaw(faceProjection) {
    const theta = atan3(0.5) * degrees2;
    const vertices = [[0, 90], [0, -90]].concat(
      range(10).map((i) => [(i * 36 + 180) % 360 - 180, i & 1 ? theta : -theta])
    );
    const polyhedron = [
      [0, 3, 11],
      [0, 5, 3],
      [0, 7, 5],
      [0, 9, 7],
      [0, 11, 9],
      // North
      [2, 11, 3],
      [3, 4, 2],
      [4, 3, 5],
      [5, 6, 4],
      [6, 5, 7],
      [7, 8, 6],
      [8, 7, 9],
      [9, 10, 8],
      [10, 9, 11],
      [11, 2, 10],
      // Equator
      [1, 2, 4],
      [1, 4, 6],
      [1, 6, 8],
      [1, 8, 10],
      [1, 10, 2]
      // South
    ].map((face) => face.map((i) => vertices[i]));
    polyhedron.forEach((face) => face.centroid = centroid_default({ type: "MultiPoint", coordinates: face }));
    (function() {
      let face, tmp, mid, centroid;
      face = polyhedron[15];
      centroid = face.centroid;
      tmp = face.slice();
      face[0] = centroid;
      face = [tmp[0], centroid, tmp[2]];
      face.centroid = centroid;
      polyhedron.push(face);
      face = [tmp[0], tmp[1], centroid];
      face.centroid = centroid;
      polyhedron.push(face);
      face = polyhedron[14];
      centroid = face.centroid;
      tmp = face.slice();
      const proj = gnomonic_default().scale(1).translate([0, 0]).rotate([-centroid[0], -centroid[1]]);
      const a = proj(face[1]), b = proj(face[2]);
      mid = proj.invert([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      face[1] = mid;
      face = [tmp[0], tmp[1], mid];
      face.centroid = centroid;
      polyhedron.push(face);
      face = polyhedron[19];
      centroid = face.centroid;
      tmp = face.slice();
      face[1] = mid;
      face = [mid, tmp[0], tmp[1]];
      face.centroid = centroid;
      polyhedron.push(face);
    })();
    const airocean = function(faceProjection2) {
      faceProjection2 = faceProjection2 || // for half-triangles this is definitely not centroid({type: "MultiPoint", coordinates: face});
      ((face2) => gnomonic_default().scale(1).translate([0, 0]).rotate([-face2.centroid[0], -face2.centroid[1]]));
      const faces = polyhedron.map((face2, i) => {
        const polygon = face2.slice();
        polygon.push(polygon[0]);
        return {
          face: face2,
          site: face2.centroid,
          id: i,
          contains: function(lambda, phi) {
            return contains_default({ type: "Polygon", coordinates: [polygon] }, [
              lambda * degrees2,
              phi * degrees2
            ]);
          },
          project: faceProjection2(face2)
        };
      });
      const parents = [
        // N
        -1,
        // 0
        0,
        // 1
        1,
        // 2
        11,
        // 3
        13,
        // 4
        // Eq
        6,
        // 5
        7,
        // 6
        1,
        // 7
        7,
        // 8
        8,
        // 9
        9,
        // 10
        10,
        // 11
        11,
        // 12
        12,
        // 13
        13,
        // 14
        // S
        6,
        // 15
        8,
        // 16
        10,
        // 17
        17,
        // 18
        21,
        // 19
        16,
        // 20
        15,
        // 21
        19,
        // 22
        19
        // 23
      ];
      parents.forEach((d, i) => {
        const node = faces[d];
        node && (node.children || (node.children = [])).push(faces[i]);
      });
      function face(lambda, phi) {
        for (let i = 0; i < faces.length; ++i) {
          if (faces[i].contains(lambda, phi)) return faces[i];
        }
      }
      const proj = polyhedral_default(
        faces[0],
        // the root face
        face
        // a function that returns a face given coords
      );
      proj.faces = faces;
      return proj;
    };
    return airocean(faceProjection);
  }
  function airocean_default() {
    const p = airoceanRaw((face) => {
      const c = face.centroid;
      face.direction = Math.abs(c[1] - 52.62) < 1 || Math.abs(c[1] + 10.81) < 1 ? 0 : 60;
      return projection(GrayFullerRaw()).scale(1).translate([0, 0]).rotate([-c[0], -c[1], face.direction || 0]);
    });
    return p.rotate([-83.65929, 25.44458, -87.45184]).angle(-60).scale(45.4631).center([126, 0]);
  }

  // src/renderer.mjs
  var PROJECTION_LABELS = Object.freeze({
    "equal-earth": "Equal Earth",
    airocean: "Airocean",
    "population-cartogram": "Fixed population cartogram"
  });
  function copy(value) {
    return structuredClone(value);
  }
  function datasetFor(fixture, datasetId) {
    const dataset = fixture.datasets.find(({ id }) => id === datasetId);
    if (!dataset) throw new Error(`Unknown dataset ${datasetId}`);
    return dataset;
  }
  function layerForDataset(fixture, datasetId) {
    const layer = fixture.layers.find((candidate) => candidate.datasetId === datasetId);
    if (!layer) throw new Error(`No layer for ${datasetId}`);
    return layer;
  }
  function layerById(fixture, layerId) {
    const layer = fixture.layers.find(({ id }) => id === layerId);
    if (!layer) throw new Error(`Unknown layer ${layerId}`);
    return layer;
  }
  function citationSet(fixture, ids) {
    return fixture.scene.citations.filter(({ id }) => ids.includes(id)).map(copy);
  }
  function projectionLabel(id) {
    return PROJECTION_LABELS[id] ?? id;
  }
  function legendEntry(dataset, value, status) {
    if (status !== "measured" || value === null || value === void 0) {
      return dataset.legend.find((entry) => entry.status === status) ?? dataset.legend.find((entry) => entry.id === "missing") ?? dataset.legend.at(-1);
    }
    return dataset.legend.find((entry) => entry.status === void 0 && value >= entry.min && (entry.max === null || value < entry.max)) ?? dataset.legend[0];
  }
  function recordsFor(fixture, dataset) {
    if (dataset.profile === "points-events") return fixture.points.map(copy);
    return fixture.geography.features.map((feature) => ({
      id: feature.id,
      label: feature.properties.label,
      value: feature.properties.value,
      status: feature.properties.status,
      uncertainty: feature.properties.uncertainty,
      geometry: copy(feature.geometry)
    }));
  }
  function finding(layer, projection2) {
    return {
      code: "renderer.projection.refused",
      severity: "error",
      layerId: layer.id,
      projection: projection2,
      message: `${layer.title ?? layer.id} supports ${layer.projections.map(projectionLabel).join(", ")}; ${projectionLabel(projection2)} was not applied.`
    };
  }
  function compatibleLayers(fixture, activeLayerIds, projection2) {
    const layers = activeLayerIds.map((id) => layerById(fixture, id));
    const refused = layers.find((layer) => !layer.projections.includes(projection2));
    return refused ? { compatible: false, finding: finding(refused, projection2) } : { compatible: true, layers };
  }
  function buildRenderModel(fixture, options = {}) {
    const datasetId = options.datasetId ?? fixture.datasets[0].id;
    const dataset = datasetFor(fixture, datasetId);
    const primaryLayer = layerForDataset(fixture, datasetId);
    const activeLayerIds = options.activeLayerIds ?? [primaryLayer.id];
    const projection2 = options.projection ?? fixture.scene.projection;
    const compatibility = compatibleLayers(fixture, activeLayerIds, projection2);
    if (!compatibility.compatible) {
      throw Object.assign(new Error(compatibility.finding.message), { finding: compatibility.finding });
    }
    const records = recordsFor(fixture, dataset).map((record) => ({
      ...record,
      legend: copy(legendEntry(dataset, record.value, record.status))
    }));
    const selectedId = records.some(({ id }) => id === options.selectedId) ? options.selectedId : records[0]?.id ?? null;
    return {
      status: "accepted",
      fixture,
      sceneId: fixture.scene.id,
      title: fixture.scene.title,
      summary: fixture.scene.summary,
      dataset: copy(dataset),
      datasetId,
      dataRevision: dataset.revision,
      encoding: dataset.encoding,
      period: dataset.period,
      projection: projection2,
      projectionLabel: projectionLabel(projection2),
      camera: copy(options.camera ?? fixture.scene.camera),
      selectedId,
      activeLayerIds: [...activeLayerIds],
      records,
      legend: dataset.legend.map(copy),
      citations: citationSet(fixture, dataset.citationIds),
      findings: [],
      hitTargets: []
    };
  }
  function changeProjection(model2, projection2) {
    const compatibility = compatibleLayers(model2.fixture, model2.activeLayerIds, projection2);
    if (!compatibility.compatible) {
      return { ...model2, status: "refused", requestedProjection: projection2, findings: [compatibility.finding] };
    }
    return buildRenderModel(model2.fixture, {
      datasetId: model2.datasetId,
      projection: projection2,
      camera: model2.camera,
      selectedId: model2.selectedId,
      activeLayerIds: model2.activeLayerIds
    });
  }
  function changeDataset(model2, datasetId) {
    const dataset = datasetFor(model2.fixture, datasetId);
    const projection2 = dataset.projections.includes(model2.projection) ? model2.projection : "equal-earth";
    return buildRenderModel(model2.fixture, { datasetId, projection: projection2, camera: model2.camera });
  }
  function setReferenceRaster(model2, enabled) {
    const primary = layerForDataset(model2.fixture, model2.datasetId).id;
    const activeLayerIds = enabled ? [primary, "layer:reference-raster"] : [primary];
    const compatibility = compatibleLayers(model2.fixture, activeLayerIds, model2.projection);
    if (!compatibility.compatible) {
      return { ...model2, status: "refused", findings: [compatibility.finding] };
    }
    return buildRenderModel(model2.fixture, {
      datasetId: model2.datasetId,
      projection: model2.projection,
      camera: model2.camera,
      selectedId: model2.selectedId,
      activeLayerIds
    });
  }
  function setCamera(model2, camera) {
    return buildRenderModel(model2.fixture, {
      datasetId: model2.datasetId,
      projection: model2.projection,
      camera,
      selectedId: model2.selectedId,
      activeLayerIds: model2.activeLayerIds
    });
  }
  function selectRecord(model2, selectedId) {
    if (!model2.records.some(({ id }) => id === selectedId)) return model2;
    return { ...model2, status: "accepted", selectedId, findings: [] };
  }
  function semanticSnapshot(model2) {
    return {
      title: model2.title,
      summary: model2.summary,
      dataset: model2.dataset.title,
      revision: model2.dataRevision,
      encoding: model2.encoding,
      period: model2.period,
      projection: model2.projectionLabel,
      legend: model2.legend.map(({ id, label, color }) => ({ id, label, color })),
      rows: model2.records.map(({ id, label, value, status, uncertainty, legend }) => ({
        id,
        label,
        value,
        status,
        uncertainty,
        legendClass: legend.id,
        selected: id === model2.selectedId
      })),
      citations: model2.citations.map(({ label, url, rights, revision }) => ({ label, url, rights, revision }))
    };
  }
  function layoutForWidth(width) {
    if (width >= 2400) return { name: "display-4k", controls: "compact-rail", columns: 2 };
    if (width <= 600) return { name: "phone", controls: "stacked", columns: 1 };
    return { name: "laptop", controls: "side-panel", columns: 2 };
  }
  function projectionFor(id, width, height, camera = { center: [0, 0], zoom: 1, pan: [0, 0] }) {
    if (id === "population-cartogram") return null;
    const projection2 = id === "airocean" ? airocean_default() : equalEarth_default();
    projection2.fitExtent([[24, 24], [width - 24, height - 24]], { type: "Sphere" });
    const [baseX, baseY] = projection2.translate();
    const [panX, panY] = camera.pan ?? [0, 0];
    projection2.center(camera.center ?? [0, 0]).scale(projection2.scale() * (camera.zoom ?? 1)).translate([baseX + panX, baseY + panY]);
    return projection2;
  }
  function resetCanvas(canvas, width, height) {
    const ratio = Math.max(1, Math.min(globalThis.devicePixelRatio ?? 1, 2));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    return context;
  }
  function drawRaster(context, width, height) {
    context.save();
    context.globalAlpha = 0.18;
    context.strokeStyle = "#5cc8ff";
    context.lineWidth = 1;
    for (let x = 0; x <= width; x += Math.max(30, width / 18)) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y <= height; y += Math.max(30, height / 10)) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    context.restore();
  }
  function drawCartogram(context, model2, width, height) {
    const records = new Map(model2.records.map((record) => [record.id, record]));
    const hits = [];
    context.fillStyle = "#111a32";
    context.fillRect(0, 0, width, height);
    for (const cell of model2.fixture.cartogram.cells) {
      const record = records.get(cell.id);
      if (!record) continue;
      const x = cell.x * width;
      const y = cell.y * height;
      const w = cell.width * width;
      const h = cell.height * height;
      context.fillStyle = record.legend.color;
      context.strokeStyle = record.id === model2.selectedId ? "#ffffff" : "#0b1020";
      context.lineWidth = record.id === model2.selectedId ? 4 : 2;
      context.fillRect(x, y, w, h);
      context.strokeRect(x, y, w, h);
      context.fillStyle = "#ffffff";
      context.font = `${Math.max(12, Math.min(18, w / 7))}px system-ui`;
      context.fillText(record.label, x + 8, y + 22, Math.max(20, w - 16));
      hits.push({ id: record.id, x, y, width: w, height: h });
    }
    return hits;
  }
  function drawProjected(context, model2, width, height) {
    const projection2 = projectionFor(model2.projection, width, height, model2.camera);
    const path = path_default(projection2, context);
    const hits = [];
    context.fillStyle = "#111a32";
    context.fillRect(0, 0, width, height);
    context.beginPath();
    path({ type: "Sphere" });
    context.fillStyle = "#0b2743";
    context.fill();
    context.strokeStyle = "#3c5a78";
    context.lineWidth = 1.2;
    context.stroke();
    context.beginPath();
    path(graticule10());
    context.strokeStyle = "rgba(197, 222, 255, .16)";
    context.lineWidth = 0.7;
    context.stroke();
    if (model2.activeLayerIds.includes("layer:reference-raster")) drawRaster(context, width, height);
    if (model2.dataset.profile === "points-events") {
      for (const record of model2.records) {
        const point = projection2(record.coordinates);
        if (!point) continue;
        const [x, y] = point;
        context.beginPath();
        context.arc(x, y, record.id === model2.selectedId ? 10 : 7, 0, Math.PI * 2);
        context.fillStyle = record.legend.color;
        context.fill();
        context.strokeStyle = record.id === model2.selectedId ? "#ffffff" : "#0b1020";
        context.lineWidth = record.id === model2.selectedId ? 3 : 2;
        context.stroke();
        hits.push({ id: record.id, x: x - 13, y: y - 13, width: 26, height: 26 });
      }
      return hits;
    }
    for (const record of model2.records) {
      const feature = { type: "Feature", id: record.id, properties: { label: record.label }, geometry: record.geometry };
      context.beginPath();
      path(feature);
      context.fillStyle = record.legend.color;
      context.fill();
      context.strokeStyle = record.id === model2.selectedId ? "#ffffff" : "#091323";
      context.lineWidth = record.id === model2.selectedId ? 3 : 1.5;
      context.stroke();
      const [[x06, y06], [x12, y12]] = path.bounds(feature);
      if (Number.isFinite(x06 + y06 + x12 + y12)) hits.push({ id: record.id, x: x06, y: y06, width: x12 - x06, height: y12 - y06 });
    }
    return hits;
  }
  function renderCanvas(canvas, model2, { width, height }) {
    const context = resetCanvas(canvas, width, height);
    const hitTargets = model2.projection === "population-cartogram" ? drawCartogram(context, model2, width, height) : drawProjected(context, model2, width, height);
    canvas.dataset.rendered = "true";
    return { ...model2, hitTargets };
  }
  function recordAtPoint(model2, x, y) {
    const hit = [...model2.hitTargets].reverse().find((target) => x >= target.x && x <= target.x + target.width && y >= target.y && y <= target.y + target.height);
    return hit ? model2.records.find(({ id }) => id === hit.id) ?? null : null;
  }

  // src/temporal.mjs
  var DAY = 864e5;
  var STATE_ENCODINGS = Object.freeze({
    measured: { label: "Measured", pattern: "solid" },
    missing: { label: "Missing", pattern: "blank" },
    zero: { label: "Reported zero", pattern: "zero-ring" },
    unavailable: { label: "Unavailable", pattern: "diagonal" },
    suppressed: { label: "Suppressed", pattern: "crosshatch" },
    "outside-range": { label: "Outside coverage", pattern: "outline" },
    filtered: { label: "Filtered", pattern: "faded" },
    interpolated: { label: "Interpolated", pattern: "dotted" },
    modeled: { label: "Modelled", pattern: "dashed" }
  });
  function copy2(value) {
    return structuredClone(value);
  }
  function dateForPeriod(period) {
    if (/^\d{4}$/u.test(period)) return /* @__PURE__ */ new Date(`${period}-07-01T00:00:00.000Z`);
    if (/^\d{4}-\d{2}$/u.test(period)) return /* @__PURE__ */ new Date(`${period}-15T00:00:00.000Z`);
    if (/^\d{4}-\d{2}-\d{2}$/u.test(period)) return /* @__PURE__ */ new Date(`${period}T00:00:00.000Z`);
    throw new TypeError(`Unsupported period ${period}`);
  }
  function distanceDays(left, right) {
    return Math.abs(dateForPeriod(left) - dateForPeriod(right)) / DAY;
  }
  function finding2(code, layer, time, message) {
    return { code, severity: "error", layerId: layer.id, time, message };
  }
  function interpolateRecords(before, after, ratio) {
    const later = new Map(after.records.map((record) => [record.id, record]));
    return before.records.map((record) => {
      const next = later.get(record.id);
      if (!next || record.status !== "measured" || next.status !== "measured") {
        return { ...copy2(record), value: null, status: next?.status ?? record.status ?? "unavailable" };
      }
      return {
        ...copy2(record),
        value: record.value + (next.value - record.value) * ratio,
        status: "interpolated",
        uncertainty: `Linear interpolation between ${before.period} and ${after.period}`
      };
    });
  }
  function aggregateRecords(observations, reducer) {
    const ids = [...new Set(observations.flatMap(({ records }) => records.map(({ id }) => id)))];
    return ids.map((id) => {
      const inputs = observations.map(({ records }) => records.find((record) => record.id === id)).filter(Boolean);
      if (!inputs.length || inputs.some(({ status }) => status !== "measured")) {
        return { id, value: null, status: inputs.find(({ status }) => status !== "measured")?.status ?? "unavailable" };
      }
      const total = inputs.reduce((sum, { value }) => sum + value, 0);
      return { ...copy2(inputs[0]), value: reducer === "mean" ? total / inputs.length : total, status: "modeled" };
    });
  }
  function alignLayer(layer, time) {
    if (layer.kind === "points") {
      const records = layer.records.map((record) => {
        const inside = dateForPeriod(record.start) <= dateForPeriod(time) && dateForPeriod(record.end) >= dateForPeriod(time);
        return inside ? copy2(record) : { ...copy2(record), status: "outside-range" };
      });
      return { status: "accepted", actualPeriod: time, records, transformation: { method: "coverage-filter", inputs: [time], parameters: { inclusive: true }, outputStatus: "measured", revision: layer.revision } };
    }
    const exact = layer.observations.find(({ period }) => period === time);
    if (exact) return { status: "accepted", actualPeriod: exact.period, records: copy2(exact.records), frameId: exact.frameId, transformation: null };
    const rule = layer.alignment;
    if (!rule) return { status: "refused", finding: finding2("time.alignment.rule_required", layer, time, `${layer.title} has no declared alignment rule for ${time}.`) };
    const ordered = [...layer.observations].sort((a, b) => dateForPeriod(a.period) - dateForPeriod(b.period));
    if (rule.method === "nearest") {
      const selected = ordered.toSorted((a, b) => distanceDays(a.period, time) - distanceDays(b.period, time))[0];
      const distance = selected ? distanceDays(selected.period, time) : Infinity;
      if (!selected || distance > rule.maxDays) return { status: "refused", finding: finding2("time.alignment.outside_tolerance", layer, time, `${layer.title} has no period within ${rule.maxDays} days of ${time}.`) };
      return { status: "accepted", actualPeriod: selected.period, records: copy2(selected.records), frameId: selected.frameId, transformation: { method: "nearest", inputs: [selected.period], parameters: { maxDays: rule.maxDays, distanceDays: distance }, outputStatus: "measured", revision: layer.revision } };
    }
    if (rule.method === "forward-fill") {
      const selected = ordered.filter(({ period }) => dateForPeriod(period) <= dateForPeriod(time)).at(-1);
      if (!selected || distanceDays(selected.period, time) > rule.maxDays) return { status: "refused", finding: finding2("time.alignment.outside_tolerance", layer, time, `${layer.title} cannot be forward-filled to ${time}.`) };
      return { status: "accepted", actualPeriod: selected.period, records: copy2(selected.records), transformation: { method: "forward-fill", inputs: [selected.period], parameters: { maxDays: rule.maxDays }, outputStatus: "modeled", revision: layer.revision } };
    }
    if (rule.method === "interpolate") {
      const before = ordered.filter(({ period }) => dateForPeriod(period) < dateForPeriod(time)).at(-1);
      const after = ordered.find(({ period }) => dateForPeriod(period) > dateForPeriod(time));
      if (!before || !after) return { status: "refused", finding: finding2("time.alignment.bounds_required", layer, time, `${layer.title} cannot interpolate ${time} without values on both sides.`) };
      const ratio = (dateForPeriod(time) - dateForPeriod(before.period)) / (dateForPeriod(after.period) - dateForPeriod(before.period));
      return { status: "accepted", actualPeriod: `${before.period} \u2192 ${after.period}`, records: interpolateRecords(before, after, ratio), transformation: { method: "linear-interpolation", inputs: [before.period, after.period], parameters: { ratio }, outputStatus: "interpolated", revision: layer.revision } };
    }
    if (rule.method === "aggregate") {
      const inputs = ordered.filter(({ period }) => period.startsWith(time.slice(0, 4)));
      if (!inputs.length) return { status: "refused", finding: finding2("time.alignment.inputs_missing", layer, time, `${layer.title} has no inputs to aggregate for ${time}.`) };
      return { status: "accepted", actualPeriod: inputs.map(({ period }) => period).join(", "), records: aggregateRecords(inputs, rule.reducer), transformation: { method: `${rule.reducer}-aggregation`, inputs: inputs.map(({ period }) => period), parameters: { calendar: "UTC year" }, outputStatus: "modeled", revision: layer.revision } };
    }
    return { status: "refused", finding: finding2("time.alignment.method_unsupported", layer, time, `${layer.title} uses unsupported alignment ${rule.method}.`) };
  }
  function buildTemporalFrame(fixture, options = {}) {
    const time = options.time ?? fixture.timeline[0];
    const projection2 = options.projection ?? fixture.projection;
    const activeLayerIds = options.activeLayerIds ?? fixture.layers.filter(({ defaultActive }) => defaultActive).map(({ id }) => id);
    const layers = [];
    for (const layerId of activeLayerIds) {
      const layer = fixture.layers.find(({ id }) => id === layerId);
      if (!layer) return { status: "refused", time, projection: projection2, activeLayerIds: [...activeLayerIds], layers: [], findings: [{ code: "layer.missing", severity: "error", layerId, time, message: `Unknown layer ${layerId}.` }] };
      if (!layer.projections.includes(projection2)) return { status: "refused", time, projection: projection2, activeLayerIds: [...activeLayerIds], layers: [], findings: [finding2("layer.projection.refused", layer, time, `${layer.title} cannot render on ${projection2}.`)] };
      const aligned = alignLayer(layer, time);
      if (aligned.status === "refused") return { status: "refused", time, projection: projection2, activeLayerIds: [...activeLayerIds], layers: [], findings: [aligned.finding] };
      const limit = layer.kind === "flow" ? 5e3 : layer.kind === "points" ? 1e4 : Infinity;
      layers.push({ ...copy2(layer), ...aligned, records: aligned.records.slice(0, limit), totalRecords: aligned.records.length, visibleRecords: Math.min(aligned.records.length, limit) });
    }
    return { status: "accepted", time, projection: projection2, activeLayerIds: [...activeLayerIds], layers, findings: [] };
  }
  function stateEncoding(status) {
    return copy2(STATE_ENCODINGS[status] ?? { label: status, pattern: "unknown" });
  }
  function temporalSnapshot(frame) {
    return {
      sceneTime: frame.time,
      projection: frame.projection,
      layers: frame.layers.map((layer) => ({
        id: layer.id,
        title: layer.title,
        kind: layer.kind,
        unit: layer.unit,
        actualPeriod: layer.actualPeriod,
        transformation: copy2(layer.transformation),
        rows: layer.records.map((record) => ({ ...copy2(record), encoding: stateEncoding(record.status) }))
      }))
    };
  }
  function renderTemporalOverlays(canvas, baseModel, frame) {
    if (frame.status !== "accepted" || baseModel.projection === "population-cartogram") return frame;
    const context = canvas.getContext("2d");
    const width = Number.parseFloat(canvas.style.width);
    const height = Number.parseFloat(canvas.style.height);
    const projection2 = projectionFor(baseModel.projection, width, height, baseModel.camera);
    context.save();
    for (const layer of frame.layers) {
      if (layer.kind === "raster") {
        context.globalAlpha = 0.18;
        for (const [index, cell] of layer.records.entries()) {
          context.fillStyle = cell.color;
          context.fillRect(index / layer.records.length * width, 0, width / layer.records.length, height);
        }
      } else if (layer.kind === "flow") {
        context.globalAlpha = 0.72;
        for (const record of layer.records) {
          if (record.status === "missing" || record.status === "unavailable") continue;
          const start = projection2(record.fromCoordinates);
          const end = projection2(record.toCoordinates);
          if (!start || !end) continue;
          context.beginPath();
          context.moveTo(...start);
          context.lineTo(...end);
          context.strokeStyle = record.status === "zero" ? "#a8b8d6" : layer.color;
          context.lineWidth = record.status === "zero" ? 1 : Math.max(1.5, Math.sqrt(record.value) / 2);
          context.setLineDash(record.status === "zero" ? [3, 5] : []);
          context.stroke();
        }
      } else if (layer.kind === "points") {
        context.setLineDash([]);
        for (const record of layer.records.filter(({ status }) => status !== "outside-range")) {
          const point = projection2(record.coordinates);
          if (!point) continue;
          context.beginPath();
          context.arc(point[0], point[1], 5, 0, Math.PI * 2);
          context.fillStyle = layer.color;
          context.fill();
        }
      } else if (layer.kind === "scalar" && layer.overlay) {
        context.setLineDash([]);
        for (const record of layer.records) {
          const coordinates2 = record.coordinates ?? (() => {
            const feature = baseModel.fixture.geography.features.find(({ id }) => id === record.id);
            return feature ? centroid_default(feature) : null;
          })();
          const point = coordinates2 ? projection2(coordinates2) : null;
          if (!point) continue;
          context.beginPath();
          context.arc(point[0], point[1], record.status === "interpolated" ? 9 : 7, 0, Math.PI * 2);
          context.strokeStyle = layer.color;
          context.lineWidth = 2.5;
          context.setLineDash(record.status === "interpolated" ? [2, 4] : []);
          context.stroke();
        }
      }
    }
    context.restore();
    canvas.dataset.temporalLayers = String(frame.layers.length);
    canvas.dataset.sceneTime = frame.time;
    return frame;
  }

  // app/app.mjs
  var elements = Object.fromEntries([
    "dataset",
    "projection",
    "reference-raster",
    "zoom-in",
    "zoom-out",
    "reset-view",
    "pause-inspection",
    "refusal",
    "revision",
    "period",
    "encoding",
    "current-projection",
    "dataset-title",
    "map-title",
    "map-summary",
    "selected-label",
    "selected-value",
    "selected-detail",
    "canvas-wrap",
    "map",
    "method-cue",
    "geography-caveat",
    "legend",
    "table-caption",
    "values",
    "citations",
    "cartogram-note",
    "motion-status",
    "scene-time",
    "temporal-layers",
    "play-time",
    "actual-periods",
    "alignment-note",
    "scene-library",
    "scene-title",
    "scene-summary",
    "scene-revision",
    "scene-definition",
    "scene-caveat",
    "scene-question",
    "scene-stop",
    "presenter-notes",
    "presentation-link",
    "previous-stop",
    "next-stop",
    "scene-share",
    "upgrade-status",
    "compare-upgrade",
    "portable-status",
    "prepare-bundle",
    "start-session",
    "end-session",
    "session-status",
    "join-url",
    "join-qr",
    "controller-app",
    "controller-status",
    "controller-time",
    "controller-projection",
    "controller-layers",
    "controller-feature",
    "controller-pan-left",
    "controller-pan-right",
    "controller-pan-up",
    "controller-pan-down",
    "controller-zoom-in",
    "controller-zoom-out",
    "controller-previous-stop",
    "controller-next-stop",
    "controller-revision"
  ].map((id) => [id, document.getElementById(id)]));
  var requestedProjection = new URL(window.location.href).searchParams.get("projection");
  var initialProjection = renderer_scene_default.datasets[0].projections.includes(requestedProjection) ? requestedProjection : renderer_scene_default.scene.projection;
  var model = buildRenderModel(renderer_scene_default, { projection: initialProjection });
  var temporalFrame = buildTemporalFrame(temporal_scene_default, { time: "2023-06", projection: initialProjection });
  var inspectionPaused = true;
  var animationTimer = null;
  var temporalFinding = null;
  var requestedSceneRevision = new URL(window.location.href).searchParams.get("sceneRevision");
  var educationalScene = educational_scenes_default.scenes.find(({ sceneId }) => requestedSceneRevision?.startsWith(`${sceneId}@`)) ?? educational_scenes_default.scenes[0];
  var educationalRevision = Number.parseInt(requestedSceneRevision?.split("@").at(-1), 10) || 1;
  var presentationStop = 0;
  var sessionParameters = new URL(window.location.href).searchParams;
  var controllerRole = sessionParameters.get("controller") === "1";
  var presentationRole = sessionParameters.get("presentation") === "1";
  document.body.dataset.presentation = String(presentationRole);
  var sessionLink = null;
  var sessionId = sessionParameters.get("session");
  var sessionSecret = sessionParameters.get("secret");
  var displaySessionRevision = 0;
  var lastSessionState = "";
  var controllerSnapshot = null;
  for (const scene of educational_scenes_default.scenes) {
    const option = document.createElement("option");
    option.value = scene.sceneId;
    option.textContent = scene.title;
    elements["scene-library"].append(option);
  }
  for (const dataset of renderer_scene_default.datasets) {
    const option = document.createElement("option");
    option.value = dataset.id;
    option.textContent = dataset.title;
    elements.dataset.append(option);
  }
  for (const period of temporal_scene_default.timeline) {
    const option = document.createElement("option");
    option.value = period;
    option.textContent = period;
    option.selected = period === temporalFrame.time;
    elements["scene-time"].append(option);
  }
  for (const layer of temporal_scene_default.layers) {
    const label = document.createElement("label");
    label.className = "check-row temporal-check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = layer.id;
    input.checked = layer.defaultActive === true;
    input.addEventListener("change", () => updateTemporal());
    const text = document.createElement("span");
    text.textContent = layer.title;
    label.append(input, text);
    elements["temporal-layers"].append(label);
  }
  function selectedTemporalLayers() {
    return [...elements["temporal-layers"].querySelectorAll("input:checked")].map(({ value }) => value);
  }
  function temporalCandidate(options = {}) {
    return buildTemporalFrame(temporal_scene_default, {
      time: options.time ?? elements["scene-time"].value,
      projection: options.projection ?? model.projection,
      activeLayerIds: options.activeLayerIds ?? selectedTemporalLayers()
    });
  }
  function updateTemporal(options = {}) {
    const candidate = temporalCandidate(options);
    if (candidate.status === "refused") {
      temporalFinding = candidate.findings[0];
      for (const checkbox of elements["temporal-layers"].querySelectorAll("input")) checkbox.checked = temporalFrame.activeLayerIds.includes(checkbox.value);
      elements["scene-time"].value = temporalFrame.time;
    } else {
      temporalFrame = candidate;
      temporalFinding = null;
    }
    render();
    return candidate;
  }
  function formatValue(record) {
    if (record.status !== "measured" || record.value === null) return "Not available";
    if (model.dataset.unit === "people") return new Intl.NumberFormat("en").format(record.value);
    return `${record.value} ${model.dataset.unit}`;
  }
  function renderSelected(snapshot) {
    const selected = snapshot.rows.find(({ selected: selected2 }) => selected2) ?? snapshot.rows[0];
    elements["selected-label"].textContent = selected?.label ?? "Nothing selected";
    elements["selected-value"].textContent = selected ? formatValue(selected) : "\u2014";
    elements["selected-detail"].textContent = selected ? `${selected.status} \xB7 ${selected.uncertainty}` : "";
  }
  function renderSemantic(snapshot) {
    elements.legend.replaceChildren(...snapshot.legend.map((entry) => {
      const item = document.createElement("li");
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = entry.color;
      swatch.setAttribute("aria-hidden", "true");
      item.append(swatch, entry.label);
      return item;
    }));
    elements["table-caption"].textContent = `${snapshot.dataset}, ${snapshot.period}; same values and classes as the Canvas view.`;
    elements.values.replaceChildren(...snapshot.rows.map((row) => {
      const tr = document.createElement("tr");
      tr.dataset.selected = String(row.selected);
      const place = document.createElement("td");
      const choose = document.createElement("button");
      choose.type = "button";
      choose.textContent = row.label;
      choose.disabled = !inspectionPaused;
      choose.addEventListener("click", () => {
        model = selectRecord(model, row.id);
        render();
      });
      place.append(choose);
      const value = document.createElement("td");
      value.textContent = formatValue(row);
      const status = document.createElement("td");
      status.textContent = row.status;
      const note = document.createElement("td");
      note.textContent = row.uncertainty;
      tr.append(place, value, status, note);
      return tr;
    }));
    elements.citations.replaceChildren(...snapshot.citations.map((citation) => {
      const item = document.createElement("li");
      const link3 = document.createElement("a");
      link3.href = citation.url;
      link3.textContent = citation.label;
      const detail = document.createTextNode(` \u2014 ${citation.revision}; ${citation.rights}`);
      item.append(link3, detail);
      return item;
    }));
  }
  function renderTemporalFacts() {
    const snapshot = temporalSnapshot(temporalFrame);
    elements["actual-periods"].replaceChildren(...snapshot.layers.map((layer) => {
      const item = document.createElement("li");
      const transformation = layer.transformation ? ` \xB7 ${layer.transformation.method}` : "";
      item.textContent = `${layer.title}: ${layer.actualPeriod}${transformation}`;
      return item;
    }));
    elements["alignment-note"].textContent = `${snapshot.layers.length} active layers. Every label names the source period actually used; transformations remain inspectable.`;
  }
  function sceneRevisionId() {
    return `${educationalScene.sceneId}@${educationalRevision}`;
  }
  function renderEducationalScene() {
    const stops = educationalScene.presentationStops;
    const stop = stops[presentationStop];
    elements["scene-library"].value = educationalScene.sceneId;
    elements["scene-title"].textContent = educationalScene.title;
    elements["scene-summary"].textContent = educationalScene.summary;
    elements["scene-revision"].textContent = sceneRevisionId();
    elements["scene-definition"].textContent = educationalScene.definitions.join(" ");
    elements["scene-caveat"].textContent = educationalScene.caveats.join(" ");
    elements["scene-question"].textContent = educationalScene.discussionPrompts.join(" ");
    elements["scene-stop"].textContent = `${stop.order} of ${stops.length} \xB7 ${stop.title}`;
    elements["presenter-notes"].textContent = stop.presenterNote;
    elements["previous-stop"].disabled = presentationStop === 0;
    elements["next-stop"].disabled = presentationStop === stops.length - 1;
    const share = new URL(window.location.href);
    share.search = "";
    share.searchParams.set("sceneRevision", sceneRevisionId());
    elements["scene-share"].textContent = share.toString();
    const presentation = new URL(share);
    presentation.searchParams.set("presentation", "1");
    elements["presentation-link"].href = presentation;
    elements["presentation-link"].textContent = presentationRole ? "Return to exploration controls" : "Open presentation display";
    if (presentationRole) {
      const exploration = new URL(share);
      exploration.searchParams.delete("presentation");
      elements["presentation-link"].href = exploration;
    }
  }
  function render() {
    const width = Math.max(280, Math.round(elements["canvas-wrap"].getBoundingClientRect().width));
    const height = window.innerWidth <= 600 ? 384 : window.innerWidth >= 2400 ? 928 : 528;
    model = renderCanvas(elements.map, model, { width, height });
    renderTemporalOverlays(elements.map, model, temporalFrame);
    const snapshot = semanticSnapshot(model);
    document.body.dataset.layout = layoutForWidth(window.innerWidth).name;
    document.body.dataset.motion = matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "standard";
    elements.dataset.value = model.datasetId;
    elements.projection.value = model.projection;
    elements["reference-raster"].checked = model.activeLayerIds.includes("layer:reference-raster");
    elements.revision.textContent = model.dataRevision;
    elements.revision.dataset.revision = model.dataRevision;
    elements.period.textContent = model.period;
    elements.encoding.textContent = model.encoding;
    elements["current-projection"].textContent = model.projectionLabel;
    elements["dataset-title"].textContent = model.dataset.title;
    elements["map-title"].textContent = model.title;
    elements["map-summary"].textContent = model.summary;
    elements["method-cue"].textContent = `Method: ${model.projectionLabel}. Measure: ${model.dataset.title}; unit: ${model.dataset.unit}; period: ${model.period}.`;
    elements["geography-caveat"].textContent = model.projection === "population-cartogram" ? renderer_scene_default.cartogram.caveat : renderer_scene_default.geography.caveat;
    elements["cartogram-note"].hidden = model.projection !== "population-cartogram";
    elements["cartogram-note"].textContent = `Cartogram geometry: ${renderer_scene_default.cartogram.source}, ${renderer_scene_default.cartogram.year}; ${renderer_scene_default.cartogram.geometryVersion}.`;
    renderSelected(snapshot);
    renderSemantic(snapshot);
    renderTemporalFacts();
    renderEducationalScene();
    if (temporalFinding) {
      elements.refusal.hidden = false;
      elements.refusal.textContent = temporalFinding.message;
    } else if (model.status === "refused") {
      elements.refusal.hidden = false;
      elements.refusal.textContent = model.findings[0].message;
    } else {
      elements.refusal.hidden = true;
      elements.refusal.textContent = "";
    }
    syncDisplaySession();
  }
  function displaySessionState() {
    return {
      period: temporalFrame.time,
      projection: model.projection,
      camera: structuredClone(model.camera),
      layers: [...temporalFrame.activeLayerIds],
      selectedFeature: model.selectedId ?? null,
      presentationStop
    };
  }
  function displaySnapshot() {
    return {
      sessionId,
      baseSceneRevision: sceneRevisionId(),
      acceptedRevision: displaySessionRevision,
      scene: displaySessionState()
    };
  }
  function syncDisplaySession() {
    if (!sessionLink || controllerRole) return;
    const state = JSON.stringify(displaySessionState());
    if (lastSessionState && state !== lastSessionState) displaySessionRevision += 1;
    if (state !== lastSessionState) {
      lastSessionState = state;
      sessionLink.publish(displaySnapshot());
      elements["session-status"].textContent = `Ready \xB7 revision ${displaySessionRevision}`;
    }
  }
  function controllerIntent(type, payload) {
    if (!sessionLink || !controllerSnapshot) return;
    const intentId = `intent:${crypto.randomUUID()}`;
    sessionLink.sendIntent({
      schema: "educational-global-maps/intent/v1",
      id: `${intentId}-v1`,
      content: { intentId, sessionId, baseRevision: controllerSnapshot.acceptedRevision, type, payload }
    });
  }
  function renderController(snapshot) {
    controllerSnapshot = snapshot;
    elements["controller-revision"].textContent = `${snapshot.baseSceneRevision} \xB7 revision ${snapshot.acceptedRevision}`;
    elements["controller-time"].value = snapshot.scene.period;
    elements["controller-projection"].value = snapshot.scene.projection;
    elements["controller-feature"].value = snapshot.scene.selectedFeature ?? "";
    for (const checkbox of elements["controller-layers"].querySelectorAll("input")) {
      checkbox.checked = snapshot.scene.layers.includes(checkbox.value);
    }
  }
  function applyControllerIntent(message) {
    const intent = message.intent?.content;
    if (!intent || intent.sessionId !== sessionId) return;
    if (intent.baseRevision !== displaySessionRevision) {
      sessionLink.publish(displaySnapshot());
      return;
    }
    const payload = intent.payload;
    if (intent.type === "set-time") {
      const candidate = updateTemporal({ time: payload.period });
      if (candidate.status === "accepted") elements["scene-time"].value = payload.period;
    } else if (intent.type === "set-projection") {
      const candidate = temporalCandidate({ projection: payload.projection });
      if (candidate.status === "accepted") {
        model = changeProjection(model, payload.projection);
        temporalFrame = candidate;
        temporalFinding = null;
        render();
      }
    } else if (intent.type === "set-layers") {
      for (const checkbox of elements["temporal-layers"].querySelectorAll("input")) checkbox.checked = payload.layers.includes(checkbox.value);
      updateTemporal({ activeLayerIds: payload.layers });
    } else if (intent.type === "set-camera") {
      model = setCamera(model, { center: payload.center, zoom: payload.zoom });
      render();
    } else if (intent.type === "select-feature") {
      model = selectRecord(model, payload.featureId);
      render();
    } else if (intent.type === "set-presentation-stop") {
      presentationStop = Math.min(educationalScene.presentationStops.length - 1, Math.max(0, payload.index));
      renderEducationalScene();
      syncDisplaySession();
    }
  }
  async function startDisplaySession() {
    sessionId = `session:${crypto.randomUUID()}`;
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    sessionSecret = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
    const relayUrl = sessionParameters.get("relay");
    const join = new URL(window.location.href);
    join.search = "";
    join.searchParams.set("controller", "1");
    join.searchParams.set("session", sessionId);
    join.searchParams.set("secret", sessionSecret);
    if (relayUrl) join.searchParams.set("relay", relayUrl);
    displaySessionRevision = 0;
    lastSessionState = JSON.stringify(displaySessionState());
    sessionLink = new BrowserSessionLink({
      role: "display",
      sessionId,
      secret: sessionSecret,
      relayUrl,
      onMessage: applyControllerIntent,
      onStatus: (status) => {
        elements["session-status"].textContent = status;
      }
    });
    sessionLink.connect(displaySnapshot());
    elements["join-url"].href = join;
    elements["join-url"].textContent = join.toString();
    elements["join-qr"].src = await import_qrcode.default.toDataURL(join.toString(), { width: 180, margin: 1, color: { dark: "#07111f", light: "#ffffff" } });
    elements["join-qr"].hidden = false;
    elements["start-session"].hidden = true;
    elements["end-session"].hidden = false;
  }
  function configureController() {
    document.querySelector(".masthead").hidden = true;
    document.querySelector(".workspace").hidden = true;
    elements["controller-app"].hidden = false;
    for (const period of temporal_scene_default.timeline) elements["controller-time"].append(new Option(period, period));
    for (const projection2 of ["equal-earth", "airocean", "population-cartogram"]) elements["controller-projection"].append(new Option(projection2, projection2));
    for (const layer of temporal_scene_default.layers) {
      const label = document.createElement("label");
      label.className = "check-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = layer.id;
      input.addEventListener("change", () => controllerIntent("set-layers", { layers: [...elements["controller-layers"].querySelectorAll("input:checked")].map(({ value }) => value) }));
      label.append(input, document.createTextNode(layer.title));
      elements["controller-layers"].append(label);
    }
    for (const row of semanticSnapshot(model).rows) elements["controller-feature"].append(new Option(row.label, row.id));
    const relayUrl = sessionParameters.get("relay");
    sessionLink = new BrowserSessionLink({
      role: "controller",
      sessionId,
      secret: sessionSecret,
      relayUrl,
      onMessage: (message) => {
        if (message.snapshot) renderController(message.snapshot);
      },
      onStatus: (status) => {
        elements["controller-status"].textContent = status;
      }
    });
    sessionLink.connect();
  }
  function activateEducationalScene(scene, revision = 1) {
    educationalScene = scene;
    educationalRevision = revision;
    presentationStop = 0;
    elements["upgrade-status"].textContent = "Pinned to the saved dataset revisions.";
    elements["portable-status"].textContent = "";
    model = changeDataset(model, scene.app.datasetId);
    for (const checkbox of elements["temporal-layers"].querySelectorAll("input")) checkbox.checked = scene.app.layerIds.includes(checkbox.value);
    const candidate = temporalCandidate({ time: scene.app.time, activeLayerIds: scene.app.layerIds });
    if (candidate.status === "accepted") temporalFrame = candidate;
    elements["scene-time"].value = temporalFrame.time;
    render();
  }
  elements["scene-library"].addEventListener("change", () => {
    activateEducationalScene(educational_scenes_default.scenes.find(({ sceneId }) => sceneId === elements["scene-library"].value));
  });
  elements["previous-stop"].addEventListener("click", () => {
    presentationStop = Math.max(0, presentationStop - 1);
    renderEducationalScene();
  });
  elements["next-stop"].addEventListener("click", () => {
    presentationStop = Math.min(educationalScene.presentationStops.length - 1, presentationStop + 1);
    renderEducationalScene();
  });
  elements["compare-upgrade"].addEventListener("click", () => {
    const population = educationalScene.layers.find(({ layerId }) => layerId === "layer:population-field");
    if (!population || population.datasetRevision.endsWith("@2024")) {
      elements["upgrade-status"].textContent = "This scene already uses the latest prepared population revision.";
      return;
    }
    educationalScene = structuredClone(educationalScene);
    const upgradedPopulation = educationalScene.layers.find(({ layerId }) => layerId === "layer:population-field");
    upgradedPopulation.datasetRevision = "dataset:population@2024";
    upgradedPopulation.period = "2024";
    educationalRevision += 1;
    elements["upgrade-status"].textContent = "Upgrade accepted as a new scene revision: dataset 2023 \u2192 2024, geography v1 \u2192 v2, transformation v1 \u2192 v2.";
    renderEducationalScene();
  });
  elements["prepare-bundle"].addEventListener("click", () => {
    const restricted = educationalScene.layers.some(({ layerId }) => layerId === "layer:learner-movement");
    elements["portable-status"].textContent = restricted ? "Bundle ready: permitted population bytes embedded. Learner movement remains a reference; classroom token required and live data is not redistributed." : "Bundle ready: all selected permitted assets embedded for offline single-device use.";
  });
  elements.dataset.addEventListener("change", () => {
    model = changeDataset(model, elements.dataset.value);
    render();
  });
  elements.projection.addEventListener("change", () => {
    const requested = elements.projection.value;
    const candidate = temporalCandidate({ projection: requested });
    if (candidate.status === "refused") {
      temporalFinding = candidate.findings[0];
      elements.projection.value = model.projection;
      render();
      return;
    }
    const changed = changeProjection(model, requested);
    model = changed;
    if (changed.status === "accepted") {
      temporalFrame = candidate;
      temporalFinding = null;
    }
    render();
  });
  elements["scene-time"].addEventListener("change", () => updateTemporal({ time: elements["scene-time"].value }));
  function stopAnimation() {
    if (animationTimer) window.clearInterval(animationTimer);
    animationTimer = null;
    elements["play-time"].textContent = "Play time";
    elements["play-time"].setAttribute("aria-pressed", "false");
  }
  elements["play-time"].addEventListener("click", () => {
    if (animationTimer) {
      stopAnimation();
      return;
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      temporalFinding = { message: "Automatic time animation is disabled by the reduced-motion preference; choose a time directly." };
      render();
      return;
    }
    elements["play-time"].textContent = "Pause time";
    elements["play-time"].setAttribute("aria-pressed", "true");
    animationTimer = window.setInterval(() => {
      const index = temporal_scene_default.timeline.indexOf(temporalFrame.time);
      const next = temporal_scene_default.timeline[(index + 1) % temporal_scene_default.timeline.length];
      const candidate = updateTemporal({ time: next });
      if (candidate.status === "accepted") elements["scene-time"].value = next;
      else stopAnimation();
    }, 1200);
  });
  elements["reference-raster"].addEventListener("change", () => {
    model = setReferenceRaster(model, elements["reference-raster"].checked);
    render();
  });
  elements["zoom-in"].addEventListener("click", () => {
    model = setCamera(model, { ...model.camera, zoom: Math.min(2.5, model.camera.zoom * 1.2) });
    render();
  });
  elements["zoom-out"].addEventListener("click", () => {
    model = setCamera(model, { ...model.camera, zoom: Math.max(0.65, model.camera.zoom / 1.2) });
    render();
  });
  elements["reset-view"].addEventListener("click", () => {
    model = setCamera(model, structuredClone(renderer_scene_default.scene.camera));
    render();
  });
  elements["pause-inspection"].addEventListener("click", () => {
    inspectionPaused = !inspectionPaused;
    elements["pause-inspection"].setAttribute("aria-pressed", String(inspectionPaused));
    elements["pause-inspection"].textContent = inspectionPaused ? "Inspection paused \xB7 values enabled" : "Pause to inspect exact values";
    elements["motion-status"].textContent = inspectionPaused ? "Paused" : "Exploring";
    render();
  });
  elements.map.addEventListener("click", (event) => {
    if (!inspectionPaused) return;
    const rect = elements.map.getBoundingClientRect();
    const record = recordAtPoint(model, event.clientX - rect.left, event.clientY - rect.top);
    if (record) {
      model = selectRecord(model, record.id);
      render();
    }
  });
  window.addEventListener("resize", render);
  elements["start-session"].addEventListener("click", startDisplaySession);
  elements["end-session"].addEventListener("click", () => {
    sessionLink?.end();
    sessionLink = null;
    elements["session-status"].textContent = "Ended \xB7 display remains usable";
    elements["end-session"].hidden = true;
    elements["start-session"].hidden = false;
  });
  elements["controller-time"].addEventListener("change", () => controllerIntent("set-time", { period: elements["controller-time"].value }));
  elements["controller-projection"].addEventListener("change", () => controllerIntent("set-projection", { projection: elements["controller-projection"].value }));
  elements["controller-feature"].addEventListener("change", () => controllerIntent("select-feature", { featureId: elements["controller-feature"].value || null }));
  for (const [id, longitude2, latitude] of [
    ["controller-pan-left", -10, 0],
    ["controller-pan-right", 10, 0],
    ["controller-pan-up", 0, 8],
    ["controller-pan-down", 0, -8]
  ]) {
    elements[id].addEventListener("click", () => {
      const camera = controllerSnapshot.scene.camera;
      controllerIntent("set-camera", { center: [camera.center[0] + longitude2, camera.center[1] + latitude], zoom: camera.zoom });
    });
  }
  elements["controller-zoom-in"].addEventListener("click", () => {
    const camera = controllerSnapshot.scene.camera;
    controllerIntent("set-camera", { center: camera.center, zoom: Math.min(2.5, camera.zoom * 1.2) });
  });
  elements["controller-zoom-out"].addEventListener("click", () => {
    const camera = controllerSnapshot.scene.camera;
    controllerIntent("set-camera", { center: camera.center, zoom: Math.max(0.65, camera.zoom / 1.2) });
  });
  elements["controller-previous-stop"].addEventListener("click", () => controllerIntent("set-presentation-stop", { index: Math.max(0, controllerSnapshot.scene.presentationStop - 1) }));
  elements["controller-next-stop"].addEventListener("click", () => controllerIntent("set-presentation-stop", { index: controllerSnapshot.scene.presentationStop + 1 }));
  elements["upgrade-status"].textContent = "Pinned to the saved dataset revisions.";
  render();
  if (controllerRole) configureController();
})();
