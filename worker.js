addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
  event.waitUntil(cleanUpOldRecords()); // Call function to clean up old records in the background
});

// Debug flag
const DEBUG_MODE = false; // DEBUG_MODE variable; if true, IP listing is active, if false, it is inactive

async function handleRequest(request) {
  if (request.method === 'POST') {
    const formData = await request.formData();
    const email = formData.get('email'); // Extract the email field from the form data
    const subject = formData.get('subject'); // Extract the subject field from the form data
    const honeypot = formData.get('honeypot'); // Honeypot field for spam protection

    // Single variable for time management
    const RATE_LIMIT_HOURS = 4 ; // Adjustable number of hours, currently set to 4 hour

    // Reject IPv6 Requests
    const clientIP = request.headers.get('cf-connecting-ip'); // Get client IP address from request headers
    if (clientIP.includes(':')) { // If the IP address is IPv6, reject the request
      return new Response('<html><body><p>IPv6 requests are not allowed. Please use an IPv4 connection.</p><button onclick="window.history.back()">Go Back</button></body></html>', { status: 403, headers: { 'Content-Type': 'text/html' } });
    }

    // Spam Protection: Honeypot and Rate Limiting
    if (honeypot) { // If honeypot field is filled, it's likely a spam submission
      return new Response('<html><body><p>Spam detected!</p><button onclick="window.history.back()">Go Back</button></body></html>', { status: 403, headers: { 'Content-Type': 'text/html' } });
    }

    const currentTimestamp = Date.now(); // Get the current timestamp
    const RATE_LIMIT_DURATION = RATE_LIMIT_HOURS * 60 * 60 * 1000; // Convert rate limit duration to milliseconds
    const KV_NAMESPACE = "formSubmissionTimes"; // Namespace for storing submission times in KV

    // Get the last submission time from KV
    const lastSubmissionTime = await formSubmissionTimes.get(clientIP); // Retrieve the last submission time for the client IP
    if (lastSubmissionTime) {
      const timeSinceLastSubmission = currentTimestamp - parseInt(lastSubmissionTime, 10); // Calculate time since last submission
      if (timeSinceLastSubmission < RATE_LIMIT_DURATION) { // If within rate limit duration, reject the request
        return new Response('<html><body><p>You can only submit the form once every ' + RATE_LIMIT_HOURS + ' hours.</p><button onclick="window.history.back()">Go Back</button></body></html>', { status: 429, headers: { 'Content-Type': 'text/html' } });
      }
    }

    // Store the current submission time
    await formSubmissionTimes.put(clientIP, currentTimestamp.toString(), { expirationTtl: RATE_LIMIT_HOURS * 60 * 60 }); // Store the current submission time with expiration

    // Telegram Bot Configuration
    const botToken = 'bottoken'; // Bot token for Telegram API
    const chatId = 'chatid'; // Chat ID to send the message to
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`; // Telegram API URL

    const message = `New Form Message\nEmail: ${email}\nSubject: ${subject}`; // Message to be sent to Telegram

    // Send to Telegram
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' // Set content type to JSON
      },
      body: JSON.stringify({
        chat_id: chatId, // Chat ID to send the message to
        text: message // Message content
      })
    });

    if (telegramResponse.ok) { // If Telegram response is OK, return success message
      return new Response('<html><body><p>Form submitted successfully!</p><button onclick="window.history.back()">Go Back</button></body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    } else { // If Telegram response is not OK, return error message
      return new Response('<html><body><p>An error occurred, please try again!</p><button onclick="window.history.back()">Go Back</button></body></html>', { status: 500, headers: { 'Content-Type': 'text/html' } });
    }
  }

  // IP Listing Endpoint
  if (DEBUG_MODE && request.method === 'GET' && new URL(request.url).pathname === '/list-ips') {
    const keysResponse = await formSubmissionTimes.list(); // List all keys from KV
    if (keysResponse.keys.length === 0) { // If no keys are found, return message
      return new Response('<html><body><p>No IPs found in KV.</p></body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    }

    let responseHtml = '<html><body><h3>IPs Stored in KV:</h3><ul>'; // Start HTML response for listing IPs
    for (const key of keysResponse.keys) { // Loop through all keys and add to response
      responseHtml += `<li>${key.name}</li>`;
    }
    responseHtml += '</ul></body></html>'; // End HTML response

    return new Response(responseHtml, { status: 200, headers: { 'Content-Type': 'text/html' } }); // Return the list of IPs
  }

  // If method is not allowed, return method not allowed response
  return new Response('<html><body><p>Method not allowed</p><button onclick="window.history.back()">Go Back</button></body></html>', { status: 405, headers: { 'Content-Type': 'text/html' } });
}

// Function to clean up old records from KV
async function cleanUpOldRecords() {
  const currentTimestamp = Date.now(); // Get the current timestamp
  const RATE_LIMIT_HOURS = 4; // Using the same duration here for cleaning up old records
  
  // Get all keys from KV
  const keysResponse = await formSubmissionTimes.list(); // List all keys from KV
  if (keysResponse.keys.length === 0) { // If no keys are found, exit the function
    return;
  }

  for (const key of keysResponse.keys) {
    const lastSubmissionTime = await formSubmissionTimes.get(key.name); // Get the last submission time for each key
    if (lastSubmissionTime) {
      const timeSinceLastSubmission = currentTimestamp - parseInt(lastSubmissionTime, 10); // Calculate time since last submission
      // If the record is older than RATE_LIMIT_HOURS, delete it
      if (timeSinceLastSubmission > RATE_LIMIT_HOURS * 60 * 60 * 1000) { // If the record is older than the rate limit duration, delete it
        await formSubmissionTimes.delete(key.name); // Delete the record from KV
      }
    }
  }
}
