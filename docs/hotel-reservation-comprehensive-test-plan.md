# Hotel Reservation Page - Comprehensive Test Plan

**Test Target URL**: https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0
**Created Date**: 2025-10-26
**Test Automation Framework**: Playwright + Othello MCP
**Language**: Japanese (UI) / English (Documentation)

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Page Structure and Elements](#page-structure-and-elements)
3. [Test Scenarios](#test-scenarios)
4. [Test Data](#test-data)
5. [Automation Strategy](#automation-strategy)
6. [Known Issues and Risks](#known-issues-and-risks)

---

## Application Overview

### System Description

The Hotel Reservation Page (reserve.html?plan-id=0) is a form-based interface for booking hotel accommodations. It is part of the HOTEL PLANISPHERE test automation practice site. The page allows users to:

- Select check-in dates and duration of stay
- Specify number of guests
- Choose optional add-on services
- Enter contact information
- Submit reservation for confirmation

### Target Plan Details

**Plan Name**: お得な特典付きプラン (Special Offer Plan)
**Base Price**: ¥7,000 per person per night
**Pricing Rules**:
- Weekends: 25% surcharge
- Guest Range: 1-9 people
- Maximum Stay: 9 nights

**Room Type**: スタンダードツイン (Standard Twin)
- Capacity: 1-2 people
- Size: 18㎡
- Features: Unit bath/toilet, independent washbasin

### Key Features

1. **Required Input Fields**:
   - Check-in Date (宿泊日) - Date picker with 3-month advance booking limit
   - Stay Duration (宿泊数) - Spinner input (1-9 nights)
   - Number of Guests (人数) - Spinner input (1-9 people)
   - Guest Name (氏名) - Text input
   - Contact Preference (確認のご連絡) - Dropdown selection

2. **Optional Add-ons** (¥1,000 per person each):
   - Breakfast Buffet (朝食バイキング)
   - Early Check-in Plan (昼からチェックインプラン)
   - Sightseeing Plan (お得な観光プラン)

3. **Dynamic Price Calculation**:
   - Real-time total price display
   - Calculation based on: nights × guests × base price + add-ons

4. **Additional Features**:
   - Comments/Requests field (optional)
   - Room details display in iframe
   - Submission button with validation

---

## Page Structure and Elements

### Identified Element References (from Snapshot)

```yaml
Navigation:
  - Hotel Planisphere Logo: ref=e3

Form Fields (Required):
  - Check-in Date Input: ref=e16 (textbox "宿泊日 必須")
  - Stay Duration Input: ref=e22 (spinbutton "宿泊数 必須")
  - Guest Count Input: ref=e29 (spinbutton "人数 必須")
  - Guest Name Input: ref=e48 (textbox "氏名 必須")
  - Contact Preference: ref=e52 (combobox "確認のご連絡 必須")

Optional Add-ons:
  - Breakfast Checkbox: ref=e35
  - Early Check-in Checkbox: ref=e39
  - Sightseeing Checkbox: ref=e43

Other Fields:
  - Comments/Requests: ref=e55 (textbox, optional)

Actions:
  - Submit Button: ref=e59 (button "予約内容を確認する")

Display Elements:
  - Plan Title: ref=e8 ("お得な特典付きプラン")
  - Price Display: ref=e58 (status showing total)
  - Room Details: ref=e62 (iframe with room information)
```

### Form Validation Rules (Observed)

- **Check-in Date**: Must be within 3 months from today, cannot be past dates
- **Stay Duration**: Integer between 1-9
- **Guest Count**: Integer between 1-9
- **Guest Name**: Required, accepts Japanese characters (hiragana, katakana, kanji), English letters, and some symbols
- **Contact Preference**: Must select one option from dropdown (default "選択してください" is invalid)

---

## Test Scenarios

### 1. UI and Display Testing

#### 1.1 Page Load and Initial State

**Seed**: N/A (Direct navigation)

**Objective**: Verify that the page loads correctly with all elements visible and in the correct initial state.

**Steps**:
1. Navigate to `https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0`
2. Wait for page to fully load (networkidle)
3. Verify page title is "宿泊予約 | HOTEL PLANISPHERE - テスト自動化練習サイト"
4. Verify heading "宿泊予約" is displayed
5. Verify plan name "お得な特典付きプラン" is displayed
6. Verify plan description is displayed: "お一人様1泊7,000円〜、土日は25%アップ。1名様〜9名様、最長9泊"
7. Verify all required field labels are present with "必須" badge
8. Verify all form fields are present and enabled
9. Verify submit button "予約内容を確認する" is visible

**Expected Results**:
- Page loads without errors
- All elements are visible and properly positioned
- Required fields show "必須" badge
- Check-in date has help text: "ご予約は3ヶ月以内の日付のみ可能です。"
- Price display shows initial value "7,000円"
- Room details iframe is loaded

**Priority**: P0 (Critical)

---

#### 1.2 Responsive Design Verification

**Objective**: Ensure the page layout adapts properly to different screen sizes.

**Steps**:
1. Navigate to the reservation page
2. Set viewport to Desktop (1920×1080)
   - Verify form layout is horizontal/two-column
   - Verify all elements fit within viewport
   - Take screenshot for baseline
3. Set viewport to Tablet (768×1024)
   - Verify layout adjusts appropriately
   - Verify no horizontal scrolling is required
   - Verify text remains readable
4. Set viewport to Mobile (375×667)
   - Verify layout switches to single column
   - Verify form fields stack vertically
   - Verify buttons are appropriately sized for touch
   - Verify price display remains visible

**Expected Results**:
- Layout responds gracefully to all viewport sizes
- No text truncation or overlap
- All interactive elements remain accessible
- Mobile layout optimized for touch interaction

**Priority**: P1 (High)

---

#### 1.3 Required Field Indicators

**Objective**: Verify that all required fields are properly marked.

**Steps**:
1. Navigate to the reservation page
2. Identify all form fields
3. For each required field, verify "必須" badge is present and visible
4. Verify badge styling (color, position)
5. Verify optional field (comments) does not have "必須" badge

**Expected Results**:
- "必須" badge appears next to: 宿泊日, 宿泊数, 人数, 氏名, 確認のご連絡
- Badge is visually distinct (typically red or highlighted)
- Optional fields do not show required indicator
- Badge position is consistent across all fields

**Priority**: P1 (High)

---

#### 1.4 Price Display Update

**Objective**: Verify that the total price updates dynamically based on form inputs.

**Steps**:
1. Navigate to the reservation page
2. Note initial price display (7,000円)
3. Change "宿泊数" to 2
   - Verify price updates to 14,000円
4. Change "人数" to 2
   - Verify price updates to 28,000円
5. Check "朝食バイキング" checkbox
   - Verify price increases by 2,000円 (1,000 × 2 people) to 30,000円
6. Check "昼からチェックインプラン" checkbox
   - Verify price increases by 2,000円 to 32,000円
7. Check "お得な観光プラン" checkbox
   - Verify price increases by 2,000円 to 34,000円
8. Uncheck all add-ons
   - Verify price returns to 28,000円
9. Test weekend pricing (if applicable)
   - Select a weekend date
   - Verify 25% surcharge is applied

**Expected Results**:
- Price calculation formula: (base_price × nights × guests) + (addon_count × 1000 × guests)
- Price updates immediately upon input change
- Price format displays properly with commas: "34,000円"
- Weekend surcharge is correctly calculated (if date selection triggers it)

**Priority**: P0 (Critical)

---

#### 1.5 Room Details Display

**Objective**: Verify that room information is displayed correctly in the iframe.

**Steps**:
1. Navigate to the reservation page
2. Locate the room details section (iframe)
3. Verify iframe loads successfully
4. Verify room details are visible:
   - Room name: "スタンダードツイン"
   - Room type: "ツイン"
   - Capacity: "1〜2名"
   - Size: "18㎡"
   - Facilities list includes: "ユニット式バス・トイレ", "独立洗面台"

**Expected Results**:
- Iframe loads without errors
- All room details are displayed correctly
- Text is readable and properly formatted
- Facilities are displayed as a list

**Priority**: P2 (Medium)

---

### 2. Input Field Testing

#### 2.1 Check-in Date - Valid Input

**Objective**: Verify that valid dates can be entered in the check-in date field.

**Steps**:
1. Navigate to the reservation page
2. Click on the check-in date field (ref: e16)
3. Test the following date inputs:
   - Tomorrow's date
   - 1 week from today
   - 2 weeks from today
   - 1 month from today
   - 2 months from today
   - 89 days from today (just under 3-month limit)
4. For each date:
   - Clear the field
   - Enter the date in format YYYY-MM-DD or use date picker
   - Verify the date is accepted
   - Verify no error message appears

**Expected Results**:
- All dates within 3-month window are accepted
- Date can be entered manually or selected from picker
- Date format is displayed consistently
- No validation errors for valid dates

**Priority**: P0 (Critical)

**Test Data**:
```javascript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const testDates = [
  tomorrow.toISOString().split('T')[0],  // Tomorrow
  addDays(7),   // +7 days
  addDays(14),  // +14 days
  addDays(30),  // +30 days
  addDays(60),  // +60 days
  addDays(89)   // +89 days (edge case)
];
```

---

#### 2.2 Check-in Date - Invalid Input (Past Dates)

**Objective**: Verify that past dates are rejected with appropriate error messages.

**Steps**:
1. Navigate to the reservation page
2. Attempt to enter the following dates:
   - Yesterday's date
   - 1 week ago
   - Today's date (if current-day booking not allowed)
3. Fill all other required fields with valid data
4. Submit the form
5. Verify error message appears

**Expected Results**:
- Past dates are either prevented from entry or trigger validation error
- Error message clearly states that past dates cannot be selected
- Error message mentions the 3-month advance booking rule
- Form submission is blocked
- Error is displayed near the date field

**Priority**: P0 (Critical)

---

#### 2.3 Check-in Date - Invalid Input (Beyond 3 Months)

**Objective**: Verify that dates beyond 3-month limit are rejected.

**Steps**:
1. Navigate to the reservation page
2. Attempt to enter dates beyond 3-month limit:
   - 91 days from today
   - 100 days from today
   - 6 months from today
3. Fill other required fields with valid data
4. Submit the form
5. Verify error message appears

**Expected Results**:
- Dates beyond 3 months are rejected
- Error message states "ご予約は3ヶ月以内の日付のみ可能です。" or similar
- Form submission is blocked
- Date field is highlighted or marked with error

**Priority**: P0 (Critical)

---

#### 2.4 Stay Duration - Valid Input

**Objective**: Verify valid stay duration values can be entered.

**Steps**:
1. Navigate to the reservation page
2. Click on the stay duration field (ref: e22)
3. Test the following values:
   - 1 night (minimum)
   - 3 nights
   - 5 nights
   - 7 nights
   - 9 nights (maximum)
4. For each value:
   - Clear the field (select all and type)
   - Enter the number
   - Verify it's accepted
   - Verify price updates accordingly

**Expected Results**:
- All values from 1-9 are accepted
- Spinner controls (up/down arrows) work correctly
- Direct keyboard input is accepted
- Price calculation updates correctly
- Field displays "泊" suffix appropriately

**Priority**: P0 (Critical)

---

#### 2.5 Stay Duration - Invalid Input

**Objective**: Verify that invalid stay duration values are rejected.

**Steps**:
1. Navigate to the reservation page
2. Test the following invalid inputs:
   - 0 nights
   - Negative number (-1)
   - 10 nights (exceeds maximum of 9)
   - Decimal value (2.5)
   - Non-numeric text ("three")
   - Empty/blank value
3. For each invalid input:
   - Attempt to enter the value
   - Fill other required fields
   - Submit the form
   - Verify error handling

**Expected Results**:
- Invalid values are either prevented from entry or trigger validation error
- Error message clearly states valid range (1-9 nights)
- HTML5 input type="number" constraints may prevent some inputs
- Form submission is blocked for invalid values
- Clear error message displayed

**Priority**: P0 (Critical)

---

#### 2.6 Stay Duration - Boundary Values

**Objective**: Test boundary values for stay duration.

**Steps**:
1. Navigate to the reservation page
2. Test boundary values:
   - Minimum: 1 night
   - Minimum - 1: 0 nights (should fail)
   - Maximum: 9 nights
   - Maximum + 1: 10 nights (should fail)
3. Verify behavior at each boundary

**Expected Results**:
- Boundary values 1 and 9 are accepted
- Values outside boundaries (0, 10) are rejected
- Edge cases are handled gracefully

**Priority**: P1 (High)

---

#### 2.7 Guest Count - Valid Input

**Objective**: Verify valid guest count values can be entered.

**Steps**:
1. Navigate to the reservation page
2. Click on guest count field (ref: e29)
3. Test the following values:
   - 1 person (minimum)
   - 2 people
   - 4 people
   - 7 people
   - 9 people (maximum)
4. For each value:
   - Clear and enter the number
   - Verify acceptance
   - Verify price calculation updates

**Expected Results**:
- All values 1-9 are accepted
- Spinner controls work correctly
- Keyboard input is accepted
- Price updates: total = base × nights × guests + addons
- Field displays "人" suffix appropriately

**Priority**: P0 (Critical)

---

#### 2.8 Guest Count - Invalid Input

**Objective**: Verify that invalid guest counts are rejected.

**Steps**:
1. Navigate to the reservation page
2. Test invalid inputs:
   - 0 people
   - Negative number (-1)
   - 10 people (exceeds maximum)
   - 100 people (far exceeds maximum)
   - Decimal value (2.5)
   - Non-numeric text
   - Empty value
3. For each:
   - Attempt entry
   - Fill other required fields
   - Submit form
   - Verify error handling

**Expected Results**:
- Invalid values trigger validation errors
- Error message states valid range (1-9 people)
- Form submission blocked
- Clear error indication

**Priority**: P0 (Critical)

---

#### 2.9 Guest Count - Room Capacity Validation

**Objective**: Verify if there's validation against room capacity (Standard Twin: 1-2 people).

**Steps**:
1. Navigate to the reservation page (plan-id=0, Standard Twin room)
2. Enter guest count of 3 or more
3. Fill other required fields
4. Submit the form
5. Check if warning or error appears about exceeding room capacity

**Expected Results**:
- If capacity validation exists: Warning/error appears for 3+ guests
- If no validation: Form accepts any value 1-9
- Document actual behavior for test plan

**Note**: This may not be enforced at plan-id=0 since the plan description states "1名様〜9名様"

**Priority**: P2 (Medium)

---

#### 2.10 Guest Name - Valid Character Types

**Objective**: Verify that various valid character types can be entered in the name field.

**Steps**:
1. Navigate to the reservation page
2. Click on guest name field (ref: e48)
3. Test each of the following character types:
   - Hiragana: "やまだたろう"
   - Katakana: "ヤマダタロウ"
   - Kanji: "山田太郎"
   - Half-width English: "Yamada Taro"
   - Full-width English: "Ｙａｍａｄａ Ｔａｒｏ"
   - Mixed: "山田Taro"
   - With middle dot: "山田・太郎"
   - With space: "山田 太郎"
   - With hyphen: "山田-太郎"
4. For each test case:
   - Clear the field
   - Enter the name
   - Fill other required fields with valid data
   - Submit the form
   - Verify submission succeeds or note error

**Expected Results**:
- All Japanese character types accepted (hiragana, katakana, kanji)
- English letters accepted (both half and full width)
- Spaces accepted
- Common punctuation (・, -, =) accepted
- Form submits successfully for all valid character types
- Input value is preserved through submission

**Priority**: P1 (High)

**Test Data**:
```javascript
const nameTestCases = [
  { value: 'やまだたろう', label: 'Hiragana' },
  { value: 'ヤマダタロウ', label: 'Katakana' },
  { value: '山田太郎', label: 'Kanji' },
  { value: 'Yamada Taro', label: 'English (half-width)' },
  { value: 'Ｙａｍａｄａ Ｔａｒｏ', label: 'English (full-width)' },
  { value: '山田Taro', label: 'Mixed Japanese/English' },
  { value: '山田・太郎', label: 'With middle dot' },
  { value: '山田 太郎', label: 'With space' },
  { value: '山田-太郎', label: 'With hyphen' }
];
```

---

#### 2.11 Guest Name - Invalid Character Types

**Objective**: Verify handling of special characters and potentially problematic input.

**Steps**:
1. Navigate to the reservation page
2. Test the following inputs in the name field:
   - Emoji: "山田太郎😀"
   - SQL injection attempt: "' OR '1'='1"
   - XSS attempt: "<script>alert('xss')</script>"
   - HTML tags: "<b>山田太郎</b>"
   - Special symbols: "山田@太郎", "山田#太郎", "山田$太郎"
3. For each:
   - Enter the value
   - Fill other required fields
   - Submit form
   - Check for:
     - Validation error
     - System error (500)
     - Successful submission with sanitized input
     - Security vulnerabilities

**Expected Results**:
- System does not crash or throw 500 error
- No XSS vulnerability (script tags are escaped/stripped)
- No SQL injection vulnerability
- Either: values are accepted and sanitized, OR validation error with clear message
- Special characters may be rejected with user-friendly error

**Priority**: P0 (Critical - Security)

---

#### 2.12 Guest Name - Length Validation

**Objective**: Verify character length limits for the name field.

**Steps**:
1. Navigate to the reservation page
2. Test the following lengths:
   - 1 character: "山"
   - 2 characters: "山田"
   - 10 characters: "山田太郎花子次郎三郎"
   - 20 characters: "山田太郎花子次郎三郎四郎五郎六郎"
   - 50 characters: "あ".repeat(50)
   - 51 characters: "あ".repeat(51)
   - 100 characters: "あ".repeat(100)
   - 500 characters: "あ".repeat(500)
3. For each:
   - Clear and enter the name
   - Attempt to submit form
   - Note whether input is accepted or rejected

**Expected Results**:
- Minimum length: Likely 1 character (or possibly 2)
- Maximum length: Should be defined (commonly 50-100 characters)
- Values within range are accepted
- Values exceeding maximum trigger validation error
- Error message states character limit clearly
- Client-side maxlength attribute may prevent over-entry

**Priority**: P1 (High)

---

#### 2.13 Guest Name - Empty/Required Validation

**Objective**: Verify that the name field cannot be left empty.

**Steps**:
1. Navigate to the reservation page
2. Leave the name field empty
3. Fill all other required fields with valid data
4. Submit the form
5. Verify error message appears
6. Test variations:
   - Completely empty
   - Only spaces: "   "
   - Only tabs/whitespace
7. Also test submitting after entering then clearing the field

**Expected Results**:
- Empty name field triggers validation error
- Error message: "氏名を入力してください" or similar
- Whitespace-only input is also rejected
- Error is displayed near the name field
- Form submission is blocked
- Field is highlighted as invalid

**Priority**: P0 (Critical)

---

#### 2.14 Contact Preference - Valid Selection

**Objective**: Verify all contact preference options can be selected.

**Steps**:
1. Navigate to the reservation page
2. Click on contact preference dropdown (ref: e52)
3. Verify available options:
   - Default: "選択してください"
   - Option 1: "希望しない"
   - Option 2: "メールでのご連絡"
   - Option 3: "電話でのご連絡"
4. Select each valid option (not default):
   - "希望しない"
   - "メールでのご連絡"
   - "電話でのご連絡"
5. For each selection:
   - Fill other required fields
   - Submit form
   - Verify submission succeeds

**Expected Results**:
- All three valid options can be selected
- Selected value is displayed in dropdown
- Form submission succeeds for all valid selections
- Default "選択してください" is not a valid submission choice

**Priority**: P0 (Critical)

---

#### 2.15 Contact Preference - Default/Empty Validation

**Objective**: Verify that the default dropdown value is rejected.

**Steps**:
1. Navigate to the reservation page
2. Leave contact preference dropdown at default "選択してください"
3. Fill all other required fields with valid data
4. Submit the form
5. Verify validation error appears

**Expected Results**:
- Default selection "選択してください" is not accepted
- Validation error message appears
- Error message: "確認のご連絡を選択してください" or similar
- Form submission is blocked
- Dropdown is highlighted as invalid

**Priority**: P0 (Critical)

---

#### 2.16 Optional Add-ons - Single Selection

**Objective**: Verify that optional add-ons can be individually selected.

**Steps**:
1. Navigate to the reservation page
2. Set base values: 2 nights, 2 guests
3. Note initial price (28,000円)
4. Test each add-on individually:

   **Test Case A: Breakfast Buffet**
   - Check "朝食バイキング" (ref: e35)
   - Verify checkbox is checked
   - Verify price increases by 4,000円 (2 guests × 2 nights × 1,000)
   - Uncheck the checkbox
   - Verify price returns to 28,000円

   **Test Case B: Early Check-in**
   - Check "昼からチェックインプラン" (ref: e39)
   - Verify checkbox is checked
   - Verify price increases by 4,000円
   - Uncheck and verify price resets

   **Test Case C: Sightseeing Plan**
   - Check "お得な観光プラン" (ref: e43)
   - Verify checkbox is checked
   - Verify price increases by 4,000円
   - Uncheck and verify price resets

**Expected Results**:
- Each checkbox can be independently checked/unchecked
- Price calculation includes add-on cost: addon_cost = 1,000 × guests × nights
- Price updates immediately upon checkbox change
- Unchecking returns price to base amount
- Multiple check/uncheck cycles work correctly

**Priority**: P1 (High)

---

#### 2.17 Optional Add-ons - Multiple Selections

**Objective**: Verify that multiple add-ons can be selected simultaneously.

**Steps**:
1. Navigate to the reservation page
2. Set base values: 2 nights, 2 guests (base: 28,000円)
3. Check all three add-ons:
   - Check "朝食バイキング"
   - Check "昼からチェックインプラン"
   - Check "お得な観光プラン"
4. Verify price: 28,000 + (3 × 2 × 2 × 1,000) = 40,000円
5. Uncheck middle option ("昼からチェックインプラン")
6. Verify price: 28,000 + (2 × 2 × 2 × 1,000) = 36,000円
7. Fill required fields and submit
8. Verify submission succeeds with multiple add-ons

**Expected Results**:
- Multiple checkboxes can be selected simultaneously
- Price calculation is cumulative for all selected add-ons
- All selected add-ons are included in final submission
- Confirmation page shows all selected add-ons

**Priority**: P1 (High)

---

#### 2.18 Optional Add-ons - No Selection

**Objective**: Verify that form can be submitted without selecting any add-ons.

**Steps**:
1. Navigate to the reservation page
2. Ensure all add-on checkboxes are unchecked
3. Fill all required fields with valid data
4. Submit the form
5. Verify submission succeeds

**Expected Results**:
- Form submission succeeds without any add-ons selected
- Price calculation is based only on base rate (nights × guests × 7,000)
- No validation error for empty add-ons (they are optional)

**Priority**: P1 (High)

---

#### 2.19 Comments/Requests Field - Optional Input

**Objective**: Verify the optional comments field functionality.

**Steps**:
1. Navigate to the reservation page
2. Locate the comments field (ref: e55): "ご要望・ご連絡事項等ありましたらご記入ください"
3. Test submitting form without any comment
   - Leave field empty
   - Fill required fields
   - Submit and verify success
4. Test with various comment lengths:
   - Short: "禁煙室希望"
   - Medium: "アレルギー対応をお願いします。卵、小麦、乳製品を避けてください。"
   - Long: Multiple paragraphs of text
5. Test special characters in comments
6. Verify comment is displayed on confirmation page

**Expected Results**:
- Field is truly optional (form submits without input)
- No maxlength restriction or very high limit
- Various character types accepted
- Input is preserved through submission
- Comment appears on confirmation page if entered

**Priority**: P2 (Medium)

---

### 3. Form Submission and Validation

#### 3.1 Happy Path - Complete Valid Submission

**Objective**: Verify successful form submission with all valid data.

**Steps**:
1. Navigate to the reservation page
2. Fill out the form with valid data:
   ```
   - Check-in Date: Tomorrow's date
   - Stay Duration: 2 nights
   - Guest Count: 2 people
   - Guest Name: 山田太郎
   - Contact Preference: メールでのご連絡
   - Add-ons: None selected
   - Comments: (empty)
   ```
3. Verify price displays 28,000円
4. Click "予約内容を確認する" button (ref: e59)
5. Wait for page transition
6. Verify navigation to confirmation page

**Expected Results**:
- Form submission succeeds without errors
- URL changes to confirmation page (likely contains "confirm")
- Confirmation page displays all entered data correctly:
  - Check-in date
  - Stay duration
  - Guest count
  - Guest name
  - Contact preference
  - Total price
- No error messages appear
- Loading/transition is smooth

**Priority**: P0 (Critical)

---

#### 3.2 Validation Summary - All Fields Empty

**Objective**: Verify behavior when submitting completely empty form.

**Steps**:
1. Navigate to the reservation page
2. Without entering any data, click submit button
3. Observe validation behavior

**Expected Results**:
- Form submission is blocked
- Validation errors appear for all required fields:
  - Check-in date
  - Stay duration
  - Guest count
  - Guest name
  - Contact preference
- Error messages are clear and specific
- Errors are displayed near respective fields (or in summary at top)
- First invalid field receives focus
- User can correct and resubmit

**Priority**: P0 (Critical)

---

#### 3.3 Validation - Partial Completion

**Objective**: Verify validation when some but not all fields are filled.

**Steps**:
1. Navigate to the reservation page
2. Fill only check-in date and stay duration
3. Leave guest count, name, and contact preference empty
4. Submit the form
5. Verify which fields show errors

**Test Variations**:
- Fill different combinations of fields
- Leave different fields empty
- Verify each required field is individually validated

**Expected Results**:
- Only unfilled required fields show validation errors
- Filled valid fields do not show errors
- Error messages are field-specific
- User can see which fields still need attention
- Validation is performed on all required fields

**Priority**: P1 (High)

---

#### 3.4 Client-Side vs Server-Side Validation

**Objective**: Determine whether validation is client-side, server-side, or both.

**Steps**:
1. Navigate to the reservation page
2. Test client-side validation:
   - Leave required fields empty and submit
   - Observe if errors appear immediately (client-side)
   - Use browser dev tools to check if form uses HTML5 validation attributes
3. Test server-side validation:
   - Use browser dev tools to bypass client-side validation
   - Remove "required" attributes
   - Submit invalid data
   - Verify server still validates and returns errors

**Expected Results**:
- Document whether validation is:
  - Client-side only (HTML5 attributes, JavaScript)
  - Server-side only (page reload with errors)
  - Both (recommended for security)
- Server should validate regardless of client-side checks
- Response time noted for server validation

**Priority**: P2 (Medium - Documentation)

---

#### 3.5 Error Message Clarity and Localization

**Objective**: Verify that error messages are user-friendly and properly localized.

**Steps**:
1. Navigate to the reservation page
2. Trigger various validation errors:
   - Empty required fields
   - Invalid date ranges
   - Out-of-bound numbers
3. For each error message, verify:
   - Is it in Japanese (matching page language)?
   - Does it clearly state what's wrong?
   - Does it indicate how to fix the issue?
   - Is it free of technical jargon or error codes?
   - Is it positioned near the relevant field?

**Expected Results**:
- All error messages in Japanese
- Clear, actionable messages like:
  - "宿泊日を入力してください"
  - "宿泊数は1〜9の範囲で入力してください"
  - "氏名を入力してください"
- No internal error codes exposed (e.g., "ERR_001")
- No stack traces or technical details
- Consistent tone and formatting

**Priority**: P1 (High)

---

#### 3.6 Form State Preservation - Browser Back

**Objective**: Verify form data is preserved when using browser back button.

**Steps**:
1. Navigate to the reservation page
2. Fill out all form fields with valid data
3. Submit the form
4. Arrive at confirmation page
5. Click browser's back button
6. Verify all previously entered data is still present in the form

**Expected Results**:
- All form field values are preserved
- Checkbox states are preserved
- User does not need to re-enter data
- Price calculation still shows correct total
- Form is in the same state as before submission

**Priority**: P1 (High)

---

#### 3.7 Form State Preservation - Confirmation Page Back Button

**Objective**: Verify form data is preserved when using the page's back button.

**Steps**:
1. Navigate to the reservation page
2. Fill out form with valid data
3. Submit the form
4. On confirmation page, look for a "戻る" (back) button or link
5. Click the back button/link
6. Verify form data is preserved

**Expected Results**:
- Back button/link exists on confirmation page
- Clicking it returns to the reservation form
- All entered data is preserved
- Form is editable
- User can modify and resubmit

**Priority**: P1 (High)

---

#### 3.8 Double Submit Prevention

**Objective**: Verify that double-clicking submit button doesn't cause duplicate submissions.

**Steps**:
1. Navigate to the reservation page
2. Fill out form with valid data
3. Double-click the "予約内容を確認する" button rapidly
4. Observe behavior

**Expected Results**:
- Button is disabled after first click (becomes unclickable)
- OR: Loading indicator appears
- OR: Page navigates before second click registers
- Only one submission is processed
- No duplicate reservation created
- No error from double submission

**Priority**: P1 (High)

---

#### 3.9 Submit Button Loading State

**Objective**: Verify submit button shows loading/processing state during submission.

**Steps**:
1. Navigate to the reservation page
2. Fill out form with valid data
3. Use browser dev tools to throttle network (slow 3G)
4. Click submit button
5. Observe button state during processing

**Expected Results**:
- Button shows loading indicator (spinner or text change)
- Button is disabled during processing
- User receives visual feedback that submission is in progress
- Button text may change (e.g., "送信中..." or "処理中...")
- After completion, page navigates to confirmation

**Priority**: P2 (Medium)

---

### 4. State Transitions and Flow

#### 4.1 Plan ID Parameter Validation

**Objective**: Verify behavior with different plan-id URL parameters.

**Steps**:
1. Navigate to each plan ID variation:
   - `?plan-id=0` (target plan)
   - `?plan-id=1`
   - `?plan-id=2`
   - `?plan-id=999` (likely invalid)
   - `?plan-id=-1` (negative)
   - `?plan-id=abc` (non-numeric)
   - No parameter (missing plan-id)
2. For each, verify:
   - Page loads or shows error
   - Correct plan information displayed
   - Form functionality remains intact

**Expected Results**:
- Valid plan IDs load corresponding plan details
- Invalid plan IDs show appropriate error message
- Missing plan ID either defaults or shows error
- System does not crash or show 500 error

**Priority**: P1 (High)

---

#### 4.2 Page Refresh - Data Loss

**Objective**: Verify behavior when page is refreshed after entering data.

**Steps**:
1. Navigate to the reservation page
2. Fill out some form fields (don't submit)
3. Refresh the page (F5 or Ctrl+R)
4. Observe form state

**Expected Results**:
- Browser may show "Resubmit form?" dialog (if POST was used)
- OR: Form data is lost and resets to initial state
- Document actual behavior
- No error occurs from refresh

**Priority**: P2 (Medium - Documentation)

---

#### 4.3 Session Timeout (if applicable)

**Objective**: Verify behavior if user leaves page open for extended time.

**Steps**:
1. Navigate to the reservation page
2. Fill out form fields
3. Leave page open for extended period (e.g., 30 minutes)
4. Attempt to submit the form
5. Observe behavior

**Expected Results**:
- If session timeout exists: Appropriate error or redirect to re-login
- If no timeout: Form submits successfully
- User data is not lost
- Clear message if session expired

**Priority**: P3 (Low)

---

#### 4.4 Navigation - External Link

**Objective**: Verify behavior when navigating away from page.

**Steps**:
1. Navigate to the reservation page
2. Fill out some form fields (don't submit)
3. Click the "Hotel Planisphere" logo link (ref: e3)
4. Observe behavior

**Expected Results**:
- Browser may show unsaved changes warning
- OR: Navigation proceeds and data is lost
- Document actual behavior
- If navigation occurs, back button restores form state

**Priority**: P2 (Medium)

---

### 5. Cross-Browser Compatibility

#### 5.1 Chrome/Chromium Compatibility

**Objective**: Verify full functionality in Chrome browser.

**Steps**:
1. Open the reservation page in latest Chrome
2. Execute key test scenarios:
   - Page load and display
   - Form input (all field types)
   - Validation
   - Submission
3. Note any Chrome-specific issues

**Expected Results**:
- All functionality works as expected
- Date picker uses Chrome's native control
- No console errors
- Performance is acceptable

**Priority**: P0 (Critical)

---

#### 5.2 Firefox Compatibility

**Objective**: Verify full functionality in Firefox browser.

**Steps**:
1. Open the reservation page in latest Firefox
2. Execute key test scenarios
3. Compare behavior to Chrome
4. Note any Firefox-specific issues

**Expected Results**:
- All functionality works as expected
- Date picker may render differently
- No console errors
- Behavior consistent with Chrome

**Priority**: P1 (High)

---

#### 5.3 Safari Compatibility (if applicable)

**Objective**: Verify functionality in Safari browser.

**Steps**:
1. Open the reservation page in Safari
2. Execute key test scenarios
3. Note any Safari-specific issues

**Expected Results**:
- Core functionality works
- Date input handling may differ (Safari has limited date picker)
- No critical errors
- Acceptable user experience

**Priority**: P2 (Medium)

---

#### 5.4 Mobile Browser Compatibility

**Objective**: Verify functionality on mobile browsers.

**Steps**:
1. Open page on mobile device (or emulation)
2. Test on both iOS Safari and Android Chrome
3. Verify:
   - Touch interactions work
   - Form inputs accessible
   - Date picker is mobile-friendly
   - Validation works
   - Submission succeeds

**Expected Results**:
- All form fields are accessible on mobile
- Touch targets are appropriately sized
- Date picker shows mobile-optimized control
- Keyboard appears for text inputs
- Number inputs show numeric keyboard

**Priority**: P1 (High)

---

### 6. Accessibility Testing

#### 6.1 Keyboard Navigation

**Objective**: Verify form can be completed using keyboard only.

**Steps**:
1. Navigate to the reservation page
2. Use only keyboard (no mouse):
   - Tab through all form fields
   - Enter data using keyboard
   - Navigate to checkboxes and toggle with Space
   - Navigate to submit button and activate with Enter
3. Verify tab order is logical
4. Verify all interactive elements are reachable

**Expected Results**:
- All form fields reachable via Tab key
- Tab order follows visual layout
- Focus indicator visible on all elements
- Can complete and submit form entirely with keyboard
- Enter key on text fields doesn't prematurely submit form

**Priority**: P1 (High)

---

#### 6.2 Screen Reader Compatibility

**Objective**: Verify form is accessible with screen readers.

**Steps**:
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate to the reservation page
3. Listen to screen reader announcements:
   - Are labels read correctly?
   - Are required fields announced as required?
   - Are error messages announced?
   - Is the form structure clear?

**Expected Results**:
- All form labels are announced
- "必須" (required) status is conveyed
- Field types (textbox, combobox, checkbox) are identified
- Error messages are read aloud
- Page structure is logical
- ARIA attributes used appropriately

**Priority**: P2 (Medium)

---

#### 6.3 Focus Indicators

**Objective**: Verify visual focus indicators are present and clear.

**Steps**:
1. Navigate to the reservation page
2. Tab through form fields
3. Observe focus indicators on:
   - Text inputs
   - Number spinners
   - Checkboxes
   - Dropdown
   - Submit button

**Expected Results**:
- All interactive elements have visible focus indicator
- Focus indicator is distinct from hover state
- Focus indicator has sufficient contrast
- Focus indicator doesn't obscure content

**Priority**: P1 (High)

---

#### 6.4 Color Contrast

**Objective**: Verify text and UI elements meet WCAG contrast requirements.

**Steps**:
1. Navigate to the reservation page
2. Use a color contrast checker tool
3. Verify contrast ratios for:
   - Body text
   - Labels
   - Required badges
   - Error messages
   - Button text
   - Placeholder text

**Expected Results**:
- Text meets WCAG AA standard (4.5:1 for normal text)
- Large text meets 3:1 ratio
- UI components meet 3:1 contrast
- Error messages are distinguishable (not by color alone)

**Priority**: P2 (Medium)

---

#### 6.5 Form Labels and ARIA

**Objective**: Verify proper use of labels and ARIA attributes.

**Steps**:
1. Navigate to the reservation page
2. Inspect HTML source
3. Verify:
   - All inputs have associated labels
   - Labels use `<label for="">` or wrap inputs
   - Required fields use appropriate ARIA attributes
   - Error messages linked to fields via aria-describedby
   - Fieldset/legend used for grouped items (add-ons)

**Expected Results**:
- Every input has programmatically associated label
- Required fields marked with aria-required="true"
- Error messages have appropriate ARIA live regions
- Semantic HTML structure
- Proper use of role attributes where needed

**Priority**: P2 (Medium)

---

### 7. Performance Testing

#### 7.1 Page Load Performance

**Objective**: Measure and verify acceptable page load times.

**Steps**:
1. Clear browser cache
2. Navigate to the reservation page
3. Use browser dev tools Performance tab
4. Measure:
   - Time to first contentful paint
   - Time to interactive
   - Total page load time
5. Test with throttled network (slow 3G)

**Expected Results**:
- Page loads within 3 seconds on standard connection
- Critical content visible within 1 second
- Interactive within 5 seconds on slow connection
- No unnecessary blocking resources
- Images optimized

**Priority**: P2 (Medium)

---

#### 7.2 Price Calculation Performance

**Objective**: Verify price calculation updates are instantaneous.

**Steps**:
1. Navigate to the reservation page
2. Rapidly change form values:
   - Increment/decrement spinners rapidly
   - Toggle checkboxes quickly
   - Type in date field
3. Observe price update responsiveness

**Expected Results**:
- Price updates within 100ms of input change
- No lag or delay in updates
- No incorrect intermediate values shown
- Calculation is accurate even with rapid changes

**Priority**: P2 (Medium)

---

### 8. Edge Cases and Error Scenarios

#### 8.1 Network Interruption During Submission

**Objective**: Verify behavior when network connection is lost during form submission.

**Steps**:
1. Navigate to the reservation page
2. Fill out form with valid data
3. Use browser dev tools to simulate offline mode
4. Click submit button
5. Observe behavior

**Expected Results**:
- Appropriate error message displayed
- User is notified of connection issue
- Form data is preserved
- User can retry submission once online
- No partial/corrupted data submitted

**Priority**: P2 (Medium)

---

#### 8.2 Server Error (500) Handling

**Objective**: Verify graceful handling of server errors.

**Steps**:
1. If possible, simulate server error condition
2. Submit form
3. Observe error handling

**Expected Results**:
- User-friendly error message (not technical stack trace)
- Message in Japanese
- Option to retry or contact support
- Form data preserved for retry
- No data loss

**Priority**: P2 (Medium)

---

#### 8.3 Concurrent Reservations (Same Room/Time)

**Objective**: Verify handling when multiple users book same room simultaneously.

**Steps**:
1. Open reservation page in two browsers
2. Fill out same reservation details in both
3. Submit first form
4. Submit second form
5. Observe handling

**Expected Results**:
- If room availability tracking exists: Second submission shows error
- Appropriate message about room no longer available
- OR: System allows multiple bookings (document behavior)
- No system crash or data corruption

**Priority**: P3 (Low)

---

#### 8.4 Special Characters in URL Parameters

**Objective**: Verify handling of manipulated or malicious URL parameters.

**Steps**:
1. Navigate with various URL manipulations:
   - `?plan-id=<script>alert('xss')</script>`
   - `?plan-id='; DROP TABLE reservations; --`
   - `?plan-id=../../../etc/passwd`
   - `?plan-id=%00`
2. Observe behavior

**Expected Results**:
- No XSS vulnerability (script not executed)
- No SQL injection
- No path traversal
- Invalid parameters handled gracefully with error message
- System remains secure

**Priority**: P1 (High - Security)

---

#### 8.5 Leap Year Date Handling

**Objective**: Verify correct handling of leap year dates.

**Steps**:
1. Navigate to reservation page
2. If current year is leap year, test February 29
3. If not leap year, test:
   - February 28 (valid)
   - February 29 (invalid for non-leap years)
4. Verify date validation

**Expected Results**:
- Leap year dates handled correctly
- February 29 accepted in leap years
- February 29 rejected in non-leap years
- No date calculation errors

**Priority**: P3 (Low)

---

#### 8.6 Daylight Saving Time Transitions

**Objective**: Verify date handling around DST transitions.

**Steps**:
1. Test reservations for dates around DST transitions
2. Verify date display and calculation accuracy

**Expected Results**:
- Dates displayed correctly regardless of DST
- No off-by-one errors
- Timezone handling is consistent

**Priority**: P3 (Low)

---

#### 8.7 Year-End Date Handling

**Objective**: Verify date handling around year boundaries.

**Steps**:
1. Navigate to reservation page (near year end)
2. Test dates spanning year boundary:
   - December 30-31
   - January 1-2 of next year
3. Verify date validation and calculation

**Expected Results**:
- Dates across year boundary handled correctly
- Stay duration calculation accurate
- No year rollover errors

**Priority**: P3 (Low)

---

### 9. Localization and Internationalization

#### 9.1 Japanese Language Display

**Objective**: Verify all Japanese text displays correctly.

**Steps**:
1. Navigate to the reservation page
2. Verify character encoding (UTF-8)
3. Check for:
   - Proper Japanese character display
   - No mojibake (garbled characters)
   - Correct font rendering
   - Appropriate line breaks for Japanese text

**Expected Results**:
- All Japanese text renders correctly
- Hiragana, katakana, and kanji display properly
- No encoding issues
- Text is readable and properly formatted

**Priority**: P1 (High)

---

#### 9.2 Date Format Localization

**Objective**: Verify date format matches Japanese conventions.

**Steps**:
1. Navigate to the reservation page
2. Observe date format in:
   - Date input field
   - Help text
   - Confirmation page
3. Verify format (YYYY/MM/DD or YYYY-MM-DD is common in Japan)

**Expected Results**:
- Date format follows Japanese conventions
- Format is consistent throughout application
- Date picker shows Japanese format
- Day/month/year order is appropriate

**Priority**: P2 (Medium)

---

#### 9.3 Currency Format

**Objective**: Verify currency is displayed in Japanese format.

**Steps**:
1. Navigate to the reservation page
2. Observe price display format
3. Verify:
   - Yen symbol (¥ or 円)
   - Thousands separator (comma)
   - No decimal places (yen doesn't use cents)

**Expected Results**:
- Price format: "7,000円" or "¥7,000"
- Commas separate thousands
- No decimal places
- Consistent formatting throughout

**Priority**: P1 (High)

---

### 10. Integration Testing

#### 10.1 Plan Selection Integration

**Objective**: Verify proper integration between plans page and reservation page.

**Steps**:
1. Navigate to plans page: `https://hotel-example-site.takeyaqa.dev/ja/plans.html`
2. Select a plan (click "このプランで予約" or similar)
3. Verify navigation to reservation page with correct plan-id
4. Verify plan details match selection:
   - Plan name
   - Base price
   - Room type

**Expected Results**:
- Correct plan-id in URL
- Plan details displayed correctly
- Price matches plan page
- Seamless transition between pages

**Priority**: P1 (High)

---

#### 10.2 Login State Integration (if applicable)

**Objective**: Verify integration with login/authentication system.

**Steps**:
1. Navigate to reservation page while logged out
2. Fill and submit form
3. Observe behavior
4. Log in to the system
5. Navigate to reservation page again
6. Check if user information is pre-filled

**Expected Results**:
- Logged-out users can still make reservations
- Logged-in users may have name pre-filled
- User session is maintained
- Login state doesn't break functionality

**Priority**: P2 (Medium)

---

#### 10.3 Confirmation Page Data Display

**Objective**: Verify all data is correctly passed to confirmation page.

**Steps**:
1. Navigate to reservation page
2. Fill form with specific test data:
   ```
   Date: 2025-11-01
   Nights: 3
   Guests: 4
   Name: テストユーザー
   Contact: 電話でのご連絡
   Add-ons: All three selected
   Comments: "特別なリクエスト"
   ```
3. Submit form
4. On confirmation page, verify every field is displayed correctly

**Expected Results**:
- All input values displayed accurately
- Date format correct
- Numbers match (nights, guests)
- Name displayed correctly
- Selected contact method shown
- All add-ons listed
- Comments displayed
- Calculated price shown correctly

**Priority**: P0 (Critical)

---

#### 10.4 Confirmation Page to Final Booking

**Objective**: Verify flow from confirmation to final booking.

**Steps**:
1. Navigate to reservation page
2. Fill and submit form
3. Arrive at confirmation page
4. Look for final confirmation button (e.g., "この内容で予約する")
5. Click final confirmation
6. Observe result

**Expected Results**:
- Final confirmation button is present
- Clicking it completes the booking
- Success message or booking confirmation number displayed
- Email confirmation sent (if feature exists)
- User is redirected to appropriate page

**Priority**: P0 (Critical)

---

### 11. Security Testing

#### 11.1 HTTPS/TLS Verification

**Objective**: Verify site uses HTTPS for secure data transmission.

**Steps**:
1. Navigate to the reservation page
2. Check browser address bar for HTTPS
3. Verify TLS certificate is valid
4. Check for mixed content warnings

**Expected Results**:
- Page loads over HTTPS
- Valid TLS certificate
- No mixed content warnings
- Secure connection established

**Priority**: P0 (Critical)

---

#### 11.2 XSS (Cross-Site Scripting) Prevention

**Objective**: Verify application is protected against XSS attacks.

**Steps**:
1. Navigate to the reservation page
2. Attempt XSS injection in all input fields:
   - `<script>alert('XSS')</script>`
   - `<img src=x onerror=alert('XSS')>`
   - `javascript:alert('XSS')`
3. Submit form
4. Verify script does not execute on:
   - Input page
   - Confirmation page
   - Any subsequent pages

**Expected Results**:
- Scripts are not executed
- Input is sanitized/escaped
- HTML is rendered as text, not parsed
- No XSS vulnerability exists

**Priority**: P0 (Critical - Security)

---

#### 11.3 SQL Injection Prevention

**Objective**: Verify application is protected against SQL injection.

**Steps**:
1. Navigate to the reservation page
2. Attempt SQL injection in input fields:
   - `' OR '1'='1`
   - `'; DROP TABLE reservations; --`
   - `' UNION SELECT * FROM users --`
3. Submit form
4. Verify no SQL error or unexpected behavior

**Expected Results**:
- No SQL errors displayed
- No database breach
- Input treated as literal string, not SQL code
- Parameterized queries or prepared statements used

**Priority**: P0 (Critical - Security)

---

#### 11.4 CSRF (Cross-Site Request Forgery) Protection

**Objective**: Verify CSRF protection is implemented.

**Steps**:
1. Inspect form HTML source
2. Look for CSRF token field
3. Attempt to submit form from external page
4. Verify request is rejected without valid token

**Expected Results**:
- CSRF token present in form
- Token is unique per session
- Requests without valid token are rejected
- Token validated on server side

**Priority**: P1 (High - Security)

---

#### 11.5 Sensitive Data Exposure

**Objective**: Verify sensitive data is not exposed in URLs or client-side code.

**Steps**:
1. Navigate through booking flow
2. Check URL parameters
3. Inspect network requests in dev tools
4. View page source
5. Check for:
   - Personal data in URLs
   - Sensitive data in JavaScript
   - Unencrypted data transmission

**Expected Results**:
- No sensitive personal data in URLs
- Credit card data not exposed (if applicable)
- Session tokens not visible in URLs
- Data transmitted securely
- Minimal sensitive data in client-side code

**Priority**: P1 (High - Security)

---

### 12. Negative Testing and Stress Testing

#### 12.1 Rapid Form Submission

**Objective**: Verify system handles rapid repeated submissions.

**Steps**:
1. Navigate to the reservation page
2. Fill form with valid data
3. Use automation to rapidly click submit button multiple times
4. Observe behavior

**Expected Results**:
- Button disables after first click
- Only one submission processed
- No duplicate bookings created
- System remains stable
- Appropriate rate limiting if applicable

**Priority**: P2 (Medium)

---

#### 12.2 Extremely Large Input Values

**Objective**: Verify handling of unexpectedly large inputs.

**Steps**:
1. Navigate to the reservation page
2. Test oversized inputs:
   - 10,000 character name
   - 100,000 character comment
   - Very large numbers (if client-side validation bypassed)
3. Submit form
4. Observe behavior

**Expected Results**:
- Input length restrictions enforced
- System does not crash
- Appropriate error messages
- No buffer overflow
- Database constraints prevent storage of invalid data

**Priority**: P2 (Medium)

---

#### 12.3 Unusual Browser/Device Configurations

**Objective**: Verify functionality with unusual browser settings.

**Steps**:
1. Test with:
   - JavaScript disabled
   - Cookies disabled
   - Very small viewport (320x240)
   - Very large viewport (3840x2160)
   - High contrast mode
   - Zoomed in/out (browser zoom)
2. Observe functionality

**Expected Results**:
- Graceful degradation when JavaScript disabled
- Clear message if cookies required
- Layout adapts to extreme viewport sizes
- Functionality maintained across zoom levels
- Readable in high contrast mode

**Priority**: P2 (Medium)

---

---

## Test Data

### Standard Test Data Sets

#### Valid Input Set 1 (Minimal)
```javascript
{
  checkInDate: getTomorrow(), // YYYY-MM-DD format
  stayDuration: 1,
  guestCount: 1,
  guestName: '山田太郎',
  contactPreference: '希望しない',
  addOns: [],
  comments: ''
}
// Expected Price: ¥7,000
```

#### Valid Input Set 2 (Typical)
```javascript
{
  checkInDate: addDays(7), // +7 days
  stayDuration: 2,
  guestCount: 2,
  guestName: '田中花子',
  contactPreference: 'メールでのご連絡',
  addOns: ['breakfast'],
  comments: '禁煙室希望'
}
// Expected Price: ¥28,000 + (1,000 × 2 × 2) = ¥32,000
```

#### Valid Input Set 3 (Maximum)
```javascript
{
  checkInDate: addDays(89), // +89 days (edge of 3-month limit)
  stayDuration: 9,
  guestCount: 9,
  guestName: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
  contactPreference: '電話でのご連絡',
  addOns: ['breakfast', 'earlyCheckIn', 'sightseeing'],
  comments: '大人数での利用です。部屋割りについて相談させてください。'
}
// Expected Price: ¥567,000 + (3,000 × 9 × 9) = ¥810,000
```

#### Invalid Input Set 1 (All Empty)
```javascript
{
  checkInDate: '',
  stayDuration: '',
  guestCount: '',
  guestName: '',
  contactPreference: '選択してください',
  addOns: [],
  comments: ''
}
// Expected: Validation errors on all required fields
```

#### Invalid Input Set 2 (Boundary Violations)
```javascript
{
  checkInDate: getYesterday(), // Past date
  stayDuration: 0, // Below minimum
  guestCount: 10, // Above maximum
  guestName: '', // Empty required field
  contactPreference: '選択してください', // Default not valid
  addOns: [],
  comments: ''
}
// Expected: Multiple validation errors
```

#### Edge Case Set 1 (Boundary Values)
```javascript
{
  checkInDate: getTomorrow(), // Earliest valid date
  stayDuration: 1, // Minimum
  guestCount: 1, // Minimum
  guestName: '山', // 1 character
  contactPreference: '希望しない',
  addOns: [],
  comments: ''
}
// Should be valid
```

#### Edge Case Set 2 (Special Characters)
```javascript
{
  checkInDate: addDays(7),
  stayDuration: 2,
  guestCount: 2,
  guestName: '山田・太郎=花子', // Special characters
  contactPreference: 'メールでのご連絡',
  addOns: [],
  comments: '<script>alert("test")</script>' // XSS attempt
}
// Should handle special characters appropriately
```

### Helper Functions for Test Data

```javascript
function getTomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

function getYesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function generateLongString(length) {
  return 'あ'.repeat(length);
}
```

---

## Automation Strategy

### Test Automation Approach

#### Framework and Tools
- **Test Automation**: Playwright with Othello MCP integration
- **Test Runner**: Playwright Test (@playwright/test)
- **Assertion Library**: Playwright expect
- **CI/CD Integration**: GitHub Actions (recommended)
- **Reporting**: HTML Reporter, JSON output for analysis

#### Automation Architecture

```
1. AI Layer (Claude via MCP)
   - Analyzes page snapshots
   - Identifies element references (ref-based)
   - Generates test instructions
   - Interprets test results

2. MCP Layer (@playwright/mcp)
   - Translates AI instructions to Playwright commands
   - Manages browser session
   - Executes ref-based operations
   - Returns structured results

3. Playwright Layer
   - Controls actual browser
   - Executes DOM operations
   - Captures screenshots/videos
   - Generates traces
```

#### Test Organization

```
tests/
├── hotel-reservation/
│   ├── ui-display.spec.js          # Scenarios 1.1-1.5
│   ├── input-validation.spec.js    # Scenarios 2.1-2.19
│   ├── form-submission.spec.js     # Scenarios 3.1-3.9
│   ├── state-transitions.spec.js   # Scenarios 4.1-4.4
│   ├── cross-browser.spec.js       # Scenarios 5.1-5.4
│   ├── accessibility.spec.js       # Scenarios 6.1-6.5
│   ├── performance.spec.js         # Scenarios 7.1-7.2
│   ├── edge-cases.spec.js          # Scenarios 8.1-8.7
│   ├── localization.spec.js        # Scenarios 9.1-9.3
│   ├── integration.spec.js         # Scenarios 10.1-10.4
│   ├── security.spec.js            # Scenarios 11.1-11.5
│   └── stress-testing.spec.js      # Scenarios 12.1-12.3
├── fixtures/
│   └── test-data.js                # Centralized test data
├── helpers/
│   └── form-helpers.js             # Reusable form functions
└── page-objects/
    └── reservation-page.js         # Page object model
```

### Priority-Based Test Execution

#### P0 (Critical) - Must pass before any release
- **Frequency**: Every commit
- **Scenarios**: 1.1, 1.4, 2.1-2.3, 2.4-2.8, 2.13-2.15, 3.1, 3.2, 10.3, 10.4, 11.1-11.3
- **Estimated Time**: ~15 minutes
- **Blocking**: Yes - failures block deployment

#### P1 (High) - Must pass before release
- **Frequency**: Every pull request
- **Scenarios**: 1.2, 1.3, 2.10-2.12, 2.16-2.18, 3.3, 3.5-3.8, 4.1, 6.1, 6.3, 10.1, 11.4-11.5
- **Estimated Time**: ~30 minutes
- **Blocking**: Yes - failures require investigation

#### P2 (Medium) - Should pass regularly
- **Frequency**: Nightly or before release
- **Scenarios**: 1.5, 2.19, 3.4, 3.9, 4.2-4.4, 5.3, 6.2, 6.4-6.5, 7.1-7.2, 8.1-8.2, 9.2, 10.2, 12.1-12.3
- **Estimated Time**: ~45 minutes
- **Blocking**: No - can be investigated post-release

#### P3 (Low) - Run periodically
- **Frequency**: Weekly or before major releases
- **Scenarios**: 4.3, 8.3-8.7
- **Estimated Time**: ~20 minutes
- **Blocking**: No

### Test Data Management

#### Approach
- **Centralized Test Data**: Store all test data sets in `fixtures/test-data.js`
- **Data Builders**: Use builder pattern for complex test objects
- **Dynamic Data**: Generate dates and timestamps dynamically
- **Data Cleanup**: Not typically needed (test site doesn't persist data)

#### Example Test Data Module
```javascript
// fixtures/test-data.js
module.exports = {
  validReservations: {
    minimal: { /* ... */ },
    typical: { /* ... */ },
    maximum: { /* ... */ }
  },
  invalidInputs: {
    allEmpty: { /* ... */ },
    boundaryViolations: { /* ... */ }
  },
  edgeCases: { /* ... */ }
};
```

### Page Object Pattern

#### Benefits
- Centralized element locators (ref-based)
- Reusable form interaction methods
- Easier maintenance when UI changes
- Clearer test code

#### Example Page Object
```javascript
// page-objects/reservation-page.js
class ReservationPage {
  constructor(mcpClient) {
    this.mcp = mcpClient;
    this.refs = {
      checkInDate: 'e16',
      stayDuration: 'e22',
      guestCount: 'e29',
      guestName: 'e48',
      contactPreference: 'e52',
      submitButton: 'e59'
    };
  }

  async navigate() {
    return await this.mcp.navigate({
      url: 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0',
      intent: 'Navigate to reservation page'
    });
  }

  async fillForm(data) {
    // Implementation using ref-based operations
  }

  async submit() {
    // Click submit button
  }

  async getPrice() {
    // Extract price value
  }
}
```

### Execution Environment

#### Local Development
```bash
# Run all tests
npm run playwright:test

# Run specific test file
npx playwright test tests/hotel-reservation/input-validation.spec.js

# Run in headed mode (see browser)
npm run playwright:headed

# Run with UI mode
npm run playwright:ui

# Run only P0 tests
npx playwright test --grep @p0
```

#### CI/CD Pipeline (GitHub Actions Example)
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --grep @p0
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Reporting and Monitoring

#### Test Reports
- **HTML Report**: Generated after test run, includes screenshots and traces
- **JSON Report**: For programmatic analysis and metrics
- **CI Integration**: Test results visible in pull requests

#### Metrics to Track
- Test execution time
- Pass/fail rates by priority
- Flaky test identification
- Coverage of scenarios

#### Failure Handling
- **Screenshots**: Captured on failure
- **Videos**: Recorded for failed tests (configurable)
- **Traces**: Full Playwright trace for debugging
- **Logs**: Console logs and network requests captured

### Maintenance Strategy

#### Regular Updates
- **Weekly**: Review and update test data (especially dates)
- **Monthly**: Review and refactor flaky tests
- **Per Release**: Update page object refs if UI changes
- **Quarterly**: Performance baseline review

#### Handling UI Changes
1. Run tests to identify failures
2. Capture new snapshot with Othello
3. Identify new element refs
4. Update page object with new refs
5. Re-run tests to verify

#### Handling Test Failures
1. Check if failure is genuine bug or test issue
2. Review screenshots and traces
3. Update test if UI/behavior changed
4. Report bug if application issue
5. Add regression test for fixed bugs

---

## Known Issues and Risks

### Current Limitations

#### Test Environment
- **No Isolated Test Database**: Test site is shared; cannot guarantee data isolation
- **No API Access**: Cannot directly set up test data or clean up after tests
- **External Dependency**: Relies on external test site availability

#### Coverage Gaps
- **Payment Flow**: Beyond confirmation page not covered (if exists)
- **Email Notifications**: Cannot verify email sending
- **Backend Validation**: Only testing client-side visible behavior
- **Load Testing**: Performance under high load not tested
- **Security Audit**: Requires professional penetration testing

### Potential Risks

#### Flaky Tests
- **Network Dependencies**: Tests may fail due to network issues
- **Timing Issues**: Async operations may cause intermittent failures
- **Dynamic Content**: If page content changes based on server state

**Mitigation**:
- Use Playwright's auto-waiting features
- Increase timeouts for slow operations
- Implement retry logic for network-dependent operations
- Use explicit waits where necessary

#### Test Data Issues
- **Date Dependencies**: Tests using relative dates may fail at month boundaries
- **Stale References**: Element refs may change if page structure updates

**Mitigation**:
- Use dynamic date calculations
- Regularly update snapshots and refs
- Version control for page object refs

#### Maintenance Burden
- **UI Changes**: Frequent UI updates require test updates
- **Ref Brittleness**: Element refs change with UI restructure

**Mitigation**:
- Use stable ref-based approach (better than CSS selectors)
- Implement page object pattern for centralized updates
- Regular test review and refactoring

### Assumptions

#### Application Behavior
- Reservation form submits to confirmation page
- Price calculation formula is: `(base × nights × guests) + (addons × 1000 × guests)`
- 3-month advance booking limit is enforced
- Guest count 1-9 and stay duration 1-9 are enforced
- Weekend pricing may apply (needs confirmation)

#### Technical Assumptions
- Page uses standard HTML form elements
- Client-side validation is present but server-side validation is also implemented
- HTTPS is used for secure data transmission
- Modern browser support (Chrome, Firefox, Safari latest versions)

### Recommendations

#### Short-term
1. Implement P0 and P1 tests immediately
2. Set up CI/CD integration
3. Establish test data management approach
4. Create page objects for maintainability

#### Medium-term
1. Expand test coverage to P2 scenarios
2. Implement visual regression testing
3. Add performance benchmarking
4. Conduct accessibility audit

#### Long-term
1. Integrate with bug tracking system
2. Implement test metrics dashboard
3. Conduct security penetration testing
4. Expand to other pages/flows in the hotel site

---

## Appendix

### Element Reference Map (from Snapshot)

```
Page: https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0

Navigation:
  e3: Hotel Planisphere logo link

Headings:
  e7: "宿泊予約" (main heading)
  e8: "お得な特典付きプラン" (plan name)

Required Fields:
  e16: Check-in Date textbox
  e22: Stay Duration spinbutton
  e29: Guest Count spinbutton
  e48: Guest Name textbox
  e52: Contact Preference combobox

Optional Add-ons:
  e35: Breakfast checkbox
  e39: Early Check-in checkbox
  e43: Sightseeing checkbox

Other:
  e55: Comments textbox (optional)
  e58: Price display (status)
  e59: Submit button "予約内容を確認する"
  e62: Room details iframe
```

### Test Execution Checklist

#### Before Running Tests
- [ ] Test site is accessible
- [ ] Playwright browsers installed
- [ ] Test data dates are current
- [ ] CI/CD pipeline configured (if applicable)

#### After Test Run
- [ ] Review HTML report
- [ ] Check for new failures
- [ ] Investigate flaky tests
- [ ] Update test data if needed
- [ ] Document any issues found

### Useful Resources

- **Test Site**: https://hotel-example-site.takeyaqa.dev/
- **GitHub Repo**: https://github.com/takeyaqa/hotel-example-site
- **Playwright Docs**: https://playwright.dev/
- **Othello Project**: (internal documentation)
- **MCP Playwright**: https://github.com/microsoft/playwright-mcp

### Glossary

- **ref**: Element reference identifier from Playwright MCP snapshot
- **MCP**: Model Context Protocol - interface for Claude AI to control Playwright
- **Othello**: Test automation orchestrator using AI + MCP + Playwright
- **P0/P1/P2/P3**: Priority levels (P0 = Critical, P3 = Low)
- **XSS**: Cross-Site Scripting attack
- **CSRF**: Cross-Site Request Forgery attack

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-26 | Claude Code | Initial comprehensive test plan created |

---

**END OF TEST PLAN**
