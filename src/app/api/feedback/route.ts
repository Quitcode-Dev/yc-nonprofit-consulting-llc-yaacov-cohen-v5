/**
 * POST /api/feedback
 *
 * Accepts multipart/form-data with fields:
 *   - category: string (required)
 *   - title: string (required)
 *   - description: string (required)
 *   - file: File (optional, max 10MB, .png/.jpg/.jpeg/.pdf)
 *
 * Validates authentication, optionally uploads the file to the
 * 'feedback-attachments' Supabase Storage bucket, then inserts a
 * feedback record into the 'feedback' table.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "application/pdf",
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const organizationId = await getUserOrganizationId();

  // ── Parse multipart form data ──────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid form data" },
      { status: 400 }
    );
  }

  const category = (formData.get("category") as string | null)?.trim() ?? "";
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const description =
    (formData.get("description") as string | null)?.trim() ?? "";
  const fileEntry = formData.get("file");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

  // ── Validate required fields ───────────────────────────────────────────────
  if (!category || !title || !description) {
    return NextResponse.json(
      { success: false, error: "Category, title, and description are required." },
      { status: 400 }
    );
  }

  // ── Validate file ──────────────────────────────────────────────────────────
  if (file) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "File must be under 10MB" },
        { status: 400 }
      );
    }

    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Only .png, .jpg, .jpeg, and .pdf files are accepted.",
        },
        { status: 400 }
      );
    }
  }

  const supabase = await createServerClient();

  // ── Upload file to Supabase Storage ────────────────────────────────────────
  let fileUrl: string | null = null;

  if (file) {
    try {
      const fileExt = file.name.split(".").pop() ?? "bin";
      const filePath = `${currentUser.user.id}/${Date.now()}.${fileExt}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("feedback-attachments")
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("File upload error:", uploadError);
        return NextResponse.json(
          { success: false, error: "Failed to upload attachment. Please try again." },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from("feedback-attachments")
        .getPublicUrl(filePath);

      fileUrl = publicUrlData?.publicUrl ?? null;
    } catch (err) {
      console.error("Storage error:", err);
      return NextResponse.json(
        { success: false, error: "Failed to upload attachment. Please try again." },
        { status: 500 }
      );
    }
  }

  // ── Insert feedback record ─────────────────────────────────────────────────
  try {
    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: currentUser.user.id,
      organization_id: organizationId ?? null,
      category,
      title,
      description,
      file_url: fileUrl,
      status: "new",
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Feedback insert error:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to save feedback. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Unexpected feedback error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
