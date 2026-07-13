
# 🌍 ChillTrip - Smart Tourism Platform

## Giới thiệu

ChillTrip là hệ thống quản lý và vận hành du lịch thông minh được phát triển trong quá trình thực tập tốt nghiệp.

Hệ thống hỗ trợ doanh nghiệp quản lý tour, khách hàng, nhà cung cấp và các hoạt động vận hành. Đồng thời tích hợp AI Chatbot hỗ trợ tư vấn, giúp nâng cao trải nghiệm người dùng.

---

## Công nghệ sử dụng

- Next.js
- TypeScript
- Ant Design
- RESTful API
- SQL Server
- Firebase
- OpenAI API

---

# Hướng dẫn cài đặt

## 1. Clone dự án

```bash
git clone https://github.com/maiphun1412/TTTN_ChillTrip_DuLichThongMinh.git
```

Di chuyển vào thư mục dự án:

```bash
cd TTTN_ChillTrip_DuLichThongMinh
```

---

## 2. Cài đặt Backend

Mở Terminal:

```bash
cd backend
```

Cài đặt thư viện:

```bash
npm install
```

Khởi chạy Backend:

```bash
npx next dev -p 3001
```

Backend mặc định chạy tại:

```
http://localhost:3001
```

---

## 3. Cài đặt Frontend

Mở Terminal mới:

```bash
cd frontend
```

Cài đặt thư viện:

```bash
npm install
```

Khởi chạy Frontend:

```bash
npm run dev
```

Frontend mặc định chạy tại:

```
http://localhost:3000
```

---

## 4. Cấu hình hệ thống

Trước khi chạy dự án, cần cấu hình các biến môi trường phù hợp:

- SQL Server
- Firebase
- OpenAI API
- Các biến trong `.env` hoặc `.env.local`

---

## Cấu trúc dự án

```text
TTTN_ChillTrip_DuLichThongMinh
│
├── backend/
│
├── frontend/
│
└── README.md
```

---

## Lưu ý

- Khởi động **Backend** trước, sau đó mới chạy **Frontend**.
- Đảm bảo SQL Server và các dịch vụ cần thiết đã được cấu hình trước khi chạy hệ thống.
- Nếu thay đổi cấu hình môi trường, hãy khởi động lại ứng dụng.

Theo mình, bản này là vừa đẹp nhất:

Không quá dài.
Có đầy đủ phần giới thiệu, công nghệ, hướng dẫn cài đặt, cách chạy Backend/Frontend.
Phù hợp để đưa lên GitHub cho đồ án tốt nghiệp.
xuấ file

README.md 

--- bỏ bớt cái này và sửa lại redme 1 cách hoàn thiện nhất, như viết báo cáo á chứ ko phải lag 1 redme thông thường, đầy đủ cách cài đặt, cách chạy be và fe

Đã làm lại README theo dạng tài liệu hướng dẫn đầy đủ hơn, giảm bớt các dấu phân cách và khối code không cần thiết.

README.md 

Library
/
README.md
# CHILLTRIP – NỀN TẢNG KẾT NỐI VÀ VẬN HÀNH DU LỊCH THÔNG MINH

## 1. Giới thiệu dự án

ChillTrip là hệ thống hỗ trợ kết nối khách hàng với doanh nghiệp du lịch, đồng thời phục vụ quản lý và vận hành các hoạt động liên quan đến tour trên môi trường số.

Hệ thống được xây dựng theo mô hình gồm hai phần chính:

- **Frontend:** giao diện dành cho khách hàng, nhân viên, hướng dẫn viên và quản trị viên.
- **Backend:** cung cấp API, xử lý nghiệp vụ và kết nối cơ sở dữ liệu.

Ngoài các chức năng quản lý tour, khách hàng, lịch khởi hành, booking và vận hành, hệ thống còn tích hợp AI Chatbot để hỗ trợ tư vấn và nâng cao trải nghiệm người dùng.

## 2. Chức năng chính

- Đăng ký, đăng nhập và quản lý tài khoản.
- Tìm kiếm, xem thông tin và đặt tour.
- Quản lý booking, lịch khởi hành và khách hàng.
- Quản lý tour, khuyến mãi, người dùng và phân quyền.
- Hỗ trợ hướng dẫn viên theo dõi lịch trình và báo cáo chuyến đi.
- Tích hợp AI Chatbot hỗ trợ tư vấn.
- Kết nối RESTful API và đồng bộ dữ liệu giữa các phân hệ.

## 3. Công nghệ sử dụng

- Next.js
- TypeScript
- Ant Design
- RESTful API
- SQL Server
- Firebase
- OpenAI API
- Git
- Visual Studio Code
- Postman

## 4. Yêu cầu trước khi cài đặt

Trước khi chạy dự án, máy tính cần cài đặt:

- **Node.js** phiên bản 18 trở lên.
- **npm** đi kèm với Node.js.
- **Git** để tải mã nguồn.
- **Visual Studio Code** hoặc trình soạn thảo tương đương.
- **SQL Server** và công cụ quản lý cơ sở dữ liệu.
- Trình duyệt web như Google Chrome hoặc Microsoft Edge.
- Kết nối Internet để sử dụng Firebase và OpenAI API.

Kiểm tra phiên bản Node.js và npm:

    node -v
    npm -v

## 5. Tải mã nguồn

Mở Terminal hoặc PowerShell và chạy:

    git clone https://github.com/maiphun1412/TTTN_ChillTrip_DuLichThongMinh.git

Di chuyển vào thư mục dự án:

    cd TTTN_ChillTrip_DuLichThongMinh

Cấu trúc chính của dự án:

    TTTN_ChillTrip_DuLichThongMinh
    ├── backend
    ├── frontend
    └── README.md

## 6. Cấu hình môi trường

Trước khi chạy hệ thống, cần tạo và cấu hình các file môi trường theo cấu trúc của dự án.

### 6.1. Backend

Tạo file `.env` hoặc `.env.local` trong thư mục `backend` nếu dự án yêu cầu.

Các nhóm thông tin thường cần cấu hình:

- Chuỗi kết nối SQL Server.
- Thông tin kết nối cơ sở dữ liệu.
- Khóa API OpenAI.
- Cấu hình Firebase.
- Các khóa bí mật và biến môi trường khác của hệ thống.

### 6.2. Frontend

Tạo file `.env.local` trong thư mục `frontend` nếu dự án yêu cầu.

Cần kiểm tra địa chỉ API của backend. Backend của dự án chạy tại:

    http://localhost:3001

Không đưa file `.env` hoặc `.env.local` lên GitHub vì các file này có thể chứa tài khoản, mật khẩu hoặc API Key.

## 7. Cài đặt và chạy Backend

Mở Terminal thứ nhất tại thư mục gốc của dự án.

Di chuyển vào thư mục backend:

    cd backend

Cài đặt toàn bộ thư viện:

    npm install

Khởi chạy backend tại cổng 3001:

    npx next dev -p 3001

Sau khi chạy thành công, backend hoạt động tại:

    http://localhost:3001

Giữ nguyên Terminal này trong suốt quá trình sử dụng hệ thống.

## 8. Cài đặt và chạy Frontend

Mở một Terminal mới tại thư mục gốc của dự án.

Di chuyển vào thư mục frontend:

    cd frontend

Cài đặt toàn bộ thư viện:

    npm install

Khởi chạy frontend:

    npm run dev

Frontend thường hoạt động tại:

    http://localhost:3000

Mở trình duyệt và truy cập địa chỉ trên để sử dụng hệ thống.

## 9. Thứ tự chạy hệ thống

Để hệ thống hoạt động đúng, thực hiện theo thứ tự:

1. Khởi động SQL Server và kiểm tra cơ sở dữ liệu.
2. Kiểm tra các file cấu hình môi trường.
3. Chạy backend bằng lệnh `npx next dev -p 3001`.
4. Mở Terminal mới và chạy frontend bằng lệnh `npm run dev`.
5. Truy cập `http://localhost:3000`.
6. Kiểm tra kết nối API giữa frontend và backend.

## 10. Kiểm tra sau khi cài đặt

Sau khi hệ thống khởi động, cần kiểm tra:

- Trang chủ hiển thị bình thường.
- Chức năng đăng ký và đăng nhập hoạt động.
- Danh sách tour được tải từ hệ thống.
- Có thể xem chi tiết tour và thực hiện đặt tour.
- Các trang quản lý tải được dữ liệu.
- Frontend gọi được API từ backend tại cổng 3001.
- AI Chatbot phản hồi khi đã cấu hình OpenAI API.
- Firebase hoạt động khi đã cấu hình đúng thông tin kết nối.

## 11. Một số lỗi thường gặp

### 11.1. Lỗi thiếu thư viện

Chạy lại trong đúng thư mục backend hoặc frontend:

    npm install

### 11.2. Cổng 3000 hoặc 3001 đang được sử dụng

Tắt tiến trình đang chiếm cổng hoặc đổi sang cổng khác.

Backend có thể chạy bằng cổng khác:

    npx next dev -p 3002

Khi đổi cổng backend, cần cập nhật lại địa chỉ API ở frontend.

### 11.3. Không kết nối được cơ sở dữ liệu

Kiểm tra:

- SQL Server đã khởi động chưa.
- Tên máy chủ, tên cơ sở dữ liệu, tài khoản và mật khẩu.
- Chuỗi kết nối trong file môi trường.
- Quyền truy cập của tài khoản cơ sở dữ liệu.

### 11.4. Frontend không gọi được Backend

Kiểm tra:

- Backend có đang chạy tại `http://localhost:3001` không.
- Địa chỉ API trong frontend có đúng không.
- Terminal backend có xuất hiện lỗi không.
- Cấu hình CORS hoặc rewrite của dự án.

### 11.5. AI Chatbot không phản hồi

Kiểm tra:

- OpenAI API Key đã được cấu hình đúng chưa.
- Tài khoản OpenAI còn hạn mức sử dụng không.
- Tên biến môi trường có đúng với mã nguồn không.
- Backend có đọc được biến môi trường không.

### 11.6. Firebase không hoạt động

Kiểm tra:

- Thông tin cấu hình Firebase.
- Quyền truy cập Realtime Database hoặc Storage.
- Rules của Firebase.
- Kết nối Internet.

## 12. Lưu ý khi sử dụng

- Không chia sẻ API Key, mật khẩu cơ sở dữ liệu hoặc file môi trường.
- Không đưa thư mục `node_modules`, `.next`, `.env` và `.env.local` lên GitHub.
- Khi thay đổi file môi trường, cần dừng và chạy lại dự án.
- Backend và frontend phải chạy đồng thời để hệ thống hoạt động đầy đủ.
- Nên sử dụng đúng phiên bản Node.js được dự án hỗ trợ để hạn chế lỗi thư viện.

Library
/
README.md
# CHILLTRIP – NỀN TẢNG KẾT NỐI VÀ VẬN HÀNH DU LỊCH THÔNG MINH

## 1. Giới thiệu dự án

ChillTrip là hệ thống hỗ trợ kết nối khách hàng với doanh nghiệp du lịch, đồng thời phục vụ quản lý và vận hành các hoạt động liên quan đến tour trên môi trường số.

Hệ thống được xây dựng theo mô hình gồm hai phần chính:

- **Frontend:** giao diện dành cho khách hàng, nhân viên, hướng dẫn viên và quản trị viên.
- **Backend:** cung cấp API, xử lý nghiệp vụ và kết nối cơ sở dữ liệu.

Ngoài các chức năng quản lý tour, khách hàng, lịch khởi hành, booking và vận hành, hệ thống còn tích hợp AI Chatbot để hỗ trợ tư vấn và nâng cao trải nghiệm người dùng.

## 2. Chức năng chính

- Đăng ký, đăng nhập và quản lý tài khoản.
- Tìm kiếm, xem thông tin và đặt tour.
- Quản lý booking, lịch khởi hành và khách hàng.
- Quản lý tour, khuyến mãi, người dùng và phân quyền.
- Hỗ trợ hướng dẫn viên theo dõi lịch trình và báo cáo chuyến đi.
- Tích hợp AI Chatbot hỗ trợ tư vấn.
- Kết nối RESTful API và đồng bộ dữ liệu giữa các phân hệ.

## 3. Công nghệ sử dụng

- Next.js
- TypeScript
- Ant Design
- RESTful API
- SQL Server
- Firebase
- OpenAI API
- Git
- Visual Studio Code
- Postman

## 4. Yêu cầu trước khi cài đặt

Trước khi chạy dự án, máy tính cần cài đặt:

- **Node.js** phiên bản 18 trở lên.
- **npm** đi kèm với Node.js.
- **Git** để tải mã nguồn.
- **Visual Studio Code** hoặc trình soạn thảo tương đương.
- **SQL Server** và công cụ quản lý cơ sở dữ liệu.
- Trình duyệt web như Google Chrome hoặc Microsoft Edge.
- Kết nối Internet để sử dụng Firebase và OpenAI API.

Kiểm tra phiên bản Node.js và npm:

    node -v
    npm -v

## 5. Tải mã nguồn

Mở Terminal hoặc PowerShell và chạy:

    git clone https://github.com/maiphun1412/TTTN_ChillTrip_DuLichThongMinh.git

Di chuyển vào thư mục dự án:

    cd TTTN_ChillTrip_DuLichThongMinh

Cấu trúc chính của dự án:

    TTTN_ChillTrip_DuLichThongMinh
    ├── backend
    ├── frontend
    └── README.md

## 6. Cấu hình môi trường

Trước khi chạy hệ thống, cần tạo và cấu hình các file môi trường theo cấu trúc của dự án.

### 6.1. Backend

Tạo file `.env` hoặc `.env.local` trong thư mục `backend` nếu dự án yêu cầu.

Các nhóm thông tin thường cần cấu hình:

- Chuỗi kết nối SQL Server.
- Thông tin kết nối cơ sở dữ liệu.
- Khóa API OpenAI.
- Cấu hình Firebase.
- Các khóa bí mật và biến môi trường khác của hệ thống.

### 6.2. Frontend

Tạo file `.env.local` trong thư mục `frontend` nếu dự án yêu cầu.

Cần kiểm tra địa chỉ API của backend. Backend của dự án chạy tại:

    http://localhost:3001

Không đưa file `.env` hoặc `.env.local` lên GitHub vì các file này có thể chứa tài khoản, mật khẩu hoặc API Key.

## 7. Cài đặt và chạy Backend

Mở Terminal thứ nhất tại thư mục gốc của dự án.

Di chuyển vào thư mục backend:

    cd backend

Cài đặt toàn bộ thư viện:

    npm install

Khởi chạy backend tại cổng 3001:

    npx next dev -p 3001

Sau khi chạy thành công, backend hoạt động tại:

    http://localhost:3001

Giữ nguyên Terminal này trong suốt quá trình sử dụng hệ thống.

## 8. Cài đặt và chạy Frontend

Mở một Terminal mới tại thư mục gốc của dự án.

Di chuyển vào thư mục frontend:

    cd frontend

Cài đặt toàn bộ thư viện:

    npm install

Khởi chạy frontend:

    npm run dev

Frontend thường hoạt động tại:

    http://localhost:3000

Mở trình duyệt và truy cập địa chỉ trên để sử dụng hệ thống.

## 9. Thứ tự chạy hệ thống

Để hệ thống hoạt động đúng, thực hiện theo thứ tự:

1. Khởi động SQL Server và kiểm tra cơ sở dữ liệu.
2. Kiểm tra các file cấu hình môi trường.
3. Chạy backend bằng lệnh `npx next dev -p 3001`.
4. Mở Terminal mới và chạy frontend bằng lệnh `npm run dev`.
5. Truy cập `http://localhost:3000`.
6. Kiểm tra kết nối API giữa frontend và backend.

## 10. Kiểm tra sau khi cài đặt

Sau khi hệ thống khởi động, cần kiểm tra:

- Trang chủ hiển thị bình thường.
- Chức năng đăng ký và đăng nhập hoạt động.
- Danh sách tour được tải từ hệ thống.
- Có thể xem chi tiết tour và thực hiện đặt tour.
- Các trang quản lý tải được dữ liệu.
- Frontend gọi được API từ backend tại cổng 3001.
- AI Chatbot phản hồi khi đã cấu hình OpenAI API.
- Firebase hoạt động khi đã cấu hình đúng thông tin kết nối.

## 11. Một số lỗi thường gặp

### 11.1. Lỗi thiếu thư viện

Chạy lại trong đúng thư mục backend hoặc frontend:

    npm install

### 11.2. Cổng 3000 hoặc 3001 đang được sử dụng

Tắt tiến trình đang chiếm cổng hoặc đổi sang cổng khác.

Backend có thể chạy bằng cổng khác:

    npx next dev -p 3002

Khi đổi cổng backend, cần cập nhật lại địa chỉ API ở frontend.

### 11.3. Không kết nối được cơ sở dữ liệu

Kiểm tra:

- SQL Server đã khởi động chưa.
- Tên máy chủ, tên cơ sở dữ liệu, tài khoản và mật khẩu.
- Chuỗi kết nối trong file môi trường.
- Quyền truy cập của tài khoản cơ sở dữ liệu.

### 11.4. Frontend không gọi được Backend

Kiểm tra:

- Backend có đang chạy tại `http://localhost:3001` không.
- Địa chỉ API trong frontend có đúng không.
- Terminal backend có xuất hiện lỗi không.
- Cấu hình CORS hoặc rewrite của dự án.

### 11.5. AI Chatbot không phản hồi

Kiểm tra:

- OpenAI API Key đã được cấu hình đúng chưa.
- Tài khoản OpenAI còn hạn mức sử dụng không.
- Tên biến môi trường có đúng với mã nguồn không.
- Backend có đọc được biến môi trường không.

### 11.6. Firebase không hoạt động

Kiểm tra:

- Thông tin cấu hình Firebase.
- Quyền truy cập Realtime Database hoặc Storage.
- Rules của Firebase.
- Kết nối Internet.

## 12. Lưu ý khi sử dụng

- Không chia sẻ API Key, mật khẩu cơ sở dữ liệu hoặc file môi trường.
- Không đưa thư mục `node_modules`, `.next`, `.env` và `.env.local` lên GitHub.
- Khi thay đổi file môi trường, cần dừng và chạy lại dự án.
- Backend và frontend phải chạy đồng thời để hệ thống hoạt động đầy đủ.
- Nên sử dụng đúng phiên bản Node.js được dự án hỗ trợ để hạn chế lỗi thư viện.