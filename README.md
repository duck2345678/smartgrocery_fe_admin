# 💻 SmartGrocery Admin Dashboard

Chào mừng bạn đến với **SmartGrocery Admin Dashboard** – Trang quản trị web tập trung tối ưu dành cho Quản trị viên (Admin) và Quản lý cấp cao. Hệ thống được xây dựng trên nền tảng **React**, **TypeScript** và **Vite** mang lại tốc độ phản hồi cực nhanh, hiệu năng vượt trội và giao diện trực quan đỉnh cao.

---

## 🎨 1. Thiết kế & Trải nghiệm giao diện cao cấp
* **Phong cách hiện đại:** Tối ưu hóa UI/UX với cấu trúc bố cục rõ ràng, điều hướng Sidebar mượt mà.
* **Biểu đồ trực quan:** Dashboard thống kê doanh thu, đơn hàng và các chỉ số vận hành thời gian thực.
* **Bảo vệ chặt chẽ:** Tích hợp xác thực phân quyền nghiêm ngặt, hỗ trợ Device Fingerprint ngăn chặn truy cập trái phép.

---

## 🌟 2. Các tính năng quản lý cốt lõi

### 📊 1. Bảng điều khiển tổng quan (Dashboard)
* Thống kê trực quan doanh thu tổng, số lượng đơn hàng cần xử lý, đơn hàng hoàn tất.
* Biểu đồ tăng trưởng và cảnh báo hàng tồn kho sắp hết.

### 👤 2. Quản lý tài khoản người dùng (Account Management)
* Hiển thị danh sách toàn bộ người dùng trong hệ thống (Khách hàng, Nhân viên, Quản trị viên) kèm theo bộ lọc thông minh (Vai trò, Trạng thái, Ngày tạo).
* Hỗ trợ đầy đủ các thao tác:
  * Thêm mới tài khoản Nhân viên / Admin.
  * Chỉnh sửa thông tin cá nhân.
  * Khóa tài khoản (Ban/Unban) có yêu cầu nhập lý do chi tiết.
  * Xóa mềm tài khoản (Soft Delete) kèm lý do để bảo toàn lịch sử dữ liệu.

### 📦 3. Quản lý danh mục & Sản phẩm (Catalog & Inventory)
* Quản lý thông tin sản phẩm, danh mục, và các biến thể sản phẩm (SKUs).
* Cập nhật nhanh số lượng tồn kho, giá bán thực tế và trạng thái hiển thị (ACTIVE, HIDDEN, DELETED).

### 🎫 4. Quản lý khuyến mại & Giảm giá (Voucher & Discount)
* Thiết lập các chiến dịch giảm giá, quản lý mã Voucher và phát hành ưu đãi mua sắm.

### 📥 5. Phiếu nhập hàng & Cài đặt hệ thống
* Ghi nhận và theo dõi các đợt nhập hàng kho, quản lý nhà cung cấp.
* Cấu hình các thông số vận hành của hệ thống bán hàng.

---

## 🛠️ 3. Thiết lập & Khởi chạy

### Bước 1: Yêu cầu hệ thống
* Cài đặt **Node.js** (Phiên bản v18 hoặc v20 khuyến nghị).

### Bước 2: Tạo tệp cấu hình `.env` (Tùy chọn)
Mặc định trang quản trị sẽ kết nối đến Backend Spring Boot chạy tại `http://localhost:8080`. Nếu bạn muốn thay đổi cấu hình cổng hoặc địa chỉ IP, tạo tệp `.env` tại thư mục gốc của phân hệ `smartgrocery_fe_admin/`:

```properties
VITE_API_URL=http://localhost:8080
```

### Bước 3: Khởi chạy dự án
1. **Cài đặt thư viện phụ thuộc:**
   ```bash
   npm install
   ```
2. **Khởi chạy môi trường phát triển (Dev Mode):**
   ```bash
   npm run dev
   ```
   * *Ứng dụng sẽ khả dụng tại địa chỉ:* `http://localhost:5173`

---

## 📁 4. Cấu trúc thư mục ứng dụng
```text
smartgrocery_fe_admin/
├── src/
│   ├── api/           # Module giao tiếp API gửi yêu cầu lên Backend (apiClient.ts, users.ts...)
│   ├── components/    # Các UI components cao cấp (Sidebar, Header, Table, Dialog, v.v.)
│   ├── pages/         # Các màn hình chính (Dashboard, AccountManagement, Products, Vouchers, Settings)
│   ├── store/         # Quản lý trạng thái xác thực và phiên làm việc (authStore.ts)
│   ├── utils/         # Hàm tiện ích xử lý định dạng tiền tệ, ngày tháng, Device Fingerprint
│   └── main.tsx       # Tệp khởi tạo chính của ứng dụng
├── index.html         # Trang gốc HTML5
├── tailwind.config.js # Cấu hình TailwindCSS cho giao diện
└── vite.config.ts     # Cấu hình đóng gói ứng dụng bằng Vite
```
