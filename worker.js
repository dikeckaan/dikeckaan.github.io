// Time configuration
const RATE_LIMIT_DURATION_HOURS = 24; // Rate limit duration in hours

// Cloudflare Turnstile Secret Key
// This will be set as an environment variable in Cloudflare Workers dashboard
// IMPORTANT: Do NOT hardcode the secret key here!

// Convert durations to milliseconds
const RATE_LIMIT_DURATION = RATE_LIMIT_DURATION_HOURS * 60 * 60 * 1000; // Rate limit duration in milliseconds

// Modern ES6 export syntax for Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};

// CORS headers - restricted to your domain only
function getCorsHeaders(origin) {
  const allowedOrigins = [
    'https://dikeckaan.github.io',
    'https://kaandikec.com',
    'http://localhost:3000', // For local development
  ];

  const isAllowed = allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://dikeckaan.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, X-Form-Token',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Sanitize input to prevent injection attacks
function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .slice(0, 5000); // Limit length
}

// Hash IP for secure KV key storage
async function hashIP(ip) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'salt-random-string-2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Main request handler
async function handleRequest(request, env) {
  const url = new URL(request.url); // Parse the request URL
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Get real client IP (Cloudflare provides this)
  const clientIP = request.headers.get('cf-connecting-ip') ||
                   request.headers.get('x-real-ip') ||
                   request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   'unknown';

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Main functionality routes
  if (request.method === 'POST' && url.pathname === '/') {
    return handleFormSubmission(request, clientIP, corsHeaders, env);
  }

  // Admin cleanup route (requires secret flag)
  if (request.method === 'POST' && url.pathname === '/admin/cleanup') {
    return handleAdminCleanup(request, corsHeaders, env);
  }

  // Method not allowed for other routes
  return new Response('Method not allowed.', { status: 405, headers: corsHeaders });
}

// Verify Cloudflare Turnstile CAPTCHA
async function verifyTurnstile(token, clientIP, env) {
  try {
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: clientIP
      })
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error(`Turnstile verification error: ${error.message}`);
    return false;
  }
}

// Handle form submissions
async function handleFormSubmission(request, clientIP, corsHeaders, env) {
  try {
    const formData = await request.formData(); // Parse the form data
    const email = formData.get('email'); // Retrieve the email field
    const subject = formData.get('subject'); // Retrieve the subject field
    const message = formData.get('message'); // Retrieve the message field
    const honeypot = formData.get('honeypot'); // Honeypot field for spam detection
    const website = formData.get('website'); // Second honeypot field
    const turnstileToken = formData.get('cf-turnstile-response'); // Cloudflare Turnstile token
    const formToken = formData.get('formToken'); // Form security token
    const mouseMovements = parseInt(formData.get('mouseMovements') || '0'); // Mouse movements tracking
    const formStartTime = formData.get('formStartTime'); // Form start time for timing attack detection

    // Spam detection using honeypots
    if (honeypot || website) {
      return new Response('Spam detected!', { status: 403, headers: corsHeaders });
    }

    // Verify form token exists and is valid format (FIRST - cheap check)
    if (!formToken || formToken.length !== 32) {
      return new Response('Invalid security token.', { status: 403, headers: corsHeaders });
    }

    // Verify Cloudflare Turnstile CAPTCHA (SECOND - requires API call)
    if (!turnstileToken) {
      return new Response('CAPTCHA verification required.', { status: 403, headers: corsHeaders });
    }

    const isTurnstileValid = await verifyTurnstile(turnstileToken, clientIP, env);
    if (!isTurnstileValid) {
      return new Response('CAPTCHA verification failed.', { status: 403, headers: corsHeaders });
    }

    // Verify form fill time (minimum 5 seconds to prevent bots)
    if (!formStartTime) {
      return new Response('Form timing data missing.', { status: 403, headers: corsHeaders });
    }

    const formFillDuration = Date.now() - parseInt(formStartTime, 10);
    if (formFillDuration < 5000) {
      return new Response('Form filled too quickly. Please take your time.', { status: 403, headers: corsHeaders });
    }

    // Verify mouse movements (human-like interaction)
    if (mouseMovements < 10) {
      return new Response('Security validation failed: insufficient interaction.', { status: 403, headers: corsHeaders });
    }

    // Check if the client is rate-limited (using hashed IP for privacy)
    const ipHash = await hashIP(clientIP);
    const lastSubmission = await env.formSubmissionTimes.get(ipHash);
    if (lastSubmission) {
      const { timestamp } = JSON.parse(lastSubmission);
      const timeElapsed = Date.now() - new Date(timestamp).getTime();

      if (timeElapsed < RATE_LIMIT_DURATION) {
        return new Response('Rate limit exceeded. Please try again later.', { status: 429, headers: corsHeaders });
      }
    }

    // Store form submission data in KV (using hashed IP)
    const submissionData = {
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
    };
    await env.formSubmissionTimes.put(ipHash, JSON.stringify(submissionData), {
      expirationTtl: RATE_LIMIT_DURATION_HOURS * 60 * 60
    });

    // Send submission data to Telegram (with sanitized content to prevent XSS)
    const botToken = env.BOT_TOKEN;
    const chatId = env.CHAT_ID;
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const telegramMessage = `🔔 New Form Submission

📧 Email: ${sanitize(email)}
📝 Subject: ${sanitize(subject)}
💬 Message:
${sanitize(message)}

🌐 IP: ${clientIP}
⏰ Time: ${new Date().toLocaleString()}`;

    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramMessage,
        parse_mode: 'HTML'
      }),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error(`Telegram API Error: ${errorText}`);
      return new Response('Failed to send Telegram message.', { status: 500, headers: corsHeaders });
    }

    return new Response('Form submitted successfully!', {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error(`Error handling form submission: ${error.message}`);
    return new Response('Internal Server Error.', { status: 500, headers: corsHeaders });
  }
}

// Admin cleanup handler - removes all rate limit records
async function handleAdminCleanup(request, corsHeaders, env) {
  try {
    // Parse request body to get the secret flag
    const body = await request.json();
    const providedSecret = body.secret;

    // Verify the secret flag from environment variable
    if (!env.ADMIN_CLEANUP_SECRET || providedSecret !== env.ADMIN_CLEANUP_SECRET) {
      return new Response('Unauthorized. Invalid or missing secret.', {
        status: 401,
        headers: corsHeaders
      });
    }

    // List and delete all keys from KV
    let deletedCount = 0;
    let cursor = undefined;

    do {
      const list = await env.formSubmissionTimes.list({ cursor });

      for (const key of list.keys) {
        await env.formSubmissionTimes.delete(key.name);
        deletedCount++;
      }

      cursor = list.cursor;
    } while (cursor);

    return new Response(JSON.stringify({
      success: true,
      message: `Cleanup completed successfully!`,
      deletedCount: deletedCount
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(`Admin cleanup error: ${error.message}`);
    return new Response(JSON.stringify({
      success: false,
      message: 'Cleanup failed.',
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
