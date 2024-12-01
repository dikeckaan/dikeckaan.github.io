# Worker README

## Overview

This Cloudflare Worker is designed for handling form submissions with features such as rate limiting, IP storage in KV, and debugging functionality accessible only to authorized IPs. The worker integrates with a KV Namespace for storing submission times and utilizes Telegram for notifications.

---

## Features

### Debug Mode
- **Enabled/Disabled**: Controlled by `DEBUG_MODE` flag.
- **Authorized Access**: Debug routes are only accessible from the IP address defined in `ALLOWED_DEBUG_IP`.
- **Debug Routes**:
  - `/debug`: Provides general debug information, including KV data.
  - `/list-ips`: Lists stored IPs in the KV Namespace.
  - `/delete-ip`: Allows deletion of specific IP entries from the KV Namespace.

### Form Submission
- **Spam Protection**: Honeypot field to detect spam submissions.
- **Rate Limiting**: Limits the frequency of submissions from the same IP address within a configurable duration.
- **Telegram Notifications**: Sends form submission details to a Telegram bot.

### Data Cleanup
- Periodically removes old KV records exceeding a configurable retention period via the `/cleanup` route.

---

## Configuration

### Debug Settings
- `DEBUG_MODE`: Boolean flag to enable or disable debug mode.
- `ALLOWED_DEBUG_IP`: IP address authorized to access debug routes.

### Rate Limiting
- `RATE_LIMIT_DURATION_HOURS`: Time window for rate limiting in hours.
- `CLEANUP_OLD_RECORDS_DAYS`: Retention duration for KV records in days.

### KV Namespace
- `kvNamespace`: Binding to a Cloudflare KV Namespace used for storing submission times.

---

## Environment Variables
- **BOT_TOKEN**: Telegram bot token for sending notifications.
- **CHAT_ID**: Telegram chat ID where form submissions are sent.

---

## Deployment

1. Bind the KV Namespace:
   ```bash
   wrangler kv:namespace create "formSubmissionTimes"
   ```

2. Add the KV binding to `wrangler.toml`:
   ```toml
   [env]
   kv_namespaces = [
     { binding = "formSubmissionTimes", id = "your-kv-namespace-id" }
   ]
   ```

3. Deploy the worker:
   ```bash
   wrangler publish
   ```

---

## Endpoints

### Debug Endpoints (Authorized IP Only)
- **`GET /debug`**: Provides debug details including IP and KV data.
- **`GET /list-ips`**: Lists all IPs stored in the KV Namespace.
- **`POST /delete-ip`**: Deletes a specific IP from the KV Namespace.

### Main Functionality
- **`POST /`**: Handles form submissions with rate limiting and Telegram integration.
- **`GET /cleanup`**: Cleans up old KV records based on the configured retention period.

---

## Error Handling
- Unauthorized debug access returns `403 Forbidden`.
- Exceeding rate limits returns `429 Too Many Requests`.
- General errors return `500 Internal Server Error`.

---

## Notes
- Ensure the Telegram bot credentials (`BOT_TOKEN` and `CHAT_ID`) are configured as environment variables.
- Regularly monitor and update the cleanup and rate limit durations as required.

For additional details, refer to the inline comments in the worker script.
