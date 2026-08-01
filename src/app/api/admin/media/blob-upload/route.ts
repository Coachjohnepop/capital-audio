import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

/**
 * Token exchange for browser → Vercel Blob uploads.
 * Do not restrict content-types tightly — Finder .mov/.m4a often send empty
 * or odd MIME types; pathname extension is enough.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("ca/media/")) {
          throw new Error("Invalid upload path — must be under ca/media/");
        }
        return {
          addRandomSuffix: false,
          allowOverwrite: true,
          // No allowedContentTypes — accept any media Finder throws at us
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
