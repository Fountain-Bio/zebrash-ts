// Minimal PDF writer for label rasters.
//
// A ZPL label is a bitmap at the printer's dot density, so each page embeds the
// rendered raster as a single image XObject and sizes the page to the physical
// label dimensions. Printing the file at 100 % scale reproduces the label at
// its real-world size.
//
// Only the object types a one-image page needs are implemented: catalogue, page
// tree, page, content stream, image XObject, and document information.

const POINTS_PER_MM = 72 / 25.4;
const PRODUCER = "zebrash ZPL viewer";

const encoder = new TextEncoder();

function ascii(text) {
  return encoder.encode(text);
}

/** Escapes a string for a PDF literal string object such as `/Title`. */
function pdfString(text) {
  const sanitised = text.replaceAll(/[^\x20-\x7e]/g, "?");
  return `(${sanitised.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")})`;
}

function pdfDate(date) {
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  return (
    `D:${pad(date.getFullYear(), 4)}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(absolute / 60))}'${pad(absolute % 60)}'`
  );
}

/**
 * Compresses bytes into a zlib stream so the image can use `/FlateDecode`.
 * Returns `null` when the browser has no `CompressionStream`, in which case the
 * caller writes the samples uncompressed.
 */
async function deflate(bytes) {
  if (typeof CompressionStream !== "function") {
    return null;
  }
  try {
    // The "deflate" format is zlib-wrapped (RFC 1950), which is what
    // /FlateDecode expects. "deflate-raw" would be rejected by PDF readers.
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Reads an image blob back as RGBA pixels.
 *
 * @returns {Promise<{width: number, height: number, data: Uint8ClampedArray}>}
 */
async function readPixels(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
      throw new Error("This browser did not provide a 2D canvas context.");
    }
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return { width: image.width, height: image.height, data: image.data };
  } finally {
    bitmap.close();
  }
}

/**
 * Converts RGBA pixels into the narrowest PDF sample format that keeps every
 * colour intact: 1-bit grey for pure black-and-white labels, 8-bit grey when
 * all channels match, and 8-bit RGB otherwise. Transparent pixels are
 * composited onto white because a printed label has a white substrate.
 */
function encodeSamples({ width, height, data }) {
  let monochrome = true;
  let grey = true;
  const composited = new Uint8Array(width * height * 3);

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source = pixel * 4;
    const alpha = data[source + 3] / 255;
    const red = Math.round(data[source] * alpha + 255 * (1 - alpha));
    const green = Math.round(data[source + 1] * alpha + 255 * (1 - alpha));
    const blue = Math.round(data[source + 2] * alpha + 255 * (1 - alpha));

    composited[pixel * 3] = red;
    composited[pixel * 3 + 1] = green;
    composited[pixel * 3 + 2] = blue;

    if (red !== green || green !== blue) {
      grey = false;
      monochrome = false;
    } else if (red !== 0 && red !== 255) {
      monochrome = false;
    }
  }

  if (monochrome) {
    const rowBytes = Math.ceil(width / 8);
    const bits = new Uint8Array(rowBytes * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        // In DeviceGray a set bit is white, so only white pixels are recorded.
        if (composited[(y * width + x) * 3] === 255) {
          bits[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
    }
    return { bytes: bits, colorSpace: "DeviceGray", bitsPerComponent: 1 };
  }

  if (grey) {
    const greys = new Uint8Array(width * height);
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      greys[pixel] = composited[pixel * 3];
    }
    return { bytes: greys, colorSpace: "DeviceGray", bitsPerComponent: 8 };
  }

  return { bytes: composited, colorSpace: "DeviceRGB", bitsPerComponent: 8 };
}

/** Accumulates PDF bytes while recording the byte offset of every object. */
class PdfWriter {
  #chunks = [];
  #length = 0;
  offsets = [0];

  push(chunk) {
    const bytes = typeof chunk === "string" ? ascii(chunk) : chunk;
    this.#chunks.push(bytes);
    this.#length += bytes.length;
  }

  /** Starts object `number`, recording where it begins for the xref table. */
  startObject(number) {
    this.offsets[number] = this.#length;
    this.push(`${number} 0 obj\n`);
  }

  endObject() {
    this.push("endobj\n");
  }

  get length() {
    return this.#length;
  }

  toBytes() {
    const output = new Uint8Array(this.#length);
    let offset = 0;
    for (const chunk of this.#chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }
}

/**
 * Builds a PDF whose pages each hold one label raster.
 *
 * @param {Array<{blob: Blob, widthMm: number, heightMm: number}>} pages
 * @param {{title?: string}} [metadata]
 * @returns {Promise<Uint8Array>} the complete PDF file
 */
export async function createLabelPdf(pages, metadata = {}) {
  if (pages.length === 0) {
    throw new Error("A PDF needs at least one label page.");
  }

  const images = [];
  for (const page of pages) {
    const pixels = await readPixels(page.blob);
    const samples = encodeSamples(pixels);
    const compressed = await deflate(samples.bytes);
    images.push({
      width: pixels.width,
      height: pixels.height,
      colorSpace: samples.colorSpace,
      bitsPerComponent: samples.bitsPerComponent,
      bytes: compressed ?? samples.bytes,
      flate: compressed !== null,
      pointWidth: page.widthMm * POINTS_PER_MM,
      pointHeight: page.heightMm * POINTS_PER_MM,
    });
  }

  // Object numbering: 1 catalogue, 2 page tree, 3 document information, then
  // three objects per page (page, content stream, image).
  const firstPageObject = 4;
  const pageObjectNumber = (index) => firstPageObject + index * 3;
  const totalObjects = 3 + images.length * 3;

  const writer = new PdfWriter();
  writer.push("%PDF-1.4\n");
  // A comment of high bytes marks the file as binary for transfer tools.
  writer.push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  writer.startObject(1);
  writer.push("<< /Type /Catalog /Pages 2 0 R >>\n");
  writer.endObject();

  const kids = images.map((_, index) => `${pageObjectNumber(index)} 0 R`).join(" ");
  writer.startObject(2);
  writer.push(`<< /Type /Pages /Kids [ ${kids} ] /Count ${images.length} >>\n`);
  writer.endObject();

  writer.startObject(3);
  writer.push(
    `<< /Title ${pdfString(metadata.title ?? "ZPL label")} ` +
      `/Producer ${pdfString(PRODUCER)} /Creator ${pdfString(PRODUCER)} ` +
      `/CreationDate ${pdfString(pdfDate(new Date()))} >>\n`,
  );
  writer.endObject();

  for (const [index, image] of images.entries()) {
    const pageNumber = pageObjectNumber(index);
    const contentNumber = pageNumber + 1;
    const imageNumber = pageNumber + 2;

    writer.startObject(pageNumber);
    writer.push(
      `<< /Type /Page /Parent 2 0 R ` +
        `/MediaBox [ 0 0 ${image.pointWidth.toFixed(3)} ${image.pointHeight.toFixed(3)} ] ` +
        `/Resources << /XObject << /Im0 ${imageNumber} 0 R >> >> ` +
        `/Contents ${contentNumber} 0 R >>\n`,
    );
    writer.endObject();

    // Scale the unit image square up to the full page, leaving no margin.
    const content = ascii(
      `q\n${image.pointWidth.toFixed(3)} 0 0 ${image.pointHeight.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`,
    );
    writer.startObject(contentNumber);
    writer.push(`<< /Length ${content.length} >>\nstream\n`);
    writer.push(content);
    writer.push("endstream\n");
    writer.endObject();

    writer.startObject(imageNumber);
    writer.push(
      `<< /Type /XObject /Subtype /Image /Name /Im0 ` +
        `/Width ${image.width} /Height ${image.height} ` +
        `/ColorSpace /${image.colorSpace} /BitsPerComponent ${image.bitsPerComponent} ` +
        `/Interpolate false ${image.flate ? "/Filter /FlateDecode " : ""}` +
        `/Length ${image.bytes.length} >>\nstream\n`,
    );
    writer.push(image.bytes);
    writer.push("\nendstream\n");
    writer.endObject();
  }

  const xrefOffset = writer.length;
  writer.push(`xref\n0 ${totalObjects + 1}\n`);
  writer.push("0000000000 65535 f \n");
  for (let number = 1; number <= totalObjects; number += 1) {
    writer.push(`${String(writer.offsets[number]).padStart(10, "0")} 00000 n \n`);
  }
  writer.push(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R /Info 3 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`,
  );

  return writer.toBytes();
}
