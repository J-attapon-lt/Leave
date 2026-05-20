// Firebase config สำหรับ HR-018 Leave Web App
// วิธีใช้:
// 1) ไปที่ Firebase Console > Project settings > Your apps > Web app
// 2) คัดลอก firebaseConfig มาแทนค่าด้านล่าง
// 3) เปิด Firestore Database และตั้ง Rules ตาม README.md

export const firebaseConfig = {
 apiKey: "AIzaSyDN1Ie5kk6UVaCb-K-Jd-k1IaPoSBfMPbc",
  authDomain: "leave-request-management-e1787.firebaseapp.com",
  projectId: "leave-request-management-e1787",
  storageBucket: "leave-request-management-e1787.firebasestorage.app",
  messagingSenderId: "335076271474",
  appId: "1:335076271474:web:72e8bb73c907d5cdcaa9eb"
};

// ชื่อ collection ใน Firestore
export const FIREBASE_COLLECTION = "hr018_leave_requests";

// true = ใช้ Firebase เป็นฐานข้อมูลหลัก
// false = ใช้ LocalStorage ชั่วคราวสำหรับทดสอบหน้าเว็บ
export const USE_FIREBASE = true;
