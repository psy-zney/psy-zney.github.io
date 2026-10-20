import { copy } from './portfolio';

export const personalProfile = {
  name: 'Lê Quang Khánh', alias: 'zney',
  introduction: copy(
    'Mình xây dựng ứng dụng web, công cụ hệ thống và những trải nghiệm tương tác. Mỗi dự án bắt đầu từ một nhu cầu cụ thể, rồi được hoàn thiện qua thiết kế, lập trình và thử nghiệm.',
    'I build web applications, system tools and interactive experiences. Each project begins with a concrete need, then takes shape through design, code and testing.'),
  invitation: copy('Cùng biến một ý tưởng thành điều có thể sử dụng.', 'Let’s turn an idea into something people can use.'),
  email: 'lequangkhanh295@gmail.com', github: 'https://github.com/psy-zney', linkedin: 'https://www.linkedin.com/in/psy-zney295',
};
