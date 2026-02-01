# Test Data & Scenarios

This file contains sample data for populating your Google Sheet and curl commands for testing all API endpoints and edge cases.

## Sample Data for Google Sheet

After creating the "Tasks" sheet with 16 column headers, add these 6 sample tasks to rows 2-7:

### Row 2: Overdue Task (High Priority)
```
task_001
Review Q1 report
Focus on revenue and growth metrics
pending
high
60
2026-01-30
2026-02-01
weekday,work
(empty)
(empty)
(empty)
(empty)
2026-01-28T08:00:00Z
2026-01-28T08:00:00Z
(empty)
```

### Row 3: Recurring Daily Task (Medium Priority)
```
task_002
Morning standup
Daily team sync
pending
medium
15
2026-02-01
2026-02-03
weekday,morning,work
daily
2026-02-01
(empty)
(empty)
2026-01-28T08:00:00Z
2026-02-01T06:00:00Z
(empty)
```

### Row 4: Snoozed Task (Low Priority)
```
task_003
Grocery shopping
Weekly groceries
pending
low
45
2026-02-01
2026-02-02
weekend,personal
weekly
2026-02-02
2026-02-01T16:00:00Z
(empty)
2026-01-29T12:00:00Z
2026-02-01T08:30:00Z
Snoozed until afternoon
```

### Row 5: Future Task (Not Yet Active)
```
task_004
Plan vacation
Research destinations for summer trip
pending
medium
120
2026-02-10
2026-02-15
(empty)
(empty)
(empty)
(empty)
(empty)
2026-01-29T14:00:00Z
2026-01-29T14:00:00Z
(empty)
```

### Row 6: Completed Task
```
task_005
Read documentation
Mindojo assignment docs
completed
high
30
2026-01-28
2026-01-29
weekday,work
(empty)
(empty)
(empty)
2026-01-29T15:30:00Z
2026-01-28T10:00:00Z
2026-01-29T15:30:00Z
(empty)
```

### Row 7: Due Today (Quick Win)
```
task_006
Email client update
Send Q1 progress summary
pending
high
15
2026-02-01
2026-02-03
weekday,work
(empty)
(empty)
(empty)
(empty)
2026-01-30T09:00:00Z
2026-01-30T09:00:00Z
(empty)
```

**Note**: Replace dates with actual current dates when testing. For example, if today is 2026-02-03:
- Overdue task: due_date = 2026-02-01
- Due today: due_date = 2026-02-03
- Future task: start_date = 2026-02-12

---

## API Testing with curl

Replace `YOUR_DEPLOYMENT_URL` with your actual Google Apps Script deployment URL (e.g., `https://script.google.com/macros/s/AKfycbxxx.../exec`).

### 1. Health Check
```bash
curl "YOUR_DEPLOYMENT_URL?action=health"
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

### 2. List All Pending Tasks
```bash
curl "YOUR_DEPLOYMENT_URL?action=tasks&status=pending&timezone=America/New_York"
```

**Expected Response**:
```json
{
  "tasks": [
    {
      "id": "task_001",
      "title": "Review Q1 report",
      "status": "pending",
      ...
    },
    ...
  ],
  "count": 5,
  "filters_applied": {
    "status": "pending",
    "context": null
  }
}
```

---

### 3. List Weekday Tasks
```bash
curl "YOUR_DEPLOYMENT_URL?action=tasks&status=pending&context=weekday&timezone=America/New_York"
```

**Expected**: Returns only tasks with "weekday" in context_tags.

---

### 4. Get Next Task (Weekday Morning)
```bash
curl "YOUR_DEPLOYMENT_URL?action=tasks/next&timezone=America/New_York&current_time=2026-02-03T09:00:00Z"
```

**Expected Response**:
```json
{
  "task": {
    "id": "task_001",
    "title": "Review Q1 report",
    ...
  },
  "score": 80,
  "scoring_breakdown": {
    "due_date_score": 50,
    "due_date_explanation": "Overdue by 2 day(s)",
    "priority_score": 30,
    "priority_explanation": "High priority",
    "duration_score": 10,
    "duration_explanation": "60 min task (medium length)",
    "total": 90
  },
  "context": {
    "current_time_local": "2026-02-03T04:00:00-05:00",
    "is_weekday": true,
    "is_morning": true,
    "eligible_tasks_count": 3,
    "filtered_out": {
      "snoozed": 1,
      "not_yet_active": 1,
      "context_mismatch": 0
    }
  }
}
```

---

### 5. Create New Task
```bash
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task from curl",
    "description": "Testing API endpoint",
    "priority": "high",
    "estimated_duration_minutes": 30,
    "due_date": "2026-02-05",
    "context_tags": ["weekday", "work"],
    "timezone": "America/New_York"
  }'
```

**Expected Response** (201 Created):
```json
{
  "task": {
    "id": "task_abc123",
    "title": "Test task from curl",
    "status": "pending",
    "priority": "high",
    ...
  }
}
```

---

### 6. Update Task
```bash
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks/task_001" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "medium",
    "due_date": "2026-02-06",
    "timezone": "America/New_York"
  }'
```

**Expected Response** (200 OK):
```json
{
  "task": {
    "id": "task_001",
    "title": "Review Q1 report",
    "priority": "medium",
    "due_date": "2026-02-06",
    ...
  }
}
```

---

### 7. Complete Non-Recurring Task
```bash
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks/task_001/complete" \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "America/New_York"
  }'
```

**Expected Response** (200 OK):
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

---

### 8. Complete Recurring Task
```bash
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks/task_002/complete" \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "America/New_York"
  }'
```

**Expected Response** (200 OK):
```json
{
  "task": {
    "id": "task_002",
    "status": "completed",
    "completed_at": "2026-02-01T10:45:00.000Z",
    ...
  },
  "recurrence_created": true,
  "next_task": {
    "id": "task_new456",
    "title": "Morning standup",
    "due_date": "2026-02-04",
    "recurrence_rule": "daily",
    ...
  }
}
```

---

### 9. Snooze Task
```bash
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks/task_006/snooze" \
  -H "Content-Type: application/json" \
  -d '{
    "snooze_until": "2026-02-01T15:00:00Z",
    "timezone": "America/New_York"
  }'
```

**Expected Response** (200 OK):
```json
{
  "task": {
    "id": "task_006",
    "title": "Email client update",
    "snooze_until": "2026-02-01T15:00:00.000Z",
    ...
  }
}
```

---

## Edge Case Testing

### 10. No Eligible Tasks (All Snoozed)
**Setup**: Snooze all pending tasks.

```bash
curl "YOUR_DEPLOYMENT_URL?action=tasks/next&timezone=America/New_York&current_time=2026-02-01T10:00:00Z"
```

**Expected Response** (404 Not Found):
```json
{
  "message": "No tasks available",
  "reason": "all_filtered",
  "filtered_out": {
    "snoozed": 5,
    "not_yet_active": 0,
    "context_mismatch": 0
  }
}
```

---

### 11. Invalid Timezone
```bash
curl "YOUR_DEPLOYMENT_URL?action=tasks&timezone=InvalidTZ&status=pending"
```

**Expected Response** (400 Bad Request):
```json
{
  "error": true,
  "message": "Invalid timezone: InvalidTZ",
  "statusCode": 400
}
```

---

### 12. Missing Required Field (Title)
```bash
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Task without title",
    "timezone": "UTC"
  }'
```

**Expected Response** (400 Bad Request):
```json
{
  "error": true,
  "message": "title is required",
  "statusCode": 400
}
```

---

### 13. Invalid Date Range (start_date > due_date)
```bash
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invalid task",
    "start_date": "2026-02-10",
    "due_date": "2026-02-05",
    "timezone": "UTC"
  }'
```

**Expected Response** (400 Bad Request):
```json
{
  "error": true,
  "message": "start_date must be before or equal to due_date",
  "statusCode": 400
}
```

---

### 14. Task Not Found
```bash
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks/task_nonexistent/complete" \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "UTC"
  }'
```

**Expected Response** (404 Not Found):
```json
{
  "error": true,
  "message": "Task not found: task_nonexistent",
  "statusCode": 404
}
```

---

### 15. Complete Already-Completed Task (Idempotency)
```bash
# First, complete task_001
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks/task_001/complete" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "UTC"}'

# Then, complete it again
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks/task_001/complete" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "UTC"}'
```

**Expected Response** (200 OK):
```json
{
  "message": "Task already completed",
  "task": {
    "id": "task_001",
    "status": "completed",
    ...
  },
  "recurrence_created": false
}
```

---

### 16. Snooze with Past Timestamp
```bash
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks/task_006/snooze" \
  -H "Content-Type: application/json" \
  -d '{
    "snooze_until": "2020-01-01T10:00:00Z",
    "timezone": "UTC"
  }'
```

**Expected Response** (400 Bad Request):
```json
{
  "error": true,
  "message": "snooze_until must be a future timestamp",
  "statusCode": 400
}
```

---

### 17. Snooze Completed Task
```bash
# First, complete task_006
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks/task_006/complete" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "UTC"}'

# Then, try to snooze it
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks/task_006/snooze" \
  -H "Content-Type: application/json" \
  -d '{
    "snooze_until": "2026-02-05T10:00:00Z",
    "timezone": "UTC"
  }'
```

**Expected Response** (400 Bad Request):
```json
{
  "error": true,
  "message": "Cannot snooze a completed task",
  "statusCode": 400
}
```

---

### 18. Weekend Context Filtering
```bash
# Test on Saturday morning
curl "YOUR_DEPLOYMENT_URL?action=tasks/next&timezone=America/New_York&current_time=2026-02-07T10:00:00Z"
```

**Expected**: Should prioritize task_003 (Grocery shopping) which has "weekend" tag, and filter out weekday-only tasks.

---

### 19. Morning vs Afternoon Context
```bash
# Morning test (9 AM)
curl "YOUR_DEPLOYMENT_URL?action=tasks/next&timezone=America/New_York&current_time=2026-02-03T14:00:00Z"

# Afternoon test (3 PM)
curl "YOUR_DEPLOYMENT_URL?action=tasks/next&timezone=America/New_York&current_time=2026-02-03T20:00:00Z"
```

**Expected**: Morning query should prioritize task_002 (Morning standup) if it has "morning" tag.

---

### 20. Recurrence Logic - Weekly
```bash
# Complete weekly recurring task (task_003: Grocery shopping, due 2026-02-02)
curl -X POST "YOUR_DEPLOYMENT_URL?action=tasks/task_003/complete" \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "UTC",
    "completion_time": "2026-02-02T10:00:00Z"
  }'
```

**Expected**: Next occurrence should be created with `due_date = "2026-02-09"` (7 days later).

---

## Natural Language Test Scenarios (Custom GPT)

After setting up the Custom GPT, test these natural language queries:

### Scenario 1: Get Next Task
```
User: What should I do next?
```
**Expected**: GPT calls `GET /tasks/next`, returns top task with score explanation.

---

### Scenario 2: Create Task with Due Date
```
User: Add a task to review the report by Friday
```
**Expected**: GPT calculates Friday's date, calls `POST /tasks`, confirms creation.

---

### Scenario 3: Create Task with Priority
```
User: I need to call the client urgently
```
**Expected**: GPT infers high priority, calls `POST /tasks` with `priority: "high"`.

---

### Scenario 4: Complete Task by Name
```
User: I finished the morning standup
```
**Expected**: GPT searches for matching task, calls `POST /tasks/task_002/complete`, confirms and mentions next occurrence.

---

### Scenario 5: Snooze Task
```
User: Remind me about groceries in 2 hours
```
**Expected**: GPT calculates timestamp (now + 2 hours), calls `POST /tasks/:id/snooze`.

---

### Scenario 6: Update Task
```
User: Change the Q1 report deadline to next Monday
```
**Expected**: GPT finds task, calculates Monday's date, calls `POST /tasks/:id` (update).

---

### Scenario 7: Ambiguous Match
```
User: Complete the report task
```
**Expected**: If multiple tasks match "report", GPT asks "Which report task? (1) Review Q1 report, (2) Write annual report..."

---

### Scenario 8: List Tasks by Context
```
User: Show me all my work tasks
```
**Expected**: GPT calls `GET /tasks?context=work&timezone=...`, lists tasks.

---

### Scenario 9: No Tasks Available
```
User: What's next?
```
**(After all tasks snoozed/completed)**

**Expected**: GPT gets 404 response, says "Great news! You have no pending tasks right now."

---

### Scenario 10: Create Recurring Task
```
User: Add a daily reminder for morning standup at 9 AM
```
**Expected**: GPT creates task with `recurrence_rule: "daily"`, `context_tags: ["morning", "weekday"]`.

---

## Test Coverage Summary

| Category | Test Cases | Coverage |
|----------|-----------|----------|
| **CRUD Operations** | 1-9 | All endpoints (health, list, next, create, update, complete, snooze) |
| **Error Handling** | 10-17 | 404, 400, validation, idempotency |
| **Context Filtering** | 18-19 | Weekday/weekend, morning/afternoon |
| **Recurrence Logic** | 8, 20 | Daily, weekly recurrence |
| **Scoring Algorithm** | 4 | Due date, priority, duration scoring |
| **Natural Language** | GPT 1-10 | End-to-end GPT integration |

---

## Quick Reference: curl Template

```bash
# Replace these variables
DEPLOYMENT_URL="https://script.google.com/macros/s/YOUR_ID/exec"
TIMEZONE="America/New_York"

# GET example
curl "${DEPLOYMENT_URL}?action=tasks&status=pending&timezone=${TIMEZONE}"

# POST example
curl -X POST "${DEPLOYMENT_URL}?action=tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My task",
    "priority": "high",
    "timezone": "'${TIMEZONE}'"
  }'
```
