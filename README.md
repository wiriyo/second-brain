# 🧠 Second Brain ของพี่ทะเล

ระบบจัดการชีวิตแบบ Second Brain สร้างด้วย HTML/CSS/JS ล้วน ๆ
ใช้งานได้ผ่าน GitHub Pages ฟรี ไม่ต้อง server

## ฟีเจอร์
- 📥 **Inbox** — จดทุกอย่างก่อน จัดทีหลัง
- ✅ **Tasks** — จัดการงาน พร้อม Priority และ PARA
- 📂 **PARA** — Projects / Areas / Resources / Archive
- 🎯 **Habit Tracker** — ติ๊กทุกวัน + สะสมแต้ม
- 🎁 **Reward Shop** — แลกรางวัลด้วยแต้ม

## วิธี Deploy ขึ้น GitHub Pages

### 1. เตรียม GitHub Repository
```bash
cd second-brain
git init
git add .
git commit -m "Initial commit"
```

### 2. สร้าง repo ใหม่ใน GitHub
- ไปที่ GitHub → New repository
- ชื่อ repo: `second-brain` (หรือชื่อที่ต้องการ)
- Public เพื่อใช้ GitHub Pages ฟรี
- หลังสร้างแล้วจะได้ URL สำหรับ push

### 3. Push ขึ้น GitHub
```bash
git remote add origin https://github.com/[username]/second-brain.git
git branch -M main
git push -u origin main
```

### 4. เปิด GitHub Pages
- ไปที่ repo → Settings → Pages
- Source: Deploy from a branch
- Branch: main → / (root)
- กด Save → รอ 1-2 นาที
- เข้าใช้งานที่ `https://[username].github.io/second-brain/`

## 📊 Google Sheets Sync (Backup ข้อมูล)

ระบบรองรับ sync ข้อมูลไป Google Sheets เพื่อ backup:

### 1. Deploy Google Apps Script
1. ไปที่ [Google Apps Script](https://script.google.com/)
2. สร้าง New Project
3. Copy โค้ดจาก `AppScript.gs` วางลงใน Code.gs
4. File → Save → ตั้งชื่อ "Second Brain"
5. Deploy → New deployment → Gear icon → Web app
   - Description: "Second Brain API"
   - Execute as: **Me**
   - Who has access: **Anyone**
6. กด Deploy → Copy Web app URL
7. วาง URL ลงใน `js/app.js` บรรทัดที่ 2 (SHEET_URL)

### 2. การ Sync
- ข้อมูลจะ sync อัตโนมัติเมื่อ: เพิ่ม/แก้/ลบ Inbox, Tasks, Habits
- กดปุ่ม "☁️ โหลดจาก Sheets" เพื่อดึงข้อมูลล่าสุด
- ทำงานออฟไลน์ได้ (ใช้ localStorage)

## โครงสร้างไฟล์
```
second-brain/
├── index.html      # หน้าหลัก Dashboard
├── inbox.html      # Inbox
├── tasks.html      # Tasks
├── para.html       # PARA Method
├── habit.html      # Habit Tracker + Reward Shop
├── css/
│   └── style.css   # Styles ทั้งหมด
└── js/
    ├── app.js      # Shared state & utilities
    ├── inbox.js    # Inbox logic
    ├── tasks.js    # Tasks logic
    ├── habit.js    # Habit & Reward logic
    └── para.js     # PARA logic
```

ข้อมูลทั้งหมดเก็บใน **localStorage** ของ browser ค่ะ
