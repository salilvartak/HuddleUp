# HuddleUp — Email Notification Function Setup

This Appwrite Function sends email notifications whenever a new document is created
in the `notifications` collection. It uses **Resend** (free tier: 100 emails/day).

---

## 1. Create the `notifications` collection in Appwrite

In the Appwrite Console → Databases → your database → Create Collection:

**Collection ID:** `notifications`

**Attributes:**

| Name         | Type    | Required | Default |
|--------------|---------|----------|---------|
| user_id      | String  | ✓        |         |
| email        | String  | ✓        |         |
| type         | String  | ✓        |         |
| title        | String  | ✓        |         |
| body         | String  | ✓        |         |
| task_id      | String  | ✗        |         |
| email_sent   | Boolean | ✓        | false   |
| created_at   | String  | ✓        |         |

**Permissions:** Any authenticated user can create documents (the app writes them).
The Appwrite Function's API key handles reads/updates.

---

## 2. Get a Resend API key

1. Sign up at [resend.com](https://resend.com) (free — 100 emails/day)
2. Go to API Keys → Create API Key
3. Copy the key

---

## 3. Deploy the Appwrite Function

In the Appwrite Console → Functions → Create Function:

- **Name:** HuddleUp Email Notifications
- **Runtime:** Node.js 18
- **Entry point:** `src/index.js`  (or `index.js` if not using `src/`)
- **Build command:** `npm install`

Upload or connect this `appwrite-function/` folder as the function source.

**Environment Variables** (Functions → Settings → Environment Variables):

```
RESEND_API_KEY        = re_xxxxxxxxxxxxxxxxxxxx
FROM_EMAIL            = HuddleUp <notifications@yourdomain.com>
APP_URL               = https://yourapp.netlify.app
APPWRITE_ENDPOINT     = https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID   = your_project_id
APPWRITE_API_KEY      = your_server_api_key
DATABASE_ID           = your_database_id
```

> **FROM_EMAIL**: For production, [verify your domain](https://resend.com/docs/send-with-custom-domain)
> in Resend. For testing, use `onboarding@resend.dev`.

---

## 4. Add the database event trigger

In the function's **Events** tab, add:

```
databases.[YOUR_DATABASE_ID].collections.notifications.documents.*.create
```

Replace `[YOUR_DATABASE_ID]` with your actual database ID.

That's it! The function will now fire whenever the app creates a notification document,
send the email via Resend, and mark `email_sent = true`.

---

## Testing

In the Appwrite Console → Functions → your function → Execute:

Paste a sample payload:
```json
{
  "$id": "test123",
  "user_id": "uid",
  "email": "you@example.com",
  "type": "assignment",
  "title": "Task assigned to you",
  "body": "Design the landing page",
  "task_id": null,
  "email_sent": false
}
```
