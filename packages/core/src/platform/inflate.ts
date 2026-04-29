/**
 * Universal zlib inflate using the Web `DecompressionStream` API.
 * Available in Node ≥ 18 and all evergreen browsers — drops the
 * `node:zlib` dependency.
 */

export async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}
