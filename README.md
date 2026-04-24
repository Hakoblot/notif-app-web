# notif-app-web

Simple local website and API for testing Expo push notifications with Aiven MySQL.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and paste the real Aiven password.

   ```env
   PORT=3001
   DATABASE_URL="mysql://avnadmin:YOUR_PASSWORD@notif-app-jacobbarcelona30-3360.c.aivencloud.com:22613/defaultdb?ssl-mode=REQUIRED"
   DB_SSL=true
   DB_SSL_REJECT_UNAUTHORIZED=true
   DB_SSL_CA_PATH=
   ```

   If startup fails with `self-signed certificate in certificate chain`, download
   the Aiven CA certificate and set `DB_SSL_CA_PATH` to that local `.pem` file.
   For quick local testing only, you can set `DB_SSL_REJECT_UNAUTHORIZED=false`.

3. Start the dashboard:

   ```bash
   npm start
   ```

4. Open `http://localhost:3001`.

## Mobile App Token Registration

The mobile app sends its Expo push token to:

```txt
POST /api/tokens
```

Payload:

```json
{
  "expoPushToken": "ExponentPushToken[...]",
  "parentName": "Jacob Barcelona",
  "studentName": "Mika Santos",
  "platform": "android",
  "deviceName": "Pixel 8"
}
```

If you are testing on a physical phone, use your computer's LAN IP in the mobile app, for example `http://192.168.1.12:3001`. `localhost` on the phone points to the phone itself.

## Sending Push

The website can send one notification to all active tokens, or to selected tokens only. It uses `expo-server-sdk`, chunks requests through Expo Push Service, logs tickets in MySQL, and disables tokens if Expo returns `DeviceNotRegistered`.
