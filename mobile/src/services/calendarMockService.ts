import germiniMockEvents, { MockEvent } from "@/src/mocks/germiniMock";

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time: string; // HH:mm
  type: "run" | "cycling" | "strength" | "rest" | "other";
  description?: string;
  source?: "Germini" | "Strava" | "Sidekick";
}

let events: CalendarEvent[] = germiniMockEvents.map((e) => ({
  id: e.id,
  date: e.date,
  title: e.title,
  time: e.time || "08:00",
  type: e.type || "other",
  description: e.description,
  source: e.source || "Germini",
}));

export const calendarMockService = {
  listBetween: async (startISO: string, endISO: string) => {
    const filtered = events.filter((e) => e.date >= startISO && e.date <= endISO);
    return { events: filtered };
  },
  listAll: async () => ({ events }),
  create: async (payload: Partial<CalendarEvent>) => {
    const id = String(Date.now());
    const ev: CalendarEvent = {
      id,
      date: payload.date || new Date().toISOString().split("T")[0],
      title: payload.title?.trim() || "Evento",
      time: payload.time || "08:00",
      type: payload.type || "other",
      description: payload.description || "",
      source: payload.source || "Sidekick",
    };
    events = [ev, ...events];
    return { event: ev };
  },
  update: async (id: string, payload: Partial<CalendarEvent>) => {
    events = events.map((e) => (e.id === id ? { ...e, ...payload } : e));
    return { event: events.find((e) => e.id === id) };
  },
  remove: async (id: string) => {
    events = events.filter((e) => e.id !== id);
    return { ok: true };
  },
};

export default calendarMockService;
