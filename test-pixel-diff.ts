import { renderZpl, loadFixture, loadFixturePng, pixelDiff } from "./test/helpers.js";

const actual = await renderZpl(loadFixture("amazon"), {});
const expected = loadFixturePng("amazon");
const diff = await pixelDiff(actual, expected);

console.log(`Amazon label pixel diff:`);
console.log(`  Diff pixels: ${diff.diffPixels}`);
console.log(`  Total pixels: ${diff.totalPixels}`);
console.log(`  Ratio: ${(diff.ratio * 100).toFixed(2)}%`);
