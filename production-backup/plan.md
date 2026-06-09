# Daily Learning Exam - Production Backup & Disaster Recovery Plan

This document outlines the official Production Backup & Disaster Recovery (DR) Plan for the **Daily Learning Exam** platform. It provides a blueprint for backing up all Firestore data, Cloud Functions code, user metadata, and system configurations, ensuring zero-loss recovery in the event of an outage or logical data corruption.

---

## 1. Executive Summary & SLAs

*   **RPO (Recovery Point Objective):** 24 hours (data lost in a catastrophic event will not exceed 24 hours).
*   **RTO (Recovery Time Objective):** 2 hours (system fully restored and functional under replica or new host instances).
*   **Backup Storage Location:** Secure, geographic-redundant Google Cloud Storage (GCS) bucket (`gs://dle-production-backups-bucket-asia`) with a retention policy of 30 days.

---

## 2. Firestore Automated Export Architecture

Firestore supports managed export actions using GCS buckets. The production setup utilizes a daily Scheduled Cloud Scheduler job triggering an administrative Cloud Function.

### A. Automatic Cloud Scheduler Job
*   **Trigger Interval:** Every night at `02:00 UTC` (07:30 IST), when student traffic is lowest.
*   **Cron Expression:** `0 2 * * *`
*   **Source:** Cloud Scheduler
*   **Destination:** HTTPS Cloud Function endpoints (Secure Endpoint / Authorized Access Only)

### B. Backup Execution Code (Cloud Functions)
```typescript
import { PubSub } from '@google-cloud/pubsub';
import { v1 } from '@google-cloud/firestore';
const client = new v1.FirestoreAdminClient();

export const scheduledFirestoreExport = async (event: any) => {
  const projectId = process.env.GCP_PROJECT || 'daily-learning-exam-prod';
  const databaseName = client.databasePath(projectId, '(default)');
  const outputUriPrefix = 'gs://dle-production-backups-bucket-asia';

  try {
    const [response] = await client.exportDocuments({
      name: databaseName,
      outputUriPrefix: outputUriPrefix,
      collectionIds: [], // Empty array triggers back up of all collections
    });
    console.log(`Firestore Backup successfully triggered: ${response.name}`);
  } catch (error) {
    console.error('FATAL: Firestore automated backup failed!', error);
    // Send priority notification alert to DevOps / Admin channels (FCM/Email)
  }
};
```

---

## 3. Manual Backup and Restore Procedures

### A. Manual Export via gcloud CLI
If an emergency snapshot is required before a critical schema migration or administrative purge, execute:
```bash
# Set active project
gcloud config set project daily-learning-exam-prod

# Run immediate full firestore export
gcloud firestore export gs://dle-production-backups-bucket-asia/manual-snapshots/pre-migration-$(date +%F)
```

### B. Complete Restoration Process (Disaster Recovery)
In the event of accidental deletion or data corruption, restore the database to a verified previous snapshot using the following steps:

1.  **Switch App to Maintenance Mode:** 
    Ensure no new transactional data or user answers are written during restoration. Go to **Super Admin Panel -> System Controls** and enable **"Maintenance Mode"**. This applies a global block across client routes and restricts database updates.
2.  **Run Firestore Import command:**
    Choose the desired backup subfolder inside your GCS bucket:
    ```bash
    # Run import from standard backup path
    gcloud firestore import gs://dle-production-backups-bucket-asia/2026-06-03T02:00:00_snapshot/
    ```
3.  **Validate Integrity:**
    Execute specific integrity sanity checks on the backup verification screens or via Admin API endpoints.
4.  **Bypass Maintenance Mode:**
    Turn off Maintenance Mode to restore access to students.

---

## 4. User Authentication & Metadata Backups

Firebase Authentication users are stored in a secure separate Google identity schema. Since Firestore backups do not include authentication secrets or credential hashes, Auth backups are run independently using the Firebase CLI.

```bash
# Export all users with password hashes (Scrypt Parameters Included)
firebase auth:export auth_backup_users.json --format=json --project=daily-learning-exam-prod
```

### Import / Restoration of Accounts
To migrate or restore users into a new Firebase project during high disaster recovery replication:
```bash
firebase auth:import auth_backup_users.json \
  --hash-algo=SCRYPT \
  --hash-key=YOUR_SCRYPT_BASE64_KEY \
  --salt-separator=YOUR_SCRYPT_SALT_SEPARATOR \
  --rounds=8 \
  --mem-cost=14 \
  --project=daily-learning-exam-prod
```

---

## 5. IAM Roles & Least Privilege Permissions Matrix

To prevent credentials leak or malicious manual operations, verify that IAM accounts conform to the principle of least privilege:

| System / Account | IAM Role Assigned | Purpose |
| :--- | :--- | :--- |
| `App Server Runtime` | `Cloud Run Service Agent` | Runtime execution with basic credentials |
| `Backup Service Account` | `Cloud Datastore Import Export Admin` | Permissions to run gcloud export/import |
| `Cloud Scheduler Service` | `Cloud Scheduler Job Runner` | Trigger authorization for backup functions |
| `GCS Storage Account` | `Storage Object Admin` | Read/write permissions in the backup bucket |

---

## 6. Retention & Lifecycle Management Policies

To minimize storage costs and comply with cloud data policies, the backup bucket uses automatic GCS Lifecycle Policy Management:

```json
{
  "rule": [
    {
      "action": {
        "type": "Delete"
      },
      "condition": {
        "age": 30
      }
    },
    {
      "action": {
        "type": "SetStorageClass",
        "storageClass": "NEARLINE"
      },
      "condition": {
        "age": 7
      }
    }
  ]
}
```
*Backups are moved to Nearline storage (low cost) after 7 days and permanently deleted after 30 days.*
