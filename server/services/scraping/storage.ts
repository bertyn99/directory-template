import { promises as fs } from "fs";
import { join } from "path";
import { $fetch } from "ofetch";

/**
 * Download and save an image
 */
export async function downloadImage(
  imageUrl: string,
  fileName: string,
  basePath: string = "public/img"
): Promise<string> {
  try {
    // Fetch the image as a buffer
    const imageBuffer = await $fetch(imageUrl, {
      responseType: "arrayBuffer",
    });

    // Extract the file extension from the image URL
    const fileExtension = new URL(imageUrl).pathname.split(".").pop() || "jpg";
    const formattedFilename = fileName.replace(/[^a-z0-9-]/gi, "-").toLowerCase();

    // Define the output path
    const outputPath = join(process.cwd(), basePath, `${formattedFilename}.${fileExtension}`);

    // Ensure the directory exists
    await fs.mkdir(join(process.cwd(), basePath), {
      recursive: true,
    });

    // Write the image buffer to a file
    await fs.writeFile(outputPath, Buffer.from(imageBuffer as ArrayBuffer));

    console.log(`Image saved to ${outputPath}`);
    return `${basePath.replace("public/", "")}/${formattedFilename}.${fileExtension}`;
  } catch (error) {
    console.error("Error downloading image:", error);
    return "";
  }
}

/**
 * Process items in batches with concurrency control
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 3,
  options?: {
    rateLimiter?: { waitForSlot: (domain: string) => Promise<void> };
    getDomain?: (item: T) => string;
  }
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        if (options?.rateLimiter && options?.getDomain) {
          await options.rateLimiter.waitForSlot(options.getDomain(item));
        }
        return processor(item);
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.error("Batch processing error:", result.reason);
      }
    }
  }

  return results;
}

