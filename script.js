// Security variables
let mouseMovements = 0;
let keyPresses = 0;
let formInteractions = 0;
let turnstileToken = null;

// DOM Elements
const form = document.getElementById('contact-form');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const spinner = document.getElementById('spinner');
const formMessage = document.getElementById('form-message');
const subjectInput = document.getElementById('subject');
const messageInput = document.getElementById('message');
const subjectCount = document.getElementById('subject-count');
const messageCount = document.getElementById('message-count');

// Set current year
document.getElementById('year').textContent = new Date().getFullYear();

// Cloudflare Turnstile callback
window.onTurnstileSuccess = function(token) {
    turnstileToken = token;
    document.getElementById('cf-turnstile-response').value = token;
};

// Generate security token
function generateToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Initialize form security
function initFormSecurity() {
    document.getElementById('formStartTime').value = Date.now();
    document.getElementById('formToken').value = generateToken();

    // Track mouse movements
    document.addEventListener('mousemove', () => {
        mouseMovements++;
        document.getElementById('mouseMovements').value = mouseMovements;
    });

    // Track keyboard interactions
    form.addEventListener('keydown', () => {
        keyPresses++;
    });

    // Track form interactions
    form.addEventListener('focus', () => {
        formInteractions++;
    }, true);
}

// Character counters
function updateCharCount(input, counter, max) {
    const count = input.value.length;
    counter.textContent = count;
    counter.style.color = count > max * 0.9 ? 'var(--error)' : 'var(--text-muted)';
}

subjectInput.addEventListener('input', () => {
    updateCharCount(subjectInput, subjectCount, 200);
});

messageInput.addEventListener('input', () => {
    updateCharCount(messageInput, messageCount, 1000);
});

// Show message
function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';

    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
}

// Validate security
function validateSecurity() {
    const honeypot = document.querySelector('input[name="honeypot"]').value;
    const website = document.querySelector('input[name="website"]').value;
    const formStartTime = parseInt(document.getElementById('formStartTime').value, 10);
    const formToken = document.getElementById('formToken').value;

    if (!turnstileToken) {
        return { valid: false, message: 'Please complete the CAPTCHA verification.' };
    }

    if (honeypot || website) {
        return { valid: false, message: 'Security check failed.' };
    }

    const formDuration = Date.now() - formStartTime;
    if (formDuration < 5000) {
        return { valid: false, message: 'Please take your time filling out the form.' };
    }

    if (mouseMovements < 10) {
        return { valid: false, message: 'Please interact with the form naturally.' };
    }

    if (keyPresses < 5) {
        return { valid: false, message: 'Please type your message.' };
    }

    if (formInteractions < 2) {
        return { valid: false, message: 'Please fill all required fields.' };
    }

    if (!formToken || formToken.length !== 32) {
        return { valid: false, message: 'Security token invalid.' };
    }

    return { valid: true };
}

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const securityCheck = validateSecurity();
    if (!securityCheck.valid) {
        showMessage(securityCheck.message, 'error');
        return;
    }

    submitBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';

    try {
        const formData = new FormData(form);
        const response = await fetch('https://siteform.dikeckaan.workers.dev/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-Form-Token': document.getElementById('formToken').value
            }
        });

        if (response.ok) {
            showMessage('Message sent successfully! I\'ll get back to you soon.', 'success');
            form.reset();
            subjectCount.textContent = '0';
            messageCount.textContent = '0';

            mouseMovements = 0;
            keyPresses = 0;
            formInteractions = 0;
            turnstileToken = null;
            initFormSecurity();

            if (typeof turnstile !== 'undefined') {
                turnstile.reset();
            }
        } else {
            if (response.status === 429) {
                showMessage('Please wait before sending another message.', 'error');
            } else if (response.status === 403) {
                showMessage('Security validation failed. Please try again.', 'error');
            } else {
                showMessage('Failed to send message. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showMessage('Network error. Please check your connection.', 'error');
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
});

// Initialize
initFormSecurity();

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll reveal animation
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});
