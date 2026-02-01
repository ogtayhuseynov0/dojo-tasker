# Mindojo: AI-First Task Manager

An AI-first task manager where a Custom GPT is the primary interface, powered by Google Sheets and Google Apps Script.

## Features

- Natural language task management via ChatGPT
- Context-aware task prioritization (time of day, urgency, priority, duration)
- Recurring tasks (daily/weekly/monthly)
- Task snoozing with timezone support
- Deterministic scoring algorithm with transparent explanations
- No authentication (test project only)

## Architecture

- **Frontend**: Custom GPT with Actions (natural language interface)
- **Backend**: Google Apps Script (HTTP API with 7 endpoints)
- **Database**: Google Sheets (single spreadsheet, 16 columns)
- **Auth**: None (public test endpoints)

## Quick Start

### 1. Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it **"Mindojo Tasks"**
3. In the first sheet, rename it to **"Tasks"**
4. Add the following header row (row 1) with exactly these column names:

```
A: id
B: title
C: description
D: status
E: priority
F: estimated_duration_minutes
G: start_date
H: due_date
I: context_tags
J: recurrence_rule
K: recurrence_anchor
L: snooze_until
M: completed_at
N: created_at
O: updated_at
P: notes
```

5. Add sample tasks (copy the rows from `test-data.md` section "Sample Data for Google Sheet")

### 2. Deploy Google Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any default code in `Code.gs`
3. Copy the entire contents of `Code.gs` from this repository
4. Paste it into the Apps Script editor
5. Click **Save** (disk icon)
6. Click **Deploy → New deployment**
7. Click the gear icon next to "Select type" and choose **Web app**
8. Configure:
   - **Description**: "Mindojo Task Manager API v1"
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone** (no authentication for demo)
9. Click **Deploy**
10. **Copy the Web app URL** (looks like `https://script.google.com/macros/s/DEPLOYMENT_ID/exec`)
11. Click **Authorize access** and grant permissions

### 3. Test the API

Replace `YOUR_DEPLOYMENT_URL` with your actual deployment URL:

```bash
# Test health endpoint
curl "YOUR_DEPLOYMENT_URL?action=health"

# Expected response:
# {"status":"ok","timestamp":"2026-02-01T10:30:00.000Z","version":"1.0.0"}
```

### 4. Configure Custom GPT

1. Go to [ChatGPT](https://chat.openai.com/)
2. Click your profile → **My GPTs** → **Create a GPT**
3. Go to the **Configure** tab
4. Set the **Name**: **Mindojo Task Manager**
5. Copy the system prompt from `docs/gpt-system-prompt.txt` and paste it into the **Instructions** field
6. Scroll to **Actions** → Click **Create new action**
7. Open `openapi.yaml` from this repository
8. **IMPORTANT**: Replace `{DEPLOYMENT_ID}` in line 8 with your actual deployment ID from step 2
9. Copy the entire `openapi.yaml` content and paste it into the **Schema** field
10. Click **Save**

### 5. Test End-to-End

In your Custom GPT chat:

**Test 1: Get next task**
```
User: What should I do next?
GPT: [Calls GET /tasks/next and returns top priority task with scoring]
```

**Test 2: Create task**
```
User: Add a task to review the Q1 report by Friday
GPT: [Calls POST /tasks and confirms creation]
```

**Test 3: Complete task**
```
User: I finished the morning standup
GPT: [Calls POST /tasks/:id/complete and confirms, creates next occurrence if recurring]
```

**Test 4: Snooze task**
```
User: Remind me about groceries in 2 hours
GPT: [Calls POST /tasks/:id/snooze with calculated timestamp]
```

## API Documentation

See [`docs/api-reference.md`](docs/api-reference.md) for complete API documentation.

## Scoring Algorithm

See [`docs/scoring-algorithm.md`](docs/scoring-algorithm.md) for detailed explanation of the task prioritization logic.

## Testing

See [`test-data.md`](test-data.md) for:
- Sample data to populate your Google Sheet
- curl commands for testing all endpoints
- Edge case scenarios

## Project Structure

```
mindodo_task/
├── README.md                    # This file
├── Code.gs                      # Google Apps Script (full implementation)
├── openapi.yaml                 # OpenAPI 3.0 schema for GPT Actions
├── test-data.md                 # Test scenarios and sample data
├── .gitignore                   # Ignore sensitive files
└── docs/
    ├── api-reference.md         # Detailed API documentation
    ├── scoring-algorithm.md     # Scoring logic explanation
    └── gpt-system-prompt.txt    # Custom GPT instructions
```

## Data Model

### Google Sheets Schema (16 columns)

| Column | Type | Example | Required |
|--------|------|---------|----------|
| id | String | task_abc123 | Yes (auto-generated) |
| title | String | Review Q1 report | Yes |
| description | String | Focus on revenue | No |
| status | pending/completed/archived | pending | Yes |
| priority | high/medium/low | high | Yes |
| estimated_duration_minutes | Number | 60 | No (default: 30) |
| start_date | ISO Date | 2026-02-01 | No |
| due_date | ISO Date | 2026-02-05 | No |
| context_tags | String (comma-separated) | weekday,work | No |
| recurrence_rule | daily/weekly/monthly/null | daily | No |
| recurrence_anchor | ISO Date | 2026-02-05 | No |
| snooze_until | ISO DateTime (UTC) | 2026-02-01T15:00:00Z | No |
| completed_at | ISO DateTime (UTC) | 2026-02-01T10:30:00Z | No |
| created_at | ISO DateTime (UTC) | 2026-01-28T08:00:00Z | Yes (auto-generated) |
| updated_at | ISO DateTime (UTC) | 2026-02-01T09:15:00Z | Yes (auto-generated) |
| notes | String | Internal metadata | No |

## Security & Production Considerations

### Current Scope (Demo/Test)
- ❌ No authentication (public endpoints)
- ❌ No user isolation (single spreadsheet)
- ❌ No rate limiting
- ❌ No input sanitization beyond basic validation
- ⚠️ Use only non-sensitive test data

### Production Recommendations (NOT implemented)
- ✅ Add OAuth 2.0 authentication
- ✅ Implement per-user data isolation (separate sheets or multi-tenant table)
- ✅ Add API key validation
- ✅ Implement rate limiting (Apps Script has quotas: 20,000 URL fetch calls/day)
- ✅ Add input sanitization (prevent injection attacks)
- ✅ Use HTTPS only (Apps Script enforces this by default)
- ✅ Add audit logging (who changed what, when)
- ✅ Deploy separate Dev/Staging/Prod environments
- ✅ Add monitoring and alerting
- ✅ Consider migrating to a real database (Firestore, PostgreSQL) for scale

## Limitations

- **Max tasks**: ~10,000 (Google Sheets cell limit)
- **Concurrent users**: Not designed for multi-user (single spreadsheet)
- **API timeout**: 30 seconds (Google Apps Script limit)
- **No real-time sync**: Sheet updates may have ~1s latency
- **No batch operations**: Each request processes one task

## Troubleshooting

### Common Issues

**1. "Script function not found: doGet"**
- Make sure you copied the entire `Code.gs` file
- Save the script and redeploy

**2. "Authorization required"**
- Click "Authorize access" during deployment
- Grant all requested permissions

**3. "404 Not Found" on API calls**
- Verify you're using the correct deployment URL
- Check that `action` parameter is included (e.g., `?action=health`)

**4. GPT Actions not working**
- Verify deployment ID in `openapi.yaml` matches your actual deployment
- Check that Web App is set to "Anyone" access
- Test the endpoint directly with curl first

**5. "Invalid timezone" error**
- Use IANA timezone format (e.g., "America/New_York", not "EST")
- See [list of valid timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

**6. Tasks not showing in "next" endpoint**
- Check if tasks are snoozed (snooze_until > now)
- Check if tasks have future start_date
- Check if status is "pending" (not "completed")
- Verify context_tags match current context (weekday/weekend, morning/afternoon)

## License

MIT License (test project only, no warranty)

## Author

Built for Mindojo Senior AI-First Full-Stack Engineer Technical Assessment

## Submission Links

- **Sheet URL**: [Add your Google Sheet URL here]
- **GAS Web App URL**: [Add your deployment URL here]
- **Custom GPT**: [Add GPT share link here]
- **Screen Recording**: [Add recording link here]
- **Repository**: [Add repo link here]
