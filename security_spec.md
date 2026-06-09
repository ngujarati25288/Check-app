# Security Specification: Daily Learning Exam

## 1. Data Invariants

1. **User Role Lockout**: Students cannot write or change their own `role` or `status` during creation or updates. Self-escalation to `admin` or `super_admin` must be physically impossible.
2. **Result Submission Ownership**: A student can only create and read their own `exam_results`. They cannot modify existing `exam_results` once submitted (terminal state).
3. **Mistakes Ownership**: A student can only view, create, or update their own `student_mistakes`. They cannot touch or view other students' mistake records.
4. **Admins Only for Content**: Only validated `admins` or `super_admins` can create/write to `subjects`, `chapters`, `questions`, and `daily_exams`. Students are strictly read-only.
5. **Leaderboard Read-Only for Students**: Students can read the leaderboard, but only backend processes or admins can create/update leaderboard details.
6. **Time Synchronization**: All timestamps (`createdAt`, `updatedAt`, `submittedAt`) must be strictly locked to `request.time`. Client-supplied custom dates are rejected.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 specific payloads representing attempts to violate Identity, Integrity, and State that are blocked by our Firestore Security Rules:

### 1. Self-Assigned Admin Role Attempt (Profile Creation)
* **Target Collection**: `/users/malicious_user`
* **JSON Payload**:
  ```json
  {
    "uid": "malicious_user",
    "fullName": "Attacker Name",
    "mobile": "9999988888",
    "role": "admin",
    "status": "approved",
    "createdAt": "timestamp_now"
  }
  ```
* **Failure Outcome**: `PERMISSION_DENIED` - Attempting to assign `role="admin"` as a non-super-admin is blocked.

### 2. Status Bypass During Registration
* **Target Collection**: `/users/malicious_user`
* **JSON Payload**:
  ```json
  {
    "uid": "malicious_user",
    "fullName": "Attacker Name",
    "mobile": "9999988888",
    "role": "student",
    "status": "approved",
    "createdAt": "timestamp_now"
  }
  ```
* **Failure Outcome**: `PERMISSION_DENIED` - Students cannot set role or status directly on create, they default to student & subject to validation rules.

### 3. Modifying Another Student's Profile
* **Target Collection**: `/users/legit_student_123`
* **Actor Auth ID**: `malicious_user`
* **Failure Outcome**: `PERMISSION_DENIED` - Path ID parameter must match `request.auth.uid`.

### 4. Direct Injection of Custom Score / Modifying Results
* **Target Collection**: `/exam_results/result_999`
* **Actor Auth ID**: `stud_123`
* **Attempt**: Modify existing exam result score from 15/20 to 20/20.
* **JSON Payload (Update)**:
  ```json
  {
    "correctAnswers": 20,
    "obtainedMarks": 20,
    "percentage": 100
  }
  ```
* **Failure Outcome**: `PERMISSION_DENIED` - Exam results are immutable after creation.

### 5. Attempting to Read Other Students' Results
* **Target Collection**: `/exam_results/result_another`
* **Actor Auth ID**: `stud_123`
* **Failure Outcome**: `PERMISSION_DENIED` - The record's `studentId` must match the authenticated user's ID.

### 6. Unauthorized Creation of Exams (Student acting as Admin)
* **Target Collection**: `/daily_exams/exam_cheat`
* **Actor Auth ID**: `stud_123` (no admin credential)
* **Failure Outcome**: `PERMISSION_DENIED` - Content creation is restricted to verified admins.

### 7. Self-Approved Mistake Progress (Bypassing Mastered State)
* **Target Collection**: `/student_mistakes/mistake_123`
* **Actor Auth ID**: `stud_123`
* **Attempt**: Manually setting `mastered = true` without completing revision iterations.
* **Failure Outcome**: `PERMISSION_DENIED` - Revision status and counts are restricted to specific action-based updates.

### 8. Denial of Wallet: ID Poisoning Attack
* **Target Collection**: `/users/VERY_LONG_STRING_OVER_1024_CHARS_WITH_JUNK_$$%@!`
* **Failure Outcome**: `PERMISSION_DENIED` - All document IDs must conform to `isValidId()` regex and length limits.

### 9. Attempting to Overwrite Leaderboard Stats
* **Target Collection**: `/leaderboard/stud_123`
* **Actor Auth ID**: `stud_123`
* **Attempt**: Overwriting leaderboard points directly via client SDK.
* **Failure Outcome**: `PERMISSION_DENIED` - Leaderboard collection is read-only for students.

### 10. Manipulating the `createdAt` Timestamp
* **Target Collection**: `/users/stud_123`
* **Attempt**: Injecting a custom historic date `"2025-01-01T00:00:00Z"`.
* **Failure Outcome**: `PERMISSION_DENIED` - Must enforce `incoming().createdAt == request.time`.

### 11. Array Overflow Resource Exhaustion (Denial of Wallet)
* **Target Collection**: `/questions/q_123`
* **Attempt**: Injecting extremely large lists into any options arrays.
* **Failure Outcome**: `PERMISSION_DENIED` - Strictly enforces sizes and string boundaries.

### 12. Unverified Email / Authentication Spoof Attack
* **Target Collection**: `/users/stud_123`
* **Actor Auth**: Signed-in but with anonymous credentials.
* **Failure Outcome**: `PERMISSION_DENIED` - Authentication must be verified via official identity provider.
