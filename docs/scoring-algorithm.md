# Task Scoring Algorithm

This document explains the deterministic scoring algorithm used by the `GET /tasks/next` endpoint to select the best task for "right now".

## Overview

The algorithm uses a **two-phase approach**:

1. **Filtering Phase**: Exclude ineligible tasks
2. **Scoring Phase**: Score eligible tasks (0-100 points) and return the highest-scoring task

The scoring is **deterministic** (same inputs always produce same output), **transparent** (scoring breakdown is returned), and **tunable** (weights can be adjusted).

---

## Phase 1: Filtering

Tasks are filtered out in this order:

### 1. Status Filter
- Only `status = "pending"` tasks are considered
- Completed and archived tasks are excluded

### 2. Snooze Filter
- Exclude tasks where `snooze_until > current_time`
- Tasks "reappear" after snooze period expires

### 3. Start Date Filter
- Exclude tasks where `start_date > current_date` (in user's timezone)
- Allows "future tasks" that aren't actionable yet

### 4. Context Filter (Soft/Optional)
- Check if task's `context_tags` match current context
- Current context auto-detected from timezone:
  - **Weekday**: Monday-Friday
  - **Morning**: Hour < 12
  - **Weekend**: Saturday-Sunday
  - **Afternoon**: Hour >= 12

**Context Matching Logic**:
- If task has `weekday` or `work` tag → show on weekdays
- If task has `weekend` or `personal` tag → show on weekends
- If task has `morning` tag → show before noon
- If task has `afternoon` tag → show after noon
- If task has no context tags → show always
- If task has irrelevant context tags → filter out

**Example**:
- Current time: Monday 9 AM
- Task with tags `[weekday, morning, work]` → **included**
- Task with tags `[weekend, personal]` → **excluded** (context mismatch)
- Task with tags `[]` → **included** (no context restriction)

---

## Phase 2: Scoring

Each eligible task receives a score from 0-100 based on three factors:

```
Total Score = Due Date Score (0-50) + Priority Score (0-30) + Duration Score (0-20)
```

### 1. Due Date Score (0-50 points)

Measures **urgency** based on how soon the task is due.

| Condition | Score | Example |
|-----------|-------|---------|
| **Overdue** (due date < current date) | **50** | Due 2 days ago |
| **Due today** | **45** | Due: 2026-02-01, Today: 2026-02-01 |
| **Due tomorrow** | **35** | Due in 1 day |
| **Due in 2-3 days** | **25** | Due: 2026-02-05, Today: 2026-02-03 |
| **Due in 4-7 days** | **15** | Due next week |
| **Due later** (> 7 days) | **5** | Due in 10+ days |
| **No deadline** | **10** | No due_date set |

**Rationale**:
- Overdue tasks get maximum urgency (50 points)
- Tasks due today are almost as urgent (45 points)
- Tasks with no deadline get low but non-zero score (10 points) to prevent them from being ignored entirely

**Code Implementation**:
```javascript
if (!task.due_date) {
  dueScore = 10;
  dueExplanation = 'No deadline set';
} else {
  var daysDiff = days_between(due_date, current_date);
  if (daysDiff < 0) {
    dueScore = 50;
    dueExplanation = 'Overdue by ' + abs(daysDiff) + ' day(s)';
  } else if (daysDiff === 0) {
    dueScore = 45;
    dueExplanation = 'Due today';
  }
  // ... etc
}
```

---

### 2. Priority Score (0-30 points)

User-assigned priority level.

| Priority | Score | Rationale |
|----------|-------|-----------|
| **High** | **30** | Explicitly marked important |
| **Medium** | **15** | Default priority |
| **Low** | **5** | Can wait |

**Rationale**:
- High priority tasks get double the score of medium priority
- Low priority tasks still get non-zero score (can win if overdue)
- 30-point range is 60% of due date score → priority matters but urgency dominates

---

### 3. Duration Score (0-20 points)

**Shorter tasks** score higher (easier to start, quick wins).

| Duration | Score | Rationale |
|----------|-------|-----------|
| **≤ 15 min** | **20** | Quick win, no excuse to delay |
| **≤ 30 min** | **15** | Short task |
| **≤ 60 min** | **10** | Medium length (typical focus session) |
| **> 60 min** | **5** | Long session (might need scheduling) |

**Rationale**:
- Encourages tackling quick tasks first (reduces task list faster)
- Prevents long tasks from blocking all progress
- Still allows long, urgent tasks to win (due date score can dominate)

**Example**:
- Overdue 2-hour task: 50 (due) + 30 (high priority) + 5 (long) = **85 points**
- Tomorrow's 15-min task: 35 (tomorrow) + 15 (medium) + 20 (quick) = **70 points**
- Overdue task wins despite longer duration

---

## Scoring Examples

### Example 1: Overdue High-Priority Report
```
Task: Review Q1 report
- Due date: 2026-01-30 (2 days overdue)
- Priority: high
- Duration: 60 minutes
- Current time: 2026-02-01

Scoring:
- Due date: 50 (overdue by 2 days)
- Priority: 30 (high)
- Duration: 10 (60 min = medium)
- TOTAL: 90 points
```

### Example 2: Tomorrow's Quick Task
```
Task: Email client update
- Due date: 2026-02-02 (tomorrow)
- Priority: medium
- Duration: 15 minutes
- Current time: 2026-02-01

Scoring:
- Due date: 35 (due tomorrow)
- Priority: 15 (medium)
- Duration: 20 (quick win)
- TOTAL: 70 points
```

### Example 3: Low-Priority Task Due Today
```
Task: Organize desk
- Due date: 2026-02-01 (today)
- Priority: low
- Duration: 30 minutes
- Current time: 2026-02-01

Scoring:
- Due date: 45 (due today)
- Priority: 5 (low)
- Duration: 15 (short)
- TOTAL: 65 points
```

### Example 4: No Deadline, High Priority
```
Task: Research new tools
- Due date: null
- Priority: high
- Duration: 120 minutes
- Current time: 2026-02-01

Scoring:
- Due date: 10 (no deadline)
- Priority: 30 (high)
- Duration: 5 (long)
- TOTAL: 45 points
```

**Winner**: Example 1 (90 points) - overdue task wins despite longer duration.

---

## Tie-Breaking

If two tasks have the same total score:
- The task that appears **first in the spreadsheet** wins (stable sort)
- In practice, ties are rare due to 100-point granularity

To add explicit tie-breaking (future enhancement):
- Add `created_at` timestamp comparison (older tasks win)
- Add `id` comparison (lexicographic order)

---

## Scoring Response Format

The `GET /tasks/next` endpoint returns both the task and the scoring breakdown:

```json
{
  "task": {
    "id": "task_001",
    "title": "Review Q1 report",
    ...
  },
  "score": 90,
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
    "current_time_local": "2026-02-01T09:00:00-05:00",
    "is_weekday": true,
    "is_morning": true,
    "eligible_tasks_count": 5,
    "filtered_out": {
      "snoozed": 1,
      "not_yet_active": 1,
      "context_mismatch": 0
    }
  }
}
```

**Benefits of Transparency**:
- Users can understand **why** a task was recommended
- Helps build trust in the AI system
- Allows debugging ("Why wasn't task X shown?" → check filtered_out stats)

---

## Tuning the Algorithm

The current weights are:
```
Due Date:  0-50 points (50% of total)
Priority:  0-30 points (30% of total)
Duration:  0-20 points (20% of total)
```

To adjust weights, modify the `calculateScore()` function in `Code.gs`:

### Increase Priority Weight (35% instead of 30%)
```javascript
// Change priority scores
var priorityMap = {
  'high': 35,    // was 30
  'medium': 18,  // was 15
  'low': 6       // was 5
};
```

### Decrease Duration Weight (Ignore Task Length)
```javascript
// Set all duration scores to 0
durationScore = 0;
durationExplanation = 'Duration not considered';
```

### Add Context Bonus (Future Enhancement)
```javascript
// Add +10 bonus for matching context
var contextBonus = 0;
if (matchesCurrentContext(task)) {
  contextBonus = 10;
}
var total = dueScore + priorityScore + durationScore + contextBonus;
```

---

## Design Principles

1. **Deterministic**: Same inputs → same output (no randomness)
2. **Transparent**: Return scoring breakdown, not just result
3. **Tunable**: Easy to adjust weights without full rewrite
4. **Explainable**: Users can understand recommendations
5. **Practical**: Prioritizes urgent tasks while avoiding analysis paralysis

---

## Alternative Scoring Approaches (Not Implemented)

### 1. Machine Learning
- Learn user preferences from completion patterns
- **Pros**: Personalized, adapts over time
- **Cons**: Complex, requires training data, less explainable

### 2. Eisenhower Matrix
- Score based on urgent/important quadrants
- **Pros**: Well-known framework
- **Cons**: Requires user to categorize tasks explicitly

### 3. Weighted Sum with User Preferences
- Let user adjust weights (priority: 60%, urgency: 30%, duration: 10%)
- **Pros**: Personalized
- **Cons**: Adds complexity, most users won't customize

### 4. Time-Based Scheduling
- Recommend tasks based on available time blocks
- **Pros**: Optimizes calendar usage
- **Cons**: Requires calendar integration, more complex

---

## Testing the Algorithm

Use the test scenarios in `test-data.md` to verify scoring:

```bash
# Get next task on weekday morning
curl "YOUR_URL?action=tasks/next&timezone=America/New_York&current_time=2026-02-03T09:00:00Z"

# Check scoring breakdown
{
  "score": 90,
  "scoring_breakdown": {
    "due_date_score": 50,    # Verify: overdue = 50
    "priority_score": 30,    # Verify: high = 30
    "duration_score": 10,    # Verify: 60 min = 10
    "total": 90              # Verify: sum is correct
  }
}
```

**Validate**:
- Overdue tasks always score highest
- Tasks due today beat tasks due tomorrow
- High priority beats medium priority (all else equal)
- Quick tasks beat long tasks (all else equal)

---

## Future Enhancements

1. **User-specific weights**: Store per-user scoring preferences
2. **Time-of-day optimization**: Show quick tasks in morning, long tasks in afternoon
3. **Dependency tracking**: Prioritize tasks that unblock others
4. **Energy level**: Ask "How's your energy?" and suggest appropriate tasks
5. **Estimated completion time**: Factor in historical completion rates
6. **Context learning**: Learn which contexts user works best in
7. **Batch scoring**: Suggest a "batch" of related tasks to do together

---

## Summary

The scoring algorithm balances **urgency** (due date), **importance** (priority), and **effort** (duration) to recommend the single best task for the current moment. It's deterministic, transparent, and tunable—key properties for building user trust in an AI-first system.

**Key Formula**:
```
Score = (0-50 due date) + (0-30 priority) + (0-20 duration)
Winner = max(scores) for eligible tasks
```
