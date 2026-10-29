// Contact form: Turnstile + light bot checks, posted to the siteform Cloudflare Worker (see worker.js).
(function () {
'use strict';

// Form Elements
const contactForm = document.getElementById('contact-form');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const spinner = document.getElementById('spinner');
const formMessage = document.getElementById('form-message');
const formStartTimeInput = document.getElementById('formStartTime');
const formTokenInput = document.getElementById('formToken');
const mouseMovementsInput = document.getElementById('mouseMovements');
const subjectInput = document.getElementById('subject');
const messageInput = document.getElementById('message');
const subjectCounter = document.getElementById('subject-counter');
const messageCounter = document.getElementById('message-counter');

// Security Variables
let mouseMovements = 0;
let keyPresses = 0;
let formInteractions = 0;
let turnstileToken = null;

// Cloudflare Turnstile callback
window.onTurnstileSuccess = function(token) {
    turnstileToken = token;
    document.getElementById('cf-turnstile-response').value = token;
};

// Generate unique form token
function generateToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Initialize form security
function initFormSecurity() {
    formStartTimeInput.value = Date.now();
    formTokenInput.value = generateToken();

    // Track pointer movement (mouse, and touch so phones pass the worker's check too)
    const onMove = () => {
        mouseMovements++;
        mouseMovementsInput.value = mouseMovements;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: true });

    // Track keyboard interactions
    contactForm.addEventListener('keydown', () => {
        keyPresses++;
    });

    // Track form field interactions
    contactForm.addEventListener('focus', () => {
        formInteractions++;
    }, true);
}

// Character counter
function updateCharCounter(input, counter, max) {
    const count = input.value.length;
    counter.textContent = count;
    counter.style.color = count > max * 0.9 ? 'var(--err)' : '';
}

subjectInput.addEventListener('input', () => {
    updateCharCounter(subjectInput, subjectCounter, 200);
});

messageInput.addEventListener('input', () => {
    updateCharCounter(messageInput, messageCounter, 1000);
});

// Show message function
function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = 'form-message ' + type;

    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => {
        formMessage.className = 'form-message';
    }, 5000);
}

// Validate security
function validateSecurity() {
    const honeypot = document.querySelector('input[name="honeypot"]').value;
    const website = document.querySelector('input[name="website"]').value;

    // Check Cloudflare Turnstile
    if (!turnstileToken) {
        return { valid: false, message: 'Please complete the CAPTCHA verification.' };
    }

    // Check honeypots
    if (honeypot || website) {
        return { valid: false, message: 'Security check failed.' };
    }

    // Check form fill time (minimum 5 seconds)
    const formFilledDuration = Date.now() - parseInt(formStartTimeInput.value, 10);
    if (formFilledDuration < 5000) {
        return { valid: false, message: 'Please take your time to fill the form.' };
    }

    // Check for human-like interactions
    if (mouseMovements < 10) {
        return { valid: false, message: 'Please interact with the form naturally.' };
    }

    if (keyPresses < 5) {
        return { valid: false, message: 'Please type your message.' };
    }

    if (formInteractions < 2) {
        return { valid: false, message: 'Please fill all required fields.' };
    }

    // Check token exists
    if (!formTokenInput.value || formTokenInput.value.length !== 32) {
        return { valid: false, message: 'Security token invalid.' };
    }

    return { valid: true };
}

// Form submission handler
contactForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    // Validate security
    const securityCheck = validateSecurity();
    if (!securityCheck.valid) {
        showMessage(securityCheck.message, 'error');
        return;
    }

    // Disable button and show spinner
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';

    try {
        // Prepare form data
        const formData = new FormData(contactForm);

        // Send AJAX request
        const response = await fetch('https://siteform.dikeckaan.workers.dev/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-Form-Token': formTokenInput.value
            }
        });

        if (response.ok) {
            showMessage('Message sent successfully!', 'success');
            contactForm.reset();
            subjectCounter.textContent = '0';
            messageCounter.textContent = '0';

            // Reset security measures
            mouseMovements = 0;
            keyPresses = 0;
            formInteractions = 0;
            turnstileToken = null;
            initFormSecurity();

            // Reset Turnstile
            if (typeof turnstile !== 'undefined') {
                turnstile.reset();
            }
        } else {
            const errorText = await response.text();
            if (response.status === 429) {
                showMessage('Please wait before sending another message.', 'error');
            } else if (response.status === 403) {
                showMessage('Security validation failed.', 'error');
            } else {
                showMessage('Failed to send message. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showMessage('Network error. Please check your connection.', 'error');
    } finally {
        // Re-enable button and hide spinner
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
});

// Initialize on page load
initFormSecurity();
})();
