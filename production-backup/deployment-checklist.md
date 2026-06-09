# Daily Learning Exam - Production Launch Deployment Checklist

This operational checklist outlines the chronological steps sequence required to execute a zero-downtime, fully secured production launch of the **Daily Learning Exam** platform.

---

## Phase A: Pre-Deployment Operations & Environment Audit
- [ ] **Google Cloud Project Setup**: Confirm active production instance `daily-learning-exam-prod` is bound to the appropriate billing profile.
- [ ] **Enable Required APIs**:
  - [ ] Firestore API (`firestore.googleapis.com`)
  - [ ] Cloud Functions API (`cloudfunctions.googleapis.com`)
  - [ ] Firebase Cloud Messaging API (`fcm.googleapis.com`)
  - [ ] Gemini AI API (Generative Language API - `generativelanguage.googleapis.com`)
- [ ] **Config Secret Store**: Save production secrets (`GEMINI_API_KEY`, credential JSONs) inside Google Cloud Secret Manager instead of hardcoding.
- [ ] **Set Environment Config**: Copy parameters listed in `/production-backup/env.production.example` into the staging server or Docker environment config profile sheets.

---

## Phase B: Database Schema & Indexing Pipeline
- [ ] **Initialize Firestore Default Database**: Make sure Firestore is provisioned in `Native Mode` (not Datastore mode), sitting on regional multi-region instances (e.g., `asia-east1` or custom high availability zones).
- [ ] **Upload Firebase Blueprint**: Run configuration updates to sync collections declared in `/production-backup/firebase-schema-export.json`.
- [ ] **Create Compound Indexes**:
  - Run CLI deployment or manual setup for composite indexes compiled in `/production-backup/firestore.indexes.json`.
  - *Note: Creating composite indexes in Firestore can take up to 10-15 minutes to transition from 'Building' to 'Active'. Do not proceed with test sequences until building is completed.*

---

## Phase C: Security Rules Audit & Upload
- [ ] **Deploy Security Rules**:
  - Run:
    ```bash
    firebase deploy --only firestore:rules --project=daily-learning-exam-prod
    ```
  - Alternatively, copy contents from `/production-backup/firestore.rules.backup` directly into the Firestore Rules console tab and click **Publish**.
- [ ] **App Check Integration**: Enable Google App Check (Play Integrity for Android, reCAPTCHA Enterprise for Web) in the Firebase console to block unauthorized scraper hits and simulated request attacks.

---

## Phase D: Cloud Function & Server Deployment
- [ ] **Deploy Cloud Functions Bundle**:
  - Make sure the scheduling module `/src/lib/cloudFunctions.ts` or index compilation engine is packaged.
  - Command:
    ```bash
    firebase deploy --only functions --project=daily-learning-exam-prod
    ```
- [ ] **Build Frontend Assets**:
  - Conduct full verification build locally or on CI/CD pipelines to ensure Vite output is correctly compiled.
  - Run:
    ```bash
    npm run lint
    npm run build
    ```
- [ ] **Container Deployment via Cloud Run**:
  - Deploy finalized Docker image to Cloud Run:
    ```bash
    gcloud run deploy daily-learning-exam-spa \
      --source . \
      --platform managed \
      --region asia-east1 \
      --allow-unauthenticated
    ```

---

## Phase E: Data Seeding, System Prep & Testing
- [/] **Enable Maintenance Mode**: Set `maintenanceMode: true` inside the default administrative configuration collection to ensure only testing entities can run credentials during seed operations.
- [ ] **Seed Master Curriculum Data**: Use admin panel screens to enter core school directories, village registers, syllabus subjects, chapters, and the default pool of questions.
- [ ] **Run Initial Academic Calculation Sync**:
  - Go to **Admin Panel -> Advanced Analytics** and click **"Sync Engine Now"**.
  - This initializes the student risk markers, school indices, village leaderboards, and report schedules in firestore, avoiding cold-start latency for the initial wave of users.
- [ ] **Testing Scenarios & Crashlytics Verification**:
  - Log in with test student credentials.
  - Run an exam and verify that results are compiled and points calculated.
  - Deliberately fire mock exceptions on mobile/web view mock interfaces to ensure they are handled gracefully and tracked appropriately.
- [ ] **Verify Backup Cron Scheduler**: Check that the Nightly Firestore Export task is listed and active in the Cloud Scheduler console.

---

## Phase F: Production Release & Active Monitoring
- [ ] **Bypass Maintenance Mode**: Go to Admin controls and set `maintenanceMode: false` to open access.
- [ ] **Go-Live Team Channels Sync**: Open Firebase Crashlytics dashboard, Cloud Logging console, and FCM status tables to view feedback in real-time.
- [ ] **Release APK/Portal Announcement**: Dispatch automated announcements about syllabus status and examination schedules to registered villages and schools.
