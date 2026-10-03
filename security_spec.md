# Free Earn - Security Specification & Test Payloads

## 1. Data Invariants
1. **Balance & Financial Isolation**: Users can never directly modify their own balance (`coins`, `totalEarnings`, `totalWithdrawn`) without server-side verification.
2. **Immutable Transactions**: Transactions once created can never be modified or deleted by regular users.
3. **Withdrawal Integrity**: A user cannot approve or mark their own withdrawal as `paid`. Status changes to `approved`, `rejected`, or `paid` are restricted to Admin.
4. **Task Verification**: Task submissions cannot be marked `approved` or `rejected` by the submitting user; only admins can review and approve tasks.
5. **No Unauthorized Reading of Other Users' PII**: Users can only read and write their own `/users/{userId}` profile document.
6. **Admin Gated**: Admin collections (`/admins/{adminId}`, `/auditLogs/{logId}`, and mutation of `/settings/{settingId}`) are strictly restricted to authenticated administrators. Bootstrapped admin is `kumarankush5184@gmail.com`.

## 2. The "Dirty Dozen" Malicious Payloads

1. **Self-Credited Coin Inflation**:
   Payload targeting `/users/USER123` updating `{ "coins": 9999999 }` by non-admin user. MUST RETURN `PERMISSION_DENIED`.

2. **Self-Approval of Withdrawal**:
   Payload targeting `/withdrawals/WD_01` updating `{ "status": "approved", "processedAt": "2026-10-01" }` by applicant. MUST RETURN `PERMISSION_DENIED`.

3. **Status Shortcutting on Task Submission**:
   Payload targeting `/taskSubmissions/SUB_01` creating a submission with `{ "status": "approved" }`. MUST RETURN `PERMISSION_DENIED`.

4. **Arbitrary User Profile Scraping**:
   User A trying to read `/users/USER_B`. MUST RETURN `PERMISSION_DENIED`.

5. **Tampering with Transaction History**:
   User attempting to delete or overwrite `/transactions/TX_99`. MUST RETURN `PERMISSION_DENIED`.

6. **Admin Role Spoofing**:
   Regular user attempting to write to `/admins/{their_uid}`. MUST RETURN `PERMISSION_DENIED`.

7. **Negative or Fraudulent Withdrawal Amount**:
   Payload submitting withdrawal with `{ "amountCoins": -500 }`. MUST RETURN `PERMISSION_DENIED`.

8. **Tampering with System Settings**:
   Non-admin attempting to modify `/settings/app_settings` `{ "minWithdrawalCoins": 0 }`. MUST RETURN `PERMISSION_DENIED`.

9. **Ghost Field Injection in User Profile**:
   Payload sending `{ "role": "admin", "isAdmin": true, "isVerified": true }` to `/users/{userId}`. MUST RETURN `PERMISSION_DENIED`.

10. **ID Poisoning Attack**:
    Payload attempting to create document with 2KB string ID containing special characters. MUST RETURN `PERMISSION_DENIED`.

11. **Impersonated Task Submission**:
    User A submitting task proof with `userId: "USER_VICTIM"`. MUST RETURN `PERMISSION_DENIED`.

12. **Tampering with App Tasks**:
    Regular user attempting to delete or edit marketplace task `/tasks/TASK_01`. MUST RETURN `PERMISSION_DENIED`.
