# 📋 รายการไฟล์ที่เกี่ยวข้องกับชีท Bets

## 🎯 ไฟล์หลัก (ต้องอัปเดต)

### 1. **services/betting/betsSheetColumns.js** ✨ (ใหม่)
- **ที่มา:** Helper class สำหรับจัดการคอลัมน์ชีท Bets
- **ฟังก์ชันหลัก:**
  - `createRow(data)` - สร้างแถวข้อมูล
  - `parseRow(row)` - แปลงแถวเป็น object
  - `getColumn(row, columnKey)` - ดึงคอลัมน์เฉพาะ
  - `setColumn(row, columnKey, value)` - ตั้งค่าคอลัมน์
  - `logRow(row)` - พิมพ์ข้อมูลแถว
- **ใช้ใน:** bettingPairingService.js, priceRangeMatchingService.js

### 2. **services/betting/bettingPairingService.js** ✅ (อัปเดตแล้ว)
- **ที่มา:** บริการจัดการการเล่นและการจับคู่
- **ฟังก์ชันที่อัปเดต:**
  - `recordBet()` - บันทึกการเล่นใหม่ (ใช้ BetsSheetColumns)
  - `getAllBets()` - ดึงข้อมูลการเล่นทั้งหมด (ใช้ BetsSheetColumns)
  - `isValidDirectPair()` - ตรวจสอบการจับคู่ Direct (ใช้ sideCode)
  - `isValidDirectReplyPair()` - ตรวจสอบการจับคู่ Direct+Reply (ใช้ sideCode)
  - `isValidPriceRangePair()` - ตรวจสอบการจับคู่ Price Range (ใช้ sideCode)

### 3. **services/betting/priceRangeMatchingService.js** ✅ (อัปเดตแล้ว)
- **ที่มา:** บริการจับคู่อัตโนมัติตามช่วงราคา
- **ฟังก์ชันที่อัปเดต:**
  - `recordToGoogleSheets()` - บันทึกการจับคู่ลงชีท (ใช้ BetsSheetColumns)
  - `isValidPriceRangePair()` - ตรวจสอบการจับคู่ (ใช้ sideCode)

### 4. **services/betting/bettingRoundController.js** ✅ (อัปเดตแล้ว)
- **ที่มา:** ควบคุมการจัดการรอบการเล่น
- **ฟังก์ชันที่อัปเดต:**
  - `handleMessage()` - ส่ง userId และ groupId ให้ recordToGoogleSheets()

---

## 📊 ไฟล์ที่ดึงข้อมูลชีท Bets

### 1. **routes/betting-webhook.js**
- **ฟังก์ชัน:** ดึงข้อมูลการเล่นทั้งหมด
- **ใช้:** `bettingPairingService.getAllBets()`
- **ต้องอัปเดต:** ✅ (ใช้ helper แล้ว)

### 2. **services/betting/bettingMatchingService.js**
- **ฟังก์ชัน:** จับคู่การเล่นและหักเงิน
- **ใช้:** `isValidDirectReplyPair()`, `isValidPriceRangePair()`, `isValidDirectPair()`
- **ต้องอัปเดต:** ✅ (ใช้ helper แล้ว)

### 3. **services/betting/autoMatchingService.js**
- **ฟังก์ชัน:** จับคู่อัตโนมัติ
- **ใช้:** `sheets.spreadsheets.values.get()` โดยตรง
- **ต้องอัปเดต:** ⚠️ (ควรใช้ helper)

### 4. **services/betting/bettingResultService.js**
- **ฟังก์ชัน:** บันทึกผลลัพธ์
- **ใช้:** ไม่ได้ใช้ชีท Bets โดยตรง
- **ต้องอัปเดต:** ❌ (ไม่จำเป็น)

---

## 🔧 ไฟล์ที่บันทึกข้อมูลชีท Bets

### 1. **services/betting/bettingPairingService.js** ✅
- `recordBet()` - บันทึกการเล่นใหม่

### 2. **services/betting/priceRangeMatchingService.js** ✅
- `recordToGoogleSheets()` - บันทึกการจับคู่

### 3. **services/betting/slipRecordingService.js**
- `recordSlip()` - บันทึกสลิป (ใช้ชีท Slips ไม่ใช่ Bets)
- **ต้องอัปเดต:** ❌ (ไม่เกี่ยวข้อง)

---

## 📝 ไฟล์ที่ตรวจสอบโครงสร้างชีท Bets

### 1. **check-bets-sheet-structure.js**
- **ที่มา:** ตรวจสอบโครงสร้างชีท Bets
- **ใช้:** `sheets.spreadsheets.values.get()`
- **ต้องอัปเดต:** ❌ (ใช้สำหรับ debug เท่านั้น)

### 2. **check-current-sheet-structure.js** ✨ (ใหม่)
- **ที่มา:** ตรวจสอบโครงสร้างชีท Bets ปัจจุบัน
- **ใช้:** `sheets.spreadsheets.values.get()`
- **ต้องอัปเดต:** ❌ (ใช้สำหรับ debug เท่านั้น)

### 3. **update-bets-sheet-headers-thai.js**
- **ที่มา:** อัปเดตชื่อคอลัมน์ชีท Bets
- **ใช้:** `sheets.spreadsheets.values.update()`
- **ต้องอัปเดต:** ❌ (ใช้สำหรับ setup เท่านั้น)

### 4. **update-bets-sheet-headers-clear.js**
- **ที่มา:** ล้างชื่อคอลัมน์ชีท Bets
- **ใช้:** `sheets.spreadsheets.values.update()`
- **ต้องอัปเดต:** ❌ (ใช้สำหรับ setup เท่านั้น)

---

## 🔍 ไฟล์ที่ต้องอัปเดตต่อไป

### 1. **services/betting/autoMatchingService.js** ⚠️
- **ปัญหา:** ใช้ `sheets.spreadsheets.values.get()` โดยตรง
- **แก้ไข:** ใช้ `BetsSheetColumns.parseRow()` แทน
- **ลำดับความสำคัญ:** สูง

### 2. **services/betting/bettingResultService.js** ⚠️
- **ปัญหา:** ต้องอัปเดตผลลัพธ์ในชีท Bets
- **แก้ไข:** ใช้ `BetsSheetColumns.setColumn()` แทน
- **ลำดับความสำคัญ:** สูง

### 3. **services/betting/balanceUpdateService.js** ⚠️
- **ปัญหา:** ใช้ชีท UsersBalance ไม่ใช่ Bets
- **แก้ไข:** สร้าง helper สำหรับ UsersBalance
- **ลำดับความสำคัญ:** ต่ำ

---

## 📊 สรุปสถานะการอัปเดต

| ไฟล์ | สถานะ | หมายเหตุ |
|-----|-------|---------|
| betsSheetColumns.js | ✅ ใหม่ | Helper class สำหรับจัดการคอลัมน์ |
| bettingPairingService.js | ✅ อัปเดต | ใช้ helper แล้ว |
| priceRangeMatchingService.js | ✅ อัปเดต | ใช้ helper แล้ว |
| bettingRoundController.js | ✅ อัปเดต | ส่ง userId และ groupId แล้ว |
| autoMatchingService.js | ⚠️ ต้องอัปเดต | ควรใช้ helper |
| bettingResultService.js | ⚠️ ต้องอัปเดต | ควรใช้ helper |
| balanceUpdateService.js | ⚠️ ต้องอัปเดต | ใช้ชีท UsersBalance |
| routes/betting-webhook.js | ✅ ใช้ helper | ดึงข้อมูลแล้ว |
| bettingMatchingService.js | ✅ ใช้ helper | ตรวจสอบการจับคู่แล้ว |

---

## 🚀 ขั้นตอนถัดไป

1. ✅ สร้าง helper class `BetsSheetColumns`
2. ✅ อัปเดต `bettingPairingService.js`
3. ✅ อัปเดต `priceRangeMatchingService.js`
4. ✅ อัปเดต `bettingRoundController.js`
5. ⏳ อัปเดต `autoMatchingService.js`
6. ⏳ อัปเดต `bettingResultService.js`
7. ⏳ ทดสอบการบันทึกและดึงข้อมูล
8. ⏳ ตรวจสอบว่าข้อมูลถูกบันทึกในคอลัมน์ที่ถูกต้อง
