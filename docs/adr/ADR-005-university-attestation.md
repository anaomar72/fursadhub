# ADR-005: University Attestation for Student Verification

## Status

Accepted (implementation begins in Phase 2)

## Context

FursadHub needs confidence that a student account genuinely corresponds to an enrolled university student, without requiring biometric/facial-recognition identity verification (explicitly out of scope) and without FursadHub needing direct integration access to each university's own student information system.

## Decision

Use **University Attestation**: authorized university staff (coordinators/admins) verify a student's claimed enrollment against the university's own source of truth, rather than FursadHub verifying enrollment independently. The workflow is:

1. student claims enrollment (university, department, student number, program, academic year)
2. authorized university staff checks the university's own records
3. staff verifies student identity/enrollment
4. where account binding is required, a short-lived QR/OTP challenge ties the verification action to the specific student account
5. enrollment becomes `VERIFIED`

QR/OTP challenges are secure random, short-lived, hashed where stored, one-time use, replay-resistant, and consumed transactionally. Email verification (`PENDING_CONTACT_VERIFICATION` → `ACTIVE`) and university enrollment verification are treated as distinct concepts — an active, email-verified account can still be blocked from student internship participation until enrollment is `VERIFIED`.

Do not implement Face++, facial recognition, or biometric identity/attendance verification.

## Consequences

- FursadHub does not need direct integration with any university's student database, which keeps the pilot's integration surface small and avoids per-university custom integration work.
- Verification quality depends on university staff diligence — this is treated as an acceptable trust boundary for a pilot with a small number of partner universities.
- Department-level authorization scope (a coordinator can only act within their assigned departments) is a critical backend security boundary that must be enforced server-side, not just in the UI.
- Verification evidence remains private, and verification-state transitions are auditable.
