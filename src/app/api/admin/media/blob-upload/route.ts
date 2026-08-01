import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

/**
 * Token exchange for browser → Vercel Blob uploads.
 * Files larger than ~4.5MB cannot go through the serverless function body
 * (HTTP 413) — they must upload directly to Blob from the client.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Only allow studio media paths
        if (!pathname.startsWith("ca/media/")) {
          throw new Error("Invalid upload path");
        }
        return {
          // Broad list — browsers report inconsistent types for .mov/.m4a
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/x-msvideo",
            "video/x-matroska",
            "video/mpeg",
            "video/x-m4v",
            "audio/mpeg",
            "audio/mp4",
            "audio/wav",
            "audio/x-wav",
            "audio/wave",
            "audio/aac",
            "audio/flac",
            "audio/ogg",
            "audio/webm",
            "audio/x-m4a",
            "audio/m4a",
            "application/octet-stream",
            "application/mp4",
          ],
          addRandomSuffix: false,
          allowOverwrite: true,
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024, // 5 GB
        };
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error("[blob-upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload token failed" },
      { status: 400 },
    );
  }
}
