# LINE Account Migration Summary

## วัตถุประสงค์
ปรับให้ Account 1 & 2 ใช้สำหรับการแจ้งเตือนทั้งหมด (ตรวจสอบข้อมูลการเล่น + แจ้งเตือนยอดเงิน + ประกาศผล + สรุปยอดแทง) โดยลบการใช้ Account 3

## การเปลี่ยนแปลง

### 1. LineNotificationService (`services/line/lineNotificationService.js`)
- ยังคงรองรับ Account 1, 2, 3 เหมือนเดิม
- ไม่มีการเปลี่ยนแปลง (ยังคงใช้ได้กับทั้ง 3 Account)

### 2. BalanceCheckService (`services/betting/balanceCheckService.js`)
**ก่อน:**
```javascript
this.lineNotificationServices = {
  1: new LineNotificationService(1),
  2: new LineNotificationService(2),
  3: new LineNotificationService(3),
};
```

**หลัง:**
```javascript
this.lineNotificationServices = {
  1: new LineNotificationService(1),
  2: new LineNotificationService(2),
};
```

**ฟังก์ชัน:**
- `notifyInsufficientBalance()` - เพิ่ม parameter `accountNumber` (default = 1)
- `checkAndNotify()` - เพิ่ม parameter `accountNumber` (default = 1)

### 3. BettingResultService (`services/betting/bettingResultService.js`)
**ก่อน:**
```javascript
this.lineNotificationService = new LineNotificationService();
```

**หลัง:**
```javascript
this.lineNotificationServices = {
  1: new LineNotificationService(1),
  2: new LineNotificationService(2),
};
```

**ฟังก์ชัน:**
- `notifyLineResult()` - เพิ่ม parameter `accountNumber` (default = 1)

### 4. ResultSettlementService (`services/betting/resultSettlementService.js`)
**ฟังก์ชัน:**
- `settleResult()` - เพิ่ม parameter `accountNumber` (default = 1)
- `notifyResults()` - เพิ่ม parameter `accountNumber` (default = 1)

### 5. BettingRoundController (`services/betting/bettingRoundController.js`)
**การเรียกใช้:**
- `checkAndNotify()` - เพิ่ม parameter `1` (Account 1)
- `notifyLineResult()` - เพิ่ม parameter `1` (Account 1)

## Environment Variables (.env)
ยังคงใช้ 3 Account ทั้งหมด:
- `LINE_CHANNEL_ACCESS_TOKEN` - Account 1
- `LINE_CHANNEL_ACCESS_TOKEN_2` - Account 2
- `LINE_CHANNEL_ACCESS_TOKEN_3` - Account 3 (ไม่ใช้แล้ว)

## การใช้งาน

### ส่งข้อความแจ้งเตือนยอดเงินไม่พอ
```javascript
// ใช้ Account 1 (default)
await balanceCheckService.checkAndNotify(lineName, amount, userId);

// หรือระบุ Account 2
await balanceCheckService.checkAndNotify(lineName, amount, userId, 2);
```

### ส่งข้อความประกาศผลแพ้ชนะ
```javascript
// ใช้ Account 1 (default)
await bettingResultService.notifyLineResult(result, slipName, score, groupId);

// หรือระบุ Account 2
await bettingResultService.notifyLineResult(result, slipName, score, groupId, 2);
```

### สรุปผลการเล่น
```javascript
// ใช้ Account 1 (default)
await resultSettlementService.settleResult(announcementText, allBets, groupId);

// หรือระบุ Account 2
await resultSettlementService.settleResult(announcementText, allBets, groupId, 2);
```

## หมายเหตุ
- ทุกฟังก์ชันมี default value `accountNumber = 1` ดังนั้นหากไม่ระบุจะใช้ Account 1 โดยอัตโนมัติ
- Account 3 ยังคงมี token ใน .env แต่ไม่ถูกใช้งานแล้ว
- สามารถเปลี่ยนเป็น Account 2 ได้ตามต้องการโดยส่ง parameter `2`
