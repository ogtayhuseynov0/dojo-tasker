# API Reference

Complete reference for all Mindojo Task Manager API endpoints.

## Base URL

```
https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
```

Replace `{DEPLOYMENT_ID}` with your Google Apps Script deployment ID.

---

## Authentication

**None**. All endpoints are publicly accessible (test project only).

For production, implement:
- OAuth 2.0 for user authentication
- API key validation
- Rate limiting

---

## Common Parameters

### Timezone

All endpoints that accept `timezone` parameter expect **IANA timezone format**:

**Valid Examples**:
- `America/New_York`
- `Europe/London`
- `Asia/Tokyo`
- `UTC`

**Invalid Examples**:
- `EST` (use `America/New_York`)
- `PST` (use `America/Los_Angeles`)
- `GMT` (use `UTC` or specific city)

See [full list of IANA timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

---

## Endpoints

### 1. GET /health

Health check endpoint to verify API connectivity.

**URL**: `?action=health`

**Method**: `GET`

**Parameters**: None

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T10:30:00.000Z",
  "version": "1.0.0"
}
```

**Example**:
```bash
curl "https://script.google.com/.../exec?action=health"
```

---

### 2. GET /tasks

List tasks with optional filters.

**URL**: `?action=tasks`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | `pending` | Filter by status: `pending`, `completed`, `archived` |
| `context` | string | No | null | Filter by context tag (e.g., `weekday`, `morning`, `work`) |
| `timezone` | string | **Yes** | - | IANA timezone |

**Response** (200 OK):
```json
{
  "tasks": [
    {
      "id": "task_001",
      "title": "Review Q1 report",
      "description": "Focus on revenue metrics",
      "status": "pending",
      "priority": "high",
      "estimated_duration_minutes": 60,
      "start_date": "2026-02-01",
      "due_date": "2026-02-03",
      "context_tags": ["weekday", "work"],
      "recurrence_rule": null,
      "recurrence_anchor": null,
      "snooze_until": null,
      "completed_at": null,
      "created_at": "2026-01-28T08:00:00Z",
      "updated_at": "2026-01-28T08:00:00Z"
    }
  ],
  "count": 1,
  "filters_applied": {
    "status": "pending",
    "context": null
  }
}
```

**Error Responses**:

| Code | Description | Example |
|------|-------------|---------|
| 400 | Invalid parameters | Invalid timezone |

**Examples**:
```bash
# List all pending tasks
curl "YOUR_URL?action=tasks&status=pending&timezone=UTC"

# List completed tasks
curl "YOUR_URL?action=tasks&status=completed&timezone=UTC"

# List weekday tasks
curl "YOUR_URL?action=tasks&context=weekday&timezone=America/New_York"
```

---

### 3. GET /tasks/next

Get the best task for "right now" with scoring breakdown.

**URL**: `?action=tasks/next`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `timezone` | string | **Yes** | - | IANA timezone |
| `current_time` | ISO datetime | No | now | For testing; overrides current time |
| `context_hint` | string | No | auto-detect | Context override: `morning`, `afternoon`, `weekday`, `weekend` |

**Response** (200 OK):
```json
{
  "task": {
    "id": "task_001",
    "title": "Review Q1 report",
    ...
  },
  "score": 85,
  "scoring_breakdown": {
    "due_date_score": 40,
    "due_date_explanation": "Due in 2 days",
    "priority_score": 30,
    "priority_explanation": "High priority",
    "duration_score": 15,
    "duration_explanation": "60 min task (medium length)",
    "total": 85
  },
  "context": {
    "current_time_local": "2026-02-01T09:00:00-05:00",
    "is_weekday": true,
    "is_morning": true,
    "eligible_tasks_count": 5,
    "filtered_out": {
      "snoozed": 1,
      "not_yet_active": 0,
      "context_mismatch": 2
    }
  }
}
```

**Error Responses**:

| Code | Description | Response |
|------|-------------|----------|
| 404 | No eligible tasks | `{"message": "No tasks available", "reason": "all_filtered", ...}` |
| 400 | Invalid parameters | Invalid timezone |

**Examples**:
```bash
# Get next task for current time
curl "YOUR_URL?action=tasks/next&timezone=America/New_York"

# Get next task for specific time (testing)
curl "YOUR_URL?action=tasks/next&timezone=UTC&current_time=2026-02-01T09:00:00Z"

# Override context detection
curl "YOUR_URL?action=tasks/next&timezone=UTC&context_hint=weekend"
```

---

### 4. POST /tasks

Create a new task.

**URL**: `?action=tasks`

**Method**: `POST`

**Request Body**:

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `title` | string | **Yes** | - | 1-200 characters |
| `description` | string | No | "" | No limit |
| `priority` | enum | No | `medium` | `high`, `medium`, `low` |
| `estimated_duration_minutes` | integer | No | 30 | > 0 |
| `start_date` | ISO date | No | null | YYYY-MM-DD |
| `due_date` | ISO date | No | null | YYYY-MM-DD, >= start_date |
| `context_tags` | array of strings | No | [] | e.g., `["weekday", "work"]` |
| `recurrence_rule` | enum | No | null | `daily`, `weekly`, `monthly` |
| `timezone` | string | **Yes** | - | IANA timezone |

**Request Example**:
```json
{
  "title": "Review Q1 report",
  "description": "Focus on revenue metrics",
  "priority": "high",
  "estimated_duration_minutes": 60,
  "start_date": "2026-02-01",
  "due_date": "2026-02-05",
  "context_tags": ["weekday", "work"],
  "recurrence_rule": null,
  "timezone": "America/New_York"
}
```

**Response** (201 Created):
```json
{
  "task": {
    "id": "task_abc123",
    "title": "Review Q1 report",
    "description": "Focus on revenue metrics",
    "status": "pending",
    "priority": "high",
    "estimated_duration_minutes": 60,
    "start_date": "2026-02-01",
    "due_date": "2026-02-05",
    "context_tags": ["weekday", "work"],
    "recurrence_rule": null,
    "recurrence_anchor": "2026-02-05",
    "snooze_until": null,
    "completed_at": null,
    "created_at": "2026-02-01T10:30:00.000Z",
    "updated_at": "2026-02-01T10:30:00.000Z"
  }
}
```

**Error Responses**:

| Code | Description | Example |
|------|-------------|---------|
| 400 | Missing title | `{"error": true, "message": "title is required"}` |
| 400 | Invalid date range | `{"message": "start_date must be before or equal to due_date"}` |
| 400 | Invalid priority | `{"message": "priority must be high, medium, or low"}` |
| 400 | Invalid duration | `{"message": "estimated_duration_minutes must be greater than 0"}` |

**Example**:
```bash
curl -X POST "YOUR_URL?action=tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New task",
    "priority": "high",
    "due_date": "2026-02-05",
    "timezone": "UTC"
  }'
```

---

### 5. POST /tasks/:id

Update an existing task (partial updates allowed).

**URL**: `?action=tasks/{task_id}`

**Method**: `POST`

**URL Parameters**:
- `{task_id}`: Task ID (e.g., `task_001`)

**Request Body** (all fields optional except timezone):

| Field | Type | Constraints |
|-------|------|-------------|
| `title` | string | 1-200 characters |
| `description` | string | No limit |
| `priority` | enum | `high`, `medium`, `low` |
| `estimated_duration_minutes` | integer | > 0 |
| `start_date` | ISO date | YYYY-MM-DD |
| `due_date` | ISO date | YYYY-MM-DD, >= start_date |
| `context_tags` | array | Array of strings |
| `recurrence_rule` | enum | `daily`, `weekly`, `monthly` |
| `timezone` | string | **Required**, IANA timezone |

**Request Example**:
```json
{
  "priority": "medium",
  "due_date": "2026-02-06",
  "timezone": "America/New_York"
}
```

**Response** (200 OK):
```json
{
  "task": {
    "id": "task_001",
    "title": "Review Q1 report",
    "priority": "medium",
    "due_date": "2026-02-06",
    "updated_at": "2026-02-01T10:35:00.000Z",
    ...
  }
}
```

**Error Responses**:

| Code | Description |
|------|-------------|
| 404 | Task not found |
| 400 | Validation error (invalid field values) |
| 400 | Cannot update read-only fields (id, created_at, completed_at) |

**Example**:
```bash
curl -X POST "YOUR_URL?action=tasks/task_001" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "high",
    "timezone": "UTC"
  }'
```

---

### 6. POST /tasks/:id/complete

Mark a task as completed. Automatically creates next occurrence for recurring tasks.

**URL**: `?action=tasks/{task_id}/complete`

**Method**: `POST`

**URL Parameters**:
- `{task_id}`: Task ID

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timezone` | string | **Yes** | IANA timezone |
| `completion_time` | ISO datetime | No | Completion timestamp (defaults to now) |

**Request Example**:
```json
{
  "timezone": "America/New_York",
  "completion_time": "2026-02-01T10:40:00Z"
}
```

**Response** (200 OK):

**Case 1: Non-recurring task**
```json
{
  "task": {
    "id": "task_001",
    "status": "completed",
    "completed_at": "2026-02-01T10:40:00.000Z",
    ...
  },
  "recurrence_created": false,
  "next_task": null
}
```

**Case 2: Recurring task**
```json
{
  "task": {
    "id": "task_002",
    "status": "completed",
    "completed_at": "2026-02-01T10:40:00.000Z",
    ...
  },
  "recurrence_created": true,
  "next_task": {
    "id": "task_new456",
    "title": "Morning standup",
    "due_date": "2026-02-02",
    "recurrence_rule": "daily",
    ...
  }
}
```

**Recurrence Logic**:
- **Daily**: Next due_date = current due_date + 1 day
- **Weekly**: Next due_date = current due_date + 7 days
- **Monthly**: Next due_date = current due_date + 1 month (same day)

**Idempotency**:
If task is already completed, returns 200 OK:
```json
{
  "message": "Task already completed",
  "task": {...},
  "recurrence_created": false
}
```

**Error Responses**:

| Code | Description |
|------|-------------|
| 404 | Task not found |
| 400 | Invalid timezone |

**Examples**:
```bash
# Complete task (non-recurring)
curl -X POST "YOUR_URL?action=tasks/task_001/complete" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "UTC"}'

# Complete recurring task
curl -X POST "YOUR_URL?action=tasks/task_002/complete" \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "UTC",
    "completion_time": "2026-02-01T10:00:00Z"
  }'
```

---

### 7. POST /tasks/:id/snooze

Snooze a task until a specific timestamp.

**URL**: `?action=tasks/{task_id}/snooze`

**Method**: `POST`

**URL Parameters**:
- `{task_id}`: Task ID

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `snooze_until` | ISO datetime | **Yes** | Timestamp when task reappears (must be future) |
| `timezone` | string | **Yes** | IANA timezone |

**Request Example**:
```json
{
  "snooze_until": "2026-02-01T15:00:00Z",
  "timezone": "America/New_York"
}
```

**Response** (200 OK):
```json
{
  "task": {
    "id": "task_003",
    "title": "Grocery shopping",
    "snooze_until": "2026-02-01T15:00:00.000Z",
    "updated_at": "2026-02-01T10:45:00.000Z",
    ...
  }
}
```

**Behavior**:
- Task is hidden from `GET /tasks/next` until `snooze_until` timestamp passes
- After snooze expires, task reappears automatically in eligible tasks

**Error Responses**:

| Code | Description | Example |
|------|-------------|---------|
| 400 | Past timestamp | `{"message": "snooze_until must be a future timestamp"}` |
| 400 | Completed task | `{"message": "Cannot snooze a completed task"}` |
| 404 | Task not found | `{"message": "Task not found: task_999"}` |

**Example**:
```bash
# Snooze task for 2 hours
curl -X POST "YOUR_URL?action=tasks/task_003/snooze" \
  -H "Content-Type: application/json" \
  -d '{
    "snooze_until": "2026-02-01T12:00:00Z",
    "timezone": "UTC"
  }'
```

---

## Error Response Format

All errors return JSON with this structure:

```json
{
  "error": true,
  "message": "Human-readable error message",
  "statusCode": 400
}
```

**Common HTTP Status Codes**:

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Task updated |
| 201 | Created | Task created |
| 400 | Bad Request | Validation error, invalid input |
| 404 | Not Found | Task doesn't exist, no eligible tasks |
| 500 | Internal Server Error | Unexpected error (check logs) |

---

## Date & Time Formats

### ISO Date Format
```
YYYY-MM-DD
Example: "2026-02-01"
```

Used for:
- `start_date`
- `due_date`
- `recurrence_anchor`

### ISO DateTime Format (UTC)
```
YYYY-MM-DDTHH:mm:ss.sssZ
Example: "2026-02-01T10:30:00.000Z"
```

Used for:
- `snooze_until`
- `completed_at`
- `created_at`
- `updated_at`
- `completion_time`

**Note**: All timestamps are stored in UTC. The API converts to user's local timezone for context detection.

---

## Rate Limits

**Current**: None (public test endpoints)

**Production Recommendations**:
- Google Apps Script quotas: 20,000 URL fetch calls/day
- Implement per-user rate limiting (e.g., 100 requests/hour)
- Use exponential backoff for retries

---

## Testing

See `test-data.md` for comprehensive curl examples and edge cases.

**Quick Test**:
```bash
# 1. Health check
curl "YOUR_URL?action=health"

# 2. List tasks
curl "YOUR_URL?action=tasks&timezone=UTC&status=pending"

# 3. Get next task
curl "YOUR_URL?action=tasks/next&timezone=UTC"

# 4. Create task
curl -X POST "YOUR_URL?action=tasks" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task", "timezone": "UTC"}'
```

---

## Debugging

### Check Apps Script Logs
1. Open Apps Script editor
2. Go to **View → Logs** or **Executions**
3. Look for error messages

### Common Issues

**1. "Script function not found: doGet"**
- Redeploy the web app after code changes

**2. 404 on all endpoints**
- Verify deployment URL is correct
- Check `action` parameter is included

**3. Tasks not showing in /tasks/next**
- Check `filtered_out` stats in response
- Verify tasks aren't snoozed or have future start_date

**4. Invalid timezone error**
- Use IANA format (e.g., `America/New_York`, not `EST`)
- See [timezone list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

---

## API Versioning

**Current Version**: 1.0.0

Future versions will use query parameter:
```
?action=tasks&version=2.0
```

Breaking changes will increment major version.

---

## Security Considerations

**Current** (Test/Demo):
- No authentication
- No input sanitization (beyond basic validation)
- Public endpoints

**Production TODO**:
- Add OAuth 2.0 authentication
- Sanitize all inputs (prevent injection)
- Add CSRF protection
- Implement rate limiting
- Use HTTPS only (Apps Script enforces this)
- Add request logging and monitoring

---

## Support

For issues or questions:
- Check `test-data.md` for examples
- Review `scoring-algorithm.md` for scoring logic
- See `README.md` for setup instructions
