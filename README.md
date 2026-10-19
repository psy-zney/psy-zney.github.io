# Zney's Portfolio — A Universe of Connected Projects

The portfolio opens with a scroll-driven journey across the Virgo constellation. Its curved product gallery contains nine real products in two continuous chapters, Web experiences and Apps & tools; scrolling moves between them without clicking a category. Ten project case studies, both printable CVs and the original interactive 3D workspace remain available through public hash routes.

Three.js, Lenis, GSAP, CSS and SVG drive the journey, wave page loader, curved screens and black-hole workspace entry. The gallery supports pointer/touch dragging, wheel input and keyboard navigation, with flat screens under reduced motion. Product destinations, authentic previews, recovery states, live preview and case-study return routes are documented in [the current feature baseline](docs/feature-preservation.vi.md).

Project stories live in `src/data/portfolio.ts`. See [content sources](docs/portfolio-content-sources.md) for repository snapshots, attribution, and scope notes. The 3D workspace and admin screen are loaded on demand.

Verification: `pnpm run check` checks the portfolio and experience, then runs TypeScript and the production build. `pnpm run check:ui` verifies desktop, portrait, landscape and reduced-motion layouts in Chrome, including continuous chapter scrolling, Manager's fallback, keyboard/touch input and workspace entry. Browser setup and test limitations are recorded in the feature baseline.

<p align="center">
  Regression checks: <code>pnpm run check</code> · Browser checks: <code>pnpm run check:ui</code>.
  Read <a href="docs/feature-preservation.vi.md">the current feature baseline</a> before switching coding models.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-WebGL-black?style=for-the-badge&logo=three.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Bun-Backend-000000?style=for-the-badge&logo=bun&logoColor=white" />
</p>

An agency-grade, highly interactive **Cyberpunk 3D Creator Portfolio** built for **Zney (@psy-zney)**. The project combines a cinematic Three.js workspace, tactile desktop interactions, bilingual content, custom audio, and a completely custom-built full-stack analytics engine.

🌐 **Live Website:** [zney295.id.vn](https://zney295.id.vn)

---

## ✨ Key Features & Architectural Highlights

### 🖥️ 1. Interactive 3D Workstation Scene
The workspace scene is built around a GLB workstation model and enhanced with runtime interaction logic:
- **Monitor Entry Point:** Clicking the computer screen seamlessly transitions you from the 3D room into the interactive 2D desktop layer.
- **Object Hover Feedback:** Interactive objects are detected with a raycaster and highlighted through neon post-processing outlines.
- **Animated Monitor Texture:** A custom GIF is rendered onto the 3D monitor surface while preserving correct orientation and presentation.

### ⌨️ 2. Interactive Desktop Overlay
After entering the screen, the experience switches to a crisp HTML/CSS overlay for pixel-perfect UI:
- **Mechanical Keyboard Simulation:** Physical keyboard events drive a visual mechanical keyboard module.
- **Cat Paw Typing Animation:** Cute cat paws dynamically reach toward the exact key positions you type on your real keyboard.
- **RGB LED Lighting System:** Features Wave, Press, and Ripple lighting modes that react to user input.
- **Custom Sound Pack:** A Web Audio API integration plays accurate CherryMX Black mechanical switch sounds based on physical typing timing.

### 📊 3. Custom Full-Stack Analytics Engine (New!)
Unlike most portfolios that use Google Analytics, this project features a 100% custom-built telemetry and analytics system:
- **Session & Flow Tracking:** Tracks unique user journeys (e.g., `Intro ➔ Workspace ➔ Admin`) using session storage and SQLite.
- **Hono & Bun Backend:** A high-performance REST API hosted on a private VPS, connected securely via Cloudflare Tunnels.
- **Secure Admin Dashboard:** A private, password-protected internal dashboard with real-time stats, visitor geo-location, and user journey flow charts.

### 🌐 4. Bilingual Adaptive UI
- Defaults to English, with full Vietnamese support via a language toggle.
- Responsive design with an orientation guard that prompts mobile users to rotate their device for the optimal 3D experience.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Frontend Core** | [React 18.3](https://react.dev/) + [TypeScript 5.5](https://www.typescriptlang.org/) |
| **Styling & Layout** | [Tailwind CSS 3.4](https://tailwindcss.com/) |
| **3D & WebGL** | [Three.js](https://threejs.org/) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) |
| **Backend API** | [Bun](https://bun.sh/) + [Hono](https://hono.dev/) |
| **Database** | SQLite (`bun:sqlite`) |
| **Icons & Typography** | [Lucide React](https://lucide.dev/) + Google Fonts |
| **CI/CD** | GitHub Actions ➔ GitHub Pages |

---

## 📂 Codebase Architecture

```text
Zney-Portfolio/
├── src/
│   ├── components/
│   │   ├── IntroPage.tsx        # Landing page and language-aware hero
│   │   ├── ModelAnalyzer.tsx    # 3D workspace, GLB loading, loader, transitions
│   │   ├── DesktopOverlay.tsx   # Pixel desktop, mechanical keyboard, cat paws
│   │   └── AdminDashboard.tsx   # Secret analytics dashboard with flow charts
│   ├── utils/
│   │   ├── visitorTracker.ts    # Frontend telemetry and session tracking
│   │   └── audioPreloader.ts    # Audio management
│   └── App.tsx                  # Routing and global state
├── public/
│   ├── CNAME                    # Custom domain mapping (zney295.id.vn)
│   ├── main.glb                 # Active 3D workspace model
│   └── sounds/                  # Mechanical keyboard sound packs
└── package.json                 # Project scripts and dependencies
```

---

## 🌟 Featured Open Source Repositories (@psy-zney)

- **[Zney-Portfolio](https://github.com/psy-zney/Zney-Portfolio)** — Interactive cyberpunk 3D portfolio and workspace experiment.
- **[beatsync](https://github.com/psy-zney/beatsync)** — Listen to music in real-time sync with friends across interactive web rooms with WebRTC audio.
- **[Security](https://github.com/psy-zney/Security)** — Cloud relay server and automated Windows security monitoring daemon for proactive system protection.
- **[LearningEnglish](https://github.com/psy-zney/LearningEnglish)** — Intelligent language acquisition app featuring automated tense verification and sentence parsing.
- **[mandycrimson](https://github.com/psy-zney/mandycrimson)** — Modern full-stack product catalog and interactive presentation web platform.

---

## 👨‍💻 Author & Contact

Designed and engineered by **Zney (@psy-zney)**.

- **GitHub:** [@psy-zney](https://github.com/psy-zney)
- **Facebook:** [psyotic.zney](https://www.facebook.com/psyotic.zney/)

---

<p align="center">
  Made with ❤️ and Cyberpunk Aesthetics by <b>Zney</b>
</p>
