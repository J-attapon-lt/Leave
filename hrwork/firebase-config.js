// Firebase config สำหรับ HR-018 Leave Web App
// วิธีใช้:
// 1) ไปที่ Firebase Console > Project settings > Your apps > Web app
// 2) คัดลอก firebaseConfig มาแทนค่าด้านล่าง
// 3) เปิด Firestore Database และตั้ง Rules ตาม README.md

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ชื่อ collection ใน Firestore
export const FIREBASE_COLLECTION = "hr018_leave_requests";

// true = ใช้ Firebase เป็นฐานข้อมูลหลัก
// false = ใช้ LocalStorage ชั่วคราวสำหรับทดสอบหน้าเว็บ
export const USE_FIREBASE = true;
