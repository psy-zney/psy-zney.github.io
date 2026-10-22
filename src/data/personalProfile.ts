import { copy } from './portfolio';

export const personalProfile = {
  name: 'Lê Quang Khánh', alias: 'zney',
  role: copy('Phát triển web, backend và công cụ Windows', 'Web, backend & Windows development'),
  education: copy('Sinh viên Công nghệ thông tin · UEH', 'Information Technology student · UEH'),
  location: copy('TP. Hồ Chí Minh, Việt Nam', 'Ho Chi Minh City, Vietnam'),
  graduation: copy('Dự kiến tốt nghiệp 08/2027', 'Expected graduation · Aug 2027'),
  homeSummary: copy('Mình biến những công việc thường ngày thành phần mềm có thể sử dụng.', 'I turn everyday tasks into usable software.'),
  introduction: copy(
    'Mình kết nối giao diện web với dịch vụ backend và phần mềm Windows. Mình tập trung vào luồng sử dụng rõ ràng, phân quyền đúng và khả năng phục hồi khi kết nối hoặc thao tác dữ liệu gặp lỗi.',
    'I connect web interfaces to backend services and Windows software. I focus on clear user flows, scoped access and recovery when connections or data operations fail.'),
  experience: [
    {
      title: copy('Dự án cá nhân', 'Personal projects'),
      description: copy('Tự xây công cụ quản lý máy tính trong mạng và chuyển dữ liệu PC được chọn khi cài lại Windows.', 'Built tools to manage networked computers and move selected PC data when reinstalling Windows.'),
      href: '#/project/sentinellan',
      evidence: copy('SentinelLAN · Hệ thống quản lý thiết bị', 'SentinelLAN · Device management'),
    },
    {
      title: copy('Sản phẩm freelance', 'Freelance delivery'),
      description: copy('Bàn giao game phối đồ trên trình duyệt, tích hợp artwork theo lớp, điều khiển cảm ứng và lưu trang phục.', 'Delivered a browser dress-up game with layered artwork, touch controls and saved looks.'),
      href: 'https://github.com/psy-zney/-Fashion-Dress-up-Game',
      evidence: copy('GameDressUp · Mã nguồn sản phẩm', 'GameDressUp · Source code'),
    },
    {
      title: copy('Làm việc trong nhóm', 'Team development'),
      description: copy('Đóng góp checkout vào codebase Cloud POS của nhóm, nối lưu giỏ hàng, lựa chọn thanh toán và luồng hủy đơn.', 'Contributed checkout to a shared Cloud POS codebase, connecting cart persistence, payment choices and cancellation flows.'),
      href: '#/project/cloud-pos',
      evidence: copy('Cloud POS · Phạm vi đóng góp', 'Cloud POS · My contribution'),
    },
  ],
  deliveryNotes: [
    {
      project: 'backup-data',
      title: copy('Kiểm tra trước khi ghi dữ liệu', 'Validate before writing'),
      description: copy('Zney Backup kiểm tra đường dẫn và SHA-256, rồi đưa dữ liệu vào vùng tạm trước khi thay file đích.', 'Zney Backup checks archive paths and SHA-256, then stages data before replacing destination files.'),
    },
    {
      project: 'sentinellan',
      title: copy('Giới hạn quyền theo ngữ cảnh', 'Scope every action'),
      description: copy('SentinelLAN gắn quyền với tổ chức và vai trò, đồng thời lưu lịch sử thao tác trên thiết bị.', 'SentinelLAN scopes access by organization and role, with an audit trail for device actions.'),
    },
    {
      project: 'cloud-pos',
      title: copy('Chuẩn bị bản có thể sử dụng', 'Prepare a usable release'),
      description: copy('Đóng gói phần mềm Windows thành MSI qua CI; hỗ trợ triển khai AWS và sửa migration cho Cloud POS.', 'Package Windows software as MSI releases through CI; support AWS deployment and migration fixes for Cloud POS.'),
    },
  ],
  invitation: copy('Cùng biến một ý tưởng thành điều có thể sử dụng.', 'Let’s turn an idea into something people can use.'),
  email: 'lequangkhanh295@gmail.com', github: 'https://github.com/psy-zney', linkedin: 'https://www.linkedin.com/in/psy-zney295',
};
