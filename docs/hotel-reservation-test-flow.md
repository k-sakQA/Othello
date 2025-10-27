# Hotel Reservation Page - Test Flow Diagram

Visual representation of test flows and scenarios for the hotel reservation page.

---

## Complete User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     HOTEL PLANISPHERE                            │
│                     Plans Page (plans.html)                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ User clicks "このプランで予約"
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│              RESERVATION PAGE (reserve.html?plan-id=0)           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Required Fields                                           │  │
│  │  • Check-in Date (宿泊日) ─────────────────→ [e16]       │  │
│  │  • Stay Duration (宿泊数) ─────────────────→ [e22]       │  │
│  │  • Guest Count (人数) ─────────────────────→ [e29]       │  │
│  │  • Guest Name (氏名) ──────────────────────→ [e48]       │  │
│  │  • Contact Preference (確認のご連絡) ─────→ [e52]       │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Optional Add-ons (+¥1,000 each)                          │  │
│  │  ☐ Breakfast (朝食バイキング) ────────────→ [e35]       │  │
│  │  ☐ Early Check-in (昼からチェックイン) ──→ [e39]       │  │
│  │  ☐ Sightseeing (お得な観光プラン) ────────→ [e43]       │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Optional Comments                                         │  │
│  │  [ご要望・ご連絡事項等...] ────────────────→ [e55]       │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Dynamic Price Display                                     │  │
│  │  合計: ¥XX,XXX円 ──────────────────────────→ [e58]       │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [予約内容を確認する] Submit Button ──────→ [e59]         │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                ┌───────┴───────┐
                │               │
        Valid Data       Invalid Data
                │               │
                ↓               ↓
┌───────────────────────┐  ┌─────────────────────────┐
│  CONFIRMATION PAGE    │  │  ERROR MESSAGES         │
│  (confirm.html)       │  │  • Validation errors    │
│  • Review all data    │  │  • Stay on same page    │
│  • Final confirm      │  │  • Highlight fields     │
│  • Complete booking   │  │  • Show error messages  │
└───────────────────────┘  └─────────────────────────┘
```

---

## Test Coverage by Form Section

```
┌─────────────────────────────────────────────────────────────────┐
│                         RESERVATION FORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SECTION 1: REQUIRED FIELDS                                     │
│  ════════════════════════════════════════════════════════════   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ [宿泊日] Check-in Date                                  │    │
│  │  ✓ Valid dates (tomorrow to +89 days)                 │    │
│  │  ✓ Invalid: past dates                        [2.1-2.3]│    │
│  │  ✓ Invalid: beyond 3 months                            │    │
│  │  ✓ Edge: today, tomorrow, +89 days                     │    │
│  │  ✓ Edge: leap year, year-end              [8.5-8.7]   │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ [宿泊数] Stay Duration                                  │    │
│  │  ✓ Valid: 1-9 nights                          [2.4]   │    │
│  │  ✓ Invalid: 0, negative, >9                   [2.5]   │    │
│  │  ✓ Boundary: 0, 1, 9, 10                      [2.6]   │    │
│  │  ✓ Decimal, non-numeric                       [2.5]   │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ [人数] Guest Count                                      │    │
│  │  ✓ Valid: 1-9 guests                          [2.7]   │    │
│  │  ✓ Invalid: 0, negative, >9                   [2.8]   │    │
│  │  ✓ Room capacity check (if exists)            [2.9]   │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ [氏名] Guest Name                                       │    │
│  │  ✓ Hiragana, Katakana, Kanji                  [2.10]  │    │
│  │  ✓ English (half/full width)                  [2.10]  │    │
│  │  ✓ Special chars (・, -, space)               [2.10]  │    │
│  │  ✓ Security: XSS, SQL injection               [2.11]  │    │
│  │  ✓ Length: 1-50 chars (approx)                [2.12]  │    │
│  │  ✓ Empty/required validation                  [2.13]  │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ [確認のご連絡] Contact Preference                        │    │
│  │  ✓ Valid: 希望しない                          [2.14]  │    │
│  │  ✓ Valid: メールでのご連絡                     [2.14]  │    │
│  │  ✓ Valid: 電話でのご連絡                       [2.14]  │    │
│  │  ✓ Invalid: 選択してください (default)         [2.15]  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  SECTION 2: OPTIONAL ADD-ONS                                    │
│  ════════════════════════════════════════════════════════════   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ ☐ [朝食バイキング] Breakfast                            │    │
│  │ ☐ [昼からチェックインプラン] Early Check-in             │    │
│  │ ☐ [お得な観光プラン] Sightseeing                        │    │
│  │                                                         │    │
│  │  ✓ Single selection                           [2.16]  │    │
│  │  ✓ Multiple selections                        [2.17]  │    │
│  │  ✓ No selections (all unchecked)              [2.18]  │    │
│  │  ✓ Price calculation update                   [1.4]   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  SECTION 3: OPTIONAL COMMENTS                                   │
│  ════════════════════════════════════════════════════════════   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ [ご要望・ご連絡事項等...] Comments field                 │    │
│  │  ✓ Empty (truly optional)                     [2.19]  │    │
│  │  ✓ Short/medium/long text                     [2.19]  │    │
│  │  ✓ Special characters                         [2.19]  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  SECTION 4: PRICE DISPLAY                                       │
│  ════════════════════════════════════════════════════════════   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 合計: ¥XX,XXX円                                          │    │
│  │  ✓ Initial price (¥7,000)                     [1.1]   │    │
│  │  ✓ Updates on duration change                 [1.4]   │    │
│  │  ✓ Updates on guest count change              [1.4]   │    │
│  │  ✓ Updates on add-on selection                [1.4]   │    │
│  │  ✓ Correct calculation                        [1.4]   │    │
│  │  ✓ Weekend surcharge (if applicable)          [1.4]   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  SECTION 5: SUBMIT BUTTON                                       │
│  ════════════════════════════════════════════════════════════   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ [予約内容を確認する] Submit                              │    │
│  │  ✓ Valid submission → confirm page            [3.1]   │    │
│  │  ✓ Invalid → errors shown                     [3.2]   │    │
│  │  ✓ Double-click prevention                    [3.8]   │    │
│  │  ✓ Loading state                              [3.9]   │    │
│  │  ✓ Keyboard accessible (Enter)                [6.1]   │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Test Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      VALIDATION TESTING FLOW                      │
└──────────────────────────────────────────────────────────────────┘

START
  │
  ↓
┌─────────────────────────┐
│ Navigate to Page        │ [1.1] Page loads correctly
│ verify.html?plan-id=0   │ All elements visible
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Test: All Fields Empty  │ [3.2] Submit with empty form
└────────┬────────────────┘
         │
         ├─→ ✓ Check-in date error shown
         ├─→ ✓ Stay duration error shown
         ├─→ ✓ Guest count error shown
         ├─→ ✓ Guest name error shown
         └─→ ✓ Contact preference error shown
         │
         ↓
┌─────────────────────────┐
│ Test: Partial Fill      │ [3.3] Some fields valid, some empty
└────────┬────────────────┘
         │
         ├─→ ✓ Filled fields: No error
         └─→ ✓ Empty fields: Error shown
         │
         ↓
┌─────────────────────────┐
│ Test: Invalid Values    │ [2.2, 2.3, 2.5, 2.8, 2.11]
└────────┬────────────────┘
         │
         ├─→ Past date → Error
         ├─→ Beyond 3 months → Error
         ├─→ Stay=0 → Error
         ├─→ Guests=10 → Error
         ├─→ XSS attempt → Blocked/Sanitized
         └─→ SQL injection → Blocked
         │
         ↓
┌─────────────────────────┐
│ Test: Boundary Values   │ [2.6] Edge cases
└────────┬────────────────┘
         │
         ├─→ Stay=1 (min) → Accept
         ├─→ Stay=9 (max) → Accept
         ├─→ Stay=0 (min-1) → Reject
         └─→ Stay=10 (max+1) → Reject
         │
         ↓
┌─────────────────────────┐
│ Test: Valid Submission  │ [3.1] Happy path
└────────┬────────────────┘
         │
         └─→ All valid data → Navigate to confirm page
         │
         ↓
       END
```

---

## Price Calculation Test Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                  PRICE CALCULATION TEST FLOW                      │
└──────────────────────────────────────────────────────────────────┘

Initial State
  │
  ├─→ Nights: 1, Guests: 1, Add-ons: 0
  └─→ Price: ¥7,000 ✓
  │
  ↓
Change Nights to 2
  │
  ├─→ Nights: 2, Guests: 1, Add-ons: 0
  └─→ Price: ¥14,000 (7,000 × 2) ✓
  │
  ↓
Change Guests to 2
  │
  ├─→ Nights: 2, Guests: 2, Add-ons: 0
  └─→ Price: ¥28,000 (7,000 × 2 × 2) ✓
  │
  ↓
Add Breakfast (+¥1,000/guest × nights)
  │
  ├─→ Nights: 2, Guests: 2, Add-ons: 1
  └─→ Price: ¥32,000 (28,000 + 1,000×2×2) ✓
  │
  ↓
Add Early Check-in (+¥1,000/guest × nights)
  │
  ├─→ Nights: 2, Guests: 2, Add-ons: 2
  └─→ Price: ¥36,000 (28,000 + 1,000×2×2×2) ✓
  │
  ↓
Add Sightseeing (+¥1,000/guest × nights)
  │
  ├─→ Nights: 2, Guests: 2, Add-ons: 3
  └─→ Price: ¥40,000 (28,000 + 1,000×2×2×3) ✓
  │
  ↓
Uncheck All Add-ons
  │
  ├─→ Nights: 2, Guests: 2, Add-ons: 0
  └─→ Price: ¥28,000 (back to base) ✓
  │
  ↓
Maximum Values Test
  │
  ├─→ Nights: 9, Guests: 9, Add-ons: 3
  └─→ Price: ¥810,000
      │
      └─→ Base: 7,000 × 9 × 9 = ¥567,000
          Add-ons: 1,000 × 3 × 9 × 9 = ¥243,000
          Total: ¥810,000 ✓
```

---

## State Transition Test Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   STATE TRANSITION TEST FLOW                      │
└──────────────────────────────────────────────────────────────────┘

┌─────────────┐
│ Plans Page  │
└──────┬──────┘
       │ Select Plan
       ↓
┌─────────────────────────┐
│ Reservation Page        │ State: Empty Form
│ (plan-id=0 in URL)      │ [4.1] Verify plan-id param
└────────┬────────────────┘
         │ Fill form
         ↓
┌─────────────────────────┐
│ Form Partially Filled   │ State: Partial Data
└────────┬────────────────┘
         │
         ├─→ [4.4] Click logo → Navigate away
         │   └─→ [4.2] Refresh → Data may be lost
         │
         │ Complete form
         ↓
┌─────────────────────────┐
│ Form Complete           │ State: Ready to Submit
└────────┬────────────────┘
         │ Submit
         ↓
┌─────────────────────────┐
│ Confirmation Page       │ State: Review
│                         │ [10.3] Verify data accuracy
└────────┬────────────────┘
         │
         ├─→ [3.7] Click 戻る button
         │   └─→ Return to form
         │       └─→ [3.6, 3.7] Verify data preserved ✓
         │
         ├─→ [3.6] Browser back button
         │   └─→ Return to form
         │       └─→ Verify data preserved ✓
         │
         │ Final confirm
         ↓
┌─────────────────────────┐
│ Booking Complete        │ State: Confirmed
│                         │ [10.4] Success message
└─────────────────────────┘
```

---

## Security Testing Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      SECURITY TEST FLOW                           │
└──────────────────────────────────────────────────────────────────┘

[11.1] HTTPS/TLS Check
  │
  └─→ Verify: https:// in URL ✓
      Verify: Valid certificate ✓
      Verify: No mixed content ✓

[11.2] XSS Prevention
  │
  ├─→ Input: <script>alert('XSS')</script> in name field
  ├─→ Input: <img src=x onerror=alert('XSS')> in comments
  └─→ Verify: Script not executed ✓
      Verify: HTML escaped/sanitized ✓

[11.3] SQL Injection Prevention
  │
  ├─→ Input: ' OR '1'='1 in name field
  ├─→ Input: '; DROP TABLE reservations; -- in comments
  └─→ Verify: No SQL error ✓
      Verify: Treated as literal string ✓

[11.4] CSRF Protection
  │
  └─→ Inspect: Form has CSRF token
      Verify: Token validated on submit ✓

[11.5] Data Exposure Check
  │
  ├─→ Check: No sensitive data in URLs
  ├─→ Check: No sensitive data in JavaScript
  └─→ Verify: Data transmitted over HTTPS ✓

[8.4] URL Parameter Security
  │
  ├─→ Test: ?plan-id=<script>alert(1)</script>
  ├─→ Test: ?plan-id='; DROP TABLE
  └─→ Verify: Invalid params handled safely ✓
      Verify: No code execution ✓
```

---

## Cross-Browser Test Matrix

```
┌──────────────────────────────────────────────────────────────────┐
│                  CROSS-BROWSER TEST MATRIX                        │
└──────────────────────────────────────────────────────────────────┘

             Chrome  Firefox  Safari  Edge  Mobile
             ────────────────────────────────────────
[5.1]  ✓       P0      P1      P2     P1    P1      Page Load
[5.1]  ✓       P0      P1      P2     P1    P1      Form Input
[5.1]  ✓       P0      P1      P2     P1    P1      Validation
[5.1]  ✓       P0      P1      P2     P1    P1      Submission
[5.4]  ✓       P0      P1      P2     P1    P1      Date Picker
[5.4]  ✓       P0      P1      P2     P1    P1      Number Input
[1.2]  ✓       P1      P1      P2     P1    P0      Responsive
[6.1]  ✓       P1      P1      P2     P1    P1      Keyboard Nav
[1.4]  ✓       P0      P1      P2     P1    P1      Price Calc

Legend:
  P0 = Critical (must test)
  P1 = High (should test)
  P2 = Medium (nice to test)
```

---

## Accessibility Test Checklist

```
┌──────────────────────────────────────────────────────────────────┐
│                   ACCESSIBILITY TEST FLOW                         │
└──────────────────────────────────────────────────────────────────┘

[6.1] Keyboard Navigation
  │
  ├─→ Tab through all fields ✓
  ├─→ Shift+Tab backwards ✓
  ├─→ Space to toggle checkboxes ✓
  ├─→ Enter to submit form ✓
  ├─→ Arrow keys in select dropdown ✓
  └─→ Tab order is logical ✓

[6.2] Screen Reader
  │
  ├─→ Labels announced ✓
  ├─→ Required fields announced ✓
  ├─→ Error messages announced ✓
  ├─→ Field types identified ✓
  └─→ Instructions clear ✓

[6.3] Focus Indicators
  │
  ├─→ Visible on all interactive elements ✓
  ├─→ Sufficient contrast ✓
  └─→ Doesn't obscure content ✓

[6.4] Color Contrast
  │
  ├─→ Body text: 4.5:1 minimum ✓
  ├─→ Labels: 4.5:1 minimum ✓
  ├─→ Required badges: 3:1 minimum ✓
  ├─→ Error messages: 4.5:1 minimum ✓
  └─→ Buttons: 4.5:1 minimum ✓

[6.5] Semantic HTML
  │
  ├─→ Form labels properly associated ✓
  ├─→ Required fields marked aria-required ✓
  ├─→ Error messages linked via aria-describedby ✓
  ├─→ Fieldset/legend for grouped items ✓
  └─→ Proper heading hierarchy ✓
```

---

## Test Execution Priority Flowchart

```
┌──────────────────────────────────────────────────────────────────┐
│                   TEST EXECUTION STRATEGY                         │
└──────────────────────────────────────────────────────────────────┘

On Every Commit:
  │
  ├─→ Run P0 Tests (20 scenarios, ~60 min)
  │   │
  │   ├─→ All pass? → ✓ Merge allowed
  │   └─→ Any fail? → ✗ Block merge, fix required
  │
  ↓

On Pull Request:
  │
  ├─→ Run P0 + P1 Tests (45 scenarios, ~135 min)
  │   │
  │   ├─→ P0 all pass? → Check P1 results
  │   │   ├─→ P1 all pass? → ✓ Approve PR
  │   │   └─→ P1 failures? → ⚠ Review required
  │   │
  │   └─→ P0 any fail? → ✗ Block PR, must fix
  │
  ↓

Nightly Build:
  │
  ├─→ Run P0 + P1 + P2 Tests (65 scenarios, ~225 min)
  │   │
  │   ├─→ Generate report
  │   ├─→ Email team
  │   ├─→ Track trends
  │   └─→ Identify flaky tests
  │
  ↓

Weekly Build:
  │
  └─→ Run All Tests (82 scenarios, ~302 min)
      │
      ├─→ Full browser matrix
      ├─→ Performance benchmarks
      ├─→ Security scans
      └─→ Accessibility audit
```

---

## Legend and Reference

```
┌──────────────────────────────────────────────────────────────────┐
│                      SYMBOL LEGEND                                │
└──────────────────────────────────────────────────────────────────┘

✓  = Test passed / Requirement met
✗  = Test failed / Blocked
⚠  = Warning / Needs review
☐  = Checkbox (unchecked)
☑  = Checkbox (checked)
[X.X] = Test scenario reference number
[eXX] = Element reference (from MCP snapshot)
→  = Flow direction / Navigation
├─→ = Branch in flow
└─→ = Final branch / End of sequence

Priority Levels:
  P0 = Critical (must pass before release)
  P1 = High (should pass before release)
  P2 = Medium (regular testing)
  P3 = Low (periodic testing)

Timing:
  ~60 min  = Estimated execution time for P0 tests
  ~135 min = Estimated execution time for P0+P1 tests
  ~225 min = Estimated execution time for P0+P1+P2 tests
  ~302 min = Estimated execution time for all tests
```

---

## Quick Test Scenario Reference

```
UI Display (1.x):        Page appearance, responsiveness, price display
Input Fields (2.x):      Field validation, character types, boundaries
Form Submission (3.x):   Submission flow, validation messages, state
State Transitions (4.x): Navigation, data preservation, parameters
Cross-Browser (5.x):     Browser compatibility matrix
Accessibility (6.x):     Keyboard, screen reader, ARIA, contrast
Performance (7.x):       Load time, calculation speed
Edge Cases (8.x):        Network errors, concurrent use, special dates
Localization (9.x):      Language, date format, currency
Integration (10.x):      Page flow, data accuracy, booking completion
Security (11.x):         HTTPS, XSS, SQL injection, CSRF, data exposure
Stress Testing (12.x):   Rapid submission, large inputs, unusual config
```

---

**END OF FLOW DIAGRAM**
