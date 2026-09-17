export type Language = "vie" | "eng";
export type Copy = Record<Language, string>;
export const copy = (vie: string, eng: string): Copy => ({ vie, eng });

export interface Project {
  id: string;
  name: string;
  category: "web" | "systems" | "mobile" | "creative";
  color: string;
  year: string;
  role: Copy;
  headline: Copy;
  summary: Copy;
  problem: Copy;
  contributions: Copy[];
  decision: Copy;
  takeaway: Copy;
  stack: string[];
  path: string[];
  demo?: string;
  source?: string;
  note?: Copy;
}

// Facts: CVs in public/file and repository snapshots documented in docs/portfolio-content-sources.md.
export const projects: Project[] = [
  {
    id: "beatsync",
    name: "BeatSync",
    category: "systems",
    color: "#a8c8ff",
    year: "2026",
    role: copy(
      "Phát triển & mở rộng từ mã nguồn mở",
      "Open-source adaptation & development",
    ),
    headline: copy(
      "Nhiều thiết bị. Một nhịp nghe chung.",
      "Different devices. One shared moment.",
    ),
    summary: copy(
      "Từ trải nghiệm nghe nhạc cùng nhau đến bài toán đồng bộ thời gian thực và tự vận hành hạ tầng.",
      "A shared listening experience that connects real-time state, audio delivery, and self-hosted infrastructure.",
    ),
    problem: copy(
      "Một bài nhạc trên nhiều thiết bị kéo theo nhiều vấn đề hơn nút Play: trạng thái phòng nghe cần được chia sẻ, file nhạc cần được phân phối, và backend cần có thể truy cập từ internet.",
      "Playing a track across devices involves more than a Play button: rooms need shared state, audio needs a delivery path, and a self-hosted backend needs to be reachable.",
    ),
    contributions: [
      copy(
        "Mở rộng trải nghiệm nghe chung với phòng nhạc, hàng chờ, chat, LiveKit voice và hiệu ứng không gian qua Web Audio.",
        "Extended the shared listening experience with rooms, queues, chat, LiveKit voice, and spatial effects through Web Audio.",
      ),
      copy(
        "Phát triển backend Go cho HTTP/WebSocket, trạng thái phòng và backup; kết hợp Rust extractor cho luồng âm thanh YouTube.",
        "Developed a Go backend for HTTP/WebSocket, room state, and backups, with a Rust extractor for YouTube audio.",
      ),
      copy(
        "Xử lý upload theo luồng lên S3/R2 và giảm tải hàng đợi khi chạm ngưỡng bộ nhớ.",
        "Implemented streamed S3/R2 uploads and queue load shedding when memory thresholds are reached.",
      ),
    ],
    decision: copy(
      "Một trải nghiệm nghe chung phải đi cùng giới hạn vận hành. Backend giữ trạng thái phòng trong một process, đẩy file lên object storage theo luồng và chủ động giảm tải khi thiếu RAM. Đây là bước phát triển từ bản Bun được mô tả trong CV trước đây.",
      "A shared listening experience has to work within operational limits. The backend keeps room state in one process, streams files to object storage, and sheds work under memory pressure. This evolves the earlier Bun version described in my previous CV.",
    ),
    takeaway: copy(
      "Kết nối trải nghiệm phía người nghe với những lựa chọn phía sau: giao tiếp thời gian thực, lưu trữ và triển khai.",
      "Connects a listener-facing experience to decisions about real-time communication, storage, and deployment.",
    ),
    stack: ["Next.js", "Go", "Rust", "WebSocket", "Cloudflare R2", "LiveKit"],
    path: ["React / Web Audio", "Go / WebSocket", "Rust / S3 / R2"],
    demo: "https://beatsync.zney295.id.vn/",
    source: "https://github.com/psy-zney/beatsync",
    note: copy(
      "Phát triển dựa trên dự án mã nguồn mở của freeman-jiang; repo giữ giấy phép MIT và ghi nhận tác giả gốc.",
      "Developed from freeman-jiang’s open-source project; the repository retains the MIT license and original attribution.",
    ),
  },
  {
    id: "sentinellan",
    name: "SentinelLAN",
    category: "systems",
    color: "#8ccbc0",
    year: "2026",
    role: copy(
      "Đồ án tốt nghiệp · Phát triển hệ thống",
      "Graduation project · System development",
    ),
    headline: copy(
      "Nhìn toàn cảnh mạng. Hiểu từng thiết bị.",
      "See the network. Understand each endpoint.",
    ),
    summary: copy(
      "Hệ thống quản lý thiết bị trong mạng LAN, nối dashboard, API và Windows Agent bằng phân quyền và dữ liệu thời gian thực.",
      "A LAN endpoint management system connecting a dashboard, API, and Windows agent through scoped access and real-time state.",
    ),
    problem: copy(
      "Quản lý nhiều máy trong một tổ chức đòi hỏi biết thiết bị nào đang online, ai được phép thao tác và điều gì đã xảy ra. Những thông tin đó phải luôn gắn với đúng tổ chức và đúng vai trò.",
      "Managing an organization’s computers means knowing which devices are online, who can act on them, and what happened. Every view and action needs the correct organization and role scope.",
    ),
    contributions: [
      copy(
        "Xây dựng dashboard Next.js, API ASP.NET Core và Windows Agent với PostgreSQL; cập nhật trạng thái thiết bị qua SignalR.",
        "Built a Next.js dashboard, ASP.NET Core API, and Windows agent with PostgreSQL and SignalR device updates.",
      ),
      copy(
        "Triển khai enrollment một lần, heartbeat, phân quyền Admin/Technician/Employee/Agent và cô lập dữ liệu theo tenant.",
        "Implemented one-time enrollment, heartbeats, Admin/Technician/Employee/Agent roles, and tenant data isolation.",
      ),
      copy(
        "Thiết kế lệnh có chữ ký HMAC, thời hạn, nonce và audit trail; bảo vệ danh tính agent bằng DPAPI và hỗ trợ hàng đợi offline.",
        "Designed commands with HMAC signatures, expiry, nonces, and audit trails, with DPAPI-protected agent identity and an offline queue.",
      ),
    ],
    decision: copy(
      "Đặt quy tắc nghiệp vụ trong Domain và Application, để API, cơ sở dữ liệu và Agent giao tiếp qua ranh giới rõ ràng. Trong MVP, khóa và cô lập mạng mặc định là mô phỏng; việc theo dõi tập trung vào telemetry kỹ thuật đã công bố.",
      "Keep business rules in Domain and Application, with clear boundaries around the API, database, and agent. Lock and isolation actions default to simulations in the MVP; monitoring focuses on disclosed technical telemetry.",
    ),
    takeaway: copy(
      "Bước mở rộng từ điều khiển một PC đến quản lý nhiều thiết bị: quyền truy cập, khả năng truy vết và ranh giới dữ liệu trở thành phần cốt lõi của thiết kế.",
      "A step from controlling one PC to managing many endpoints: access, traceability, and data boundaries become central design concerns.",
    ),
    stack: [
      "Next.js",
      "C#",
      "ASP.NET Core",
      "PostgreSQL",
      "SignalR",
      "Windows Agent",
    ],
    path: ["Next.js dashboard", "ASP.NET Core / SignalR", "Windows Agent"],
    source: "https://github.com/psy-zney/SentinelLAN",
  },
  {
    id: "study-cabin",
    name: "Study Cabin",
    category: "web",
    color: "#b7cba1",
    year: "2026",
    role: copy(
      "Dự án cá nhân · Công cụ học tập",
      "Personal project · Learning tool",
    ),
    headline: copy(
      "Học hôm nay. Nhớ lại vào ngày mai.",
      "Learn today. Come back remembering.",
    ),
    summary: copy(
      "Biến việc tự học TOEIC thành một vòng lặp: học mẫu câu, ôn đến hạn, luyện Part 5 và theo dõi tiến độ.",
      "A personal TOEIC study loop: learn patterns, review due items, practice Part 5, and follow progress.",
    ),
    problem: copy(
      "Một công cụ học tập cần biết hôm nay nên học gì và phần nào cần ôn lại. Cập nhật nội dung không được làm mất lịch ôn hay những lần làm bài trước đó.",
      "A study tool needs to surface what to learn today and what is due for review. Content updates must preserve review schedules and earlier attempts.",
    ),
    contributions: [
      copy(
        "Xây dựng hành trình Today → Learn → Review → Practice → Progress với nội dung mẫu câu, cụm từ và thì.",
        "Built a Today → Learn → Review → Practice → Progress journey around patterns, phrases, and tenses.",
      ),
      copy(
        "Tổ chức lưu trữ SQLite/Prisma và seed theo khóa ổn định, giữ trạng thái ôn tập khi nội dung được cập nhật.",
        "Organized SQLite/Prisma persistence and stable-key seeding that preserves review state during content updates.",
      ),
      copy(
        "Tách frontend trên Vercel khỏi backend tự host; tích hợp Ollama như phần hỗ trợ tùy chọn cho công cụ từ vựng.",
        "Separated a Vercel frontend from a self-hosted backend, with optional Ollama enrichment for vocabulary tools.",
      ),
    ],
    decision: copy(
      "Đáp án luyện tập và lịch ôn dùng logic xác định; AI là phần bổ sung. Khi Ollama không chạy, vòng lặp học chính vẫn sử dụng được. Nội dung bị loại khỏi bộ học được lưu trữ thay vì xóa lịch sử.",
      "Practice answers and review scheduling use deterministic logic; AI adds optional enrichment. The core study loop works without Ollama. Retired content is archived so its history can be preserved.",
    ),
    takeaway: copy(
      "Thiết kế quanh thói quen sử dụng lâu dài: tiến độ của người học quan trọng như nội dung của một buổi học.",
      "Designs for a recurring habit: the learner’s accumulated progress matters as much as a single lesson.",
    ),
    stack: ["Next.js", "TypeScript", "Prisma", "SQLite", "Ollama"],
    path: ["Study / review UI", "Learning logic", "Prisma / SQLite"],
    demo: "https://study.zney295.id.vn",
    source: "https://github.com/psy-zney/LearningEnglish",
  },
  {
    id: "backup-data",
    name: "Zney Backup",
    category: "systems",
    color: "#b6bcdd",
    year: "2026",
    role: copy(
      "Desktop developer · Công cụ Windows",
      "Desktop developer · Windows utility",
    ),
    headline: copy(
      "Cài lại Windows. Giữ lại những điều cần thiết.",
      "A fresh Windows install. A familiar workspace.",
    ),
    summary: copy(
      "Ứng dụng WPF đóng gói dữ liệu và cấu hình được chọn vào file .zney, với kiểm tra trước khi khôi phục.",
      "A WPF utility that packages selected data and configuration into .zney backups, with validation before restoration.",
    ),
    problem: copy(
      "Sau khi cài lại Windows, cài ứng dụng chỉ là một phần việc. Cấu hình và dữ liệu quen thuộc cũng cần được phục hồi, với lựa chọn rõ ràng về thứ sẽ được ghi lại lên máy.",
      "After reinstalling Windows, reinstalling apps is only part of the work. Familiar settings and data also need restoration, with clear choices about what will be written to the machine.",
    ),
    contributions: [
      copy(
        "Xây dựng ứng dụng C#/.NET WPF với luồng xuất và nhập gói .zney, danh sách chọn dữ liệu và bộ cài MSI.",
        "Built a C#/.NET WPF application with .zney export/import flows, data selection, and an MSI installer.",
      ),
      copy(
        "Quét ứng dụng từ shortcut và Registry; đọc dữ liệu theo luồng khi tạo backup, có giới hạn thời gian cho winget.",
        "Scanned shortcuts and the Registry for apps, streamed data during backup creation, and bounded winget execution time.",
      ),
      copy(
        "Kiểm tra đường dẫn và SHA-256, đưa dữ liệu vào vùng tạm trước khi thay file đích; tách luồng khôi phục Winget, Steam và ứng dụng thủ công.",
        "Validated paths and SHA-256 hashes, staged data before replacing destination files, and separated Winget, Steam, and manual restore workflows.",
      ),
    ],
    decision: copy(
      "Kiểm tra toàn bộ nhóm dữ liệu được chọn trước khi ghi đè. File backup là dữ liệu để đọc và xác minh; ứng dụng không chạy script từ gói backup. Giao diện yêu cầu người dùng chọn rõ những gì cần khôi phục.",
      "Verify the selected data group before overwriting files. A backup is data to read and validate; the application does not execute scripts from the package. The interface requires an explicit restoration selection.",
    ),
    takeaway: copy(
      "Trải nghiệm đáng tin bắt đầu từ những chi tiết ít thấy: giới hạn quét, xác minh dữ liệu và thứ tự thực hiện thao tác.",
      "A trustworthy experience depends on quiet details: bounded scans, data verification, and the order of operations.",
    ),
    stack: ["C#", ".NET", "WPF", "SHA-256", "Windows", "MSI"],
    path: ["Select / export", "Manifest / SHA-256", "Verify / restore"],
    source: "https://github.com/psy-zney/BackupData",
  },
  {
    id: "cloud-pos",
    name: "Cloud POS",
    category: "web",
    color: "#e6be87",
    year: "2026",
    role: copy(
      "Full-stack developer · Dự án nhóm",
      "Full-stack developer · Team project",
    ),
    headline: copy(
      "Một đơn hàng phải đúng, từ giỏ hàng đến tồn kho.",
      "From a cart to an order you can trust.",
    ),
    summary: copy(
      "Đóng góp vào hệ thống bán hàng đa doanh nghiệp, với trọng tâm là thanh toán, tồn kho và tính nhất quán dữ liệu.",
      "Contributing to a multi-tenant point-of-sale platform through checkout, inventory tracking, and database fixes.",
    ),
    problem: copy(
      "Trong hệ thống bán hàng, giỏ hàng, phương thức thanh toán và biến động tồn kho phải nối thành một luồng nhất quán. Các lỗi truy vấn hoặc migration ảnh hưởng trực tiếp đến luồng sử dụng này.",
      "In a point-of-sale system, carts, payment methods, and inventory movements must form a coherent flow. Query and migration failures directly affect that workflow.",
    ),
    contributions: [
      copy(
        "Xây dựng luồng checkout và thanh toán, lưu giỏ hàng và thay đổi giao diện theo phương thức thanh toán.",
        "Built checkout and payment flows, including cart persistence and payment-method-dependent UI.",
      ),
      copy(
        "Triển khai theo dõi biến động tồn kho và sửa lỗi MySQL prepared statement trong truy vấn danh sách tồn kho.",
        "Implemented inventory movement tracking and fixed a MySQL prepared-statement error in the inventory list query.",
      ),
      copy(
        "Sửa lỗi migration liên quan đến khóa ngoại và tương thích MySQL trong dự án nhóm triển khai trên AWS.",
        "Resolved foreign-key and MySQL compatibility issues in migrations for the team project deployed on AWS.",
      ),
    ],
    decision: copy(
      "Đi theo luồng nghiệp vụ xuyên suốt frontend, API và cơ sở dữ liệu. Phần đóng góp tập trung vào checkout, tồn kho và sửa lỗi dữ liệu trong một hệ thống được xây dựng cùng nhóm.",
      "Follow the business flow across the frontend, API, and database. My contribution focuses on checkout, inventory, and data fixes within a system built with a team.",
    ),
    takeaway: copy(
      "Thể hiện khả năng làm việc trong codebase chung và theo một vấn đề qua nhiều lớp của ứng dụng.",
      "Shows work within a shared codebase and the ability to follow a problem through multiple application layers.",
    ),
    stack: ["React", "Node.js", "Express", "MySQL", "AWS EC2 / RDS", "JWT"],
    path: ["Checkout UI", "Express API", "MySQL / AWS"],
    demo: "https://pos.zney295.id.vn/",
  },
  {
    id: "security-core",
    name: "Security Core",
    category: "systems",
    color: "#a9d8c6",
    year: "01 — 03 / 2026",
    role: copy(
      "Phát triển hệ thống & ứng dụng",
      "System & application developer",
    ),
    headline: copy(
      "Khoảng cách giữa một chiếc điện thoại và chiếc PC.",
      "Bridging a phone and a distant PC.",
    ),
    summary: copy(
      "Bốn module phối hợp để điều khiển bảo mật PC từ mobile, kể cả khi kết nối bị gián đoạn.",
      "Four cooperating modules for remote PC security, with command validation and interrupted connections in mind.",
    ),
    problem: copy(
      "Điều khiển PC từ xa đòi hỏi nhiều hơn việc gửi lệnh. Hệ thống cần ghép cặp thiết bị, kiểm tra tính hợp lệ của lệnh và xử lý trường hợp PC không có kết nối.",
      "Remote PC control requires more than sending a command. Devices need pairing, commands need validation, and the system must handle an offline PC.",
    ),
    contributions: [
      copy(
        "Thiết kế Rust service, ứng dụng desktop Tauri/React, mobile React Native/Expo và cloud relay Node.js/Socket.IO.",
        "Designed a Rust service, Tauri/React desktop app, React Native/Expo mobile app, and Node.js/Socket.IO cloud relay.",
      ),
      copy(
        "Triển khai lệnh có chữ ký HMAC và thời hạn để chống phát lại; ghép cặp bằng QR và xác nhận OTP cho thao tác nhạy cảm.",
        "Implemented signed, time-limited HMAC commands against replay, QR pairing, and OTP confirmation for sensitive actions.",
      ),
      copy(
        "Xây dựng hàng đợi tối đa 50 lệnh khi PC offline, cùng thao tác khóa PC, chặn USB và chụp webcam.",
        "Built a relay queue of up to 50 commands for offline PCs, plus PC lock, USB blocking, and webcam capture actions.",
      ),
    ],
    decision: copy(
      "Tách giao diện điều khiển, relay và service đặc quyền thành các module riêng. Lệnh đi qua cơ chế kiểm tra chữ ký và thời hạn; hàng đợi trên relay xử lý lúc PC chưa kết nối.",
      "Separate the control interface, relay, and privileged service. Commands have signature and expiry checks, while a relay queue handles periods when the PC is disconnected.",
    ),
    takeaway: copy(
      "Dẫn chứng cho tư duy hệ thống: ranh giới giữa các module, xác thực lệnh và trạng thái kết nối đều là một phần của trải nghiệm.",
      "Demonstrates systems thinking: module boundaries, command validation, and connection state all shape the experience.",
    ),
    stack: ["Rust", "Tauri", "React Native", "Expo", "Node.js", "Socket.IO"],
    path: ["Mobile / Desktop", "Cloud relay", "Rust service"],
    demo: "https://zney295.id.vn/Security/",
    source: "https://github.com/psy-zney/Security",
  },
  {
    id: "mandy-crimson",
    name: "Mandy Crimson",
    category: "web",
    color: "#e5a9b7",
    year: "2026",
    role: copy(
      "Frontend developer · Khách hàng nhỏ",
      "Frontend developer · Small business client",
    ),
    headline: copy(
      "Từ bảng tính lộn xộn đến nhãn hàng sẵn in.",
      "From spreadsheets to labels ready to print.",
    ),
    summary: copy(
      "Một công cụ phục vụ công việc cụ thể: đọc đơn hàng Excel và tạo nhãn nhận hàng, vận chuyển quốc tế.",
      "A focused business tool that turns Excel orders into pickup and international shipping labels.",
    ),
    problem: copy(
      "Dữ liệu đơn hàng đến từ bảng tính với tên cột tiếng Việt hoặc tiếng Anh. Nội dung sản phẩm dạng văn bản cần được chuyển thành cấu trúc trước khi tạo nhãn.",
      "Order spreadsheets use both English and Vietnamese headers. Raw product-line text must become structured items before it can be used on a label.",
    ),
    contributions: [
      copy(
        "Xây dựng luồng nhập Excel và nhận diện tiêu đề cột ở cả hai ngôn ngữ.",
        "Built Excel import with header matching across English and Vietnamese formats.",
      ),
      copy(
        "Phân tích văn bản sản phẩm thành các mục đơn hàng có cấu trúc, tạo nhãn và biên nhận có thể in.",
        "Parsed raw product text into structured order items and generated printable labels and receipts.",
      ),
      copy(
        "Triển khai công cụ dưới dạng website tĩnh cho một khách hàng kinh doanh nhỏ.",
        "Deployed the tool as a static website for a small business client.",
      ),
    ],
    decision: copy(
      "Đưa trọng tâm vào dữ liệu đầu vào và kết quả in. Một website tĩnh phù hợp với phạm vi công cụ: nhận file, xử lý nội dung và xuất nhãn.",
      "Focus on input data and printable output. A static website fits the tool’s scope: accept a file, process its content, and produce labels.",
    ),
    takeaway: copy(
      "Khả năng biến một công việc thường ngày thành một luồng thao tác rõ ràng, có đầu ra sử dụng được.",
      "Shows how an everyday business task can become a clear workflow with usable output.",
    ),
    stack: ["React", "TypeScript", "Vite", "xlsx"],
    path: ["Excel orders", "Parse / normalize", "Print labels"],
    demo: "https://zney295.id.vn/mandycrimson/",
    source: "https://github.com/psy-zney/mandycrimson",
  },
  {
    id: "luckyfood",
    name: "LuckyFood",
    category: "mobile",
    color: "#d5d89d",
    year: "04 — 05 / 2026",
    role: copy("Mobile developer", "Mobile developer"),
    headline: copy(
      "Hôm nay ăn gì? Bắt đầu từ nguyên liệu đang có.",
      "What’s for dinner? Start with what you have.",
    ),
    summary: copy(
      "Ứng dụng gợi ý món ăn, lọc theo nguyên liệu và chọn bữa ăn ngẫu nhiên, với lưu trữ cục bộ.",
      "A recipe app with ingredient filters, a daily meal picker, and local-first persistence.",
    ),
    problem: copy(
      "Chọn món ăn là một quyết định nhỏ lặp lại mỗi ngày. Ứng dụng cần giúp khám phá món và làm việc với dữ liệu cục bộ, đồng thời phân tách luồng quản trị và người dùng.",
      "Choosing a meal is a small, recurring decision. The app needs recipe discovery and local data, alongside separate admin and user flows.",
    ),
    contributions: [
      copy(
        "Xây dựng ứng dụng Expo/TypeScript với duyệt món, bộ lọc nguyên liệu và chọn món ngẫu nhiên.",
        "Built an Expo/TypeScript app with dish browsing, ingredient filters, and a randomized meal picker.",
      ),
      copy(
        "Thiết kế điều hướng theo vai trò bằng React Navigation và Zustand.",
        "Designed role-based navigation with React Navigation and Zustand.",
      ),
      copy(
        "Triển khai SQLite, tự khởi tạo dữ liệu, đăng nhập cục bộ, món yêu thích và lịch sử bữa ăn.",
        "Implemented SQLite persistence, automatic dataset seeding, local account authentication, favorites, and meal history.",
      ),
    ],
    decision: copy(
      "Dùng SQLite làm nền tảng lưu trữ offline-first; phân tách luồng Admin và User trong kiến trúc điều hướng.",
      "Use SQLite for offline-first persistence and separate Admin and User flows in the navigation architecture.",
    ),
    takeaway: copy(
      "Kết nối một nhu cầu gần gũi với kiến trúc mobile: điều hướng, trạng thái, xác thực và lưu trữ.",
      "Connects an everyday need to mobile architecture: navigation, state, authentication, and persistence.",
    ),
    stack: ["React Native", "Expo", "TypeScript", "Zustand", "SQLite"],
    path: ["Recipe discovery", "Role-based flows", "Local SQLite"],
    source: "https://github.com/psy-zney/LuckyFood",
    note: copy(
      "Tích hợp Google Sign-In đang tắt trong bản code hiện tại; luồng tài khoản cục bộ là phần được mô tả ở đây.",
      "Google Sign-In is disabled in the current code snapshot; the account flow described here is local authentication.",
    ),
  },
  {
    id: "chemistry-lab",
    name: "Chemistry Lab 3D",
    category: "creative",
    color: "#b6e0da",
    year: "2026",
    role: copy("Phát triển mô phỏng Unity", "Unity simulation developer"),
    headline: copy(
      "Học hóa học bằng cách bước vào phòng thí nghiệm.",
      "Learn chemistry by stepping inside the lab.",
    ),
    summary: copy(
      "Trò chơi desktop Unity/C# cho phép khám phá phòng lab 3D, chuẩn bị mẫu, quan sát phản ứng và học từ hệ quả an toàn.",
      "A native Unity/C# desktop simulation where players prepare samples, observe reactions, and learn through safety consequences.",
    ),
    problem: copy(
      "Một phương trình trên giấy chưa cho người học thấy điều kiện phản ứng, cách thao tác với dụng cụ hay rủi ro khi xử lý khí độc. Mô phỏng cần giữ kiến thức có cấu trúc mà vẫn tạo được trải nghiệm tương tác.",
      "An equation on paper cannot show reaction conditions, physical handling, or the consequences of hazardous gas. The simulation needs structured chemistry knowledge and meaningful interaction.",
    ),
    contributions: [
      copy(
        "Xây dựng phòng thí nghiệm góc nhìn thứ nhất với kệ hóa chất, khay chuẩn bị, bình phản ứng, tủ hút và giao diện Việt–Anh.",
        "Built a first-person laboratory with chemical shelves, preparation tray, reaction vessels, fume hood, and Vietnamese/English UI.",
      ),
      copy(
        "Tổ chức dữ liệu nguyên tố, hóa chất và phản ứng có chọn lọc; bổ sung ma trận tạo hợp chất và các quy tắc phản ứng động có kiểm soát.",
        "Structured element, chemical, and curated reaction data, then added a compound matrix and bounded dynamic reaction rules.",
      ),
      copy(
        "Gắn nhiệt độ, thể tích, nồng độ và thiết bị bảo hộ vào phản ứng; lưu sản phẩm đã tổng hợp để người chơi có thể dùng tiếp.",
        "Connected temperature, volume, concentration, and safety equipment to reactions, with persistent synthesized products for later use.",
      ),
    ],
    decision: copy(
      "Phản ứng đã biên soạn được ưu tiên trước; bộ quy tắc động chỉ mở rộng khi dữ liệu đủ tin cậy. Mẫu vật phải đặt lên khay cạnh bình trước khi nạp, để thao tác trong game có quan hệ rõ với diễn biến phản ứng. Đây là mô phỏng giáo dục, không phải hướng dẫn thí nghiệm ngoài đời.",
      "Curated reactions take priority; dynamic rules extend them only within defined bounds. A sample must be placed on the tray beside a vessel before loading it, making the action legible in the game. This is an educational simulation, not real-world lab guidance.",
    ),
    takeaway: copy(
      "Kết nối dữ liệu, thuật toán và tương tác 3D thành một hệ thống học qua trải nghiệm, với giới hạn an toàn được thể hiện ngay trong cách chơi.",
      "Brings data, algorithms, and 3D interaction into a learning experience, with safety constraints expressed through play.",
    ),
    stack: ["Unity 6", "C#", "3D", "Simulation", "Data-driven rules"],
    path: ["3D lab interaction", "Reaction rules", "Safety / inventory"],
    source: "https://github.com/psy-zney/chemistryLAB",
  },
  {
    id: "micro4nerds",
    name: "Micro4Nerds",
    category: "mobile",
    color: "#c0b6e3",
    year: "03 — 05 / 2026",
    role: copy("Android developer", "Android developer"),
    headline: copy(
      "Một góc nhỏ dành cho người yêu máy ảnh.",
      "A small corner for camera enthusiasts.",
    ),
    summary: copy(
      "Ứng dụng Android native cho máy ảnh và ống kính Micro Four Thirds, từ khám phá sản phẩm đến đặt hàng.",
      "A native Android shopping app for Micro Four Thirds cameras, lenses, and accessories.",
    ),
    problem: copy(
      "Hành trình mua sắm cần nối danh mục, giỏ hàng, thanh toán và lịch sử đơn. Dữ liệu cục bộ và dữ liệu từ Firebase cần có một cấu trúc truy cập thống nhất.",
      "A shopping journey connects browsing, cart, checkout, and order history. Local data and Firebase data need a consistent access structure.",
    ),
    contributions: [
      copy(
        "Xây dựng ứng dụng Java/Android theo MVVM, gồm danh mục, giỏ hàng, checkout và lịch sử đơn hàng.",
        "Built a Java/Android app with MVVM, product browsing, cart, checkout, and order history.",
      ),
      copy(
        "Áp dụng Repository pattern để phối hợp SQLite, SharedPreferences và Firebase Firestore/Auth/Storage.",
        "Used a Repository pattern to coordinate SQLite, SharedPreferences, and Firebase Firestore/Auth/Storage.",
      ),
      copy(
        "Tích hợp Firebase Authentication và Google Sign-In.",
        "Integrated Firebase Authentication and Google Sign-In.",
      ),
    ],
    decision: copy(
      "Đặt Repository giữa lớp giao diện và các nguồn dữ liệu, phối hợp bộ nhớ cục bộ với dịch vụ Firebase trong kiến trúc MVVM.",
      "Place a Repository between the UI and data sources, coordinating local storage and Firebase services within MVVM.",
    ),
    takeaway: copy(
      "Bổ sung góc nhìn native Android cho kinh nghiệm React Native, cùng cách tổ chức dữ liệu và luồng mua sắm.",
      "Adds native Android experience alongside React Native, with structured data access and shopping workflows.",
    ),
    stack: ["Java", "Android SDK", "MVVM", "Firebase", "SQLite"],
    path: ["Android UI", "ViewModel / Repository", "SQLite / Firebase"],
  },
];

export const capabilities = [
  {
    id: "interfaces",
    number: "01",
    title: copy("Giao diện có mục đích", "Interfaces with purpose"),
    description: copy(
      "Đưa quy trình thực tế vào giao diện: từ giỏ hàng và thanh toán đến xử lý đơn Excel và học tập hằng ngày.",
      "Turning real workflows into interfaces, from carts and checkout to Excel orders and daily study.",
    ),
    tools: ["React", "Next.js", "TypeScript"],
    projects: ["cloud-pos", "mandy-crimson", "study-cabin"],
  },
  {
    id: "systems",
    number: "02",
    title: copy("Các phần kết nối với nhau", "Systems that connect"),
    description: copy(
      "Thiết kế cách client, server và thiết bị trao đổi trạng thái, kể cả khi kết nối gián đoạn.",
      "Designing how clients, servers, and devices exchange state, including interrupted connections.",
    ),
    tools: ["Go", "Rust", "ASP.NET Core", "WebSocket"],
    projects: ["beatsync", "security-core", "sentinellan"],
  },
  {
    id: "mobile",
    number: "03",
    title: copy("Trải nghiệm trong tầm tay", "Experiences in your hands"),
    description: copy(
      "Xây dựng luồng mobile với điều hướng theo vai trò, lưu trữ cục bộ và tích hợp cloud.",
      "Building mobile flows with role-based navigation, local persistence, and cloud integration.",
    ),
    tools: ["React Native", "Expo", "Java", "SQLite"],
    projects: ["luckyfood", "micro4nerds", "security-core"],
  },
  {
    id: "simulation",
    number: "04",
    title: copy("Mô phỏng có quy tắc", "Simulation with rules"),
    description: copy(
      "Biến dữ liệu hóa học và luật phản ứng thành trải nghiệm 3D nơi thao tác của người chơi tạo ra kết quả có thể hiểu được.",
      "Turning chemistry data and reaction rules into a 3D experience where player actions lead to understandable outcomes.",
    ),
    tools: ["Unity", "C#", "3D", "Data modeling"],
    projects: ["chemistry-lab"],
  },
  {
    id: "delivery",
    number: "05",
    title: copy("Từ code đến sử dụng", "From code to use"),
    description: copy(
      "Làm việc với triển khai cloud, giới hạn bộ nhớ, đóng gói desktop và kiểm tra dữ liệu trước khi khôi phục.",
      "Working with cloud deployment, memory limits, desktop packaging, and data validation before restoration.",
    ),
    tools: ["AWS", "Cloudflare", "Docker", ".NET / WPF"],
    projects: ["cloud-pos", "beatsync", "backup-data"],
  },
];
