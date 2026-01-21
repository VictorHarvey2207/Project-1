# Project-1
<<<<<<< HEAD
# Project-1
=======
# Hotel Management (Web-only)

Hệ thống quản lý khách sạn chạy theo mô hình **web-only**:

- **Backend**: C++ (cpp-httplib) cung cấp REST API và serve static files cho frontend
- **Frontend**: HTML/CSS/JS thuần, gọi API bằng `fetch`
- **Dữ liệu**: lưu ở các file JSON

## Cấu trúc thư mục

- `Backend/`:
  - `src/server_http.cpp`: web server (API + static)
  - `include/`, `src/*Management.*`: các module nghiệp vụ
  - `rooms.json`, `customers.json`, `reservations.json`, `invoices.json`: dữ liệu
  - `cmake-build/`: thư mục build (đã generate bởi CMake)
- `Frontend/`: giao diện web

> Ghi chú: `Backend/Crow/` là thư viện Crow được giữ lại trong workspace nhưng **không còn dùng** cho bản web-only (project hiện dùng cpp-httplib).

## Chạy nhanh (Windows)

### 1) Build backend

Cách dễ nhất là dùng build đã có sẵn trong `Backend/cmake-build`:

```powershell
cd "Backend\cmake-build"
cmake --build . --target server_http2
```

`server_http2` tồn tại để tránh lỗi Windows “.exe đang chạy bị lock” khi bạn rebuild.

### 2) Chạy server

```powershell
cd "Backend\cmake-build"
.\server_http2.exe
```

Mặc định server listen tại:

- `http://127.0.0.1:3001`

### 3) Mở giao diện

Mở trình duyệt và truy cập:

- `http://127.0.0.1:3001/`

Server sẽ redirect về `Dashboard.html`.

## API chính

Một vài endpoint tiêu biểu:

- Rooms: `GET /api/rooms`, `POST /api/rooms`, `DELETE /api/rooms/{roomId}`, `GET /api/rooms/sort/{asc|desc}`
- Customers: `GET /api/customers`, `POST /api/customers`, `DELETE /api/customers/{customerId}`
- Reservations: `GET /api/reservations`, `POST /api/reservations`, `PUT /api/reservations/{reservationId}`, `DELETE /api/reservations/{reservationId}`
- Checkout/Invoices: `POST /api/checkout`, `GET /api/invoices`, `POST /api/invoices/sync`, `POST /api/invoices/rebuild`
- Services: `GET /api/service/rooms`, `GET /api/service/rooms/{roomId}/services`, `POST /api/service/rooms/{roomId}/services`, `DELETE /api/service/rooms/{roomId}/services/{index}`
- Advanced: `POST /api/rooms/combination`

## Benchmark (tuỳ chọn)

Project có target `benchmark` để đo nhanh một số thuật toán (sort, unordered_map index/lookup, backtracking):

```powershell
cd "Backend\cmake-build"
cmake --build . --target benchmark
.\benchmark.exe --repeats 20
```

## Lưu ý thường gặp

- Nếu chạy `server_http2.exe` báo không listen được, thường là **port 3001 đang bị dùng**.
- Khi rebuild trên Windows, hãy tắt process `server_http2.exe` trước (file `.exe` đang chạy sẽ bị lock).
>>>>>>> c31dd36 (Initial commit: web-only hotel management system)
