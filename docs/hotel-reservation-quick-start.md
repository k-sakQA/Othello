# Hotel Reservation Page - Test Automation Quick Start Guide

**Quick Reference** for implementing automated tests for the hotel reservation page using Playwright + Othello MCP.

---

## Table of Contents

1. [Quick Overview](#quick-overview)
2. [Getting Started](#getting-started)
3. [Essential Element References](#essential-element-references)
4. [Common Test Patterns](#common-test-patterns)
5. [Priority Test Execution](#priority-test-execution)
6. [Troubleshooting](#troubleshooting)

---

## Quick Overview

### Test Target
- **URL**: https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0
- **Page Type**: Hotel reservation form
- **Language**: Japanese
- **Form Type**: Multi-field reservation with validation

### Key Test Areas
- ✅ Form field validation (5 required fields)
- ✅ Dynamic price calculation
- ✅ Optional add-ons (3 checkboxes)
- ✅ Form submission and navigation
- ✅ Error handling and messaging

---

## Getting Started

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps chromium

# Verify Playwright installation
npx playwright --version
```

### Run Your First Test

```bash
# Run all hotel reservation tests
npx playwright test tests/hotel-reservation.spec.js

# Run in headed mode (see browser)
npx playwright test tests/hotel-reservation.spec.js --headed

# Run with UI mode (interactive)
npx playwright test tests/hotel-reservation.spec.js --ui

# Run specific test
npx playwright test -g "正常値で予約フォームを送信できる"
```

### View Test Results

```bash
# View HTML report
npx playwright show-report

# View last test run trace
npx playwright show-trace trace.zip
```

---

## Essential Element References

### Form Fields (Required)

These are the **ref** identifiers for interacting with form elements using Othello MCP:

```javascript
const REFS = {
  // Required input fields
  checkInDate: 'e16',      // textbox "宿泊日 必須"
  stayDuration: 'e22',     // spinbutton "宿泊数 必須"
  guestCount: 'e29',       // spinbutton "人数 必須"
  guestName: 'e48',        // textbox "氏名 必須"
  contactPref: 'e52',      // combobox "確認のご連絡 必須"

  // Optional add-ons
  breakfastCheckbox: 'e35',      // "朝食バイキング"
  earlyCheckInCheckbox: 'e39',   // "昼からチェックインプラン"
  sightseeingCheckbox: 'e43',    // "お得な観光プラン"

  // Optional fields
  commentsField: 'e55',    // textbox for comments

  // Actions
  submitButton: 'e59',     // "予約内容を確認する"

  // Display elements
  priceDisplay: 'e58',     // Total price status
  planName: 'e8',          // "お得な特典付きプラン"
};
```

### Using Refs in Tests

```javascript
// Example: Fill check-in date
await page.fill('[aria-label="宿泊日 必須"]', '2025-11-01');
// Or using ref with MCP (preferred in Othello):
await mcpClient.callTool('browser_type', {
  element: '宿泊日入力欄',
  ref: 'e16',
  text: '2025-11-01',
  intent: '宿泊日を入力'
});
```

---

## Common Test Patterns

### Pattern 1: Fill Complete Form (Happy Path)

```javascript
test('Complete reservation form successfully', async ({ page }) => {
  // Navigate to page
  await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');

  // Calculate tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().split('T')[0];

  // Fill required fields
  await page.fill('input[name="reserve_date"]', dateString);
  await page.fill('input[name="reserve_term"]', '2');
  await page.fill('input[name="head_count"]', '2');
  await page.fill('input[name="username"]', '山田太郎');
  await page.selectOption('select[name="contact"]', 'email');

  // Submit form
  await page.click('button[type="submit"]');

  // Verify navigation to confirmation page
  await expect(page).toHaveURL(/confirm/);
});
```

### Pattern 2: Verify Required Field Validation

```javascript
test('Show errors for empty required fields', async ({ page }) => {
  await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');

  // Submit without filling any fields
  await page.click('button[type="submit"]');

  // Verify error messages appear
  const errors = page.locator('.error, [role="alert"]');
  await expect(errors.first()).toBeVisible();

  // Verify form did not navigate away
  await expect(page).toHaveURL(/reserve/);
});
```

### Pattern 3: Test Dynamic Price Calculation

```javascript
test('Price updates when form values change', async ({ page }) => {
  await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');

  // Get initial price (should be 7,000円 for 1 night, 1 person)
  const initialPrice = await page.locator('[role="status"]').textContent();
  expect(initialPrice).toContain('7,000');

  // Change to 2 nights
  await page.fill('input[name="reserve_term"]', '2');

  // Verify price doubled (14,000円)
  await expect(page.locator('[role="status"]')).toContainText('14,000');

  // Change to 2 guests
  await page.fill('input[name="head_count"]', '2');

  // Verify price quadrupled (28,000円)
  await expect(page.locator('[role="status"]')).toContainText('28,000');

  // Add breakfast add-on (+2,000 per person × 2 nights = +4,000)
  await page.check('input[value="breakfast"]');

  // Verify price increased to 32,000円
  await expect(page.locator('[role="status"]')).toContainText('32,000');
});
```

### Pattern 4: Test Character Type Input

```javascript
test('Accept various Japanese character types in name', async ({ page }) => {
  await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');

  const testCases = [
    { value: 'やまだたろう', label: 'Hiragana' },
    { value: 'ヤマダタロウ', label: 'Katakana' },
    { value: '山田太郎', label: 'Kanji' },
    { value: 'Yamada Taro', label: 'English' },
  ];

  for (const testCase of testCases) {
    await page.fill('input[name="username"]', '');
    await page.fill('input[name="username"]', testCase.value);

    const inputValue = await page.inputValue('input[name="username"]');
    expect(inputValue).toBe(testCase.value);
  }
});
```

### Pattern 5: Test Form State Preservation

```javascript
test('Preserve form data when navigating back', async ({ page }) => {
  await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');

  // Fill form
  const testName = '山田太郎';
  await page.fill('input[name="username"]', testName);
  await page.fill('input[name="reserve_term"]', '3');

  // Fill other required fields and submit
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.fill('input[name="reserve_date"]', tomorrow.toISOString().split('T')[0]);
  await page.fill('input[name="head_count"]', '2');
  await page.selectOption('select[name="contact"]', 'email');
  await page.click('button[type="submit"]');

  // Wait for confirmation page
  await page.waitForURL(/confirm/);

  // Go back
  await page.goBack();

  // Verify data preserved
  const nameValue = await page.inputValue('input[name="username"]');
  expect(nameValue).toBe(testName);

  const termValue = await page.inputValue('input[name="reserve_term"]');
  expect(termValue).toBe('3');
});
```

### Pattern 6: Test Boundary Values

```javascript
test('Accept boundary values for stay duration', async ({ page }) => {
  await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');

  // Test minimum (1)
  await page.fill('input[name="reserve_term"]', '1');
  let value = await page.inputValue('input[name="reserve_term"]');
  expect(value).toBe('1');

  // Test maximum (9)
  await page.fill('input[name="reserve_term"]', '9');
  value = await page.inputValue('input[name="reserve_term"]');
  expect(value).toBe('9');
});

test('Reject out-of-bounds values for stay duration', async ({ page }) => {
  await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');

  // Fill other required fields
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.fill('input[name="reserve_date"]', tomorrow.toISOString().split('T')[0]);
  await page.fill('input[name="username"]', '山田太郎');
  await page.fill('input[name="head_count"]', '2');
  await page.selectOption('select[name="contact"]', 'email');

  // Try invalid value (0)
  await page.fill('input[name="reserve_term"]', '0');
  await page.click('button[type="submit"]');

  // Verify error appears
  const errors = page.locator('.error, [role="alert"]');
  await expect(errors.first()).toBeVisible();
});
```

---

## Priority Test Execution

### P0 Tests (Must Run on Every Commit)

Estimated time: ~15 minutes

```bash
# Run only P0 tagged tests
npx playwright test --grep @p0

# Or run specific critical tests
npx playwright test tests/hotel-reservation/input-validation.spec.js
npx playwright test tests/hotel-reservation/form-submission.spec.js
```

**P0 Test List**:
- Page loads correctly
- All required fields validate
- Valid form submission succeeds
- Price calculation is accurate
- Security: XSS/SQL injection prevented

### P1 Tests (Run on Pull Requests)

Estimated time: ~30 minutes

```bash
# Run P0 and P1 tests
npx playwright test --grep "@p0|@p1"
```

**P1 Test List**:
- Responsive design works
- Various character types accepted
- Error messages are clear
- Browser back preserves data
- Cross-browser compatibility

### Quick Smoke Test

Run this before any commit:

```bash
npx playwright test tests/hotel-reservation/smoke.spec.js --headed
```

Create `smoke.spec.js`:
```javascript
const { test, expect } = require('@playwright/test');

test('Smoke test: Complete happy path', async ({ page }) => {
  await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().split('T')[0];

  await page.fill('input[name="reserve_date"]', dateString);
  await page.fill('input[name="reserve_term"]', '2');
  await page.fill('input[name="head_count"]', '2');
  await page.fill('input[name="username"]', '山田太郎');
  await page.selectOption('select[name="contact"]', 'email');

  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/confirm/);
});
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Tests Fail with "Element not found"

**Cause**: Element selectors may have changed, or page hasn't loaded.

**Solution**:
```javascript
// Add explicit waits
await page.waitForLoadState('networkidle');
await page.waitForSelector('input[name="username"]');

// Or use Playwright's auto-waiting with locator
const nameInput = page.locator('input[name="username"]');
await nameInput.fill('山田太郎');
```

#### Issue 2: Date Input Fails

**Cause**: Date format may vary by browser or input type.

**Solution**:
```javascript
// Use ISO format (YYYY-MM-DD)
const dateString = '2025-11-01';
await page.fill('input[name="reserve_date"]', dateString);

// Or click and type
await page.click('input[name="reserve_date"]');
await page.keyboard.type(dateString);
```

#### Issue 3: Form Submits Before Validation

**Cause**: JavaScript may be disabled or validation not triggering.

**Solution**:
```javascript
// Wait for validation to complete
await page.click('button[type="submit"]');
await page.waitForTimeout(500); // Brief wait for validation

// Or wait for specific error element
await page.waitForSelector('.error, [role="alert"]', { timeout: 3000 });
```

#### Issue 4: Price Calculation Incorrect

**Cause**: Formula may be different than expected, or timing issue.

**Solution**:
```javascript
// Wait for price update
await page.fill('input[name="reserve_term"]', '2');
await page.waitForFunction(() => {
  const priceElement = document.querySelector('[role="status"]');
  return priceElement && priceElement.textContent.includes('14,000');
});
```

#### Issue 5: Flaky Tests

**Cause**: Network timing, async operations.

**Solution**:
```javascript
// Use Playwright's built-in retry
test.describe.configure({ retries: 2 });

// Or increase timeout for specific actions
await expect(page.locator('[role="status"]')).toContainText('28,000', { timeout: 10000 });
```

### Debug Mode

```bash
# Run with debug mode
npx playwright test --debug

# Run with headed browser and slow motion
npx playwright test --headed --slow-mo=500

# Run with full trace
npx playwright test --trace on
```

### Viewing Traces

```bash
# After test run with --trace on
npx playwright show-trace test-results/path-to-test/trace.zip
```

---

## Test Data Helpers

### Create Reusable Helper Functions

Create `tests/helpers/date-helpers.js`:

```javascript
module.exports = {
  getTomorrow() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  },

  addDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  },

  getYesterday() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  },

  isWeekend(dateString) {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }
};
```

Use in tests:

```javascript
const { getTomorrow, addDays } = require('./helpers/date-helpers');

test('Book for tomorrow', async ({ page }) => {
  await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');
  await page.fill('input[name="reserve_date"]', getTomorrow());
  // ...
});
```

---

## Next Steps

1. **Start with Smoke Test**: Implement and verify the basic happy path works
2. **Add P0 Tests**: Cover critical validation and security scenarios
3. **Expand to P1**: Add comprehensive input validation tests
4. **Set Up CI/CD**: Integrate with GitHub Actions or similar
5. **Monitor and Maintain**: Track flaky tests, update refs as needed

---

## Additional Resources

- **Full Test Plan**: See `hotel-reservation-comprehensive-test-plan.md`
- **Test Matrix**: See `hotel-reservation-test-matrix.csv`
- **Playwright Docs**: https://playwright.dev/
- **Test Site Source**: https://github.com/takeyaqa/hotel-example-site

---

**Quick Reference Card**

```
URL: https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0

Required Fields:
- Check-in Date (e16): YYYY-MM-DD within 3 months
- Stay Duration (e22): 1-9 nights
- Guest Count (e29): 1-9 people
- Guest Name (e48): Japanese/English text
- Contact Preference (e52): 希望しない | メールでのご連絡 | 電話でのご連絡

Optional Add-ons (¥1,000 each per person):
- Breakfast (e35)
- Early Check-in (e39)
- Sightseeing (e43)

Price Formula:
  base_price = 7,000 × nights × guests
  addon_price = 1,000 × addon_count × guests × nights
  total = base_price + addon_price

Submit Button: e59 → Navigates to confirmation page
```
