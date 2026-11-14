export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm if timed event
  endDate: string;
  isAllDay: boolean;
}

interface RawGCalEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

function normalizeGCalEvent(raw: RawGCalEvent): GoogleCalendarEvent {
  const isAllDay = Boolean(raw.start?.date && !raw.start?.dateTime);
  let startDate = '';
  let startTime: string | undefined;

  if (raw.start?.date) {
    startDate = raw.start.date;
  } else if (raw.start?.dateTime) {
    const dt = new Date(raw.start.dateTime);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    startDate = `${y}-${m}-${d}`;
    startTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(
      2,
      '0'
    )}`;
  }

  let endDate = startDate;
  if (raw.end?.date) {
    endDate = raw.end.date;
  } else if (raw.end?.dateTime) {
    const dt = new Date(raw.end.dateTime);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    endDate = `${y}-${m}-${d}`;
  }

  return {
    id: raw.id,
    summary: raw.summary || '(Untitled Event)',
    description: raw.description,
    location: raw.location,
    htmlLink: raw.htmlLink,
    startDate,
    startTime,
    endDate,
    isAllDay,
  };
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMinISO: string,
  timeMaxISO: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || `Google Calendar request failed (${res.status})`
    );
  }

  const data = (await res.json()) as { items?: RawGCalEvent[] };
  return (data.items || [])
    .map(normalizeGCalEvent)
    .filter((ev) => Boolean(ev.startDate));
}

export interface CreateGCalEventInput {
  summary: string;
  description?: string;
  dateISO: string; // YYYY-MM-DD
  timeHHMM?: string; // HH:mm (optional; creates 1h timed event if provided, all-day otherwise)
  timeZone: string;
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  input: CreateGCalEventInput
): Promise<GoogleCalendarEvent> {
  let body: Record<string, unknown>;

  if (input.timeHHMM) {
    const startLocal = `${input.dateISO}T${input.timeHHMM}:00`;
    const [hh, mm] = input.timeHHMM.split(':').map(Number);
    const endDt = new Date(`${input.dateISO}T00:00:00`);
    endDt.setHours(hh + 1, mm, 0, 0);
    const endY = endDt.getFullYear();
    const endM = String(endDt.getMonth() + 1).padStart(2, '0');
    const endD = String(endDt.getDate()).padStart(2, '0');
    const endHH = String(endDt.getHours()).padStart(2, '0');
    const endMM = String(endDt.getMinutes()).padStart(2, '0');
    const endLocal = `${endY}-${endM}-${endD}T${endHH}:${endMM}:00`;

    body = {
      summary: input.summary,
      description: input.description,
      start: {
        dateTime: startLocal,
        timeZone: input.timeZone,
      },
      end: {
        dateTime: endLocal,
        timeZone: input.timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 15 }],
      },
    };
  } else {
    const [y, m, d] = input.dateISO.split('-').map(Number);
    const nextDay = new Date(y, m - 1, d + 1);
    const nextISO = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(nextDay.getDate()).padStart(2, '0')}`;

    body = {
      summary: input.summary,
      description: input.description,
      start: { date: input.dateISO },
      end: { date: nextISO },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 540 }],
      },
    };
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || `Failed to create Google Calendar event (${res.status})`
    );
  }

  const raw = (await res.json()) as RawGCalEvent;
  return normalizeGCalEvent(raw);
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      eventId
    )}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok && res.status !== 204) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || `Failed to delete Google Calendar event (${res.status})`
    );
  }
}
