# LE QUANG KHANH
### Mobile Developer Intern

Ho Chi Minh City, Vietnam · [lequangkhanh295@gmail.com](mailto:lequangkhanh295@gmail.com) · [github.com/psy-zney](https://github.com/psy-zney) · [zney295.id.vn](https://zney295.id.vn)

---

## Summary

Mobile Developer with project experience in both cross-platform (React Native/Expo) and native Android (Java) development. Comfortable owning a mobile app end-to-end, including navigation architecture, offline-first local storage, authentication, and integration with backend/cloud services.

---

## Education

**University of Economics Ho Chi Minh City (UEH)**
*B.S. in Information Technology — Ho Chi Minh City, Vietnam* · GPA: 2.9/4.0
Expected Aug 2027

**Relevant Coursework:** Data Structures & Algorithms, Object-Oriented Programming, Database Management Systems, Mobile Application Development, Information Security

---

## Technical Projects

### LuckyFood — Recipe & Meal Decision App
*Apr 2026 – May 2026*

- Built a cross-platform mobile app (Expo, TypeScript) that helps users decide what to cook, with dish browsing, ingredient-based filtering, and a randomized daily meal picker.
- Designed a role-based navigation architecture with React Navigation and Zustand, separating Admin and User flows.
- Implemented offline-first local persistence with SQLite (expo-sqlite), automatic dataset seeding, local email/password accounts, favorites, and meal history.
- Prepared a Google Sign-In integration; it is disabled in the current repository snapshot.

**Tech stack:** React Native, Expo, TypeScript, Zustand, SQLite

### Security Core — Cross-Platform Remote Security System
*Jan 2026 – Mar 2026 · Demo: [zney295.id.vn/Security](https://zney295.id.vn/Security/)*

- Designed a 4-module remote security system for Windows PCs: a Rust background service (SYSTEM privileges), a Tauri/React desktop management app, a React Native/Expo mobile control app, and a Node.js/Socket.IO cloud relay.
- Built the mobile control app (React Native/Expo), including remote actions such as PC lock, USB port blocking, and webcam capture, with OTP confirmation for sensitive operations.
- Implemented HMAC-signed, time-limited commands between mobile and PC to prevent replay attacks, and QR-code based pairing between the mobile and desktop apps.
- Implemented an offline command queue on the relay server (up to 50 buffered commands) delivered once the PC reconnects.

**Tech stack:** React Native, Expo, Rust, Tauri, Node.js, Socket.IO, WebSocket, Named Pipes

### Micro4Nerds — Native Android E-Commerce App
*Mar 2026 – May 2026*

- Built a native Android app (Java, MVVM architecture) for browsing and purchasing Micro Four Thirds cameras, lenses, and accessories.
- Structured the app with a Repository pattern coordinating local (SQLite cache, SharedPreferences) and remote (Firebase Firestore, Auth, Storage) data sources.
- Implemented product browsing, cart, checkout, and order history flows, with Google Sign-In and Firebase Authentication.

**Tech stack:** Java, Android SDK, MVVM, Firebase (Auth, Firestore, Storage), SQLite, Glide

---

## Skills

| Category | Details |
|---|---|
| **Languages** | JavaScript, TypeScript, Java, Rust, SQL |
| **Mobile** | React Native, Expo SDK, React Navigation, Zustand, Android SDK (Java), MVVM |
| **Backend & Cloud** | Firebase (Auth, Firestore, Storage), Node.js, Socket.IO, REST APIs |
| **Data & Storage** | SQLite (expo-sqlite, Android), MongoDB, offline-first architecture |
| **Tools & Concepts** | Git, GitHub, Google Sign-In / OAuth, Data Structures & Algorithms, OOP |
