import { copy, type Copy } from "./portfolio";

export interface ConstellationStar {
  id: string;
  code: string;
  name: Copy;
  subtitle: Copy;
  starName: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  route: string;
  glowColor: string;
  isOrigin?: boolean;
}

export const CONSTELLATION_STARS: ConstellationStar[] = [
  {
    id: "story",
    code: "STAR-01",
    name: copy("Giới thiệu & Khởi nguyên", "My Story & Origin"),
    subtitle: copy("Câu chuyện & Góc nhìn", "Perspective & Journey"),
    starName: "α Zney (Khởi nguồn)",
    x: 36.5,
    y: 26.5,
    route: "#/story",
    glowColor: "#7dd3fc",
    isOrigin: true,
  },
  {
    id: "projects",
    code: "STAR-02",
    name: copy("Kho Dự Án", "Selected Work"),
    subtitle: copy("Các sản phẩm đã xây dựng", "Featured Engineering Projects"),
    starName: "β Polaris (Công trình)",
    x: 49.6,
    y: 14.3,
    route: "#/projects",
    glowColor: "#facc15",
  },
  {
    id: "skills",
    code: "STAR-03",
    name: copy("Kỹ Năng & Năng Lực", "Capabilities & Stack"),
    subtitle: copy("Web · Mobile · Systems", "Full-stack & Architecture"),
    starName: "γ Rigel (Năng lực)",
    x: 36.3,
    y: 45.5,
    route: "#/skills",
    glowColor: "#38bdf8",
  },
  {
    id: "home",
    code: "STAR-04",
    name: copy("Vũ Trụ Zney", "Zney Universe"),
    subtitle: copy("Trọng tâm điều phối", "Overview & Command Center"),
    starName: "δ Vega (Tâm vũ trụ)",
    x: 58.9,
    y: 47.8,
    route: "#/home",
    glowColor: "#ffffff",
  },
  {
    id: "cloud-pos",
    code: "STAR-05",
    name: copy("Cloud POS", "Cloud POS Platform"),
    subtitle: copy("Web & Multi-tenant POS", "Checkout & Inventory Systems"),
    starName: "ε Sirius (Web & Systems)",
    x: 75.1,
    y: 31.4,
    route: "#/project/cloud-pos",
    glowColor: "#fbbf24",
  },
  {
    id: "luckyfood",
    code: "STAR-06",
    name: copy("LuckyFood", "LuckyFood Mobile"),
    subtitle: copy("Mobile & Local Persistence", "React Native & Offline-first"),
    starName: "ζ Betelgeuse (Mobile Hub)",
    x: 73.6,
    y: 62.1,
    route: "#/project/luckyfood",
    glowColor: "#a3e635",
  },
  {
    id: "security-core",
    code: "STAR-07",
    name: copy("Security Core", "Security Core & Realtime"),
    subtitle: copy("Điều khiển PC & Bảo mật", "Rust · Socket.IO · HMAC"),
    starName: "η Antares (Hệ thống)",
    x: 53.2,
    y: 68.4,
    route: "#/project/security-core",
    glowColor: "#34d399",
  },
  {
    id: "contact",
    code: "STAR-08",
    name: copy("Trạm Kết Nối & CV", "Contact & Resume"),
    subtitle: copy("Hồ sơ & Cơ hội hợp tác", "Get in touch & Credentials"),
    starName: "θ Altair (Kết nối)",
    x: 39.7,
    y: 79.3,
    route: "#/contact",
    glowColor: "#c084fc",
  },
];

// Exact constellation lines and curve extracted from user's image
export const CONSTELLATION_PATHS = {
  // Line from Star 1 (A: 36.5, 26.5) to Star 2 (B: 49.6, 14.3)
  path1_A_to_B: "M 36.5 26.5 L 49.6 14.3",

  // Smooth swan/Z curve from Star 2 (B: 49.6, 14.3) down to Star 3 (C: 36.3, 45.5)
  path2_B_to_C: "M 49.6 14.3 C 53.5 22, 53.5 32, 36.3 45.5",

  // Horizontal bar from Star 3 (C: 36.3, 45.5) to Star 4 (D: 58.9, 47.8)
  path3_C_to_D: "M 36.3 45.5 L 58.9 47.8",

  // Radial branch from Star 4 (D: 58.9, 47.8) to Star 5 (E: 75.1, 31.4)
  path4_D_to_E: "M 58.9 47.8 L 75.1 31.4",

  // Radial branch from Star 4 (D: 58.9, 47.8) to Star 6 (F: 73.6, 62.1)
  path5_D_to_F: "M 58.9 47.8 L 73.6 62.1",

  // Vertical stem from Star 4 (D: 58.9, 47.8) to Star 7 (G: 53.2, 68.4)
  path6_D_to_G: "M 58.9 47.8 L 53.2 68.4",

  // Radial branch from Star 7 (G: 53.2, 68.4) to Star 8 (H: 39.7, 79.3)
  path7_G_to_H: "M 53.2 68.4 L 39.7 79.3",
};

// Continuous full path string for complete outline render
export const FULL_CONSTELLATION_PATH =
  "M 36.5 26.5 L 49.6 14.3 C 53.5 22, 53.5 32, 36.3 45.5 L 58.9 47.8 L 75.1 31.4 M 58.9 47.8 L 73.6 62.1 M 58.9 47.8 L 53.2 68.4 L 39.7 79.3";
