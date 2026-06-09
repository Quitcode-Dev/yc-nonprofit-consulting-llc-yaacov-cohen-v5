"use client";

import React, { useCallback, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import "./calendar.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarMove {
  id: string;
  title: string;
  donorName: string;
  due_date: string; // "YYYY-MM-DD"
  status: "pending" | "completed";
  isOverdue: boolean;
  solicitorId: string;
}

export interface SolicitorOption {
  id: string;
  name: string;
}

interface CalendarViewProps {
  moves: CalendarMove[];
  isAdmin: boolean;
  solicitorOptions: SolicitorOption[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventClassName(move: CalendarMove): string {
  if (move.isOverdue) return "event-overdue";
  if (move.status === "completed") return "event-completed";
  return "event-pending";
}

function buildEvents(
  moves: CalendarMove[],
  solicitorFilter: string
): EventInput[] {
  const filtered =
    solicitorFilter && solicitorFilter !== "all"
      ? moves.filter((m) => m.solicitorId === solicitorFilter)
      : moves;

  return filtered.map((move) => ({
    id: move.id,
    title: `${move.title} — ${move.donorName}`,
    date: move.due_date,
    classNames: [getEventClassName(move)],
    extendedProps: { moveId: move.id },
  }));
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// ─── Calendar View Component ──────────────────────────────────────────────────

export default function CalendarView({
  moves,
  isAdmin,
  solicitorOptions,
}: CalendarViewProps) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [solicitorFilter, setSolicitorFilter] = useState<string>("all");

  // Build FullCalendar events from moves (filtered by solicitor for admins)
  const events = buildEvents(moves, isAdmin ? solicitorFilter : "all");

  // ── Navigation ───────────────────────────────────────────────────────────────

  const handlePrev = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.prev();
    setCurrentDate(api.getDate());
  }, []);

  const handleNext = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.next();
    setCurrentDate(api.getDate());
  }, []);

  const handleToday = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.today();
    setCurrentDate(api.getDate());
  }, []);

  // ── Event click ──────────────────────────────────────────────────────────────

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const moveId = info.event.extendedProps.moveId as string;
      if (moveId) {
        router.push(`/moves/${moveId}`);
      }
    },
    [router]
  );

  return (
    <div className="space-y-4">
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev}>
            ← Previous
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            Next →
          </Button>
          <span className="ml-2 text-base font-semibold">
            {formatMonthYear(currentDate)}
          </span>
        </div>

        {/* Solicitor filter — admins only */}
        {isAdmin && solicitorOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Solicitor:
            </span>
            <Select
              value={solicitorFilter}
              onValueChange={setSolicitorFilter}
            >
              <SelectTrigger className="w-48 h-9">
                <SelectValue placeholder="All Solicitors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Solicitors</SelectItem>
                {solicitorOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-500" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-500" />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-500" />
          Overdue
        </span>
      </div>

      {/* ── Calendar ───────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            events={events}
            eventClick={handleEventClick}
            height="auto"
            dayMaxEvents={4}
            eventDisplay="block"
          />
        </CardContent>
      </Card>
    </div>
  );
}
