// Debug flag and authorized IP
const DEBUG_MODE = false; // Enable or disable debug mode
const ALLOWED_DEBUG_IP = '1.1.1.1'; // IP address allowed to access debug routes

// Time configuration
const RATE_LIMIT_DURATION_HOURS = 4; // Rate limit duration in hours
const CLEANUP_OLD_RECORDS_DAYS = 32; // Number of days before old records are cleaned

// KV Namespace Binding
const kvNamespace = formSubmissionTimes; // KV Namespace for storing form submission data

// Convert durations to milliseconds
const RATE_LIMIT_DURATION = RATE_LIMIT_DURATION_HOURS * 60 * 60 * 1000; // Rate limit duration in milliseconds
const CLEANUP_DURATION = CLEANUP_OLD_RECORDS_DAYS * 24 * 60 * 60 * 1000; // Cleanup duration in milliseconds

// Main event listener for fetch events
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request)); // Handle the incoming request
});

// Main request handler
async function handleRequest(request) {
  const url = new URL(request.url); // Parse the request URL
  const clientIP = request.headers.get('cf-connecting-ip'); // Get the client's IP address

  // Handle debug routes
  if (DEBUG_MODE && clientIP === ALLOWED_DEBUG_IP) {
    if (url.pathname === '/debug') {
      return handleDebug(request); // Debug information
    } else if (url.pathname === '/list-ips') {
      return listIPs(); // List all IPs stored in KV
    } else if (url.pathname === '/delete-ip' && request.method === 'POST') {
      return deleteIP(request); // Delete a specific IP from KV
    }
  }

  // Unauthorized debug access
  if (DEBUG_MODE && url.pathname.startsWith('/debug')) {
    return new Response('Unauthorized access to debug mode.', { status: 403 });
  }

  // Main functionality routes
  if (request.method === 'POST') {
    return handleFormSubmission(request); // Handle form submissions
  } else if (request.method === 'GET' && url.pathname === '/cleanup') {
    return handleCleanup(); // Handle cleanup of old records
  }

  // Method not allowed for other routes
  return new Response('Method not allowed.', { status: 405 });
}

// Debug: Display general information
async function handleDebug(request) {
  try {
    const keys = await kvNamespace.list(); // List all keys in KV Namespace
    const keyValues = [];

    for (const key of keys.keys) {
      const value = await kvNamespace.get(key.name); // Retrieve value for each key
      keyValues.push({ key: key.name, value });
    }

    const clientIP = request.headers.get('cf-connecting-ip'); // Get the client's IP address

    // Return HTML with debug information
    return new Response(`
      <html>
        <body>
          <h1>Debug Information</h1>
          <h2>Client IP</h2>
          <p>${clientIP || 'Unavailable'}</p>
          
          <h2>Secrets</h2>
          <p><strong>BOT_TOKEN:</strong> ${BOT_TOKEN}</p>
          <p><strong>CHAT_ID:</strong> ${CHAT_ID}</p>

          <h2>KV Namespace Data</h2>
          <ul>
            ${keyValues
              .map(item => `<li><strong>${item.key}:</strong> ${item.value}</li>`)
              .join('')}
          </ul>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error(`Error in debug handler: ${error.message}`);
    return new Response('Debug Error.', { status: 500 });
  }
}

// Debug: List all stored IPs
async function listIPs() {
  try {
    const keys = await kvNamespace.list(); // List all keys in KV Namespace
    if (keys.keys.length === 0) {
      return new Response('No IPs found in KV Namespace.', { status: 404 });
    }

    let ipListHtml = '<h1>Stored IPs in KV Namespace</h1><ul>';
    for (const key of keys.keys) {
      ipListHtml += `<li>${key.name}</li>`; // Add each IP to the HTML list
    }
    ipListHtml += '</ul>';

    // Return HTML for IP list with a form for deletion
    return new Response(`
      <html>
        <body>
          ${ipListHtml}
          <form action="/delete-ip" method="post">
            <h2>Delete an IP</h2>
            <label for="ip">Enter IP to delete:</label>
            <input type="text" id="ip" name="ip" required>
            <button type="submit">Delete IP</button>
          </form>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    return new Response(`Error listing IPs: ${error.message}`, { status: 500 });
  }
}

// Debug: Delete a specific IP from KV
async function deleteIP(request) {
  try {
    const formData = await request.formData(); // Parse form data
    const ipToDelete = formData.get('ip'); // Retrieve the IP to delete

    if (!ipToDelete) {
      return new Response('IP address is required.', { status: 400 });
    }

    const existingValue = await kvNamespace.get(ipToDelete); // Check if the IP exists in KV

    if (!existingValue) {
      return new Response(`IP "${ipToDelete}" not found in KV Namespace.`, { status: 404 });
    }

    await kvNamespace.delete(ipToDelete); // Delete the IP from KV

    return new Response(`IP "${ipToDelete}" was successfully deleted from KV Namespace.`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    return new Response(`Error deleting IP: ${error.message}`, { status: 500 });
  }
}

// Handle form submissions
async function handleFormSubmission(request) {
  try {
    const formData = await request.formData(); // Parse the form data
    const clientIP = request.headers.get('cf-connecting-ip'); // Retrieve the client's IP
    const email = formData.get('email'); // Retrieve the email field
    const subject = formData.get('subject'); // Retrieve the subject field
    const honeypot = formData.get('honeypot'); // Honeypot field for spam detection

    // Spam detection using honeypot
    if (honeypot) {
      return new Response('Spam detected!', { status: 403 });
    }

    // Check if the client is rate-limited
    const lastSubmission = await kvNamespace.get(clientIP);
    if (lastSubmission) {
      const { timestamp } = JSON.parse(lastSubmission);
      const timeElapsed = Date.now() - new Date(timestamp).getTime();

      if (timeElapsed < RATE_LIMIT_DURATION) {
        return new Response('Rate limit exceeded. Please try again later.', { status: 429 });
      }
    }

    // Store form submission data in KV
    const submissionData = {
      email,
      subject,
      timestamp: new Date().toISOString(),
    };
    await kvNamespace.put(clientIP, JSON.stringify(submissionData), { expirationTtl: 24 * 60 * 60 });

    // Send submission data to Telegram
    const botToken = BOT_TOKEN;
    const chatId = CHAT_ID;
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const message = `New Form Submission\nEmail: ${email}\nSubject: ${subject}\nIP: ${clientIP}`;
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error(`Telegram API Error: ${errorText}`);
      return new Response('Failed to send Telegram message.', { status: 500 });
    }

    return new Response('Form submitted successfully!', { status: 200 });
  } catch (error) {
    console.error(`Error handling form submission: ${error.message}`);
    return new Response('Internal Server Error.', { status: 500 });
  }
}

// Cleanup old KV records
async function handleCleanup() {
  try {
    const keys = await kvNamespace.list(); // List all keys in KV Namespace
    const currentTime = Date.now(); // Get the current timestamp

    for (const key of keys.keys) {
      const data = await kvNamespace.get(key.name); // Retrieve data for each key
      if (data) {
        const { timestamp } = JSON.parse(data);
        const recordTime = new Date(timestamp).getTime();

        // Delete records older than the configured cleanup duration
        if (currentTime - recordTime > CLEANUP_DURATION) {
          await kvNamespace.delete(key.name);
        }
      }
    }

    return new Response('Cleanup completed successfully!', { status: 200 });
  } catch (error) {
    console.error(`Error during cleanup: ${error.message}`);
    return new Response('Cleanup failed.', { status: 500 });
  }
}
