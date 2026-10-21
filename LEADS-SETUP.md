# Save interested people into a Google Sheet (about 10 minutes)

The app has a "💌 Stay connected" form (in the menu, and as a gentle pop-up once after 3 questions).
Each sign-up becomes a new row in your Google Sheet: time, name, WhatsApp number, city, language.
Until you finish the steps below, the form stays hidden, so nobody sees a broken form.

## 1. Make the Sheet
1. Open https://sheets.new and name it **Gita Sarthi Leads**.

## 2. Add the script
1. In the Sheet: **Extensions -> Apps Script**.
2. Delete the code that is already there.
3. Open `google-apps-script/Code.gs` from this project, copy everything, paste it in, and press **Save** (disk icon).

## 3. Publish it
1. Click **Deploy -> New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy**, then **Authorize access**, and pick your Google account.
   If Google says "Google hasn't verified this app", click **Advanced -> Go to ... (unsafe) -> Allow**.
   It is your own script, so this is expected.
5. Copy the **Web app URL**. It ends with `/exec`.
6. Paste that URL into a new browser tab. You should see:
   `{"ok":true,"message":"Gita Sarthi leads endpoint is running"}`

## 4. Connect the app
1. Open `frontend/connect.js` and change this line near the top:
   `var LEADS_URL = window.GITA_LEADS_URL || "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";`
   Replace `PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` with your Web app URL (keep the quotes).
2. Commit the change on GitHub. Render redeploys by itself in a few minutes.

## 5. Test
1. Open your app (press Ctrl+Shift+R), go to the menu -> **Stay connected**, fill the form, and press **Connect**.
2. A new tab called **Leads** appears in your Sheet with your row.

## Get it as Excel
In the Sheet: **File -> Download -> Microsoft Excel (.xlsx)**.

## Good to know
- The same WhatsApp number is only saved once.
- If you change Code.gs later: **Deploy -> Manage deployments -> pencil icon -> Version: New version -> Deploy**. The URL stays the same.
- Only you can open the Sheet. Do not share it publicly, because it holds people's phone numbers.
- People agree to get messages by ticking the consent box. Only message people who signed up, and stop if someone asks you to.
