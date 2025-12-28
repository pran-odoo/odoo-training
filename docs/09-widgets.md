# 9. Widgets - Display vs Data Storage

::: danger The Golden Rule
**Widgets change how a field LOOKS, not what it STORES.**

Think of widgets like different picture frames - the photo inside stays the same, but the presentation changes.
:::

## Real Example You See Every Day

The "Status" field on a Sales Order stores a simple value like `'draft'` or `'sale'`. But look how differently it can appear:

| Location | Widget | Display |
|----------|--------|---------|
| In the header | `widget="statusbar"` | Horizontal pipeline: Quotation → Sales Order → Locked |
| In list view | `widget="badge"` | Colored pill/tag |

Same field, same data (`state = 'sale'`), completely different look!

## Widgets by Category

### Selection Field Widgets

Selection fields store a single choice from a list. These widgets change how users pick that choice:

| Widget | Looks Like | Best For | Where You've Seen It |
|--------|------------|----------|---------------------|
| `selection` (default) | Dropdown menu | Many options, save space | Country selection, Payment terms |
| `radio` | Radio buttons | 2-4 options, all visible | Invoice type (Customer/Vendor) |
| `statusbar` | Horizontal pipeline | Document workflow stages | Sales Order status, Invoice status |
| `badge` | Colored pill/tag | Status in list views | Order status column in list |
| `priority` | Stars (★★★) | Priority/importance | Lead priority in CRM |

### Relationship Field Widgets

These change how you select and display linked records:

| Widget | Looks Like | Best For | Where You've Seen It |
|--------|------------|----------|---------------------|
| `many2one` (default) | Dropdown with search | Standard relationship | Customer on Sales Order |
| `many2one_avatar` | Name + small image | Records with images | Product selection |
| `many2one_avatar_user` | User avatar + name | User assignments | Salesperson, Assigned To |
| `many2many_tags` | Colored tag pills | Multiple selections | Product Tags, Employee Skills |
| `many2many_checkboxes` | Checkbox list | Fixed small set of options | Access groups selection |

### Number and Money Widgets

| Widget | Looks Like | Best For | Where You've Seen It |
|--------|------------|----------|---------------------|
| `float` (default) | Plain number | General quantities | Quantity field |
| `monetary` | $ 1,234.56 | Money amounts | Unit Price, Total Amount |
| `percentage` | 25.00 % | Percentages | Discount %, Margin % |
| `progressbar` | Visual progress bar | Completion tracking | Project completion, Task progress |
| `integer` | Whole number only | Counts, sequences | Sequence number |

### Date and Time Widgets

| Widget | Looks Like | Best For | Where You've Seen It |
|--------|------------|----------|---------------------|
| `date` (default) | Date picker | Single dates | Invoice Date, Due Date |
| `daterange` | Start → End picker | Date ranges | Leave requests, Project dates |
| `remaining_days` | "In 5 days" / "3 days ago" | Deadlines | Due date display |

### Text and Content Widgets

| Widget | Looks Like | Best For | Where You've Seen It |
|--------|------------|----------|---------------------|
| `char` (default) | Single line input | Short text | Name, Reference |
| `text` | Multi-line textarea | Long plain text | Internal notes |
| `html` | Rich text editor | Formatted content | Product description, Email body |
| `url` | Clickable link | Website URLs | Partner website |
| `email` | Clickable mailto link | Email addresses | Contact email |
| `phone` | Clickable tel link | Phone numbers | Contact phone |
| `CopyClipboardChar` | Text + copy button | Codes to copy | Tracking numbers, API keys |

### Binary and Image Widgets

| Widget | Looks Like | Best For | Where You've Seen It |
|--------|------------|----------|---------------------|
| `binary` (default) | Upload/download button | Any file | Attachments |
| `image` | Image preview | Photos, logos | Product image, Partner logo |
| `pdf_viewer` | Embedded PDF viewer | PDF documents | Invoice PDF preview |

### Special Purpose Widgets

| Widget | Used For | Where You've Seen It |
|--------|----------|---------------------|
| `handle` | Drag to reorder rows | Order lines, Pricelist items |
| `boolean_toggle` | On/Off switch instead of checkbox | Settings toggles |
| `color` | Color picker | Stage colors in Kanban |
| `domain` | Domain builder UI | Filter rules in automated actions |
| `ace` | Code editor with syntax highlighting | Python code in server actions |

## How to Specify a Widget

### In XML Views

Add the `widget` attribute to a field:

```xml
<!-- In form view -->
<field name="state" widget="statusbar"/>
<field name="user_id" widget="many2one_avatar_user"/>
<field name="tag_ids" widget="many2many_tags"/>

<!-- In list view -->
<field name="state" widget="badge"/>
<field name="priority" widget="priority"/>
```

### In Studio

1. Open Studio on the form/list view
2. Click on the field you want to change
3. In the properties panel, find "Widget"
4. Select from the dropdown

::: info Note
Studio only shows widgets compatible with that field type.
:::

## Common Widget Mistakes

::: warning Watch Out For These

| Mistake | What Happens | Solution |
|---------|--------------|----------|
| Using `monetary` without `currency_field` | No currency symbol shown | Ensure model has a currency_id field linked |
| Using `statusbar` on non-Selection field | Widget doesn't render | Only works with Selection fields |
| Using `many2many_tags` on Many2one | Error or strange behavior | Use `many2one_avatar` instead |
| Using `image` on non-Binary field | Nothing displays | Image widget needs Binary field type |
:::

## Widgets Don't Change Data

::: danger Remember This
If you change a widget:
- ✓ The display changes
- ✓ The user experience changes
- ✗ The stored data does NOT change
- ✗ Reports using that field are NOT affected
- ✗ API responses are NOT affected

Widgets are purely a **presentation layer** concern.
:::

## Test Your Knowledge

**Q1: You change a Selection field from displaying as a dropdown to displaying as radio buttons (using `widget="radio"`). What happens to existing data in that field?**

- A) All existing data is cleared and must be re-entered
- B) The data is converted to a new format in the database
- C) Nothing - the stored data remains exactly the same, only the display changes ✓
- D) The field becomes read-only

::: details Answer
**Correct Answer: C**

Widgets only affect how data is displayed in the UI - they never modify the underlying data storage. Changing from dropdown to radio buttons is purely cosmetic. The database stores the same selection value regardless of which widget presents it.
:::

**Q2: A user wants to see the Sales Order "Status" field displayed as a clickable pipeline in the form header (showing Quotation → Sales Order → Locked). Which widget should be used?**

- A) `widget="badge"`
- B) `widget="statusbar"` ✓
- C) `widget="selection"`
- D) `widget="priority"`

::: details Answer
**Correct Answer: B**

The `statusbar` widget displays selection/many2one fields as a horizontal pipeline of stages. Users can click on stages to change the status. It's commonly used in form headers to show workflow progression like Quotation → Sales Order.
:::

**Q3: What widget would you use to display a Many2many field as colorful, removable tags?**

- A) `widget="many2many_tags"` ✓
- B) `widget="text"`
- C) `widget="char"`
- D) `widget="selection"`

::: details Answer
**Correct Answer: A**

The `many2many_tags` widget displays records as colorful, removable tags. It's typically used with Many2many fields to show related records in an intuitive, visual way that makes multi-value selection easy.
:::

## Widget Quick Reference by Field Type

### For Selection Fields

| Widget | Use When |
| :--- | :--- |
| `selection` | Many options, standard dropdown |
| `radio` | 2-4 options, all visible at once |
| `statusbar` | Document workflow in form header |
| `badge` | Status display in list views |
| `priority` | Star rating for importance |

### For Relational Fields

| Widget | Use When |
| :--- | :--- |
| `many2one` | Standard single selection |
| `many2one_avatar` | Show image with name |
| `many2one_avatar_user` | User assignment with avatar |
| `many2many_tags` | Multiple colored tags |
| `many2many_checkboxes` | Small fixed set as checkboxes |

### For Numeric Fields

| Widget | Use When |
| :--- | :--- |
| `float` | Standard decimal number |
| `monetary` | Currency amounts (needs currency_field) |
| `percentage` | Show as percentage with % symbol |
| `progressbar` | Visual completion indicator |
| `integer` | Whole numbers only |

### For Text Fields

| Widget | Use When |
| :--- | :--- |
| `char` | Single line text |
| `text` | Multi-line plain text |
| `html` | Rich text with formatting |
| `email` | Clickable email link |
| `phone` | Clickable phone link |
| `url` | Clickable website link |

## Requesting Widget Changes

When asking a developer to change a widget:

> "Please change the [field name] field on [model/view] to use the [widget name] widget."

**Example requests:**
- "Please change the status field in the order list view to use the badge widget"
- "Please change the assigned user field to use many2one_avatar_user"
- "Please change the priority field to use the priority widget (stars)"
