// Gerador de QR Code ISO/IEC 18004 puro (Byte mode, ECC Level L, Versões 1..9, Mask 0)
// 100% autônomo e legível por qualquer câmera de celular sem dependências externas.

const EXP = new Array(512).fill(0);
const LOG = new Array(256).fill(0);
let val = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = val;
  LOG[val] = i;
  val <<= 1;
  if (val & 0x100) val ^= 0x11d;
}
for (let i = 255; i < 512; i++) {
  EXP[i] = EXP[i - 255];
}

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGeneratorPoly(deg) {
  let poly = [1];
  for (let i = 0; i < deg; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const res = [...data, ...new Array(ecLen).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 1; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(data.length);
}

const VERSION_SPECS = [
  null,
  { size: 21, total: 26, data: 19, ec: 7, align: [] },
  { size: 25, total: 44, data: 34, ec: 10, align: [6, 18] },
  { size: 29, total: 70, data: 55, ec: 15, align: [6, 22] },
  { size: 33, total: 100, data: 80, ec: 20, align: [6, 26] },
  { size: 37, total: 134, data: 108, ec: 26, align: [6, 30] },
  { size: 41, total: 172, data: 136, ec: 36, align: [6, 34] },
  { size: 45, total: 196, data: 156, ec: 40, align: [6, 22, 38] },
  { size: 49, total: 242, data: 194, ec: 48, align: [6, 24, 42] },
  { size: 53, total: 292, data: 232, ec: 60, align: [6, 26, 46] },
];

const VERSION_INFO_BITS = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
};

// Format info para ECC Level L (01) + Mask 0 (000) -> BCH(15,5) com máscara 0x5412
const FORMAT_INFO_L_MASK0 = 0x77c4;

export function generateQrMatrix(text) {
  const encoder = new TextEncoder();
  const raw = Array.from(encoder.encode(String(text || 'https://tappo.app/m/M01')));

  let ver = 1;
  while (ver < 9) {
    const cap = VERSION_SPECS[ver].data - 2;
    if (raw.length <= cap) break;
    ver++;
  }

  const spec = VERSION_SPECS[ver];
  const maxBytes = spec.data - 2;
  const payload = raw.slice(0, maxBytes);
  const size = spec.size;

  const bits = [];
  const pushBits = (v, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((v >> i) & 1);
    }
  };

  // Modo Byte (0100) + tamanho em 8 bits
  pushBits(0b0100, 4);
  pushBits(payload.length, 8);
  for (const b of payload) {
    pushBits(b, 8);
  }

  const term = Math.min(4, spec.data * 8 - bits.length);
  pushBits(0, term);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataBytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    dataBytes.push(byte);
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataBytes.length < spec.data) {
    dataBytes.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  const ecBytes = rsEncode(dataBytes, spec.ec);
  const allBytes = [...dataBytes, ...ecBytes];

  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunc = Array.from({ length: size }, () => new Array(size).fill(false));

  const setFunc = (r, c, dark) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = Boolean(dark);
      isFunc[r][c] = true;
    }
  };

  const drawFinder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
          const dark =
            r >= 0 &&
            r <= 6 &&
            c >= 0 &&
            c <= 6 &&
            (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          setFunc(rr, cc, dark);
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (const r of spec.align) {
    for (const c of spec.align) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setFunc(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  setFunc(size - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      setFunc(8, i, false);
      setFunc(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFunc(8, size - 1 - i, false);
    if (i < 7) setFunc(size - 1 - i, 8, false);
  }

  if (ver >= 7) {
    const vbits = VERSION_INFO_BITS[ver];
    for (let i = 0; i < 18; i++) {
      const bit = (vbits >> i) & 1;
      const r = Math.floor(i / 3);
      const c = size - 11 + (i % 3);
      setFunc(r, c, bit);
      setFunc(c, r, bit);
    }
  }

  let bitIdx = 0;
  const totalBits = allBytes.length * 8;
  let upward = true;
  let col = size - 1;
  while (col > 0) {
    if (col === 6) col--;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (const dc of [0, -1]) {
        const c = col + dc;
        if (!isFunc[r][c]) {
          let bit = 0;
          if (bitIdx < totalBits) {
            bit = (allBytes[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
          if ((r + c) % 2 === 0) bit ^= 1;
          modules[r][c] = Boolean(bit);
        }
      }
    }
    upward = !upward;
    col -= 2;
  }

  const fmt = FORMAT_INFO_L_MASK0;
  for (let i = 0; i < 6; i++) setFunc(8, i, (fmt >> (14 - i)) & 1);
  setFunc(8, 7, (fmt >> 8) & 1);
  setFunc(8, 8, (fmt >> 7) & 1);
  setFunc(7, 8, (fmt >> 6) & 1);
  for (let i = 0; i < 6; i++) setFunc(5 - i, 8, (fmt >> (5 - i)) & 1);

  for (let i = 0; i < 8; i++) setFunc(8, size - 1 - i, (fmt >> i) & 1);
  for (let i = 0; i < 7; i++) setFunc(size - 7 + i, 8, (fmt >> (14 - i)) & 1);

  return modules;
}
