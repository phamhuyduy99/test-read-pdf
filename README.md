# Test Read PDF

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Dự án: **Test Read PDF**

Branch hiện tại: `develop`

## Link chạy trực tiếp

[Truy cập ứng dụng tại đây](https://test-read-pdf-client.onrender.com/)


## Mục tiêu dự án

Dự án này là một ví dụ đầy đủ để:

* Sử dụng **React + TypeScript + Vite**.
* Tích hợp khả năng **đọc và hiển thị file PDF**.
* Hỗ trợ **upload PDF, hiển thị trang, điều hướng giữa các trang**.
* Dễ dàng mở rộng, thêm tính năng xử lý PDF hoặc kết nối backend.

## Cấu trúc thư mục

```
/test-read-pdf
├── mock-server/          # Server giả lập (mock API)
│   ├── pdfs/             # Chứa các file pdfs sample
│   ├── db.json           # Chứa data để mock
│   ├── server.ts         # Entry point server
│   └── package.json      # Cấu hình project mock-server
├── public/               # Tài nguyên tĩnh (favicon, hình ảnh, etc)
├── src/                  # Mã nguồn React + TypeScript
│   ├── components/       # Các component UI, ví dụ PdfViewerTrueFullWidth
│   ├── pages/            # Các trang chính của app
│   ├── constants/        # Chứa giá trị constant
│   ├── types/            # Chứa type
│   └── main.tsx          # Entry point React app
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tsconfig.json
└── vite.config.ts
```

### Chi tiết các thư mục chính

* **/mock-server**: chứa server giả lập các API để thử upload hoặc đọc dữ liệu PDF.

  * **pdfs/**: Các file pdf sample để hiển thị được tải từ trên mạng.
  * **db.json**: lưu trữ tạm thời dữ liệu để mock, dùng kết hợp với json-server.
  * **server.ts**: entry point chạy server mock.
  * **package.json**: quản lý các package dùng cho mock-server.

* **/src/components**: component như `PdfViewerTrueFullWidth` sẽ giúp render PDF, chuyển trang, phóng to/thu nhỏ.

* **/src/pages**: các trang chính, ví dụ trang upload PDF và trang xem PDF.

* **/src/constants**: chứa giá trị constant.

* **/src/types**: chứa type.


* Các file TypeScript config (`tsconfig.*.json`) và ESLint (`eslint.config.js`) để đảm bảo code chuẩn và không lỗi type.

## Yêu cầu trước khi chạy

* Node.js >= 16
* npm >= 8 hoặc yarn >= 1.22
* Kết nối internet để tải các package phụ thuộc

## Hướng dẫn chạy dự án

### 1. Clone repo và chuyển branch `develop`

```bash
git clone https://github.com/phamhuyduy99/test-read-pdf.git
cd test-read-pdf
git checkout develop
```

### 2. Cài đặt phụ thuộc

```bash
npm install
```

### 3. Chạy môi trường phát triển

```bash
npm run dev
```

* Mở trình duyệt vào địa chỉ mặc định: [http://localhost:5173](http://localhost:5173)
* Hỗ trợ **HMR (Hot Module Replacement)** để tự động reload khi thay đổi code.

### 4. Build cho production

```bash
npm run build
```

* Kết quả build sẽ nằm trong thư mục `dist/`
* Có thể deploy lên Vercel, Netlify hoặc server tĩnh.

### 5. Chạy mock-server

Nếu muốn sử dụng API giả lập:

```bash
cd mock-server
npm install
npm run server
```

* Server sẽ chạy trên cổng được định nghĩa trong `mock-server/package.json`
* Dùng để thử upload file PDF hoặc lấy dữ liệu mẫu.

## Sử dụng PDF Viewer


### Hiển thị PDF

* Component `PdfViewerTrueFullWidth` sẽ nhận file PDF từ server mock.
* Có thể **chuyển trang**, **phóng to/thu nhỏ**, **tìm kiếm file PDF**.
* Các props chính:

  * `initialDocumentId`: file PDF init
  * `onDocumentLoad`: callback khi load file PDF
  * `onPageChange`: callback khi đổi trang

### Ví dụ component

```tsx
   <PdfViewerTrueFullWidth
                initialDocumentId={"1"}
                onDocumentLoad={handleDocumentLoad}
                onPageChange={handlePageChange}
            />
```

## Cấu hình TypeScript & ESLint

* `tsconfig.app.json`: cho ứng dụng frontend
* `tsconfig.node.json`: cho mock-server hoặc backend
* `tsconfig.json`: cấu hình chung
* `eslint.config.js`: kiểm tra code React + TypeScript, có thể mở rộng rule theo ý muốn

## Gợi ý phát triển thêm

* Thêm chức năng **tìm kiếm từ trong PDF**.
* Hỗ trợ **chia sẻ link tới trang PDF cụ thể**.
* Lazy-load các trang PDF để tăng hiệu năng.
* Viết unit test / integration test với Jest + React Testing Library.
* CI/CD pipeline để tự động build và test.

## Đóng góp

* Mọi góp ý hoặc cải thiện vui lòng mở Pull Request hoặc Issue trên GitHub.
* Luôn dùng branch `develop` để phát triển các tính năng mới.

---

**Chúc bạn lập trình vui vẻ và phát triển thành công tính năng đọc PDF!**
