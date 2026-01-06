/**
 * Rich Menu Configuration
 * ตั้งค่า Rich Menu สำหรับ 5 ปุ่มหลัก
 */

export const RICH_MENU_CONFIG = {
  size: {
    width: 2400,
    height: 1620,
  },
  selected: true,
  name: 'Betting Bot Menu',
  areas: [
    // Row 1: เปิดรับแทง
    {
      bounds: {
        x: 0,
        y: 0,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: 'เปิดรับแทง',
        data: 'action=open_betting',
        displayText: 'เปิดรับแทง',
      },
    },
    // Row 1: ส่งลิงค์ห้องแข่ง
    {
      bounds: {
        x: 800,
        y: 0,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: 'ส่งลิงค์ห้องแข่ง',
        data: 'action=send_room',
        displayText: 'ส่งลิงค์ห้องแข่ง',
      },
    },
    // Row 1: สรุปยอดแทง
    {
      bounds: {
        x: 1600,
        y: 0,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: 'สรุปยอดแทง',
        data: 'action=summary',
        displayText: 'สรุปยอดแทง',
      },
    },
    // Row 2: ส่งลิงค์การโอนเงิน
    {
      bounds: {
        x: 0,
        y: 810,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: 'ส่งลิงค์การโอนเงิน',
        data: 'action=send_payment_link',
        displayText: 'ส่งลิงค์การโอนเงิน',
      },
    },
    // Row 2: สรุปผลแข่ง
    {
      bounds: {
        x: 800,
        y: 810,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: 'สรุปผลแข่ง',
        data: 'action=announce_results',
        displayText: 'สรุปผลแข่ง',
      },
    },
    // Row 2: รายงานการแข่งขัน
    {
      bounds: {
        x: 1600,
        y: 810,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: 'รายงานการแข่งขัน',
        data: 'action=report',
        displayText: 'รายงานการแข่งขัน',
      },
    },
  ],
};

/**
 * Alternative Rich Menu with 5 buttons in single row (if needed)
 */
export const RICH_MENU_CONFIG_SINGLE_ROW = {
  size: {
    width: 2400,
    height: 810,
  },
  selected: true,
  name: 'Betting Bot Menu',
  areas: [
    {
      bounds: {
        x: 0,
        y: 0,
        width: 480,
        height: 810,
      },
      action: {
        type: 'postback',
        label: 'เปิดแทง',
        data: 'action=open_betting',
        displayText: 'เปิดแทง',
      },
    },
    {
      bounds: {
        x: 480,
        y: 0,
        width: 480,
        height: 810,
      },
      action: {
        type: 'postback',
        label: 'ส่งห้องแข่ง',
        data: 'action=send_room',
        displayText: 'ส่งห้องแข่ง',
      },
    },
    {
      bounds: {
        x: 960,
        y: 0,
        width: 480,
        height: 810,
      },
      action: {
        type: 'postback',
        label: 'ส่งลิงค์การโอนเงิน',
        data: 'action=send_payment_link',
        displayText: 'ส่งลิงค์การโอนเงิน',
      },
    },
    {
      bounds: {
        x: 1440,
        y: 0,
        width: 480,
        height: 810,
      },
      action: {
        type: 'postback',
        label: 'สรุปยอด',
        data: 'action=summary',
        displayText: 'สรุปยอด',
      },
    },
    {
      bounds: {
        x: 1920,
        y: 0,
        width: 480,
        height: 810,
      },
      action: {
        type: 'postback',
        label: 'แจ้งผลแทง',
        data: 'action=announce_results',
        displayText: 'แจ้งผลแทง',
      },
    },
  ],
};
