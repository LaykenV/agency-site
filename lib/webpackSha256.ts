import { createHash, type BinaryToTextEncoding } from "node:crypto";

/**
 * Webpack hasher that uses Node crypto and ignores empty writes.
 *
 * Next defaults to WASM xxhash64, which crashes on Vercel when webpack
 * hashes an undefined module source (`Cannot read properties of undefined
 * (reading 'length')`). Pointing `hashFunction` at the string `"sha256"`
 * only changes the throw to Node's `Hash.update(undefined)`.
 */
export class WebpackSha256 {
  private readonly hash = createHash("sha256");

  update(data?: unknown, inputEncoding?: BufferEncoding) {
    if (data == null) return this;
    if (typeof data === "string") {
      this.hash.update(data, inputEncoding ?? "utf8");
      return this;
    }
    if (Buffer.isBuffer(data)) {
      this.hash.update(data);
      return this;
    }
    if (ArrayBuffer.isView(data)) {
      this.hash.update(
        Buffer.from(data.buffer, data.byteOffset, data.byteLength),
      );
      return this;
    }
    return this;
  }

  digest(encoding?: BinaryToTextEncoding) {
    return encoding ? this.hash.digest(encoding) : this.hash.digest();
  }
}
