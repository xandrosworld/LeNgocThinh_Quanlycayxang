# ⛽ Quản Lý Cây Xăng - Gas Station Management

Phần mềm quản lý trạm xăng dầu hoàn chỉnh, giúp chủ trạm và nhân viên quản lý ca bán, công nợ, nhập hàng, tồn kho, chi phí, báo cáo doanh thu và lợi nhuận.

![Tech Stack](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-316192?logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?logo=tailwind-css)

---

## ✨ Tính năng

### 📊 Tổng quan (Dashboard)
- Bảng tổng hợp nhanh: doanh thu, sản lượng, công nợ
- Biểu đồ doanh thu theo ngày

### 📋 Chốt ca
- Nhập số đầu/cuối 4 vòi bơm (D1, E10, DS)
- Tự động tính doanh thu = (số cuối - số đầu) × đơn giá
- Ghi nhận: tiền mặt, chuyển khoản, doanh thu khác
- Quản lý công nợ phát sinh & khách trả nợ trong ca
- Chi phí trong ca

### 💰 Công nợ
- Danh sách khách hàng & nợ hiện tại
- Lịch sử giao dịch nợ (phát sinh / trả nợ)
- Hạn mức nợ từng khách

### 📦 Nhập hàng
- Phiếu nhập: ngày, mặt hàng, số lượng, đơn giá, nhà cung cấp
- Tự động cập nhật tồn bồn khi nhập
- Lịch sử nhập hàng

### ⛽ Tồn bồn
- 3 bồn chứa (D1, E10, DS) hiển thị trực quan
- Thanh mức nhiên liệu có animation
- Cảnh báo màu: xanh (an toàn), vàng (sắp hết), đỏ (nguy hiểm), cam (gần đầy)

### 💸 Chi phí
- Quản lý các khoản chi tiêu
- Lọc theo ngày
- Tổng chi phí tháng

### 📊 Báo cáo tháng
- KPI: doanh thu, sản lượng, công nợ, chi phí, lợi nhuận
- Biểu đồ đường: doanh thu theo ngày
- Biểu đồ cột: sản lượng theo mặt hàng
- Biểu đồ tròn: tỷ trọng doanh thu
- Top khách nợ nhiều

### 💰 Lợi nhuận
- Phân tích: Doanh thu → Giá vốn → Lợi nhuận gộp → Chi phí → Lợi nhuận ròng
- Biểu đồ xu hướng lợi nhuận theo ngày
- Chi tiết theo từng mặt hàng
- Chỉ Chủ trạm xem được

### 🤖 AI Nhanh
- Giao diện chat nhập lệnh tiếng Việt
- Xử lý local, không cần API key
- Hỗ trợ: trả nợ, thêm nợ, chi phí, nhập hàng, truy vấn
- Xác nhận trước khi thực thi

### ⚙️ Cài đặt
- Giá bán, giá nhập, chiết khấu từng mặt hàng
- Dung tích bồn chứa
- Hạn mức nợ mặc định

---

## 🛠️ Công nghệ

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3 |
| Charts | Chart.js + react-chartjs-2 |
| Database | PostgreSQL |
| ORM | Prisma 5 |
| Auth | iron-session |
| Toast | react-hot-toast |

---

## 🔑 Tài khoản Demo

| Vai trò | Username | Password | Quyền |
|---------|----------|----------|-------|
| Chủ trạm | `chu` | `123456` | Toàn quyền: dashboard, chốt ca, công nợ, nhập hàng, bồn, chi phí, báo cáo, lợi nhuận, AI, cài đặt |
| Nhân viên | `nhanvien` | `123456` | Chốt ca, chi phí |

---

## 🚀 Chạy Local

### Yêu cầu
- Node.js 18+
- PostgreSQL 14+
- npm hoặc yarn

### Các bước

```bash
# 1. Clone repo
git clone <repo-url>
cd gas-station-demo

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env
cp .env.example .env
# Sửa DATABASE_URL trong .env

# 4. Generate Prisma client
npm run db:generate

# 5. Push schema lên database
npm run db:push

# 6. Seed dữ liệu mẫu
npm run db:seed

# 7. Chạy dev server
npm run dev
```

Mở trình duyệt: [http://localhost:3000](http://localhost:3000)

---

## 🚂 Deploy lên Railway

### Bước 1: Tạo project trên Railway
1. Truy cập [railway.app](https://railway.app)
2. Tạo project mới → Add PostgreSQL database
3. Copy `DATABASE_URL` từ Variables tab

### Bước 2: Deploy app
1. Connect repo GitHub
2. Thêm environment variables:
   ```
   DATABASE_URL=postgresql://...
   SESSION_SECRET=<chuỗi-bí-mật-32-ký-tự>
   ```
3. Thêm build command (nếu cần):
   ```
   npx prisma generate && npx prisma db push && npm run build
   ```
4. Deploy!

### Bước 3: Seed dữ liệu
```bash
# Chạy seed qua Railway CLI
railway run npm run db:seed
```

---

## 📁 Cấu trúc dự án

```
gas-station-demo/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── src/
│   ├── app/
│   │   ├── globals.css        # Tailwind + custom styles
│   │   ├── layout.tsx         # Root layout
│   │   ├── api/
│   │   │   ├── imports/       # API nhập hàng
│   │   │   ├── tanks/         # API bồn chứa
│   │   │   ├── expenses/      # API chi phí
│   │   │   ├── reports/       # API báo cáo
│   │   │   ├── profit/        # API lợi nhuận
│   │   │   ├── ai/            # API AI (parse + execute)
│   │   │   └── settings/      # API cài đặt
│   │   └── (dashboard)/
│   │       ├── imports/       # Trang nhập hàng
│   │       ├── tanks/         # Trang tồn bồn
│   │       ├── expenses/      # Trang chi phí
│   │       ├── reports/       # Trang báo cáo
│   │       ├── profit/        # Trang lợi nhuận
│   │       ├── ai/            # Trang AI nhanh
│   │       └── settings/      # Trang cài đặt
│   └── lib/
│       ├── prisma.ts          # Prisma client singleton
│       ├── session.ts         # Session management
│       ├── format.ts          # Formatting utilities
│       ├── constants.ts       # App constants
│       └── ai-parser.ts       # Vietnamese NLP parser
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 📊 Database Schema

```
User ─── Shift ─── PumpReading
  │         │          │
  │         ├── Expense │
  │         │          │
  │         └── DebtTransaction ─── Customer
  │
  └── FuelImport ─── FuelType ─── Pump
                         │
                         └── Tank
```

---

## 🔮 Cải tiến tương lai

- [ ] Mobile app (React Native)
- [ ] Xuất báo cáo PDF/Excel
- [ ] Tích hợp SMS thông báo nợ
- [ ] Quét mã QR khách hàng
- [ ] Dashboard realtime (WebSocket)
- [ ] Multi-station support
- [ ] Tích hợp máy đo tự động
- [ ] Backup dữ liệu tự động
- [ ] Phân quyền chi tiết hơn
- [ ] API cho ứng dụng bên thứ ba

---

## 📝 License

MIT License - Sử dụng tự do cho mục đích thương mại và phi thương mại.

---

**Phát triển bởi** 🇻🇳 | Phiên bản 1.0.0
