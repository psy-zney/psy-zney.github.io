import { copy, type Copy } from './portfolio';

// The product ring continues the Porrima story before the Skills chapter.
export const SHOWCASE_ENABLED: boolean = true;
export const visiblePortfolioHash = (hash: string) => !SHOWCASE_ENABLED && /^#\/showcase(?:\/|$)/.test(hash) ? '#/projects' : hash;

export interface ShowcaseProduct {
  id: string;
  name: string;
  kind: 'website' | 'download';
  category: Copy;
  description: Copy;
  url: string;
  preview?: string;
  color: string;
  caseStudy?: string;
  scope?: Copy;
  stack?: string;
  resume?: 'fullstack' | 'software';
}

// User-supplied destinations. Preview captures: docs/product-preview-sources.md.
export const showcaseProducts: ShowcaseProduct[] = [
  { id: 'mpoly', name: 'Cờ Tỷ Phú Mèo', kind: 'website', category: copy('Trò chơi / Multiplayer', 'Game / Multiplayer'), description: copy('Một bàn cờ, những con phố Sài Gòn và sáu người bạn.', 'A board, the streets of Saigon and six friends.'), url: 'https://mpoly.zney295.id.vn/', preview: './img/products/mpoly-board.jpg', color: '#e8bd67' },
  { id: 'beatsync', name: 'BeatSync', kind: 'website', category: copy('Âm nhạc / Thời gian thực', 'Music / Real time'), description: copy('Mở rộng phòng nghe chung với hàng chờ, chat và gọi thoại.', 'Extended shared listening rooms with a common queue, chat and voice calls.'), url: 'https://beatsync.zney295.id.vn/', preview: './img/products/beatsync.webp', color: '#a8c8ff', caseStudy: 'beatsync',
    scope: copy('Mở rộng từ mã nguồn mở', 'Open-source fork & extensions'), stack: 'Next.js · Go · WebSocket · LiveKit', resume: 'fullstack' },
  { id: 'boom', name: 'Mèo Nổ', kind: 'website', category: copy('Trò chơi / Thẻ bài', 'Game / Cards'), description: copy('Một bộ bài vui. Những chú mèo đầy bất ngờ.', 'Playful cards. Unpredictable cats.'), url: 'https://boom.zney295.id.vn/', preview: './img/products/boom.webp', color: '#edb489' },
  { id: 'study', name: 'Study Cabin', kind: 'website', category: copy('Học tập / TOEIC', 'Learning / TOEIC'), description: copy('Một góc học nhỏ cho một hành trình dài.', 'A quiet place for a longer learning journey.'), url: 'https://study.zney295.id.vn/', preview: './img/products/study.webp', color: '#b9cbb2', caseStudy: 'study-cabin' },
  { id: 'manager', name: 'Manager', kind: 'website', category: copy('Ứng dụng web', 'Web application'), description: copy('Khám phá ứng dụng tại manager.zney295.id.vn.', 'Explore the application at manager.zney295.id.vn.'), url: 'https://manager.zney295.id.vn/', color: '#a9bfd5' },
  { id: 'fashion', name: 'Tung Tung', kind: 'website', category: copy('Trò chơi / Thời trang', 'Game / Fashion'), description: copy('Tích hợp artwork, phối trang phục, tùy biến khuôn mặt và xuất ảnh.', 'Integrated client artwork, outfit selection, face customization and image export.'), url: 'https://zney295.id.vn/-Fashion-Dress-up-Game/', preview: './img/products/fashion.webp', color: '#bfdbbe',
    scope: copy('GameDressUp · Freelance đã bàn giao', 'GameDressUp · Delivered freelance work'), stack: 'Next.js · React · TypeScript · Canvas', resume: 'fullstack' },
  { id: 'sentinel', name: 'SentinelLAN', kind: 'download', category: copy('Ứng dụng / Quản lý thiết bị', 'Software / Devices'), description: copy('Kết nối agent, API và dashboard để quản lý thiết bị theo vai trò.', 'Connected an agent, API and dashboard for role-based device management.'), url: 'https://zney295.id.vn/SentinelLAN/#downloads', preview: './img/products/sentinel.webp', color: '#8ccbc0', caseStudy: 'sentinellan',
    scope: copy('Dự án cá nhân · Quản lý thiết bị', 'Personal project · Endpoint management'), stack: 'C# · ASP.NET Core · Next.js · PostgreSQL', resume: 'software' },
  { id: 'security', name: 'Security Core', kind: 'download', category: copy('Ứng dụng / Bảo mật', 'Software / Security'), description: copy('Một hệ thống kết nối máy tính và ứng dụng điều khiển.', 'A system connecting a computer and its control app.'), url: 'https://zney295.id.vn/Security/', preview: './img/products/security.webp', color: '#b6a6e1', caseStudy: 'security-core' },
  { id: 'backup', name: 'Zney Backup', kind: 'download', category: copy('Ứng dụng / Sao lưu Windows', 'Software / Windows backup'), description: copy('Chọn dữ liệu, giữ thiết lập và cài lại ứng dụng được hỗ trợ bằng winget.', 'Select data, preserve settings and reinstall supported apps with winget.'), url: 'https://zney295.id.vn/BackupData/#download', preview: './img/products/backup.webp', color: '#90bfda', caseStudy: 'backup-data',
    scope: copy('Dự án cá nhân · Chuyển máy Windows', 'Personal project · Windows migration'), stack: 'C# · .NET 8 · WPF · winget', resume: 'software' },
];

export function showcaseIndexForHash(hash: string): number | null {
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts[0] !== 'showcase' || parts.length > 2) return null;
  return parts.length === 1 || !parts[1] ? 0 : (() => {
    const index = showcaseProducts.findIndex(product => product.id === parts[1]);
    return index < 0 ? null : index;
  })();
}
