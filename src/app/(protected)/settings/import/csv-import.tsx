"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlatformField =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "capacity"
  | "parent"
  | "grandparent"
  | "alumni"
  | "board_member"
  | "community_builder"
  | "program_attendee"
  | "volunteer"
  | "donor_advised_fund"
  | "foundation_trustee"
  | "skip";

type FieldMapping = Record<string, PlatformField>;

interface ImportError {
  row: number;
  reason: string;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: ImportError[];
}

interface ImportLogEntry {
  id: string;
  import_type: string;
  created_at: string;
  records_created: number | null;
  records_skipped: number | null;
  total_rows: number | null;
  file_name: string | null;
}

interface CSVImportProps {
  initialImportLogs: ImportLogEntry[];
}

// ─── Platform field options ───────────────────────────────────────────────────

const PLATFORM_FIELDS: { value: PlatformField; label: string }[] = [
  { value: "skip", label: "Skip This Column" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "capacity", label: "Capacity" },
  { value: "parent", label: "Parent" },
  { value: "grandparent", label: "Grandparent" },
  { value: "alumni", label: "Alumni" },
  { value: "board_member", label: "Board Member" },
  { value: "community_builder", label: "Community Builder" },
  { value: "program_attendee", label: "Program Attendee" },
  { value: "volunteer", label: "Volunteer" },
  { value: "donor_advised_fund", label: "Donor Advised Fund" },
  { value: "foundation_trustee", label: "Foundation/Trustee" },
];

const REQUIRED_FIELDS: PlatformField[] = ["first_name", "last_name"];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const steps = [
    { number: 1, label: "Upload" },
    { number: 2, label: "Map Fields" },
    { number: 3, label: "Results" },
  ];

  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((step, index) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;

        return (
          <React.Fragment key={step.number}>
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? "✓" : step.number}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="h-px w-8 bg-border mx-2" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CSVImport({ initialImportLogs }: CSVImportProps) {
  // ── Step state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1: Upload ─────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);

  // ── Step 2: Field Mapping ──────────────────────────────────────────────────
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});

  // ── Step 3: Results ────────────────────────────────────────────────────────
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [expandedErrors, setExpandedErrors] = useState(false);

  // ── Import history ─────────────────────────────────────────────────────────
  const [importLogs, setImportLogs] = useState<ImportLogEntry[]>(initialImportLogs);

  // ── Auto-detect mapping from header names ─────────────────────────────────
  function autoDetectMapping(headers: string[]): FieldMapping {
    const mapping: FieldMapping = {};
    const lowerFieldMap: Record<string, PlatformField> = {
      "first name": "first_name",
      firstname: "first_name",
      "first_name": "first_name",
      "last name": "last_name",
      lastname: "last_name",
      "last_name": "last_name",
      email: "email",
      "email address": "email",
      phone: "phone",
      "phone number": "phone",
      mobile: "phone",
      capacity: "capacity",
      parent: "parent",
      grandparent: "grandparent",
      alumni: "alumni",
      "board member": "board_member",
      board_member: "board_member",
      "community builder": "community_builder",
      community_builder: "community_builder",
      "program attendee": "program_attendee",
      program_attendee: "program_attendee",
      volunteer: "volunteer",
      "donor advised fund": "donor_advised_fund",
      donor_advised_fund: "donor_advised_fund",
      "foundation/trustee": "foundation_trustee",
      "foundation trustee": "foundation_trustee",
      foundation_trustee: "foundation_trustee",
    };

    for (const header of headers) {
      const lower = header.toLowerCase().trim();
      mapping[header] = lowerFieldMap[lower] ?? "skip";
    }

    return mapping;
  }

  // ── File parsing ───────────────────────────────────────────────────────────
  async function parseCSVFile(file: File) {
    setFileError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError("File exceeds the 10MB size limit. Please upload a smaller file.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Only .csv files are accepted.");
      return;
    }

    try {
      const Papa = (await import("papaparse")).default;

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete(results) {
          const headers = results.meta.fields ?? [];
          if (headers.length === 0) {
            setFileError("The CSV file appears to have no columns.");
            return;
          }
          setCsvHeaders(headers);
          setCsvRows(results.data);
          setSelectedFileName(file.name);
          const detected = autoDetectMapping(headers);
          setFieldMapping(detected);
          setStep(2);
        },
        error(err: { message: string }) {
          setFileError(`Failed to parse CSV: ${err.message}`);
        },
      });
    } catch {
      setFileError("Failed to load CSV parser. Please try again.");
    }
  }

  // ── Drag and drop handlers ─────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await parseCSVFile(file);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await parseCSVFile(file);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Field mapping change ───────────────────────────────────────────────────
  function handleMappingChange(csvColumn: string, value: PlatformField) {
    setFieldMapping((prev) => ({ ...prev, [csvColumn]: value }));
  }

  // ── Validate required fields are mapped ───────────────────────────────────
  const mappedPlatformFields = Object.values(fieldMapping);
  const requiredFieldsMapped = REQUIRED_FIELDS.every((req) =>
    mappedPlatformFields.includes(req)
  );

  // ── Run import ────────────────────────────────────────────────────────────
  async function handleImport() {
    if (!requiredFieldsMapped || isImporting) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const response = await fetch("/api/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: csvRows,
          fieldMapping,
          fileName: selectedFileName,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        setImportError(json.error ?? "Import failed. Please try again.");
      } else {
        setImportResult(json.result);
        // Refresh import logs by adding a synthetic entry
        const logEntry: ImportLogEntry = {
          id: crypto.randomUUID(),
          import_type: "csv",
          created_at: new Date().toISOString(),
          records_created: json.result.created,
          records_skipped: json.result.skipped,
          total_rows: csvRows.length,
          file_name: selectedFileName,
        };
        setImportLogs((prev) => [logEntry, ...prev].slice(0, 10));
        setStep(3);
      }
    } catch {
      setImportError("Network error — please check your connection and try again.");
    } finally {
      setIsImporting(false);
    }
  }

  // ── Reset to start a new import ────────────────────────────────────────────
  function handleReset() {
    setStep(1);
    setSelectedFileName(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setFieldMapping({});
    setImportResult(null);
    setImportError(null);
    setExpandedErrors(false);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // ── Timestamp formatter ────────────────────────────────────────────────────
  function formatTimestamp(iso: string): string {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold">CSV Import</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CSV file to import donors into your organization.
        </p>
      </div>

      {/* Import form card */}
      <Card>
        <CardHeader>
          <CardTitle>Import Donors</CardTitle>
          <CardDescription>
            Upload a .csv file, map columns to donor fields, then run the import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StepIndicator currentStep={step} />

          {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Drag and drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload CSV file"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Drag &amp; drop your CSV file here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse · .csv only · max 10MB
                  </p>
                </div>
              </div>

              {/* Hidden file input */}
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
                aria-hidden="true"
              />

              {/* File error */}
              {fileError && (
                <p role="alert" className="text-sm text-destructive">
                  {fileError}
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: Field Mapping ─────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Map each CSV column to the correct donor field.{" "}
                  <span className="text-destructive font-medium">
                    * Required fields
                  </span>{" "}
                  must be mapped before importing.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                >
                  ← Back
                </Button>
              </div>

              {/* File info */}
              {selectedFileName && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <span className="font-medium">File:</span>
                  <span className="text-muted-foreground">{selectedFileName}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {csvRows.length} row{csvRows.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              )}

              {/* Mapping table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CSV Column</TableHead>
                      <TableHead>Platform Field</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvHeaders.map((header) => {
                      const selected = fieldMapping[header] ?? "skip";
                      const isRequired =
                        selected !== "skip" && REQUIRED_FIELDS.includes(selected);

                      return (
                        <TableRow key={header}>
                          <TableCell className="font-mono text-sm">
                            {header}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <select
                                value={selected}
                                onChange={(e) =>
                                  handleMappingChange(
                                    header,
                                    e.target.value as PlatformField
                                  )
                                }
                                aria-label={`Map column ${header}`}
                                className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {PLATFORM_FIELDS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {isRequired && (
                                <span
                                  className="text-destructive font-bold shrink-0"
                                  aria-label="Required field"
                                  title="Required field"
                                >
                                  *
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Required fields legend */}
              <p className="text-xs text-muted-foreground">
                <span className="text-destructive font-bold">*</span> Indicates
                a required field (First Name, Last Name). Both must be mapped
                before you can import.
              </p>

              {/* Import error */}
              {importError && (
                <p role="alert" className="text-sm text-destructive">
                  {importError}
                </p>
              )}

              {/* Import button */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleImport}
                  disabled={!requiredFieldsMapped || isImporting}
                  aria-disabled={!requiredFieldsMapped || isImporting}
                >
                  {isImporting ? (
                    <>
                      <Spinner />
                      Importing…
                    </>
                  ) : (
                    "Import"
                  )}
                </Button>
                {!requiredFieldsMapped && (
                  <p className="text-xs text-muted-foreground">
                    Map{" "}
                    {REQUIRED_FIELDS.filter(
                      (r) => !Object.values(fieldMapping).includes(r)
                    )
                      .map((r) =>
                        PLATFORM_FIELDS.find((f) => f.value === r)?.label ?? r
                      )
                      .join(" and ")}{" "}
                    to enable import.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Results ───────────────────────────────────────────── */}
          {step === 3 && importResult && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">
                Import complete for{" "}
                <span className="font-semibold">{selectedFileName}</span>
              </p>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard
                  label="Total Rows"
                  value={csvRows.length}
                  colorClass="text-foreground"
                />
                <SummaryCard
                  label="Records Created"
                  value={importResult.created}
                  colorClass="text-green-600"
                  bgClass="bg-green-50"
                />
                <SummaryCard
                  label="Records Skipped"
                  value={importResult.skipped}
                  colorClass="text-yellow-600"
                  bgClass="bg-yellow-50"
                />
                <SummaryCard
                  label="Errors"
                  value={importResult.errors.length}
                  colorClass="text-destructive"
                  bgClass={importResult.errors.length > 0 ? "bg-red-50" : undefined}
                />
              </div>

              {/* Expandable error detail */}
              {importResult.errors.length > 0 && (
                <div className="rounded-md border">
                  <button
                    type="button"
                    onClick={() => setExpandedErrors((prev) => !prev)}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                    aria-expanded={expandedErrors}
                  >
                    <span className="text-destructive">
                      {importResult.errors.length} row
                      {importResult.errors.length !== 1 ? "s" : ""} with errors
                    </span>
                    <span
                      className={`text-muted-foreground transition-transform ${
                        expandedErrors ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </button>

                  {expandedErrors && (
                    <div className="border-t overflow-auto max-h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-24">Row</TableHead>
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.errors.map((err, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-sm">
                                {err.row}
                              </TableCell>
                              <TableCell className="text-sm text-destructive">
                                {err.reason}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {/* Start a new import */}
              <Button type="button" variant="outline" onClick={handleReset}>
                Import Another File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Import History ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>Last 10 CSV imports for your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {importLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm font-mono max-w-[180px] truncate">
                        {log.file_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="uppercase text-xs">
                          {log.import_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(log.created_at)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-green-600 font-medium">
                        {log.records_created ?? 0}
                      </TableCell>
                      <TableCell className="text-right text-sm text-yellow-600 font-medium">
                        {log.records_skipped ?? 0}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {log.total_rows ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  colorClass,
  bgClass,
}: {
  label: string;
  value: number;
  colorClass: string;
  bgClass?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-4 space-y-1 ${bgClass ?? ""}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-current mr-2"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
