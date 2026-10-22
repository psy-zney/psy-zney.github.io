# Chuyển trạm và passage hiện hành

Yêu cầu mới của chủ repo ưu tiên các ghi chú trước. Tài liệu này chỉ ghi
quy tắc chuyển động đang dùng; không đóng băng thiết kế hoặc độ dài nội dung.

- Camera hành trình giữ trục XYZ khi chuyển trạm, không thêm xoắn/roll.
  Orbit của hệ hành tinh ở điểm đọc phụ thuộc scroll và đi ngược cùng tọa độ.
- Mobile framing/lens thay đổi theo viewport để chữ và hệ sao không đè nhau;
  không thay đường camera vật lý. Desktop có thể dùng các góc bố cục khác nhau.
- Continue đi qua từng điểm đọc. Menu cho phép đi thẳng theo lựa chọn rõ ràng.
  Từ position 5.30, tăng riêng wheel xuống gain 2.4; giữ reverse và đầu/cuối.
- Intro dùng GLB gốc và Galaxy. Kéo ngang xoay nền; Start chủ động vào Home,
  Escape hủy entry. Chưa có video hầm gốc được xác minh thì không dựng video giả.
- Contact → showcase là chuyển DOM dọc 1.65s. Ba preview dự án hiện thành
  cửa sổ trong đoạn dẫn; camera hành trình và góc nhìn hố đen giữ nguyên.
  Escape/wheel ngược/touch xuống retrace cùng progress; hidden tab không chạy bù.
- Reduced motion bỏ chuyển cảnh động và đi trực tiếp. Ảnh preview lỗi không
  được khóa hành trình; thông báo trạng thái theo request ảnh thật.
- Showcase dùng dải ngang phẳng, spring và một hành động chọn một dự án.
  Mobile dưới 1000px đọc dọc tự nhiên, nav nằm sau nội dung, không che nút.
  Swipe/wheel ngang hoặc nút đổi dự án. Desktop wheel dọc có thể chọn thế giới;
  sau biên 9/9, gesture kế tiếp xuống Contact. Back trở đúng Contact 6.
- Các đối chiếu hình cũ đã bị thay được loại khỏi baseline. Hình học/screen,
  nguyên liệu và visual mới có thể phát triển theo yêu cầu, kèm kiểm tra thật.
