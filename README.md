# Present — school attendance check-in

Students scan a QR code at the school gate or in class; the check-in is saved and
the parent or guardian gets a text from the school's own phone. Teachers sign in
to see their class roster live and download a monthly Excel record.

## What's in it

| Route | What it does |
| --- | --- |
| `/` | Home. Two cards: Student and Teacher. A phone that already registered goes straight to the scanner. |
| `/register` | Student registration: name, section, parent/guardian name and phone. Philippine mobile numbers are formatted as you type, tagged with their carrier (Globe/TM, Smart/TNT/Sun, DITO, GOMO) and saved in +63 form. Optional "Add fingerprint". |
| `/scan` | Camera QR scanner with an aiming frame, Morning/Afternoon status cards, and a fingerprint log-in option for returning students. |
| `/gate` | Printable kiosk QR code for the school gate (`PRESENT://school-gate/v1`) with a Print button. |
| `/auth` | Teacher sign in / register with email and password. |
| `/teacher` | Teacher dashboard: set your class section, print a classroom QR code, watch the roster update, and compile monthly records into Excel. |
| `/practice` | Practice workspace (browser-local demo, no live records and no texts sent). |

## Attendance times (Asia/Manila)

| Period | Present | Late | Absent |
| --- | --- | --- | --- |
| Morning | 4:00 – 7:15 AM | 7:16 – 7:30 AM | 7:31 – 11:35 AM |
| Afternoon | 11:36 AM – 12:35 PM | 12:36 – 12:50 PM | 12:51 PM onward |

Time-outs are automatic at the absent cutoffs, so every record has a time in and
a time out. A student can check in once per period per day.

## Stack

- TanStack Start (React 19 + Vite), TypeScript
- Tailwind CSS v4
- Lovable Cloud backend (auth, database, storage)
- `html5-qrcode` for scanning, `qrcode.react` for generating, `exceljs` for the monthly workbook

## Running it locally

```sh
npm install
cp .env.example .env   # fill in the backend values
npm run dev
```

`.env` holds the backend URL and publishable key. Both are public browser values,
but keep the file out of git (`.env` is in `.gitignore`).

## Database

Schema lives in `drizzle/migrations/`:

- `0000_migration.sql` — `teacher_settings`, `students`, `attendance`, and the
  `teaches_section(section)` helper used by teacher-scoped row-level security.
- `0001_monthly_attendance_archive.sql` — adds the `status` column, the
  `monthly_attendance` archive table, and the trigger that snapshots every
  check-in into it.

Apply them to your own backend instance, then set the auth and SMS values below.

## Parent texts

Texts go out through SMSGate (an Android phone acting as the SMS sender).
Server-side secrets: `SMSGATE_SERVER_URL` (optional), `SMSGATE_USERNAME`,
`SMSGATE_PASSWORD`, or `SMSGATE_TOKEN`. A failed text never blocks a check-in —
the scan is still saved and the screen says the text could not be sent.

## Tests

```sh
npm test
```

Covers the attendance windows, the once-per-period rule, the monthly workbook,
and the practice workspace.
