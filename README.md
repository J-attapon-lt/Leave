# HR-018 ระบบใบลาออนไลน์

เว็บแอปแบบ Static สำหรับกรอกและพิมพ์ใบลา อ้างอิงฟอร์ม HR-018 ใบลากิจ ลาป่วย ลาคลอด ลาพักผ่อน

## ไฟล์หลัก

- `index.html` หน้าเว็บหลัก
- `styles.css` รูปแบบหน้าจอและแบบพิมพ์
- `app.js` ระบบบันทึก/แก้ไข/ลบ/ค้นหา/Export
- `.github/workflows/deploy-pages.yml` GitHub Actions สำหรับ Deploy ไป GitHub Pages
- `.nojekyll` ป้องกัน GitHub Pages แปลงไฟล์ด้วย Jekyll

## วิธีใช้งานบนเครื่อง

1. เปิด `index.html` ด้วย Chrome / Edge
2. กรอกข้อมูลในเมนู `สร้างใบลา`
3. กด `บันทึกใบลา`
4. ไปที่ `แบบฟอร์มพิมพ์` แล้วกด `พิมพ์ / Save PDF`

## Deploy GitHub Pages

### วิธีที่ 1: Upload ผ่านหน้าเว็บ GitHub

1. สร้าง Repository ใหม่ เช่น `hr-leave-webapp`
2. Upload ไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น Repository
3. ไปที่ `Settings` > `Pages`
4. Source เลือก `GitHub Actions`
5. ไปที่แท็บ `Actions` แล้วรอ Workflow `Deploy static site to GitHub Pages` ทำงานเสร็จ
6. เปิด URL ที่ GitHub Pages แสดงให้

### วิธีที่ 2: ใช้ Git command

```bash
git init
git branch -M main
git add .
git commit -m "Deploy HR-018 leave web app"
git remote add origin https://github.com/YOUR_USERNAME/hr-leave-webapp.git
git push -u origin main
```

จากนั้นไปที่ `Settings` > `Pages` แล้วเลือก Source เป็น `GitHub Actions`

## ความสามารถ

- บันทึกใบลาในเครื่องด้วย LocalStorage
- ค้นหา แก้ไข ลบ คัดลอกใบลา
- Export ข้อมูลเป็น JSON และ CSV
- คำนวณสถิติการลาในปีงบประมาณแบบอัตโนมัติจากรายการที่บันทึกไว้
- พิมพ์เป็นฟอร์ม A4 ตามโครงเอกสาร HR-018

## หมายเหตุ

ข้อมูลจะถูกเก็บใน Browser เครื่องที่เปิดใช้งานเท่านั้น ถ้าต้องการใช้หลายเครื่องหรือมี Login/Role/Database ควรต่อ Backend เพิ่ม เช่น Laravel, Flask, Node.js หรือ Next.js + MySQL/PostgreSQL
