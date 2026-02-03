/**
 * Mindojo Task Manager - Google Apps Script Backend
 *
 * AI-first task manager with Custom GPT frontend
 * Backend: Google Apps Script (HTTP API)
 * Database: Google Sheets
 *
 * API Endpoints:
 * - GET  /health
 * - GET  /tasks
 * - GET  /tasks/next
 * - POST /tasks
 * - PUT  /tasks/:id
 * - POST /tasks/:id/complete
 * - POST /tasks/:id/snooze
 */

// ============================================================================
// ENTRY POINTS
// ============================================================================

/**
 * Handle GET requests
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

/**
 * Handle POST requests
 */
function doPost(e) {
  return handleRequest(e, 'POST');
}

/**
 * Main request handler and router
 */
function handleRequest(e, method) {
  try {
    // Parse action from query parameter
    var action = e.parameter.action || '';

    Logger.log('Request: ' + method + ' ' + action);

    // Route to appropriate handler
    if (method === 'GET') {
      if (action === 'health') {
        return health();
      } else if (action === 'tasks') {
        return getTasks(e.parameter);
      } else if (action === 'tasks/next') {
        return getNextTask(e.parameter);
      } else {
        return respondError('Unknown action: ' + action, 404);
      }
    } else if (method === 'POST') {
      // Parse request body
      var body = {};
      if (e.postData && e.postData.contents) {
        try {
          body = JSON.parse(e.postData.contents);
        } catch (err) {
          return respondError('Invalid JSON in request body', 400);
        }
      }

      // Route POST requests
      if (action === 'tasks') {
        return createTask(body);
      } else if (action.indexOf('tasks/') === 0) {
        // Extract task ID from action (e.g., "tasks/task_123/complete")
        var parts = action.split('/');
        var taskId = parts[1];
        var subAction = parts[2] || '';

        if (subAction === 'complete') {
          return completeTask(taskId, body);
        } else if (subAction === 'snooze') {
          return snoozeTask(taskId, body);
        } else if (subAction === '') {
          // PUT /tasks/:id (update)
          return updateTask(taskId, body);
        } else {
          return respondError('Unknown action: ' + action, 404);
        }
      } else {
        return respondError('Unknown action: ' + action, 404);
      }
    } else {
      return respondError('Method not allowed: ' + method, 405);
    }
  } catch (err) {
    Logger.log('Error: ' + err.message + '\nStack: ' + err.stack);
    return respondError('Internal server error: ' + err.message, 500);
  }
}

// ============================================================================
// CORE UTILITIES
// ============================================================================

/**
 * Get the Tasks sheet
 */
function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Tasks');
  if (!sheet) {
    throw new Error('Sheet "Tasks" not found. Please create it with the required columns.');
  }
  return sheet;
}

/**
 * Generate unique task ID
 */
function generateId() {
  return 'task_' + Utilities.getUuid().substring(0, 8);
}

/**
 * Respond with JSON
 */
function respondJson(data, statusCode) {
  statusCode = statusCode || 200;
  var output = JSON.stringify(data);
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Respond with error
 */
function respondError(message, statusCode) {
  statusCode = statusCode || 400;
  return respondJson({
    error: true,
    message: message,
    statusCode: statusCode
  }, statusCode);
}

/**
 * Parse timezone (validate IANA format)
 */
function parseTimezone(tz) {
  if (!tz) {
    throw new Error('Timezone is required');
  }
  // Basic validation - try to use it
  try {
    Utilities.formatDate(new Date(), tz, 'HH');
    return tz;
  } catch (err) {
    throw new Error('Invalid timezone: ' + tz);
  }
}

/**
 * Get current time in user's timezone
 */
function getCurrentTime(timezone) {
  var now = new Date();
  return now;
}

/**
 * Convert date to ISO string (date only)
 */
function toISODate(date) {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
}

/**
 * Convert date to ISO string (datetime)
 */
function toISODateTime(date) {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Parse ISO date string to Date object
 */
function parseISODate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr);
}

/**
 * Check if date is weekday (Mon-Fri) in user's timezone
 */
function isWeekday(date, timezone) {
  var dayOfWeek = parseInt(Utilities.formatDate(date, timezone, 'u')); // 1=Mon, 7=Sun
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Check if time is morning (hour < 12) in user's timezone
 */
function isMorning(date, timezone) {
  var hour = parseInt(Utilities.formatDate(date, timezone, 'HH'));
  return hour < 12;
}

/**
 * Add days to date
 */
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to date
 */
function addMonths(date, months) {
  var result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// ============================================================================
// DATA ACCESS LAYER
// ============================================================================

/**
 * Get all tasks from sheet
 */
function getAllTasksFromSheet() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();

  // Skip header row
  var tasks = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; // Skip empty rows

    tasks.push({
      id: row[0],
      title: row[1],
      description: row[2] || '',
      status: row[3] || 'pending',
      priority: row[4] || 'medium',
      estimated_duration_minutes: row[5] || 30,
      start_date: row[6] || null,
      due_date: row[7] || null,
      context_tags: row[8] ? row[8].split(',').map(function(t) { return t.trim(); }) : [],
      recurrence_rule: row[9] || null,
      recurrence_anchor: row[10] || null,
      snooze_until: row[11] || null,
      completed_at: row[12] || null,
      created_at: row[13] || new Date().toISOString(),
      updated_at: row[14] || new Date().toISOString(),
      notes: row[15] || '',
      _rowIndex: i + 1 // Store row index for updates
    });
  }

  return tasks;
}

/**
 * Find task by ID
 */
function findTaskById(taskId) {
  var tasks = getAllTasksFromSheet();
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].id === taskId) {
      return tasks[i];
    }
  }
  return null;
}

/**
 * Append task to sheet
 */
function appendTaskToSheet(task) {
  var sheet = getSheet();
  var contextTagsStr = Array.isArray(task.context_tags) ? task.context_tags.join(',') : '';

  sheet.appendRow([
    task.id,
    task.title,
    task.description || '',
    task.status || 'pending',
    task.priority || 'medium',
    task.estimated_duration_minutes || 30,
    task.start_date || '',
    task.due_date || '',
    contextTagsStr,
    task.recurrence_rule || '',
    task.recurrence_anchor || '',
    task.snooze_until || '',
    task.completed_at || '',
    task.created_at || new Date().toISOString(),
    task.updated_at || new Date().toISOString(),
    task.notes || ''
  ]);

  return task;
}

/**
 * Update task in sheet
 */
function updateTaskInSheet(task) {
  var sheet = getSheet();
  var rowIndex = task._rowIndex;

  if (!rowIndex) {
    throw new Error('Cannot update task: row index not found');
  }

  var contextTagsStr = Array.isArray(task.context_tags) ? task.context_tags.join(',') : '';
  task.updated_at = new Date().toISOString();

  sheet.getRange(rowIndex, 1, 1, 16).setValues([[
    task.id,
    task.title,
    task.description || '',
    task.status || 'pending',
    task.priority || 'medium',
    task.estimated_duration_minutes || 30,
    task.start_date || '',
    task.due_date || '',
    contextTagsStr,
    task.recurrence_rule || '',
    task.recurrence_anchor || '',
    task.snooze_until || '',
    task.completed_at || '',
    task.created_at || new Date().toISOString(),
    task.updated_at,
    task.notes || ''
  ]]);

  return task;
}

/**
 * Serialize task for API response (remove internal fields)
 */
function serializeTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    estimated_duration_minutes: task.estimated_duration_minutes,
    start_date: toISODate(task.start_date),
    due_date: toISODate(task.due_date),
    context_tags: task.context_tags,
    recurrence_rule: task.recurrence_rule,
    recurrence_anchor: toISODate(task.recurrence_anchor),
    snooze_until: toISODateTime(task.snooze_until),
    completed_at: toISODateTime(task.completed_at),
    created_at: toISODateTime(task.created_at),
    updated_at: toISODateTime(task.updated_at)
  };
}

// ============================================================================
// ENDPOINT HANDLERS
// ============================================================================

/**
 * GET /health
 */
function health() {
  return respondJson({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}

/**
 * GET /tasks
 */
function getTasks(params) {
  try {
    var timezone = parseTimezone(params.timezone);
    var statusFilter = params.status || 'pending';
    var contextFilter = params.context || null;
    var currentTime = params.current_time ? new Date(params.current_time) : new Date();
    var limit = params.limit ? parseInt(params.limit) : 5; // Default limit 5 tasks for ChatGPT

    // Get all tasks
    var allTasks = getAllTasksFromSheet();

    // Filter by status
    var filtered = allTasks.filter(function(task) {
      return task.status === statusFilter;
    });

    // Filter by context if provided
    if (contextFilter) {
      filtered = filtered.filter(function(task) {
        return task.context_tags && task.context_tags.indexOf(contextFilter) >= 0;
      });
    }

    // Limit results (prevent response too large error)
    var totalCount = filtered.length;
    if (filtered.length > limit) {
      filtered = filtered.slice(0, limit);
    }

    // Serialize tasks with minimal format for GPT (reduce response size)
    var serialized = filtered.map(function(task) {
      var minimal = {
        id: task.id,
        title: task.title,
        priority: task.priority
      };

      // Only include fields if they have values
      if (task.due_date) {
        minimal.due_date = toISODate(task.due_date);
      }
      if (task.estimated_duration_minutes && task.estimated_duration_minutes !== 30) {
        minimal.duration_min = task.estimated_duration_minutes;
      }
      if (task.context_tags && task.context_tags.length > 0) {
        minimal.tags = task.context_tags;
      }

      return minimal;
    });

    return respondJson({
      tasks: serialized,
      count: serialized.length
    });
  } catch (err) {
    return respondError(err.message, 400);
  }
}

/**
 * GET /tasks/next
 * Get best task for "right now" with scoring
 */
function getNextTask(params) {
  try {
    var timezone = parseTimezone(params.timezone);
    var currentTime = params.current_time ? new Date(params.current_time) : new Date();
    var contextHint = params.context_hint || null;

    // Detect context if not provided
    var isWeekdayNow = isWeekday(currentTime, timezone);
    var isMorningNow = isMorning(currentTime, timezone);

    // Get all pending tasks
    var allTasks = getAllTasksFromSheet();
    var pendingTasks = allTasks.filter(function(task) {
      return task.status === 'pending';
    });

    // Filter eligible tasks
    var filterStats = {
      snoozed: 0,
      not_yet_active: 0,
      context_mismatch: 0
    };

    var eligibleTasks = [];
    for (var i = 0; i < pendingTasks.length; i++) {
      var task = pendingTasks[i];

      // Filter: snoozed
      if (task.snooze_until) {
        var snoozeUntil = new Date(task.snooze_until);
        if (currentTime < snoozeUntil) {
          filterStats.snoozed++;
          continue;
        }
      }

      // Filter: not yet active
      if (task.start_date) {
        var startDate = new Date(task.start_date);
        var currentDate = new Date(Utilities.formatDate(currentTime, timezone, 'yyyy-MM-dd'));
        if (currentDate < startDate) {
          filterStats.not_yet_active++;
          continue;
        }
      }

      // Filter: context mismatch (soft filter)
      if (task.context_tags && task.context_tags.length > 0) {
        var matchesContext = false;

        // Check weekday/weekend
        if (isWeekdayNow && (task.context_tags.indexOf('weekday') >= 0 || task.context_tags.indexOf('work') >= 0)) {
          matchesContext = true;
        } else if (!isWeekdayNow && (task.context_tags.indexOf('weekend') >= 0 || task.context_tags.indexOf('personal') >= 0)) {
          matchesContext = true;
        }

        // Check morning/afternoon
        if (isMorningNow && task.context_tags.indexOf('morning') >= 0) {
          matchesContext = true;
        } else if (!isMorningNow && task.context_tags.indexOf('afternoon') >= 0) {
          matchesContext = true;
        }

        // If no context tags match and tags are specific, skip
        if (!matchesContext && (task.context_tags.indexOf('morning') >= 0 || task.context_tags.indexOf('afternoon') >= 0 ||
                                task.context_tags.indexOf('weekday') >= 0 || task.context_tags.indexOf('weekend') >= 0)) {
          filterStats.context_mismatch++;
          continue;
        }
      }

      eligibleTasks.push(task);
    }

    // Check if no tasks available
    if (eligibleTasks.length === 0) {
      return respondJson({
        message: 'No tasks available',
        reason: 'all_filtered',
        filtered_out: filterStats
      }, 404);
    }

    // Score all eligible tasks
    var scoredTasks = [];
    for (var j = 0; j < eligibleTasks.length; j++) {
      var t = eligibleTasks[j];
      var scoreBreakdown = calculateScore(t, currentTime, timezone);
      scoredTasks.push({
        task: t,
        score: scoreBreakdown.total,
        breakdown: scoreBreakdown
      });
    }

    // Sort by score (descending)
    scoredTasks.sort(function(a, b) {
      return b.score - a.score;
    });

    // Return top task
    var best = scoredTasks[0];
    return respondJson({
      task: serializeTask(best.task),
      score: best.score,
      scoring_breakdown: best.breakdown,
      context: {
        current_time_local: Utilities.formatDate(currentTime, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        is_weekday: isWeekdayNow,
        is_morning: isMorningNow,
        eligible_tasks_count: eligibleTasks.length,
        filtered_out: filterStats
      }
    });
  } catch (err) {
    return respondError(err.message, 400);
  }
}

/**
 * POST /tasks
 * Create new task
 */
function createTask(body) {
  try {
    // Validate required fields
    if (!body.title || body.title.trim() === '') {
      throw new Error('title is required');
    }
    if (body.title.length > 200) {
      throw new Error('title must be 200 characters or less');
    }

    var timezone = parseTimezone(body.timezone);

    // Validate priority
    var priority = body.priority || 'medium';
    if (['high', 'medium', 'low'].indexOf(priority) < 0) {
      throw new Error('priority must be high, medium, or low');
    }

    // Validate dates
    if (body.start_date && body.due_date) {
      var startDate = new Date(body.start_date);
      var dueDate = new Date(body.due_date);
      if (startDate > dueDate) {
        throw new Error('start_date must be before or equal to due_date');
      }
    }

    // Validate estimated_duration_minutes
    var duration = body.estimated_duration_minutes || 30;
    if (duration <= 0) {
      throw new Error('estimated_duration_minutes must be greater than 0');
    }

    // Validate recurrence_rule
    var recurrenceRule = body.recurrence_rule || null;
    if (recurrenceRule && ['daily', 'weekly', 'monthly'].indexOf(recurrenceRule) < 0) {
      throw new Error('recurrence_rule must be daily, weekly, or monthly');
    }

    // Create task object
    var task = {
      id: generateId(),
      title: body.title.trim(),
      description: body.description || '',
      status: 'pending',
      priority: priority,
      estimated_duration_minutes: duration,
      start_date: body.start_date || null,
      due_date: body.due_date || null,
      context_tags: body.context_tags || [],
      recurrence_rule: recurrenceRule,
      recurrence_anchor: body.due_date || null, // Set anchor to initial due date
      snooze_until: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: ''
    };

    // Append to sheet
    appendTaskToSheet(task);

    return respondJson({
      task: serializeTask(task)
    }, 201);
  } catch (err) {
    return respondError(err.message, 400);
  }
}

/**
 * POST /tasks/:id (update)
 * Update existing task
 */
function updateTask(taskId, body) {
  try {
    var timezone = parseTimezone(body.timezone);

    // Find task
    var task = findTaskById(taskId);
    if (!task) {
      return respondError('Task not found: ' + taskId, 404);
    }

    // Update allowed fields
    if (body.title !== undefined) {
      if (!body.title || body.title.trim() === '') {
        throw new Error('title cannot be empty');
      }
      if (body.title.length > 200) {
        throw new Error('title must be 200 characters or less');
      }
      task.title = body.title.trim();
    }

    if (body.description !== undefined) {
      task.description = body.description;
    }

    if (body.priority !== undefined) {
      if (['high', 'medium', 'low'].indexOf(body.priority) < 0) {
        throw new Error('priority must be high, medium, or low');
      }
      task.priority = body.priority;
    }

    if (body.estimated_duration_minutes !== undefined) {
      if (body.estimated_duration_minutes <= 0) {
        throw new Error('estimated_duration_minutes must be greater than 0');
      }
      task.estimated_duration_minutes = body.estimated_duration_minutes;
    }

    if (body.start_date !== undefined) {
      task.start_date = body.start_date;
    }

    if (body.due_date !== undefined) {
      task.due_date = body.due_date;
    }

    // Validate date range
    if (task.start_date && task.due_date) {
      var startDate = new Date(task.start_date);
      var dueDate = new Date(task.due_date);
      if (startDate > dueDate) {
        throw new Error('start_date must be before or equal to due_date');
      }
    }

    if (body.context_tags !== undefined) {
      task.context_tags = body.context_tags;
    }

    if (body.recurrence_rule !== undefined) {
      if (body.recurrence_rule && ['daily', 'weekly', 'monthly'].indexOf(body.recurrence_rule) < 0) {
        throw new Error('recurrence_rule must be daily, weekly, or monthly');
      }
      task.recurrence_rule = body.recurrence_rule;
    }

    // Update in sheet
    updateTaskInSheet(task);

    return respondJson({
      task: serializeTask(task)
    });
  } catch (err) {
    return respondError(err.message, 400);
  }
}

/**
 * POST /tasks/:id/complete
 * Mark task as completed (handles recurrence)
 */
function completeTask(taskId, body) {
  try {
    var timezone = parseTimezone(body.timezone);
    var completionTime = body.completion_time ? new Date(body.completion_time) : new Date();

    // Find task
    var task = findTaskById(taskId);
    if (!task) {
      return respondError('Task not found: ' + taskId, 404);
    }

    // Check if already completed (idempotency)
    if (task.status === 'completed') {
      return respondJson({
        message: 'Task already completed',
        task: serializeTask(task),
        recurrence_created: false
      });
    }

    // Mark as completed
    task.status = 'completed';
    task.completed_at = completionTime.toISOString();
    updateTaskInSheet(task);

    // Handle recurrence
    var nextTask = null;
    var recurrenceCreated = false;

    if (task.recurrence_rule) {
      var nextDueDate = null;
      var currentDueDate = task.due_date ? new Date(task.due_date) : new Date();

      if (task.recurrence_rule === 'daily') {
        nextDueDate = addDays(currentDueDate, 1);
      } else if (task.recurrence_rule === 'weekly') {
        nextDueDate = addDays(currentDueDate, 7);
      } else if (task.recurrence_rule === 'monthly') {
        nextDueDate = addMonths(currentDueDate, 1);
      }

      if (nextDueDate) {
        // Create next occurrence
        nextTask = {
          id: generateId(),
          title: task.title,
          description: task.description,
          status: 'pending',
          priority: task.priority,
          estimated_duration_minutes: task.estimated_duration_minutes,
          start_date: toISODate(nextDueDate),
          due_date: toISODate(nextDueDate),
          context_tags: task.context_tags,
          recurrence_rule: task.recurrence_rule,
          recurrence_anchor: task.recurrence_anchor,
          snooze_until: null,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notes: 'Auto-created from recurring task ' + task.id
        };

        appendTaskToSheet(nextTask);
        recurrenceCreated = true;
      }
    }

    return respondJson({
      task: serializeTask(task),
      recurrence_created: recurrenceCreated,
      next_task: nextTask ? serializeTask(nextTask) : null
    });
  } catch (err) {
    return respondError(err.message, 400);
  }
}

/**
 * POST /tasks/:id/snooze
 * Snooze task until specific time
 */
function snoozeTask(taskId, body) {
  try {
    var timezone = parseTimezone(body.timezone);

    if (!body.snooze_until) {
      throw new Error('snooze_until is required');
    }

    var snoozeUntil = new Date(body.snooze_until);
    var now = new Date();

    // Validate future timestamp
    if (snoozeUntil <= now) {
      throw new Error('snooze_until must be a future timestamp');
    }

    // Find task
    var task = findTaskById(taskId);
    if (!task) {
      return respondError('Task not found: ' + taskId, 404);
    }

    // Cannot snooze completed tasks
    if (task.status === 'completed') {
      throw new Error('Cannot snooze a completed task');
    }

    // Update snooze_until
    task.snooze_until = snoozeUntil.toISOString();
    updateTaskInSheet(task);

    return respondJson({
      task: serializeTask(task)
    });
  } catch (err) {
    return respondError(err.message, 400);
  }
}

// ============================================================================
// SCORING ALGORITHM
// ============================================================================

/**
 * Calculate score for a task
 * Returns breakdown object with scores and explanations
 */
function calculateScore(task, currentTime, timezone) {
  var dueScore = 0;
  var dueExplanation = '';
  var priorityScore = 0;
  var priorityExplanation = '';
  var durationScore = 0;
  var durationExplanation = '';

  // 1. Due date score (0-50 points)
  if (!task.due_date) {
    dueScore = 10;
    dueExplanation = 'No deadline set';
  } else {
    var dueDate = new Date(task.due_date);
    var currentDate = new Date(Utilities.formatDate(currentTime, timezone, 'yyyy-MM-dd'));
    var daysDiff = Math.floor((dueDate - currentDate) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      // Overdue
      var overdueDays = Math.abs(daysDiff);
      dueScore = 50;
      dueExplanation = 'Overdue by ' + overdueDays + ' day(s)';
    } else if (daysDiff === 0) {
      // Due today
      dueScore = 45;
      dueExplanation = 'Due today';
    } else if (daysDiff === 1) {
      // Due tomorrow
      dueScore = 35;
      dueExplanation = 'Due tomorrow';
    } else if (daysDiff <= 3) {
      // Due in 2-3 days
      dueScore = 25;
      dueExplanation = 'Due in ' + daysDiff + ' days';
    } else if (daysDiff <= 7) {
      // Due in 4-7 days
      dueScore = 15;
      dueExplanation = 'Due in ' + daysDiff + ' days';
    } else {
      // Due later
      dueScore = 5;
      dueExplanation = 'Due in ' + daysDiff + ' days';
    }
  }

  // 2. Priority score (0-30 points)
  var priorityMap = {
    'high': 30,
    'medium': 15,
    'low': 5
  };
  priorityScore = priorityMap[task.priority] || 15;
  priorityExplanation = task.priority.charAt(0).toUpperCase() + task.priority.slice(1) + ' priority';

  // 3. Duration score (0-20 points)
  var duration = task.estimated_duration_minutes || 30;
  if (duration <= 15) {
    durationScore = 20;
    durationExplanation = duration + ' min task (quick win)';
  } else if (duration <= 30) {
    durationScore = 15;
    durationExplanation = duration + ' min task (short)';
  } else if (duration <= 60) {
    durationScore = 10;
    durationExplanation = duration + ' min task (medium length)';
  } else {
    durationScore = 5;
    durationExplanation = duration + ' min task (long session)';
  }

  // Total score
  var total = dueScore + priorityScore + durationScore;

  return {
    due_date_score: dueScore,
    due_date_explanation: dueExplanation,
    priority_score: priorityScore,
    priority_explanation: priorityExplanation,
    duration_score: durationScore,
    duration_explanation: durationExplanation,
    total: total
  };
}
