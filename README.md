# notif-app-web

## Install

```bash
npm install
```

## Environment

Create `.env` from `.env.example`:

```env
PORT=3001
DATABASE_URL=""

DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA_PATH=

EXPO_ACCESS_TOKEN=
```

- `EXPO_ACCESS_TOKEN` is only needed if you enable Expo Push Security.

## Run Locally

```bash
npm start
```

## Database Tables

On startup, the API creates:

- `push_tokens`
- `push_notifications`

`push_tokens` stores Expo push tokens from mobile devices.

`push_notifications` stores send attempts, Expo ticket IDs, and error messages.

## API Endpoints

Register or update a token:

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

List tokens:

```txt
GET /api/tokens
```

Send push:

```txt
POST /api/push/send
```

Payload for all active tokens:

```json
{
  "mode": "all",
  "title": "Campus update",
  "body": "Mika Santos has arrived on campus."
}
```

Payload for selected tokens:

```json
{
  "mode": "selected",
  "tokenIds": [1, 2],
  "title": "Campus update",
  "body": "Mika Santos has arrived on campus."
}
```

List send logs:

```txt
GET /api/notifications
```

## Render Deployment

1. Push this folder to GitHub as its own repo, for example `notif-app-web`.

   ```bash
   cd "C:\Users\Documents\GitHub\notif-app-web"
   git init
   git add .
   git commit -m "Initial notification web dashboard"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/notif-app-web.git
   git push -u origin main
   ```

2. In Render, create a new `Web Service`.

3. Use:

   ```txt
   Language: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. Add environment variables in Render:

   ```env
   DATABASE_URL=
   DB_SSL=true
   DB_SSL_REJECT_UNAUTHORIZED=true
   DB_SSL_CA_PATH=
   EXPO_ACCESS_TOKEN=
   ```

5. Deploy.

6. Open the Render URL:

   ```txt
   https://your-render-url.onrender.com
   ```

7. Test:

   ```txt
   https://your-render-url.onrender.com/api/health
   ```

Render free services can sleep after inactivity, so the first request may be slow.

## Mobile App Connection

Set the mobile app's `EXPO_PUBLIC_API_URL` to this web service URL.

Local Wi-Fi test:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.12:3001
```

Render/preview build:

```env
EXPO_PUBLIC_API_URL=https://your-render-url.onrender.com
```

Then rebuild the mobile preview APK:

```bash
cd "C:\Users\Documents\GitHub\notif-app"
eas build --profile preview --platform android
```

## Expo Push Security

Expo's push notification tool and Expo Push Service may ask for an access token only if Push Security is enabled for the Expo project.

If Push Security is disabled:

```txt
EXPO_ACCESS_TOKEN can be empty
```

If Push Security is enabled:

1. Create an Expo access token.
2. Add it to Render:

   ```env
   EXPO_ACCESS_TOKEN=your_expo_access_token
   ```

3. Redeploy the Render service.

Never put `EXPO_ACCESS_TOKEN` in the mobile app or any `EXPO_PUBLIC_*` variable.

## What Needs Firebase?

This web service does not need Firebase.

Android mobile builds need Firebase/FCM configuration because Android push delivery uses FCM under the hood. That setup belongs in the mobile app and EAS credentials, not in this web project.

## Useful Docs

- Expo server SDK: https://github.com/expo/expo-server-sdk-node
- Expo push sending: https://docs.expo.dev/push-notifications/sending-notifications/
- Expo Push Security: https://docs.expo.dev/push-notifications/sending-notifications/#additional-security
- Render web services: https://render.com/docs/web-services
