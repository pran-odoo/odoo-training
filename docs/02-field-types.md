# Complete Field Types Guide

## What Are Fields?

::: info Technical Definition
Fields are the **columns** in your database table. Each field stores a specific type of data.
Understanding field types helps you:
- Know what kind of data can be stored
- Understand why certain validations exist
- Write better functional specifications
:::

## Basic Field Types

| Field Type | What It Stores | Example Use | Database Storage |
| :--- | :--- | :--- | :--- |
| **Char** | Short text (single line) | Customer name, Reference | VARCHAR (limited characters) |
| **Text** | Long text (multiple lines) | Description, Notes, Address | TEXT (unlimited) |
| **Html** | Formatted text with styling | Email templates, Product descriptions | TEXT with HTML tags |
| **Integer** | Whole numbers only | Quantity, Age, Count | INTEGER |
| **Float** | Decimal numbers | Weight, Dimensions | FLOAT/NUMERIC |
| **Monetary** | Currency amounts | Price, Total amount | NUMERIC (with currency link) |
| **Boolean** | True/False (checkbox) | Is Active, Is Company | BOOLEAN |
| **Date** | Date only (no time) | Birth date, Deadline | DATE |
| **Datetime** | Date and time | Order date, Last login | TIMESTAMP |
| **Selection** | Predefined choices | Status, Type, Priority | VARCHAR (stores key) |
| **Binary** | File attachments | PDF, Excel, Documents | BYTEA or file system |
| **Image** | Image files | Product image, Avatar | BYTEA (with auto-resize) |
| **Json** | Structured data | Complex configurations | JSONB |
| **Properties** | Dynamic sub-fields | Custom fields per project | JSONB |

## Field Type Details with Examples

### Char vs Text - When to Use Which?

| Use Char For | Use Text For |
| :--- | :--- |
| Names (max ~255 chars) | Descriptions (unlimited) |
| Reference numbers | Notes and comments |
| Email addresses | Full addresses |
| Phone numbers | Terms and conditions |

::: tip Key Difference
**Char** shows as a single-line input.
**Text** shows as a multi-line textarea.
:::

### Selection Field - The Dropdown

Selection fields store a **key** internally but display a **label** to users.

**Example: Order Status**

| What User Sees | What's Stored in Database |
| :--- | :--- |
| Quotation | `draft` |
| Quotation Sent | `sent` |
| Sales Order | `sale` |
| Cancelled | `cancel` |

::: info Why This Matters
When filtering or searching via API/code, you must use the technical key (`draft`), not the label (`Quotation`).
:::

### Monetary Field - More Than Just a Number

A Monetary field is linked to a **currency field**. This allows:
- Proper currency symbol display (EUR, USD, INR)
- Correct decimal places (2 for EUR, 0 for JPY)
- Currency conversion calculations

**Example:** Sale Order has `amount_total` (Monetary) linked to `currency_id` (Many2one to res.currency)

### Properties Field - Dynamic Custom Fields

::: tip Properties Field
The Properties field allows creating **custom sub-fields per record** without database changes.

**Use Case:** Different projects need different custom fields:
- Project "Website Redesign" needs fields: Browser compatibility, Responsive breakpoints
- Project "ERP Implementation" needs fields: Go-live date, Training hours

With Properties, each project can have its own custom fields, and all tasks in that project inherit them!
:::

## Common Field Attributes

Every field in Odoo can have attributes that control its behavior. Understanding these is crucial for functional consultants.

| Attribute | What It Does | Example | Functional Impact |
| :--- | :--- | :--- | :--- |
| `string` | Label shown to users | `string="Customer Name"` | What appears on forms/lists |
| `required` | Must have a value | `required=True` | Can't save record without it |
| `readonly` | Can't be edited | `readonly=True` | Display only, no editing |
| `default` | Pre-filled value | `default="draft"` | New records start with this value |
| `help` | Tooltip on hover | `help="Enter name"` | Shows info icon with explanation |
| `copy` | Include when duplicating | `copy=False` | Reference numbers shouldn't copy |
| `index` | Create DB index | `index=True` | Faster searches on this field |
| `tracking` | Log changes in chatter | `tracking=True` | Shows "Status: Draft → Confirmed" |
| `groups` | Restrict visibility | `groups="base.group_system"` | Only admins see this field |

::: warning Required vs Default - Common Confusion
- **required=True**: User MUST provide a value (even if there's a default)
- **default=value**: Pre-fills the field, but user can leave it empty (unless also required)
- **Both together**: Field is pre-filled AND mandatory

**Example:** Sale Order state has `default='draft'` and `required=True` - it always starts as draft and must have a state.
:::

## Field Sizes and Limits

| Field Type | Default Limit | Can Customize? | Notes |
| :--- | :--- | :--- | :--- |
| Char | No limit (was 256) | Yes (`size=N`) | Since Odoo 12, no default limit |
| Text | Unlimited | No | Use for long content |
| Integer | -2B to +2B | No | 32-bit signed integer |
| Float | ~15 digits precision | Yes (`digits`) | `digits=(16, 2)` = 16 total, 2 decimal |
| Monetary | Currency-dependent | Auto | Uses currency's decimal places |
| Binary | ~1GB (PostgreSQL) | No | Large files stored externally |
| Image | Auto-resized | Yes | `max_width`, `max_height` attributes |

## Practical Examples by Business Scenario

### Scenario: Product Catalog

| Field Name | Type | Why This Type? |
| :--- | :--- | :--- |
| `name` | Char | Short product name, single line |
| `description_sale` | Text | Long description for quotes |
| `list_price` | Float | Price without currency formatting |
| `standard_price` | Float | Cost price (company_dependent) |
| `qty_available` | Float | Stock can be fractional (0.5 kg) |
| `active` | Boolean | Archive/unarchive products |
| `type` | Selection | Consumable/Service/Storable |
| `image_1920` | Image | Product photo with auto-resize |
| `barcode` | Char | EAN/UPC code, indexed for scanning |

### Scenario: HR Employee

| Field Name | Type | Why This Type? |
| :--- | :--- | :--- |
| `name` | Char | Employee's full name |
| `work_email` | Char | Email with validation widget |
| `birthday` | Date | Only date needed, no time |
| `gender` | Selection | male/female/other choices |
| `notes` | Text | HR notes, can be lengthy |
| `certificate` | Selection | Education level dropdown |
| `resume_line_ids` | One2many | Multiple resume entries |
| `image_1920` | Image | Employee photo |

## Float Precision - The Decimal Problem

::: danger Why Float Precision Matters
Float fields can cause unexpected rounding issues. Consider this:

```
Unit Price: 10.00
Quantity: 3
Expected Total: 30.00
Actual (with float errors): 29.999999999997
```

**Solution:** Use the `digits` attribute to control precision:
- `digits=(16, 2)` = 16 total digits, 2 after decimal (standard for prices)
- `digits='Product Price'` = Uses named precision from settings
- `digits='Product Unit of Measure'` = Higher precision for quantities
:::

### Named Decimal Precisions in Odoo

| Precision Name | Default Digits | Used For |
| :--- | :--- | :--- |
| Product Price | 2 | Prices, unit costs |
| Product Unit of Measure | 5 | Quantities (allows 0.00001) |
| Discount | 2 | Percentage discounts |
| Stock Weight | 2 | Product weights |

::: tip Configuration
These can be configured in Settings → Technical → Database Structure → Decimal Accuracy
:::

## Date and Datetime - Timezone Handling

::: warning Critical: Timezone Behavior
| Field Type | Storage | Display |
| :--- | :--- | :--- |
| **Date** | Stored as-is (no timezone) | Shows same date everywhere |
| **Datetime** | Stored in UTC | Converted to user's timezone |

**Example Problem:** A meeting scheduled at "2024-01-15 10:00" in India (UTC+5:30) is stored as "2024-01-15 04:30" UTC. A user in New York (UTC-5) sees it as "2024-01-14 23:30"!

**Solution:** Use Date for deadlines/birthdays, Datetime for appointments/timestamps.
:::

## Selection Fields - Best Practices

### Selection Field Structure

Selection fields have a list of (key, label) pairs:

```python
state = fields.Selection([
    ('draft', 'Draft'),
    ('confirmed', 'Confirmed'),
    ('done', 'Done'),
    ('cancel', 'Cancelled'),
], default='draft')
```

**Key Rules:**
- **Keys**: lowercase, no spaces, use underscores (stored in DB)
- **Labels**: Human-readable, translatable (shown to users)
- Keys can't be changed after data exists (would lose data!)
- Labels can be changed anytime (just UI text)

### Adding Options to Existing Selection Fields

You can extend selection fields using `selection_add`:

```python
# Original field has: draft, confirmed, done
# Your module adds: on_hold

state = fields.Selection(
    selection_add=[('on_hold', 'On Hold')],
    ondelete={'on_hold': 'set default'}
)
```

::: tip ondelete Parameter
The `ondelete` tells Odoo what to do if the module is uninstalled - set records to default state.
:::

## Binary and Image Fields

### Binary vs Image - When to Use Which

| Use Binary For | Use Image For |
| :--- | :--- |
| PDF documents | Product photos |
| Excel files | Employee avatars |
| Any non-image file | Company logos |
| Images that shouldn't be resized | Any image that needs thumbnails |

### Image Field Auto-Resize

Image fields automatically create multiple sizes:
- `image_1920` - Original/large (max 1920px)
- `image_1024` - Medium (max 1024px)
- `image_512` - Small (max 512px)
- `image_256` - Thumbnail (max 256px)
- `image_128` - Icon (max 128px)

::: tip Performance Tip
Always use the smallest size needed. Don't load `image_1920` for a list view thumbnail!
:::

## Field Type Decision Matrix

### Quick Reference: Which Field Type to Use?

| I need to store... | Use This Type | Not This |
| :--- | :--- | :--- |
| A name or title | **Char** | Text (overkill) |
| A description or notes | **Text** | Char (too limited) |
| A price with currency | **Monetary** | Float (loses currency) |
| A percentage | **Float** | Integer (no decimals) |
| A count or quantity (whole) | **Integer** | Float (unnecessary) |
| A quantity (can be partial) | **Float** | Integer (can't do 0.5) |
| A yes/no choice | **Boolean** | Selection (overkill) |
| A status with 3+ options | **Selection** | Char (no validation) |
| A birthday | **Date** | Datetime (has TZ issues) |
| An appointment time | **Datetime** | Date (loses time) |
| A document attachment | **Binary** | Char (can't store files) |
| A photo/logo | **Image** | Binary (no auto-resize) |
| Rich formatted text | **Html** | Text (loses formatting) |

## Company-Dependent Fields

### What Are Company-Dependent Fields?

In a multi-company environment, some fields need to store **different values for each company**. These are called `company_dependent` fields (formerly called "Property" fields).

::: info How It Works
When a field has `company_dependent=True`:
- The value is stored per-company in a JSONB column
- Each user sees the value for their active company
- Changing companies shows different values automatically
:::

### Common Company-Dependent Fields

| Model | Field | Why Company-Dependent? |
| :--- | :--- | :--- |
| `product.template` | `standard_price` | Different cost in each warehouse/company |
| `product.template` | `property_account_income_id` | Different income accounts per company |
| `product.template` | `property_account_expense_id` | Different expense accounts per company |
| `res.partner` | `property_account_receivable_id` | Different AR accounts per company |
| `res.partner` | `property_account_payable_id` | Different AP accounts per company |
| `stock.location` | `valuation_in_account_id` | Different valuation accounts |

### Database Storage

Company-dependent fields are stored as JSONB with company IDs as keys:

```json
{
  "1": 150.00,    // Company 1: Cost is 150
  "2": 175.50,   // Company 2: Cost is 175.50
  "3": 140.00     // Company 3: Cost is 140
}
```

::: warning For Functional Consultants
When exporting data or creating reports involving company-dependent fields:
- The value shown depends on the user's active company
- Direct SQL queries need to parse JSONB by company ID
- Always verify which company's data you're viewing!
:::

## Common Mistakes with Field Types

::: danger Wrong Approach: Using Char for Prices
```python
price = fields.Char()
```
**Problem:** Can't calculate, sort, or format properly. "100" comes before "20" alphabetically!

**Correct:**
```python
price = fields.Monetary(currency_field='currency_id')
```
**Benefit:** Proper calculations, sorting, currency symbols.
:::

::: danger Wrong Approach: Using Text for Emails
```python
email = fields.Text()
```
**Problem:** Multi-line input, no email validation, wastes space.

**Correct:**
```python
email = fields.Char()
# In view: widget="email"
```
**Benefit:** Single line, clickable mailto link, proper validation.
:::

::: danger Wrong Approach: Datetime for Deadlines
```python
deadline = fields.Datetime()
```
**Problem:** "Due Jan 15" might show as "Due Jan 14" in different timezones!

**Correct:**
```python
deadline = fields.Date()
```
**Benefit:** "Due Jan 15" is Jan 15 everywhere in the world.
:::

::: danger Wrong Approach: Float for Quantities Without Precision
```python
qty = fields.Float()
```
**Problem:** May get rounding errors like 2.9999999 instead of 3.0

**Correct:**
```python
qty = fields.Float(digits='Product Unit of Measure')
```
**Benefit:** Uses named precision (5 decimals) for consistent rounding.
:::

## Knowledge Check

::: details Q1: Which field type for Product Price?
**Answer: Monetary**

Monetary fields handle currency formatting, rounding rules, and multi-currency calculations automatically. Float would lose precision and not show currency symbols.
:::

::: details Q2: Which field type for Deadlines?
**Answer: Date**

Date fields store only the date without time, so "Jan 15" is Jan 15 for everyone. Datetime would shift based on timezone.
:::

::: details Q3: What's the difference between Html and Text?
**Answer: Html allows rich formatting and is sanitized; Text is plain text**

Html fields provide a rich text editor and sanitize content to prevent XSS attacks. Text is for multi-line plain text like notes or descriptions.
:::

::: details Q4: What does `tracking=True` do on a field?
**Answer: Logs changes in the chatter**

When a tracked field changes, Odoo automatically posts a message in the chatter showing the old and new values, like "Status: Draft → Confirmed".
:::

::: details Q5: Why use `digits='Product Price'` instead of `digits=(16, 2)`?
**Answer: Named precision is centrally configurable**

Using a named precision allows administrators to change decimal places globally in Settings → Technical → Decimal Accuracy, affecting all fields using that precision.
:::

::: details Q6: What makes a field "company_dependent"?
**Answer: It stores different values per company**

Company-dependent fields (like `standard_price` on products) store values in JSONB format with company IDs as keys, allowing each company to have its own value.
:::

::: details Q7: When should you use Image instead of Binary?
**Answer: When you need automatic resizing and thumbnails**

Image fields automatically create multiple sizes (1920, 1024, 512, 256, 128 pixels). Use for photos, logos, avatars. Binary is for documents like PDFs.
:::

::: details Q8: Can you change a Selection field's key after data exists?
**Answer: No - you would lose data**

Selection keys are stored in the database. Changing a key would orphan existing records. You can only change labels (the display text) safely.
:::
