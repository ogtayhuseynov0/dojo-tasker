# Privacy Policy for Mindojo Task Manager

**Last Updated:** February 4, 2026
**Project Type:** Technical Assessment Demo (Non-Production)

## Overview

Mindojo Task Manager is a demonstration project built for a technical assessment. This is **NOT a production application** and should only be used with non-sensitive test data.

## Data Collection

### What Data We Collect

When you use this task manager through the Custom GPT interface, we collect and store:

- **Task Information**: Task titles, descriptions, due dates, priority levels, estimated durations, context tags, and completion status
- **Timestamps**: Task creation, update, completion, and snooze times
- **User Context**: Timezone information (provided by your browser to enable context-aware task suggestions)

### What We DO NOT Collect

- ❌ Personal identification information (name, email, phone number)
- ❌ Authentication credentials (no login required)
- ❌ IP addresses or device information
- ❌ Payment information
- ❌ Browsing history or cookies

## How Data Is Stored

- **Storage Location**: All task data is stored in a single Google Sheet
- **Access Control**: The Google Sheet and Google Apps Script are configured with "Anyone" access (no authentication) for demonstration purposes
- **Data Persistence**: Data remains in the Google Sheet until manually deleted
- **No Encryption**: Data is stored in plain text (Google Sheets standard storage)

## How Data Is Used

Your task data is used solely to:

1. Display your tasks through the Custom GPT interface
2. Calculate task priority scores based on due dates, priority levels, and durations
3. Filter tasks by context (weekday/weekend, morning/afternoon)
4. Generate task analytics and completion statistics
5. Manage recurring tasks and snooze functionality

## Data Sharing

- **No Third-Party Sharing**: Your task data is NOT shared with any third parties
- **ChatGPT Processing**: Task queries are processed by OpenAI's ChatGPT to enable natural language interaction, subject to [OpenAI's Privacy Policy](https://openai.com/policies/privacy-policy)
- **Val.town Proxy**: Requests pass through a Val.town proxy function that only forwards requests and does not log or store data

## Data Security

### ⚠️ Important Security Limitations

This is a **test project** with the following security limitations:

- ❌ **No Authentication**: Anyone with the API URL can access all tasks
- ❌ **No User Isolation**: All users share the same Google Sheet
- ❌ **No Rate Limiting**: No protection against abuse
- ❌ **No Input Sanitization**: Minimal validation beyond basic checks
- ❌ **No Audit Logging**: No tracking of who accessed or modified data

### ⚠️ DO NOT Use This Application For:

- Real personal tasks containing sensitive information
- Business-critical task management
- Tasks containing financial information, passwords, or secrets
- Production workloads or real user data

### ✅ Appropriate Use:

- Technical demonstration and assessment
- Testing task management features
- Evaluating AI-first interface design
- Non-sensitive test data only (e.g., "Review sample report", "Test feature X")

## Your Rights

Since there is no user authentication or identification:

- **Access**: You can view all tasks by querying the Custom GPT or directly accessing the Google Sheet
- **Deletion**: Contact the project owner to delete all data from the Google Sheet
- **Export**: Data can be exported from the Google Sheet in CSV/Excel format
- **Modification**: You can update or delete tasks through the Custom GPT interface

## Data Retention

- **Retention Period**: Indefinite (until manual deletion)
- **Deletion**: The project owner may delete all data after the technical assessment is complete
- **No Automatic Cleanup**: Completed tasks remain in the sheet unless manually archived or deleted

## Production Recommendations

If this project were to be used in production, the following measures would be required:

1. ✅ Implement OAuth 2.0 authentication
2. ✅ Add per-user data isolation (separate sheets or multi-tenant database)
3. ✅ Use API keys for access control
4. ✅ Implement rate limiting and DDoS protection
5. ✅ Add input sanitization and validation
6. ✅ Enable HTTPS-only communication (already enforced by Google Apps Script)
7. ✅ Implement audit logging for compliance
8. ✅ Encrypt sensitive data at rest
9. ✅ Add GDPR/CCPA compliance features (data export, deletion requests)
10. ✅ Use a production-grade database (Firestore, PostgreSQL) instead of Google Sheets

## Third-Party Services

This project uses the following third-party services:

1. **OpenAI ChatGPT** (Custom GPT with Actions)
   - Privacy Policy: https://openai.com/policies/privacy-policy
   - Purpose: Natural language interface for task management

2. **Google Sheets** (Data Storage)
   - Privacy Policy: https://policies.google.com/privacy
   - Purpose: Persistent storage of task data

3. **Google Apps Script** (Backend API)
   - Privacy Policy: https://policies.google.com/privacy
   - Purpose: HTTP API for CRUD operations

4. **Val.town** (Proxy Service)
   - Privacy Policy: https://www.val.town/privacy
   - Purpose: Handle HTTP 302 redirects from Google Apps Script

## Changes to This Policy

As this is a demonstration project, this privacy policy may be updated without notice. Check the "Last Updated" date at the top of this document.

## Contact

For questions about this privacy policy or data deletion requests, contact the project owner through the GitHub repository.

## Acknowledgment

By using Mindojo Task Manager, you acknowledge that:

1. This is a test project not intended for production use
2. You will only use non-sensitive test data
3. You understand the security limitations outlined above
4. You accept the risks of using an unauthenticated, publicly accessible system

---

**Project Repository**: [Add your GitHub repo URL here]
**Assessment**: Mindojo Senior AI-First Full-Stack Engineer Technical Assessment
**Date**: February 2026
