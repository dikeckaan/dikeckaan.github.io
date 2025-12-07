# Abdurrahman Kaan Dikeç - Personal Website

A modern, minimalist personal portfolio website built with vanilla HTML, CSS, and JavaScript. Features an elegant design with animated backgrounds, secure contact form, and full responsive support.

🌐 **Live Site:** [dikeckaan.github.io](https://dikeckaan.github.io)

---

## ✨ Features

### 🎨 Design & UI
- **Modern Minimalist Aesthetic** - Clean, distraction-free design focusing on content
- **Animated Gradient Background** - Three floating gradient orbs with smooth animations
- **Gradient Text Effects** - Eye-catching title with gradient color transitions
- **Interactive Elements** - Hover effects, tooltips, and smooth transitions throughout
- **Availability Badge** - Pulsing indicator showing project availability status
- **Section Numbering** - Professional portfolio-style section organization
- **Skill Tags Grid** - Interactive skill showcase with hover animations

### 🔒 Security
- **Cloudflare Turnstile CAPTCHA** - Advanced bot protection for contact form
- **Honeypot Fields** - Hidden spam trap fields
- **Behavioral Analysis** - Mouse movement and keyboard interaction tracking
- **Form Timing Validation** - Prevents automated rapid submissions
- **Security Tokens** - Unique token generation for each form session
- **Rate Limiting** - Server-side protection against spam (via Cloudflare Worker)
- **XSS Protection** - Input sanitization and validation

### 📱 Responsive Design
- **Mobile-First Approach** - Optimized for all screen sizes
- **Adaptive Typography** - Fluid font sizing using CSS clamp
- **Touch-Friendly** - Optimized tap targets for mobile devices
- **Flexible Grid** - CSS Grid and Flexbox for responsive layouts

### ⚡ Performance
- **Vanilla JavaScript** - No heavy frameworks, faster load times
- **Inline SVG Icons** - No external icon library dependencies
- **Optimized Animations** - Hardware-accelerated CSS transforms
- **Minimal Dependencies** - Only Cloudflare Turnstile for CAPTCHA

### 🎭 Animations
- **Scroll Reveal** - Elements fade in as you scroll using Intersection Observer
- **Floating Orbs** - Continuous background animation with blur effects
- **Button Shimmer** - Hover effect with animated shimmer overlay
- **Social Icon Bounce** - Spring-like hover animations with tooltips
- **Form Focus Effects** - Smooth input transitions with glow effects
- **Pulsing Badge** - Subtle scale animation for availability indicator

---

## 🏗️ Structure

```
dikeckaan.github.io/
├── index.html          # Main HTML structure
├── style.css           # All styles and animations
├── script.js           # Form logic, security, and interactions
├── worker.js           # Cloudflare Worker for form handling
├── CNAME               # Custom domain configuration
├── robots.txt          # Search engine directives
├── sitemap.xml         # SEO sitemap
└── README.md           # This file
```

---

## 🎨 Design System

### Color Palette
```css
--bg-primary: #0a0a0a      /* Deep black background */
--bg-secondary: #141414    /* Card backgrounds */
--text-primary: #ffffff    /* Main text */
--text-secondary: #a0a0a0  /* Secondary text */
--accent: #6366f1          /* Indigo accent color */
--success: #22c55e         /* Success messages */
--error: #ef4444           /* Error messages */
```

### Typography
- **Font Family:** System font stack (San Francisco, Segoe UI, Roboto)
- **Headings:** 800 weight, gradient text effects
- **Body:** 400 weight, increased line-height for readability

### Spacing
- Consistent spacing scale using rem units
- Generous padding for touch targets
- Balanced whitespace for visual hierarchy

---

## 🔧 Technologies

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern features (Grid, Flexbox, Custom Properties)
- **Vanilla JavaScript** - ES6+ features

### Security & Services
- **Cloudflare Turnstile** - CAPTCHA verification
- **Cloudflare Workers** - Serverless form processing
- **GitHub Pages** - Static site hosting

### APIs Used
- Intersection Observer API - Scroll animations
- Fetch API - Form submissions
- Web Crypto API - Token generation

---

## 📋 Sections

### 1. Hero Section
- Name and title with gradient effect
- Availability badge with pulsing animation
- Tagline and subtitle
- Social media links with tooltips (GitHub, Twitter, Instagram, Email)

### 2. About Section
- Personal introduction with highlighted text
- Detailed description
- Interactive skill tags (Development, Engineering, Problem Solving, Music)

### 3. Contact Form
- Email, subject, and message fields
- Character counters (200 for subject, 1000 for message)
- Cloudflare Turnstile CAPTCHA
- Real-time validation
- Success/error message display
- Animated submit button with arrow

### 4. Footer
- Copyright information with dynamic year
- Tagline: "Built with passion and precision"

---

## 🛡️ Security Features

### Client-Side Validation
```javascript
- Mouse movement tracking (minimum 10 movements)
- Keyboard press tracking (minimum 5 presses)
- Form interaction tracking (minimum 2 interactions)
- Timing validation (minimum 5 seconds to fill)
- Honeypot field detection
- Unique token generation per session
```

### Server-Side Protection
- Cloudflare Worker validates all security checks
- Rate limiting per IP address
- CAPTCHA verification
- Input sanitization
- Email notification to site owner

---

## 🚀 Deployment

This site is automatically deployed via **GitHub Pages** from the `master` branch.

### Deploy Steps:
1. Push changes to `master` branch
2. GitHub Pages automatically builds and deploys
3. Site is live at `dikeckaan.github.io`

### Custom Domain (Optional):
- Configure CNAME file with your domain
- Update DNS settings to point to GitHub Pages

---

## 📝 Form Handler (Cloudflare Worker)

The contact form is processed by a Cloudflare Worker (`worker.js`) that:
1. Validates all security checks
2. Verifies Cloudflare Turnstile token
3. Implements rate limiting
4. Sanitizes input
5. Sends email notifications
6. Returns appropriate responses

**Worker Endpoint:** `https://siteform.dikeckaan.workers.dev/`

---

## 🎯 Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Required Features:
- CSS Grid & Flexbox
- CSS Custom Properties
- Intersection Observer API
- Fetch API
- ES6+ JavaScript

---

## 🔄 Version History

### v2.0.0 - Modern Redesign (Current)
- Complete UI/UX overhaul
- Animated gradient backgrounds
- Enhanced security features
- Improved mobile responsiveness
- English content
- Cleaned up codebase

### v1.0.0 - Initial Version
- Basic HTML5 UP template
- FontAwesome icons
- Complex asset structure

---

## 📦 Dependencies

**Runtime:**
- Cloudflare Turnstile (CDN: `challenges.cloudflare.com/turnstile/v0/api.js`)

**Development:**
- None - Pure vanilla stack

**Total Bundle Size:** ~12KB (HTML + CSS + JS combined)

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/dikeckaan/dikeckaan.github.io.git

# Navigate to directory
cd dikeckaan.github.io

# Serve locally (using any static server)
python3 -m http.server 8000
# or
npx serve

# Open browser
open http://localhost:8000
```

---

## 📧 Contact Form Configuration

To use the contact form, you need:

1. **Cloudflare Turnstile Site Key**
   - Sign up at [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Create a Turnstile widget
   - Replace site key in `index.html`:
   ```html
   <div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>
   ```

2. **Cloudflare Worker**
   - Deploy `worker.js` to Cloudflare Workers
   - Configure environment variables
   - Update fetch URL in `script.js`

---

## 🎨 Customization

### Change Colors
Edit CSS variables in `style.css`:
```css
:root {
    --accent: #6366f1;  /* Change accent color */
    --bg-primary: #0a0a0a;  /* Change background */
}
```

### Modify Content
- Edit `index.html` for text content
- Update social links in Hero section
- Modify skill tags in About section

### Adjust Animations
- Edit animation keyframes in `style.css`
- Modify timing in `@keyframes` rules
- Adjust `animation-delay` for orbs

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Abdurrahman Kaan Dikeç**

- GitHub: [@dikeckaan](https://github.com/dikeckaan)
- Twitter: [@kaandikec](https://twitter.com/kaandikec)
- Instagram: [@kaandikec](https://instagram.com/kaandikec)
- Email: site@kaandikec.org

---

## 🙏 Acknowledgments

- Cloudflare for Turnstile CAPTCHA and Workers platform
- GitHub Pages for free hosting
- Modern web standards for making this possible without frameworks

---

**Built with passion and precision** ✨
