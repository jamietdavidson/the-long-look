import sharp from 'sharp';

const MAX_LONG_EDGE = Number(process.env.PRINT_IMAGE_MAX_PX ?? 2400);
const WEBP_QUALITY = Number(process.env.PRINT_IMAGE_WEBP_QUALITY ?? 82);

/**
 * Resize to a web-friendly long edge and encode as WebP.
 * @param {Buffer} inputBuffer
 */
export async function optimizePrintImageBuffer(inputBuffer) {
  const pipeline = sharp(inputBuffer, {failOn: 'none'}).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width ?? MAX_LONG_EDGE;
  const height = meta.height ?? MAX_LONG_EDGE;
  const longEdge = Math.max(width, height);

  const resized =
    longEdge > MAX_LONG_EDGE
      ? pipeline.resize({
          width: width >= height ? MAX_LONG_EDGE : undefined,
          height: height > width ? MAX_LONG_EDGE : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        })
      : pipeline;

  const buffer = await resized.webp({quality: WEBP_QUALITY, effort: 4}).toBuffer();

  return {
    buffer,
    mimeType: 'image/webp',
    byteLength: buffer.length,
    sourceWidth: width,
    sourceHeight: height,
  };
}

/** @param {string} sourceUrl */
export async function fetchAndOptimizePrintImage(sourceUrl) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download print image (${response.status}): ${sourceUrl}`,
    );
  }

  const inputBuffer = Buffer.from(await response.arrayBuffer());
  return optimizePrintImageBuffer(inputBuffer);
}
