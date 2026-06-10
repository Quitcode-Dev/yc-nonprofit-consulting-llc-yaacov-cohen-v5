import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusForm } from "./status-form";
import type { FeedbackStatus } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileRow {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface OrganizationRow {
  name: string;
}

interface FeedbackDetailRaw {
  id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  file_url: string | null;
  created_at: string;
  // Supabase returns joined rows as arrays when using relational selects
  profiles: ProfileRow[] | ProfileRow | null;
  organizations: OrganizationRow[] | OrganizationRow | null;
}

interface FeedbackDetail {
  id: string;
  title: string;
  category: string;
  description: string;
  status: FeedbackStatus;
  file_url: string | null;
  created_at: string;
  profiles: ProfileRow | null;
  organizations: OrganizationRow | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getCategoryVariant(
  category: string
): "default" | "secondary" | "outline" | "muted" {
  switch (category) {
    case "bug_report":
      return "default";
    case "feature_request":
      return "secondary";
    case "question":
      return "outline";
    default:
      return "muted";
  }
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "success" | "muted" {
  switch (status) {
    case "new":
      return "default"; // blue
    case "reviewed":
      return "secondary"; // yellow/amber
    case "resolved":
      return "success"; // green
    default:
      return "muted";
  }
}

function getUserName(profile: FeedbackDetail["profiles"]): string {
  if (!profile) return "—";
  const name = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ");
  return name || "—";
}

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase().split("?")[0];
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg")
  );
}

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["super_admin"]);

  const { id } = await params;

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("feedback")
    .select(
      `
      id,
      title,
      category,
      description,
      status,
      file_url,
      created_at,
      profiles (
        first_name,
        last_name,
        email
      ),
      organizations (
        name
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  // Normalize joined rows: Supabase may return arrays for 1-to-many relations
  const raw = data as unknown as FeedbackDetailRaw;
  const feedback: FeedbackDetail = {
    id: raw.id,
    title: raw.title,
    category: raw.category,
    description: raw.description,
    status: raw.status as FeedbackStatus,
    file_url: raw.file_url,
    created_at: raw.created_at,
    profiles: Array.isArray(raw.profiles)
      ? (raw.profiles[0] ?? null)
      : raw.profiles,
    organizations: Array.isArray(raw.organizations)
      ? (raw.organizations[0] ?? null)
      : raw.organizations,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back navigation */}
      <div>
        <Button variant="outline" asChild size="sm">
          <Link href="/admin/feedback">← Back to Feedback Inbox</Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{feedback.title}</h1>
        <Badge variant={getStatusVariant(feedback.status)}>
          {feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
        </Badge>
      </div>

      {/* Metadata card */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Title */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Title</p>
              <p className="text-sm mt-1">{feedback.title}</p>
            </div>

            {/* Category */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Category
              </p>
              <div className="mt-1">
                <Badge variant={getCategoryVariant(feedback.category)}>
                  {formatCategory(feedback.category)}
                </Badge>
              </div>
            </div>

            {/* Submitted by name */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Submitted By
              </p>
              <p className="text-sm mt-1">{getUserName(feedback.profiles)}</p>
            </div>

            {/* Submitted by email */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                User Email
              </p>
              <p className="text-sm mt-1">
                {feedback.profiles?.email ? (
                  <a
                    href={`mailto:${feedback.profiles.email}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {feedback.profiles.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic">—</span>
                )}
              </p>
            </div>

            {/* Organization */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Organization
              </p>
              <p className="text-sm mt-1">
                {feedback.organizations?.name ?? (
                  <span className="text-muted-foreground italic">—</span>
                )}
              </p>
            </div>

            {/* Submitted at */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Submitted At
              </p>
              <p className="text-sm mt-1">{formatDate(feedback.created_at)}</p>
            </div>

            {/* Status */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Status
              </p>
              <div className="mt-1">
                <Badge variant={getStatusVariant(feedback.status)}>
                  {feedback.status.charAt(0).toUpperCase() +
                    feedback.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description card */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{feedback.description}</p>
        </CardContent>
      </Card>

      {/* File attachment card */}
      {feedback.file_url && (
        <Card>
          <CardHeader>
            <CardTitle>Attachment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isImageUrl(feedback.file_url) ? (
              /* Image preview */
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={feedback.file_url}
                  alt="Feedback attachment"
                  className="max-w-md rounded-md border object-contain"
                />
                <a
                  href={feedback.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                >
                  Open full size ↗
                </a>
              </div>
            ) : isPdfUrl(feedback.file_url) ? (
              /* PDF download link */
              <a
                href={feedback.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Download PDF attachment
              </a>
            ) : (
              /* Generic file download link */
              <a
                href={feedback.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Download attachment
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status change controls */}
      <Card>
        <CardHeader>
          <CardTitle>Update Status</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusForm
            feedbackId={feedback.id}
            currentStatus={feedback.status}
          />
        </CardContent>
      </Card>
    </div>
  );
}
