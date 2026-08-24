# CheckInQR cPanel Deployment

## cPanel Application Manager

Use these values:

```text
Application Name: checkinqr
Deployment Domain: flodeka.com
Base Application URL: /
Application Path: checkinqr
Deployment Environment: Production
Startup File: app.js
```

## Files to upload

Upload the project contents into the `~/checkinqr` folder.

Do not upload local build/cache folders:

```text
.next
.next-build
node_modules
mobile/android/build
```

## Environment variables

Create a `.env` file in `~/checkinqr`:

```env
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME"
AUTH_SECRET="CHANGE_ME_TO_A_LONG_RANDOM_SECRET"
NODE_ENV="production"
```

## First deployment commands

Run these commands from the `~/checkinqr` folder:

```bash
npm install
npm run prisma:generate
npm run db:push
npm run build
```

Then restart the app from cPanel Application Manager.

## Future update commands

After uploading or pulling new code:

```bash
npm install
npm run prisma:generate
npm run db:push
npm run build
```

Then restart the app from cPanel Application Manager.
