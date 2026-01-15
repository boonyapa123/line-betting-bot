const crypto = require('crypto');
const http = require('http');

const channelSecret = '24b3f0f4effec815066a141c130d7964';

function createMessage(text, messageId, userId, replyToken) {
  return {
    events: [
      {
        type: 'message',
        message: {
          type: 'text',
          id: messageId,
          text: text
        },
        timestamp: Math.floor(Date.now() / 1000),
        source: {
          type: 'group',
          groupId: 'Ce73f7032aa63204dcfc2d5685719565b',
          userId: userId
        },
        replyToken: replyToken
      }
    ]
  };
}

function sendMessage(message, label, port = 3001) {
  return new Promise((resolve) => {
    const body = JSON.stringify(message);
    const signature = crypto
      .createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64');

    const options = {
      hostname: 'localhost',
      port: port,
      path: '/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
        'X-Line-Signature': signature
      }
    };

    const req = http.request(options, (res) => {
      console.log(`${label} - Status: ${res.statusCode}`);
      resolve();
    });

    req.on('error', (error) => {
      console.error(`${label} - Error:`, error.message);
      resolve();
    });

    req.write(body);
    req.end();
  });
}

async function test() {
  console.log('=== LOCAL WEBHOOK TEST ===\n');
  
  console.log('TEST 1: User A sends bet message');
  console.log('Message: "ชล 500 มะปราง"\n');
  
  const msg1 = createMessage(
    'ชล 500 มะปราง',
    '100001',
    'U1111111111111111111111111111111',
    'token_test1'
  );
  await sendMessage(msg1, 'Message 1');
  
  console.log('\nWaiting 1 second...\n');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('TEST 2: User B replies (should create pair and record to sheets)');
  console.log('Message: "ถ 500 อ้วน"\n');
  
  const msg2 = createMessage(
    'ถ 500 อ้วน',
    '100002',
    'U2222222222222222222222222222222',
    'token_test1'
  );
  await sendMessage(msg2, 'Message 2 (reply)');
  
  console.log('\nWaiting 2 seconds to see logs...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('=== TEST COMPLETE ===');
  console.log('Check the server logs above to verify:');
  console.log('1. Webhook received both messages');
  console.log('2. Pair was detected');
  console.log('3. Data was recorded to Google Sheets');
}

test();
