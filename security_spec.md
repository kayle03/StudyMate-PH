# Security Specification for StudyMate PH

## Data Invariants
1. Users can only edit their own profiles.
2. Study materials are public for reading but only editable by the uploader.
3. Timestamps (createdAt) must be validated using server time.
4. Entity integrity (types, required fields) must be strictly enforced.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Attempt to create a material with `uploadedBy` set to another user's UID.
2. **Shadow Field Injection**: Attempt to add `isAdmin: true` to a user document.
3. **Ghost Update**: Attempt to update another user's material title.
4. **Timestamp Fraud**: Attempt to set `createdAt` to a future date instead of `request.time`.
5. **Type Poisoning**: Sending `downloadCount` as a string instead of a number.
6. **Schema Bypass**: Creating a material without a `title`.
7. **Cross-User Pollution**: Updating `uid` in a user profile.
8. **Malicious ID**: Using a 2KB string as a document ID.
9. **Role Escalation**: Setting `memberCount` to 999999 manually.
10. **State Corruption**: Deleting a group created by someone else.
11. **PII Leak**: Authenticated user trying to read all `users` collection without direct UID match.
12. **Metadata Bypass**: Updating `uploadedByName` to someone else's name while keeping own UID.

## Test Runner
Verified against `firestore.rules`.
