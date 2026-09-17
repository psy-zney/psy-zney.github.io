# LE QUANG KHANH
### Full-Stack Web Developer Intern

Ho Chi Minh City, Vietnam · [lequangkhanh295@gmail.com](mailto:lequangkhanh295@gmail.com) · [github.com/psy-zney](https://github.com/psy-zney) · [zney295.id.vn](https://zney295.id.vn)

---

## Summary

Information Technology student at UEH seeking a Full-Stack Web Developer internship. Project experience spans React/Next.js interfaces, Node.js and Go backends, ASP.NET Core endpoint management, and relational databases. Comfortable following a feature across the interface, API, data, and deployment layers.

---

## Education

**University of Economics Ho Chi Minh City (UEH)**
*B.S. in Information Technology — Ho Chi Minh City, Vietnam* · GPA: 2.9/4.0
Expected Aug 2027

**Relevant Coursework:** Data Structures & Algorithms, Object-Oriented Programming, Database Management Systems, Web Development, Information Security, Cloud Computing

---

## Technical Projects

### Cloud POS SaaS — Multi-Tenant Point-of-Sale Platform *(Team Project)*
*2026 · Demo: [pos.zney295.id.vn](https://pos.zney295.id.vn/)*

- Contributed to a multi-tenant SaaS POS system (React/Vite, Node.js/Express, MySQL) deployed on AWS with EC2, RDS, Nginx, and PM2.
- Built the checkout and payment flow, including cart persistence and payment-method-dependent UI logic.
- Implemented inventory movement tracking and resolved a MySQL prepared-statement error affecting the inventory list query.
- Fixed database migration issues, including foreign key constraints and MySQL compatibility.

**Tech stack:** React, Vite, Node.js, Express, MySQL, JWT, AWS (EC2, RDS, SES), Nginx, PM2

### Security Core — Cross-Platform Remote Security System
*Jan 2026 – Mar 2026 · Demo: [zney295.id.vn/Security](https://zney295.id.vn/Security/)*

- Designed a 4-module remote security system for Windows PCs: a Rust background service (SYSTEM privileges), a Tauri/React desktop management app, a React Native/Expo mobile control app, and a Node.js/Socket.IO cloud relay.
- Implemented HMAC-signed, time-limited commands between mobile and PC to prevent replay attacks.
- Built remote actions including PC lock, USB port blocking, and webcam capture, with OTP confirmation for sensitive operations.
- Implemented an offline command queue on the relay server (up to 50 buffered commands) delivered once the PC reconnects, and QR-code based pairing between the mobile and desktop apps.

**Tech stack:** Rust, Tauri, React, React Native/Expo, Node.js, Socket.IO, Named Pipes, WebSocket

### BeatSync — Multi-Device Audio Sync Platform *(Open-Source Adaptation)*
*May 2026 – Present*

- Extended a project originally by freeman-jiang (MIT license) with a shared listening experience, room queues, chat, LiveKit voice, and spatial audio.
- Developed the current Go HTTP/WebSocket backend with room state and backup support, evolving the earlier Bun implementation.
- Integrated a Rust audio extractor, streamed S3/R2 uploads, and memory-aware queue load shedding for constrained hosting.
- Maintained the original attribution and MIT license in the repository.

**Tech stack:** Next.js, React, Go, Rust, WebSocket, Cloudflare R2, LiveKit, Docker

### SentinelLAN — LAN Endpoint Management *(Graduation Project)*
*2026 · Source: [github.com/psy-zney/SentinelLAN](https://github.com/psy-zney/SentinelLAN)*

- Built a Next.js dashboard, ASP.NET Core API, and Windows agent with PostgreSQL persistence and SignalR status updates.
- Implemented role and tenant boundaries, one-time enrollment, heartbeats, and signed commands with expiry, nonces, and audit records.
- Organized backend responsibilities through Domain, Application, Infrastructure, and API layers; added DPAPI-protected agent identity and offline queuing.
- Kept lock and network-isolation actions simulated by default in the MVP.

**Tech stack:** Next.js, C#, ASP.NET Core, PostgreSQL, SignalR, Windows Agent

### Study Cabin — Personal TOEIC Learning System
*2026 · Source: [github.com/psy-zney/LearningEnglish](https://github.com/psy-zney/LearningEnglish)*

- Built a daily loop for learning, due review, deterministic Part 5 practice, and progress tracking.
- Used SQLite/Prisma and stable-key seeding to update learning content while preserving review history.
- Separated a Vercel frontend from a self-hosted backend; kept Ollama enrichment optional so the core study loop works without it.

**Tech stack:** Next.js, TypeScript, Prisma, SQLite, Cloudflare Tunnels, Ollama

### Mandy Crimson — Order Label Generator
*2026 · Demo: [zney295.id.vn/mandycrimson](https://zney295.id.vn/mandycrimson/)*

- Built a web tool that imports customer orders from Excel spreadsheets, matching column headers across English and Vietnamese formats.
- Parses raw product-line text into structured order items and generates printable labels/receipts for pickup and international shipping.
- Deployed as a static site for a small business client.

**Tech stack:** React, TypeScript, Vite, xlsx

---

## Skills

| Category | Details |
|---|---|
| **Languages** | JavaScript, TypeScript, Go, C#, Rust, PHP, SQL, HTML/CSS |
| **Backend** | Node.js, Express.js, ASP.NET Core, REST APIs, JWT Auth, WebSocket, Socket.IO, MySQL, PostgreSQL, SQLite, MongoDB |
| **Frontend** | React, Next.js, Tailwind CSS, Vite, Zustand |
| **Cloud & DevOps** | AWS (EC2, RDS, SES), Cloudflare (R2, Tunnels), Docker, Nginx, PM2, GitHub Pages |
| **Tools & Concepts** | Git, GitHub, Data Structures & Algorithms, OOP, Database Design |
