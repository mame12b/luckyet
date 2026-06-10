# Where I left off (resume notes)

## Last completed
- Phase 3 i18n shipped (Auth + Dashboard + BuyTicket in Amharic)
- Phase 4 Round 1: StickyBuyCTA ready to ship (file rewritten, awaiting test)
- Phase A (email infrastructure): code written, wiring tested, BLOCKED on Resend domain verification

## What's working
- Local + production: full English + Amharic UX
- Promoter QR program live with Abela
- All backups exist as *.bak files

## What's blocked
- Password reset rebuild (self-service via email OTP)
- Reason: Resend sender domain not yet verified
- Need: Verify a real domain in Resend dashboard, OR fall back to onboarding@resend.dev

## Files modified for Phase A (in case you forget what changed)
- ~/luckyet/server/services/emailService.js          (NEW)
- ~/luckyet/server/routes/authRoutes.js              (added test-email route)
- ~/luckyet/docker-compose.yml                       (added RESEND_API_KEY + EMAIL_FROM env vars)
- ~/luckyet/.env                                     (added RESEND_API_KEY + EMAIL_FROM)
- ~/luckyet/server/.env                              (also has the keys)

## Cleanup needed when resuming
- Either: replace placeholder API key with real one + verified sender domain
- Or: remove the test route from authRoutes.js if Phase A is no longer wanted

## Test command after resuming
curl -X POST http://localhost:5000/api/auth/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"mame4005@gmail.com","name":"Mame Test"}'

Expected: {"ok":true,"providerId":"<real-uuid>"} and email arrives

## Phase plan
- Phase A: email infrastructure (BLOCKED)
- Phase B: User model OTP fields + new auth controller (PENDING)
- Phase C: Frontend simplification (PENDING)
- Phase D: Remove PasswordResetRequest model + admin page (PENDING)
