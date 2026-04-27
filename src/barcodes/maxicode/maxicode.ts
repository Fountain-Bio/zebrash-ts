// Port of github.com/ingridhq/maxicode/maxicode.go.
//
// Entry point: `encode(mode, eci, inputData)` builds a 30 x 33 module grid
// for a Maxicode symbol. Drawing of hexagons / bullseye is left to the
// renderer that consumes the SymbolGrid (zebrash unit 23).

import { type Encoder, newEncoder } from "./readsolomon.js";
import { SymbolGrid } from "./symbolgrid.js";

// Special characters.
export const RS = String.fromCharCode(30);
export const GS = String.fromCharCode(29);
export const EOT = String.fromCharCode(4);

// ISO/IEC 16023 Figure 5 - MaxiCode Module Sequence (30 x 33 data grid).
const maxiGrid: readonly number[] = [
  122, 121, 128, 127, 134, 133, 140, 139, 146, 145, 152, 151, 158, 157, 164, 163, 170, 169, 176,
  175, 182, 181, 188, 187, 194, 193, 200, 199, 0, 0, 124, 123, 130, 129, 136, 135, 142, 141, 148,
  147, 154, 153, 160, 159, 166, 165, 172, 171, 178, 177, 184, 183, 190, 189, 196, 195, 202, 201,
  817, 0, 126, 125, 132, 131, 138, 137, 144, 143, 150, 149, 156, 155, 162, 161, 168, 167, 174, 173,
  180, 179, 186, 185, 192, 191, 198, 197, 204, 203, 819, 818, 284, 283, 278, 277, 272, 271, 266,
  265, 260, 259, 254, 253, 248, 247, 242, 241, 236, 235, 230, 229, 224, 223, 218, 217, 212, 211,
  206, 205, 820, 0, 286, 285, 280, 279, 274, 273, 268, 267, 262, 261, 256, 255, 250, 249, 244, 243,
  238, 237, 232, 231, 226, 225, 220, 219, 214, 213, 208, 207, 822, 821, 288, 287, 282, 281, 276,
  275, 270, 269, 264, 263, 258, 257, 252, 251, 246, 245, 240, 239, 234, 233, 228, 227, 222, 221,
  216, 215, 210, 209, 823, 0, 290, 289, 296, 295, 302, 301, 308, 307, 314, 313, 320, 319, 326, 325,
  332, 331, 338, 337, 344, 343, 350, 349, 356, 355, 362, 361, 368, 367, 825, 824, 292, 291, 298,
  297, 304, 303, 310, 309, 316, 315, 322, 321, 328, 327, 334, 333, 340, 339, 346, 345, 352, 351,
  358, 357, 364, 363, 370, 369, 826, 0, 294, 293, 300, 299, 306, 305, 312, 311, 318, 317, 324, 323,
  330, 329, 336, 335, 342, 341, 348, 347, 354, 353, 360, 359, 366, 365, 372, 371, 828, 827, 410,
  409, 404, 403, 398, 397, 392, 391, 80, 79, 0, 0, 14, 13, 38, 37, 3, 0, 45, 44, 110, 109, 386, 385,
  380, 379, 374, 373, 829, 0, 412, 411, 406, 405, 400, 399, 394, 393, 82, 81, 41, 0, 16, 15, 40, 39,
  4, 0, 0, 46, 112, 111, 388, 387, 382, 381, 376, 375, 831, 830, 414, 413, 408, 407, 402, 401, 396,
  395, 84, 83, 42, 0, 0, 0, 0, 0, 6, 5, 48, 47, 114, 113, 390, 389, 384, 383, 378, 377, 832, 0, 416,
  415, 422, 421, 428, 427, 104, 103, 56, 55, 17, 0, 0, 0, 0, 0, 0, 0, 21, 20, 86, 85, 434, 433, 440,
  439, 446, 445, 834, 833, 418, 417, 424, 423, 430, 429, 106, 105, 58, 57, 0, 0, 0, 0, 0, 0, 0, 0,
  23, 22, 88, 87, 436, 435, 442, 441, 448, 447, 835, 0, 420, 419, 426, 425, 432, 431, 108, 107, 60,
  59, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24, 90, 89, 438, 437, 444, 443, 450, 449, 837, 836, 482, 481, 476,
  475, 470, 469, 49, 0, 31, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 54, 53, 464, 463, 458, 457, 452, 451,
  838, 0, 484, 483, 478, 477, 472, 471, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 466, 465,
  460, 459, 454, 453, 840, 839, 486, 485, 480, 479, 474, 473, 52, 51, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 2, 0, 43, 468, 467, 462, 461, 456, 455, 841, 0, 488, 487, 494, 493, 500, 499, 98, 97, 62, 61,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 27, 92, 91, 506, 505, 512, 511, 518, 517, 843, 842, 490, 489, 496, 495,
  502, 501, 100, 99, 64, 63, 0, 0, 0, 0, 0, 0, 0, 0, 29, 28, 94, 93, 508, 507, 514, 513, 520, 519,
  844, 0, 492, 491, 498, 497, 504, 503, 102, 101, 66, 65, 18, 0, 0, 0, 0, 0, 0, 0, 19, 30, 96, 95,
  510, 509, 516, 515, 522, 521, 846, 845, 560, 559, 554, 553, 548, 547, 542, 541, 74, 73, 33, 0, 0,
  0, 0, 0, 0, 11, 68, 67, 116, 115, 536, 535, 530, 529, 524, 523, 847, 0, 562, 561, 556, 555, 550,
  549, 544, 543, 76, 75, 0, 0, 8, 7, 36, 35, 12, 0, 70, 69, 118, 117, 538, 537, 532, 531, 526, 525,
  849, 848, 564, 563, 558, 557, 552, 551, 546, 545, 78, 77, 0, 34, 10, 9, 26, 25, 0, 0, 72, 71, 120,
  119, 540, 539, 534, 533, 528, 527, 850, 0, 566, 565, 572, 571, 578, 577, 584, 583, 590, 589, 596,
  595, 602, 601, 608, 607, 614, 613, 620, 619, 626, 625, 632, 631, 638, 637, 644, 643, 852, 851,
  568, 567, 574, 573, 580, 579, 586, 585, 592, 591, 598, 597, 604, 603, 610, 609, 616, 615, 622,
  621, 628, 627, 634, 633, 640, 639, 646, 645, 853, 0, 570, 569, 576, 575, 582, 581, 588, 587, 594,
  593, 600, 599, 606, 605, 612, 611, 618, 617, 624, 623, 630, 629, 636, 635, 642, 641, 648, 647,
  855, 854, 728, 727, 722, 721, 716, 715, 710, 709, 704, 703, 698, 697, 692, 691, 686, 685, 680,
  679, 674, 673, 668, 667, 662, 661, 656, 655, 650, 649, 856, 0, 730, 729, 724, 723, 718, 717, 712,
  711, 706, 705, 700, 699, 694, 693, 688, 687, 682, 681, 676, 675, 670, 669, 664, 663, 658, 657,
  652, 651, 858, 857, 732, 731, 726, 725, 720, 719, 714, 713, 708, 707, 702, 701, 696, 695, 690,
  689, 684, 683, 678, 677, 672, 671, 666, 665, 660, 659, 654, 653, 859, 0, 734, 733, 740, 739, 746,
  745, 752, 751, 758, 757, 764, 763, 770, 769, 776, 775, 782, 781, 788, 787, 794, 793, 800, 799,
  806, 805, 812, 811, 861, 860, 736, 735, 742, 741, 748, 747, 754, 753, 760, 759, 766, 765, 772,
  771, 778, 777, 784, 783, 790, 789, 796, 795, 802, 801, 808, 807, 814, 813, 862, 0, 738, 737, 744,
  743, 750, 749, 756, 755, 762, 761, 768, 767, 774, 773, 780, 779, 786, 785, 792, 791, 798, 797,
  804, 803, 810, 809, 816, 815, 864, 863,
];

// Appendix A - ASCII character to Code Set (e.g. 2 = Set B).
// Set 0 refers to special characters that fit into more than one set (e.g. GS).
const maxiCodeSet: readonly number[] = [
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 5, 0,
  2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 2, 2, 2, 2, 2, 2, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3,
  3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 5, 5, 5,
  5, 5, 5, 4, 5, 3, 4, 3, 5, 5, 4, 4, 3, 3, 3, 4, 3, 5, 4, 4, 3, 3, 4, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3,
  3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4,
  4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
];

// Appendix A - ASCII character to symbol value.
const maxiSymbolChar: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
  30, 28, 29, 30, 35, 32, 53, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
  51, 52, 53, 54, 55, 56, 57, 58, 37, 38, 39, 40, 41, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
  14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 42, 43, 44, 45, 46, 0, 1, 2, 3, 4, 5, 6, 7, 8,
  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 32, 54, 34, 35, 36, 48, 49,
  50, 51, 52, 53, 54, 55, 56, 57, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 49, 50, 51, 52,
  53, 54, 55, 56, 57, 36, 37, 37, 38, 39, 40, 41, 42, 43, 38, 44, 37, 39, 38, 45, 46, 40, 41, 39,
  40, 41, 42, 42, 47, 43, 44, 43, 44, 45, 45, 46, 47, 46, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 32, 33, 34, 35, 36, 0, 1, 2, 3, 4, 5, 6,
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 32, 33, 34, 35, 36,
];

const rsEcc10 = newEncoder(0x43, 10, 1);
const rsEcc20 = newEncoder(0x43, 20, 1);
const rsEcc28 = newEncoder(0x43, 28, 1);

function getRsEncoder(eccLen: number): Encoder {
  switch (eccLen) {
    case 10:
      return rsEcc10;
    case 20:
      return rsEcc20;
    default:
      return rsEcc28;
  }
}

export function encode(mode: number, eci: number, inputData: string): SymbolGrid {
  const scmHeader = `[)>${RS}01${GS}`;

  if (mode < 2 || mode > 6) {
    throw new Error("only modes 2 to 6 supported");
  }

  const codewords = new Int32Array(144);
  let secondaryData = "";

  if (mode === 2 || mode === 3) {
    if (!inputData.startsWith(scmHeader)) {
      throw new Error("invalid mode 2 / mode 3 structured carrier message header");
    }

    // Header + postcode + country code + service class + tracking code + SCAC + EOT
    // (44 characters mode 2, 41 for mode 3).
    const minLen = mode === 2 ? 44 : 41;

    if (inputData.length < minLen) {
      throw new Error("input data is shorter than mandatory UPS requirements");
    }

    if (!inputData.endsWith(EOT)) {
      throw new Error("input data should end with EOT marker");
    }

    // Extract the postcode, country code and service class and save in the
    // primary data buffer. Note: Group separators GS are removed.
    const postcodeStart = 9;

    const groups = inputData.slice(postcodeStart).split(GS);
    if (groups.length < 3) {
      throw new Error(
        "input data should contain postcode, country code and service class separated by Gs",
      );
    }

    const postcode = groups[0]!;
    const countryCode = groups[1]!;
    const serviceClass = groups[2]!;

    if ((mode === 2 && postcode.length !== 9) || (mode === 3 && postcode.length !== 6)) {
      throw new Error("invalid postcode length");
    }
    if (countryCode.length !== 3) {
      throw new Error("invalid country code length");
    }
    if (serviceClass.length !== 3) {
      throw new Error("invalid service class length");
    }

    const cc = parseStrictInt(countryCode);
    if (cc === null) {
      throw new Error("country code must be numeric");
    }
    const sc = parseStrictInt(serviceClass);
    if (sc === null) {
      throw new Error("service class must be numeric");
    }

    if (mode === 2) {
      if (cc !== 840) {
        throw new Error("mode 2 requires US country code 840");
      }

      const pc = parseStrictInt(postcode);
      if (pc === null) {
        throw new Error("postcode must be numeric in mode 2");
      }

      processPrimaryMode2(codewords, pc, cc, sc);
    } else {
      processPrimaryMode3(codewords, postcode, cc, sc);
    }

    // Copy the header and the 2 digit year into the secondary data buffer.
    secondaryData = inputData.slice(0, 9);

    // Copy the rest of the data into the secondary data buffer.
    if (groups.length > 3) {
      secondaryData += groups.slice(3).join(GS);
    }
  } else {
    // Not using a primary, just copy all the data into the secondary data buffer.
    codewords[0] = mode;
    secondaryData = inputData;
  }

  processSecondary(codewords, mode, eci, secondaryData);

  // All the data is sorted - now do error correction.
  primaryDataCheck(codewords);

  // 84 data codewords, 40 error corrections (or 68 / 56 for mode 5).
  const eccLen = mode === 5 ? 56 : 40;

  secondaryDataCheckEven(codewords, eccLen / 2);
  secondaryDataCheckOdd(codewords, eccLen / 2);

  const grid = new SymbolGrid();

  // Copy data into symbol grid.
  for (let row = 0; row < 33; row++) {
    for (let column = 0; column < 30; column++) {
      const g = maxiGrid[row * 30 + column]! + 5;
      const block = Math.floor(g / 6);
      const bit = g % 6;

      if (block === 0) {
        continue;
      }

      const bitPattern = (codewords[block - 1]! & (32 >> bit)) >> (5 - bit);

      if (bitPattern !== 0) {
        grid.setModule(row, column, true);
      }
    }
  }

  // Add orientation markings.
  grid.setModule(0, 28, true); // Top right filler
  grid.setModule(0, 29, true);
  grid.setModule(9, 10, true); // Top left marker
  grid.setModule(9, 11, true);
  grid.setModule(10, 11, true);
  grid.setModule(15, 7, true); // Left hand marker
  grid.setModule(16, 8, true);
  grid.setModule(16, 20, true); // Right hand marker
  grid.setModule(17, 20, true);
  grid.setModule(22, 10, true); // Bottom left marker
  grid.setModule(23, 10, true);
  grid.setModule(22, 17, true); // Bottom right marker
  grid.setModule(23, 17, true);

  return grid;
}

// Mirrors Go strconv.Atoi: accepts only base-10 integers, optional sign.
function parseStrictInt(s: string): number | null {
  if (s.length === 0) return null;
  let i = 0;
  let sign = 1;
  if (s[0] === "+") {
    i = 1;
  } else if (s[0] === "-") {
    sign = -1;
    i = 1;
  }
  if (i === s.length) return null;
  let n = 0;
  for (; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 48 || c > 57) return null;
    n = n * 10 + (c - 48);
  }
  return sign * n;
}

function processPrimaryMode2(
  codewords: Int32Array,
  postcode: number,
  countryCode: number,
  serviceClass: number,
): void {
  const postcodeLen = 9;

  codewords[0] = ((postcode & 0x03) << 4) | 2;
  codewords[1] = (postcode & 0xfc) >> 2;
  codewords[2] = (postcode & 0x3f00) >> 8;
  codewords[3] = (postcode & 0xfc000) >> 14;
  codewords[4] = (postcode & 0x3f00000) >> 20;
  codewords[5] = ((postcode & 0x3c000000) >> 26) | ((postcodeLen & 0x3) << 4);
  codewords[6] = ((postcodeLen & 0x3c) >> 2) | ((countryCode & 0x3) << 4);
  codewords[7] = (countryCode & 0xfc) >> 2;
  codewords[8] = ((countryCode & 0x300) >> 8) | ((serviceClass & 0xf) << 2);
  codewords[9] = (serviceClass & 0x3f0) >> 4;
}

function processPrimaryMode3(
  codewords: Int32Array,
  postcode: string,
  countryCode: number,
  serviceClass: number,
): void {
  const postcodeLen = 6;

  const pc = new Int32Array(postcodeLen);

  for (let i = 0; i < postcodeLen; i++) {
    const c = postcode.charCodeAt(i);

    if (c >= 65 /* 'A' */ && c <= 90 /* 'Z' */) {
      // (Capital) letters shifted to Code Set A values.
      pc[i] = c - 64;
    } else if (c === 27 || c === 31 || c === 33 || c >= 59) {
      // Not a valid postcode character.
      pc[i] = 32; // ' '
    } else {
      // Input characters lower than 27 (NUL - SUB) in postcode are interpreted
      // as capital letters in Code Set A (e.g. LF becomes 'J').
      pc[i] = c;
    }
  }

  codewords[0] = ((pc[5]! & 0x03) << 4) | 3;
  codewords[1] = ((pc[4]! & 0x03) << 4) | ((pc[5]! & 0x3c) >> 2);
  codewords[2] = ((pc[3]! & 0x03) << 4) | ((pc[4]! & 0x3c) >> 2);
  codewords[3] = ((pc[2]! & 0x03) << 4) | ((pc[3]! & 0x3c) >> 2);
  codewords[4] = ((pc[1]! & 0x03) << 4) | ((pc[2]! & 0x3c) >> 2);
  codewords[5] = ((pc[0]! & 0x03) << 4) | ((pc[1]! & 0x3c) >> 2);
  codewords[6] = ((pc[0]! & 0x3c) >> 2) | ((countryCode & 0x3) << 4);
  codewords[7] = (countryCode & 0xfc) >> 2;
  codewords[8] = ((countryCode & 0x300) >> 8) | ((serviceClass & 0xf) << 2);
  codewords[9] = (serviceClass & 0x3f0) >> 4;
}

function determineSet(set: Int32Array, i: number, allowedSets: readonly number[]): number {
  const opt1 = set[i - 1]!;
  const opt2 = set[i + 1]!;

  const opt1Allowed = allowedSets.includes(opt1);
  const opt2Allowed = allowedSets.includes(opt2);

  if (opt1Allowed && opt2Allowed) {
    return Math.min(opt1, opt2);
  }
  if (opt1Allowed) return opt1;
  if (opt2Allowed) return opt2;
  return allowedSets[0]!;
}

function insertPosition(
  set: Int32Array,
  character: Int32Array,
  position: number,
  dataLenRef: { value: number },
): void {
  for (let i = 143; i > position; i--) {
    set[i] = set[i - 1]!;
    character[i] = character[i - 1]!;
  }
  dataLenRef.value++;
}

function processSecondary(
  codewords: Int32Array,
  mode: number,
  eci: number,
  secondaryData: string,
): void {
  // Format text according to Appendix A.
  if (secondaryData.length > 138) {
    throw new Error("input data is too long");
  }

  const set = new Int32Array(144);
  const character = new Int32Array(144);

  for (let i = 0; i < secondaryData.length; i++) {
    const code = secondaryData.charCodeAt(i);
    // Look up in Appendix A table - this gives value and code set for most chars.
    set[i] = maxiCodeSet[code]!;
    character[i] = maxiSymbolChar[code]!;
  }

  // If a character can be represented in more than one code set, pick which
  // version to use.
  if (set[0] === 0) {
    if (character[0] === 13) {
      character[0] = 0;
    }
    set[0] = 1;
  }

  const dataLenRef = { value: secondaryData.length };

  for (let i = 1; i < dataLenRef.value; i++) {
    // Special characters.
    if (set[i] === 0) {
      switch (character[i]) {
        case 13: // Carriage Return
          set[i] = determineSet(set, i, [1, 5]);
          character[i] = set[i] === 5 ? 13 : 0;
          break;
        case 28: // FS
          set[i] = determineSet(set, i, [1, 2, 3, 4, 5]);
          if (set[i] === 5) character[i] = 32;
          break;
        case 29: // GS
          set[i] = determineSet(set, i, [1, 2, 3, 4, 5]);
          if (set[i] === 5) character[i] = 33;
          break;
        case 30: // RS
          set[i] = determineSet(set, i, [1, 2, 3, 4, 5]);
          if (set[i] === 5) character[i] = 34;
          break;
        case 32: // Space
          set[i] = determineSet(set, i, [1, 2, 3, 4, 5]);
          switch (set[i]) {
            case 1:
              character[i] = 32;
              break;
            case 2:
              character[i] = 47;
              break;
            default:
              character[i] = 59;
              break;
          }
          break;
        case 44: // Comma
          set[i] = determineSet(set, i, [1, 2]);
          if (set[i] === 2) character[i] = 48;
          break;
        case 46: // Full Stop
          set[i] = determineSet(set, i, [1, 2]);
          if (set[i] === 2) character[i] = 49;
          break;
        case 47: // Slash
          set[i] = determineSet(set, i, [1, 2]);
          if (set[i] === 2) character[i] = 50;
          break;
        case 58: // Colon
          set[i] = determineSet(set, i, [1, 2]);
          if (set[i] === 2) character[i] = 51;
          break;
      }
    }
  }

  // Add the padding.
  for (let i = dataLenRef.value; i < 144; i++) {
    set[i] = set[dataLenRef.value - 1] === 2 ? 2 : 1;
    character[i] = 33;
  }

  // Find candidates for number compression.
  // Number compression not allowed on the primary data.
  // In modes 4, 5 & 6 the first nine characters of the secondary data
  // are placed in the primary data.
  const start = mode === 2 || mode === 3 ? 0 : 9;

  let count = 0;
  for (let i = start; i < 144; i++) {
    // Character is a number.
    if (set[i] === 1 && character[i]! >= 48 && character[i]! <= 57) {
      count++;
    } else {
      count = 0;
    }

    // Nine digits in a row can be compressed.
    if (count === 9) {
      for (let j = i - 8; j <= i; j++) {
        set[j] = 6;
      }
      count = 0;
    }
  }

  // Add shift and latch characters.
  let currSet = 1;
  let idx = 0;

  while (idx < 144) {
    if (set[idx] !== currSet && set[idx] !== 6) {
      switch (set[idx]) {
        case 1:
          if (currSet === 2) {
            // Set B
            if (idx + 1 < 144 && set[idx + 1] === 1) {
              if (idx + 2 < 144 && set[idx + 2] === 1) {
                if (idx + 3 < 144 && set[idx + 3] === 1) {
                  // Latch A
                  insertPosition(set, character, idx, dataLenRef);
                  character[idx] = 63; // Set B Latch A
                  currSet = 1;
                  idx += 3; // Next 3 Set A so skip over
                } else {
                  // 3 Shift A
                  insertPosition(set, character, idx, dataLenRef);
                  character[idx] = 57; // Set B triple shift A
                  idx += 2; // Next 2 Set A so skip over
                }
              } else {
                // 2 Shift A
                insertPosition(set, character, idx, dataLenRef);
                character[idx] = 56; // Set B double shift A
                idx++; // Next Set A so skip over
              }
            } else {
              // Shift A
              insertPosition(set, character, idx, dataLenRef);
              character[idx] = 59; // Set A Shift B
            }
          } else {
            // All sets other than B only have latch.
            // Latch A
            insertPosition(set, character, idx, dataLenRef);
            character[idx] = 58; // Sets C,D,E Latch A
            currSet = 1;
          }
          break;
        case 2:
          // Set B. If not Set A or next Set B.
          if (currSet !== 1 || (idx + 1 < 144 && set[idx + 1] === 2)) {
            // Latch B
            insertPosition(set, character, idx, dataLenRef);
            character[idx] = 63; // Sets A,C,D,E Latch B
            currSet = 2;
          } else {
            // Only available from Set A. Shift B.
            insertPosition(set, character, idx, dataLenRef);
            character[idx] = 59; // Set B Shift A
          }
          break;
        case 3:
        case 4:
        case 5: {
          // Set C, D, E.
          // If first and next 3 same set, or not first and previous and next 2 same set.
          const lockable =
            (idx === 0 &&
              idx + 3 < 144 &&
              set[idx + 1] === set[idx] &&
              set[idx + 2] === set[idx] &&
              set[idx + 3] === set[idx]) ||
            (idx > 0 &&
              set[idx - 1] === set[idx] &&
              idx + 2 < 144 &&
              set[idx + 1] === set[idx] &&
              set[idx + 2] === set[idx]);

          if (lockable) {
            if (idx === 0) {
              // Lock in C/D/E.
              insertPosition(set, character, idx, dataLenRef);
              character[idx] = 60 + set[idx]! - 3;
              idx++; // Extra bump
              insertPosition(set, character, idx, dataLenRef);
              character[idx] = 60 + set[idx]! - 3;
              idx += 3; // Next 3 same set so skip over
            } else {
              // Add single Shift to previous Shift.
              insertPosition(set, character, idx, dataLenRef);
              character[idx - 1] = 60 + set[idx]! - 3;
              idx += 2; // Next 2 same set so skip over
            }
            currSet = set[idx]!;
          } else {
            // Shift C/D/E.
            insertPosition(set, character, idx, dataLenRef);
            character[idx] = 60 + set[idx]! - 3;
          }
          break;
        }
      }
      idx++; // Allow for bump
    }
    idx++;
  }

  // Number compression.
  idx = 0;
  while (idx < 144) {
    if (set[idx] === 6) {
      let compressed = "";
      for (let j = 0; j < 9; j++) {
        compressed += String.fromCharCode(character[idx + j]!);
      }

      const value = parseStrictInt(compressed);
      if (value === null) {
        throw new Error("failed to convert compressed number");
      }

      character[idx] = 31; // NS
      character[idx + 1] = (value & 0x3f000000) >> 24;
      character[idx + 2] = (value & 0xfc0000) >> 18;
      character[idx + 3] = (value & 0x3f000) >> 12;
      character[idx + 4] = (value & 0xfc0) >> 6;
      character[idx + 5] = value & 0x3f;

      idx += 6;
      for (let j = idx; j < 140; j++) {
        set[j] = set[j + 3]!;
        character[j] = character[j + 3]!;
      }

      dataLenRef.value -= 3;
    } else {
      idx++;
    }
  }

  // Insert ECI at the beginning of message if needed.
  // Encode ECI assignment numbers according to table 3.
  if (eci !== 0) {
    insertPosition(set, character, 0, dataLenRef);
    character[0] = 27; // ECI

    if (eci <= 31) {
      insertPosition(set, character, 1, dataLenRef);
      character[1] = eci;
    } else if (eci >= 32 && eci <= 1023) {
      insertPosition(set, character, 1, dataLenRef);
      insertPosition(set, character, 1, dataLenRef);
      insertPosition(set, character, 1, dataLenRef);
      character[1] = 0x30 + ((eci >> 12) & 0x03);
      character[2] = (eci >> 6) & 0x3f;
      character[3] = eci & 0x3f;
      dataLenRef.value += 4;
    } else if (eci >= 32768) {
      insertPosition(set, character, 1, dataLenRef);
      insertPosition(set, character, 1, dataLenRef);
      insertPosition(set, character, 1, dataLenRef);
      insertPosition(set, character, 1, dataLenRef);
      character[1] = 0x38 + ((eci >> 18) & 0x02);
      character[2] = (eci >> 12) & 0x3f;
      character[3] = (eci >> 6) & 0x3f;
      character[4] = eci & 0x3f;
    }
  }

  switch (mode) {
    case 2:
    case 3:
      if (dataLenRef.value > 84) {
        throw new Error("input data is too long");
      }
      for (let i = 0; i < 84; i++) {
        codewords[i + 20] = character[i]!;
      }
      break;
    case 4:
    case 6:
      if (dataLenRef.value > 93) {
        throw new Error("input data is too long");
      }
      // Primary
      for (let i = 0; i < 9; i++) {
        codewords[i + 1] = character[i]!;
      }
      // Secondary
      for (let i = 0; i < 84; i++) {
        codewords[i + 20] = character[i + 9]!;
      }
      break;
    case 5:
      if (dataLenRef.value > 77) {
        throw new Error("input data is too long");
      }
      // Primary
      for (let i = 0; i < 9; i++) {
        codewords[i + 1] = character[i]!;
      }
      // Secondary
      for (let i = 0; i < 68; i++) {
        codewords[i + 20] = character[i + 9]!;
      }
      break;
  }
}

function primaryDataCheck(codewords: Int32Array): void {
  const dataLen = 10;
  const eccLen = 10;

  const data = new Uint8Array(dataLen);
  const result = new Uint8Array(eccLen);

  for (let j = 0; j < dataLen; j++) {
    data[j] = codewords[j]! & 0xff;
  }

  getRsEncoder(eccLen).encode(dataLen, data, result);

  for (let j = 0; j < eccLen; j++) {
    codewords[dataLen + j] = result[eccLen - 1 - j]!;
  }
}

function secondaryDataCheckEven(codewords: Int32Array, eccLen: number): void {
  const dataLen = eccLen === 20 ? 84 : 68;

  const data = new Uint8Array(dataLen);
  const result = new Uint8Array(eccLen);

  for (let j = 0; j < dataLen + 1; j += 2) {
    data[j / 2] = codewords[j + 20]! & 0xff;
  }

  getRsEncoder(eccLen).encode(dataLen / 2, data, result);

  for (let j = 0; j < eccLen; j++) {
    codewords[dataLen + 2 * j + 20] = result[eccLen - 1 - j]!;
  }
}

function secondaryDataCheckOdd(codewords: Int32Array, eccLen: number): void {
  const dataLen = eccLen === 20 ? 84 : 68;

  const data = new Uint8Array(dataLen);
  const result = new Uint8Array(eccLen);

  for (let j = 1; j < dataLen + 1; j += 2) {
    data[(j - 1) / 2] = codewords[j + 20]! & 0xff;
  }

  getRsEncoder(eccLen).encode(dataLen / 2, data, result);

  for (let j = 0; j < eccLen; j++) {
    codewords[dataLen + 2 * j + 1 + 20] = result[eccLen - 1 - j]!;
  }
}
