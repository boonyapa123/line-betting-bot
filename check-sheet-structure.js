require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'UsersBalance!A1:E3' });
  console.log('UsersBalance:', JSON.stringify(res.data.values, null, 2));
  const res2 = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Players!A1:E3' });
  console.log('Players:', JSON.stringify(res2.data.values, null, 2));
}
main().catch(e => console.error(e.message));
