# MVP Manual Testing Plan

This testing plan covers all critical paths before going live. Test each section in order, as later flows depend on earlier ones.

## Prerequisites

Before testing:
- Ensure Stripe is in **test mode** with test API keys
- Have access to your admin email (matching `ADMIN_EMAIL` env var)
- Have a test email account for client testing
- Have Cal.com webhooks configured for test environment
- Convex dev deployment running

---

## 1. Public Site and SEO

### Landing Page (`/`)
- [ ] Page loads without errors
- [ ] All sections render correctly (hero, features, pricing, FAQ, reviews)
- [ ] Mobile menu opens/closes properly
- [ ] Theme toggle (light/dark) works
- [ ] CTA buttons link correctly
- [ ] Schedule call link opens Cal.com booking

### Legal Pages
- [ ] `/legal/terms` renders full terms of service
- [ ] Terms version matches `TERMS_VERSION` in `lib/legal/terms.ts`
- [ ] Print button works (if present)

### SEO/Meta
- [ ] `/robots.txt` returns valid robots file
- [ ] `/sitemap.xml` returns valid sitemap
- [ ] Open Graph image at `/opengraph-image` renders correctly

---

## 2. Admin Portal (`/admin`)

### Access Control
- [ ] Non-authenticated users see "Please sign in" message
- [ ] Non-admin authenticated users cannot access (test with client email)
- [ ] Admin email user has full access

### Prospects Tab
- [ ] List displays all prospects
- [ ] **Create prospect**: Fill all fields, save successfully
- [ ] **Duplicate warning**: Try creating prospect with existing email - shows warning dialog
- [ ] **Edit prospect**: Modify fields and save
- [ ] **Send magic link**: Button shows cooldown timer after send
- [ ] Verify email arrives in test inbox

### Projects Tab
- [ ] List displays all projects with correct statuses
- [ ] **Status dropdown**: Change status, verify it persists
- [ ] **Expand project**: Click "Manage" to see full details
- [ ] **Build details display**: Headline, domain, inspiration links, color swatches
- [ ] **Brand assets**: Logo and images display as thumbnails (clickable to full size)
- [ ] **My Notes**: Edit and save admin notes
- [ ] **Deployment fields**: Update live/staging URLs and save

### Scheduled Calls Tab
- [ ] Displays calls grouped by date
- [ ] Shows meeting URLs and project links
- [ ] Type and status display correctly

### Edit Requests Tab
- [ ] List displays all requests with thumbnails
- [ ] **Status dropdown**: Change status, verify it persists
- [ ] **Priority dropdown**: Change priority, verify it persists
- [ ] Attachment thumbnails display (click opens full image)

### Activity Log Tab
- [ ] Displays activities grouped by date
- [ ] Shows actor badges (System/User/Admin)
- [ ] Relative timestamps display correctly
- [ ] Project links work

---

## 3. Authentication Flow (Magic Link)

### Send Magic Link (from Admin)
- [ ] Select prospect in admin
- [ ] Click "Send Magic Link"
- [ ] Verify email arrives within 1-2 minutes
- [ ] Email contains correct link to `/portal/verify?sid=SESSION_ID`

### Magic Link Verification
- [ ] Click link from email
- [ ] Redirects to `/portal/agreement?sid=SESSION_ID`
- [ ] User is authenticated (check session)
- [ ] **Cross-device**: Open link on different device/browser - should work
- [ ] **Expired link**: Wait 24+ hours, verify link shows error

### Mobile Testing (Critical)
- [ ] Send magic link to mobile device
- [ ] After clicking "Send", user sees static `/link-sent.html` page
- [ ] Click magic link from email on mobile
- [ ] Should authenticate without hanging or errors
- [ ] Session persists across page navigation

---

## 4. Agreement Flow (`/portal/agreement`)

### Page Load
- [ ] Shows prospect name and company in project details
- [ ] Displays terms summary points
- [ ] Terms version shown
- [ ] "View Terms" link opens `/legal/terms` in new tab

### Agreement Acceptance
- [ ] **Unchecked state**: "Accept & Continue" button disabled
- [ ] Check "I agree" checkbox
- [ ] Button becomes enabled with correct text
- [ ] Click button, shows "Capturing agreement..."
- [ ] **Success path**: Redirects to Stripe checkout
- [ ] Verify `agreements` table has new row with:
  - Correct `termsVersion`
  - Correct `termsHash` (SHA-256)
  - `userAgent` captured
  - `acceptedAt` timestamp

### Error Handling
- [ ] If already accepted, redirects to `/portal/subscribe` or project page
- [ ] If user email doesn't match prospect, shows error

---

## 5. Payment Flow (Stripe Test Mode)

### Stripe Checkout
- [ ] After agreement, redirects to Stripe hosted checkout
- [ ] Shows correct price ($199/mo)
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete checkout successfully

### Success Redirect
- [ ] Redirects to `/portal/paymentSuccess`
- [ ] Shows success message
- [ ] Auto-redirects to `/portal/[projectId]`

### Webhook Processing
- [ ] Verify `checkout.session.completed` webhook received
- [ ] `stripe_customers` table has entry linking authUserId to stripeCustomerId
- [ ] `stripe_subscription_cache` table updated with subscription status
- [ ] Project status updated to `AWAITING_ASSETS`
- [ ] `activity_log` entry created for payment

### Failed Payment (Optional)
- [ ] Use test card `4000 0000 0000 9995` (insufficient funds)
- [ ] Verify appropriate error handling
- [ ] Check activity log for failure entry

---

## 6. Client Portal - AWAITING_ASSETS

### Page Load (`/portal/[projectId]`)
- [ ] Shows progress timeline with "Assets" step active
- [ ] Displays build details form
- [ ] Shows kickoff call CTA (if not yet scheduled)

### Build Details Form
- [ ] **Headline**: Enter text, required field validation
- [ ] **Domain preference**: Enter domain
- [ ] **Inspiration links**: Add URLs via chips input, remove chips
- [ ] **Color scheme**: Use color pickers, verify preview updates live
- [ ] **Color preview**: Gradient shows both colors, text contrast adjusts
- [ ] **Logo upload**: Select file, preview appears immediately
- [ ] **Brand images**: Select multiple files, grid preview appears
- [ ] **Save**: Submit form, shows success toast
- [ ] Verify data saved in `projects.buildDetails`

### After Form Submission
- [ ] Form collapses to summary view
- [ ] "Edit Details" button shows form again
- [ ] Kickoff call CTA appears

### Schedule Kickoff Call
- [ ] Click schedule button
- [ ] Opens Cal.com booking page
- [ ] Complete booking (use test mode if available)
- [ ] Verify Cal webhook fires and:
  - `scheduled_calls` table has entry
  - `projects.calKickoffBooking` populated
  - `activity_log` entry for booking

---

## 7. Client Portal - IN_PROGRESS

- [ ] Admin changes project status to `IN_PROGRESS`
- [ ] Client refreshes portal page
- [ ] Shows "Your Site is Being Built" hero
- [ ] Progress indicators display
- [ ] Kickoff call summary shows if booked
- [ ] "What's Happening Now" checklist renders

---

## 8. Client Portal - IN_REVIEW

- [ ] Admin sets staging URL in project deployment
- [ ] Admin changes status to `IN_REVIEW`
- [ ] Client refreshes portal
- [ ] Shows "Ready for Review" hero
- [ ] Staging URL displays and links work
- [ ] Review checklist renders
- [ ] Review call CTA appears
- [ ] Schedule review call, verify webhook works

---

## 9. Client Portal - LIVE

### Setup
- [ ] Admin sets live URL in deployment
- [ ] Admin changes status to `LIVE`

### Dashboard View
- [ ] Shows "Site is Live" banner with live indicator
- [ ] Live URL links correctly
- [ ] Analytics tab active by default

### Analytics Tab
- [ ] `DashboardStats` component renders
- [ ] `PageViewsChart` shows (may be empty initially)
- [ ] `TopPages` displays
- [ ] `RecentLeads` section visible

### Support Tab
- [ ] Click "Support" tab
- [ ] Edit requests list renders
- [ ] Support request form displays

### Submit Edit Request
- [ ] Fill title and details (required)
- [ ] Select priority
- [ ] Optionally attach images (test file validation: type, size, count)
- [ ] Submit request
- [ ] Verify `edit_requests` table entry
- [ ] Request appears in list with correct status

### Expand Edit Request
- [ ] Click expand on a request
- [ ] Details text displays
- [ ] Attachment thumbnails load (lazy-loaded)
- [ ] Click thumbnail opens full image

### Billing Portal (12+ months only)
- [ ] If subscription is 12+ months old, "Billing" button appears
- [ ] Click opens Stripe Customer Portal
- [ ] (Skip if testing fresh subscription)

---

## 10. Client Template Integration (Hub Endpoints)

### Lead Ingestion (`POST /api/ingest-lead`)

Test with curl or Postman:

```bash
curl -X POST https://YOUR_CONVEX_URL/api/ingest-lead \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-live-url.com" \
  -d '{
    "projectId": "PROJECT_ID_HERE",
    "source": "contact-form",
    "data": {
      "name": "Test Lead",
      "email": "test@example.com",
      "phone": "555-1234",
      "message": "Test message"
    }
  }'
```

- [ ] Verify 200 response with leadId
- [ ] `client_leads` table has entry
- [ ] Lead appears in portal dashboard

### Origin Validation
- [ ] Test with wrong origin header - should return 403
- [ ] Test with staging URL origin - should work for IN_REVIEW projects

### Rate Limiting
- [ ] Send 6 requests rapidly - 6th should get 429

### Analytics Pixel (`POST /api/analytics/pixel`)

```bash
curl -X POST https://YOUR_CONVEX_URL/api/analytics/pixel \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-live-url.com" \
  -d '{
    "projectId": "PROJECT_ID_HERE",
    "path": "/test-page"
  }'
```

- [ ] Verify 204 response
- [ ] `client_analytics` table updated (daily aggregate)
- [ ] Top pages includes the path

---

## 11. Cal.com Webhook Integration

### Booking Created
- [ ] Complete a booking on Cal.com
- [ ] Verify webhook received at `/cal-webhook`
- [ ] Correct table updated:
  - Prospect call: `prospects.calProspectBooking`
  - Kickoff: `projects.calKickoffBooking`
  - Review: `projects.calReviewBooking`
- [ ] `scheduled_calls` entry created
- [ ] `activity_log` entry: `call.booked`

### Booking Rescheduled
- [ ] Reschedule an existing booking
- [ ] Verify `call.rescheduled` activity log entry
- [ ] Times updated in relevant table

### Booking Cancelled
- [ ] Cancel a booking
- [ ] Verify `call.canceled` activity log entry

---

## 12. Email Sending (Resend)

- [ ] **Magic link email**: Arrives with correct formatting
- [ ] **Welcome/payment success email**: Sent after checkout (verify in Resend dashboard)
- [ ] **Lead notification**: Triggered when lead submitted via template site

---

## 13. File Storage (Convex)

### Upload Flow
- [ ] Logo uploads work in build details
- [ ] Multiple brand images upload
- [ ] Edit request attachments upload
- [ ] Files accessible via signed URLs

### Authorization
- [ ] Signed URLs work for correct project
- [ ] Cannot access files from other projects (test by manipulating storage IDs)

---

## 14. Error Handling and Edge Cases

### Authentication Errors
- [ ] Visit `/portal/agreement` without session ID - shows appropriate error
- [ ] Visit `/portal/agreement` with invalid session ID - shows error
- [ ] Visit `/portal/autherror` - displays error content

### Authorization Errors
- [ ] Attempt to access another user's project - redirects or shows error
- [ ] Non-admin accessing `/admin` - blocked appropriately

### Network/API Errors
- [ ] Stripe checkout fails gracefully with user-friendly error
- [ ] Convex mutations show appropriate error toasts on failure

### Validation
- [ ] Required fields show validation errors
- [ ] File upload rejects invalid types
- [ ] File upload rejects oversized files
- [ ] URL input validates format

---

## 15. Responsive Design / Cross-Browser

### Mobile (iOS Safari, Android Chrome)
- [ ] Landing page renders correctly
- [ ] Mobile menu works
- [ ] Portal pages are usable
- [ ] Forms are accessible on small screens
- [ ] Touch interactions work

### Tablet
- [ ] Layouts adapt appropriately
- [ ] Admin tables are scrollable/usable

### Desktop Browsers
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Dark Mode
- [ ] All pages render correctly in dark mode
- [ ] Theme toggle persists preference
- [ ] No contrast/readability issues

---

## 16. Performance Checks

- [ ] Landing page loads in < 3 seconds
- [ ] PageSpeed Insights score > 90 for mobile
- [ ] No console errors on page load
- [ ] No memory leaks during session

---

## Post-Testing Checklist

Before going live:
- [ ] All critical paths tested successfully
- [ ] No blocking bugs identified
- [ ] Stripe keys ready to switch to live mode
- [ ] Cal.com webhooks configured for production
- [ ] Environment variables verified for production
- [ ] Domain and DNS configured
- [ ] SSL certificates active

---

## Notes

Use this document to track testing progress. Mark items with `[x]` when verified. Document any issues found in a separate bug tracking system or notes file.

**Test Date:** _______________  
**Tester:** _______________  
**Environment:** _______________  
