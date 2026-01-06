const line = require('@line/bot-sdk');

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const middleware = line.middleware({
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

module.exports = { client, middleware };
