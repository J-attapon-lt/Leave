# HR-018 ระบบใบลาออนไลน์ + Firebase Firestore

เว็บแอปใบลา HR-018 สำหรับกรอกข้อมูลใบลา บันทึกลง Firebase Firestore และพิมพ์ฟอร์มให้เหมือนเอกสาร HR-018 โดยใช้ภาพเทมเพลตจาก PDF เป็นต้นแบบ

## ไฟล์สำคัญ

- `index.html` หน้าเว็บหลัก
- `app.js` logic ของระบบ + เชื่อม Firestore
- `firebase-config.js` ตั้งค่า Firebase Project
- `styles.css` หน้าตาเว็บและหน้าพิมพ์
- `assets/hr018-template.png` ภาพพื้นหลังฟอร์ม HR-018 สำหรับพิมพ์
- `.github/workflows/deploy-pages.yml` deploy ผ่าน GitHub Pages

## วิธีตั้งค่า Firebase

1. เข้า Firebase Console
2. Create project หรือเลือก project เดิม
3. ไปที่ Build > Firestore Database
4. กด Create database
5. เลือก Start in test mode สำหรับทดสอบ หรือ Production mode แล้วใส่ Rules ตามหัวข้อด้านล่าง
6. ไปที่ Project settings > Your apps > Web app
7. คัดลอกค่า `firebaseConfig`
8. เปิดไฟล์ `firebase-config.js` แล้วแทนค่าตัวอย่างทั้งหมด

ตัวอย่าง:

```js
export const firebaseConfig = {
  apiKey: "xxxx",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Firestore Collection

ค่าเริ่มต้นใช้ collection:

```txt
hr018_leave_requests
```

เปลี่ยนได้ในไฟล์ `firebase-config.js`:

```js
export const FIREBASE_COLLECTION = "hr018_leave_requests";
```

## Firestore Rules สำหรับทดสอบ

> ใช้เฉพาะตอนทดสอบภายในเท่านั้น เพราะใครที่เปิดเว็บได้จะอ่าน/เขียนข้อมูลได้

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /hr018_leave_requests/{docId} {
      allow read, write: if true;
    }
  }
}
```

## Rules แบบล็อกอินเท่านั้น

ถ้าต้องการใช้จริงในองค์กร แนะนำเพิ่ม Firebase Authentication แล้วใช้ Rules แบบนี้:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /hr018_leave_requests/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Deploy GitHub Pages

1. อัปโหลดไฟล์ทั้งหมดขึ้น GitHub repo
2. ไปที่ Settings > Pages
3. Source เลือก GitHub Actions
4. ไปแท็บ Actions แล้วรอ workflow ทำงานเสร็จ
5. เปิด URL ที่ GitHub Pages แสดงให้

## วิธีพิมพ์ให้ตรงแบบฟอร์ม

- Paper: A4
- Scale: 100%
- Margins: None / ไม่มีขอบ
- Background graphics: เปิด
- Headers and footers: ปิด

## นำเข้าข้อมูลเก่าจาก LocalStorage

ถ้าเคยใช้เวอร์ชันเดิมที่เก็บข้อมูลในเครื่อง ให้กดปุ่ม `Import Local` หลังจากตั้งค่า Firebase แล้ว ระบบจะนำข้อมูลเดิมเข้า Firestore


## Print fine tune update
ค่าเริ่มต้นหน้า Print ถูกปรับเป็น x=-18, y=-14, font=3 เพื่อให้ข้อความใกล้เส้นประมากขึ้นจากภาพทดสอบล่าสุด และเปลี่ยน key calibration เป็น v3 เพื่อไม่ติด cache ค่าเดิมใน browser.
