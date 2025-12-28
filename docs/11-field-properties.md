# 11. Field Properties

## What Are Field Properties?

Properties are settings that control a field's behavior: Is it required? Can it be edited? What's the default value?

::: tip Why This Matters to You
Ever wondered why:
- Some fields turn **red** and won't let you save without filling them? → `required=True`
- Some fields are **grayed out** and can't be edited? → `readonly=True`
- Some fields **auto-fill** when you create a new record? → `default=...`
- Some changes appear in the **chatter history**? → `tracking=True`
- Some fields are **invisible** to certain users? → `groups="..."`

These are all field properties in action. Understanding them helps you configure Odoo behavior and communicate requirements to developers.
:::

## Common Field Properties

| Property | Type | What It Does | Example Use |
|----------|------|--------------|-------------|
| **string** | String | Label shown to users | `string="Customer Name"` |
| **required** | Boolean | Must be filled before saving | `required=True` |
| **readonly** | Boolean | Cannot be edited by users | `readonly=True` |
| **default** | Value/Function | Initial value for new records | `default=lambda self: fields.Date.today()` |
| **help** | String | Tooltip text on hover | `help="Enter the full legal name"` |
| **index** | Boolean/String | Create database index for faster search | `index=True` |
| **copy** | Boolean | Include when duplicating record | `copy=False` for reference numbers |
| **tracking** | Boolean/Integer | Log changes in chatter | `tracking=True` |
| **groups** | String | Restrict visibility to user groups | `groups="account.group_account_manager"` |
| **company_dependent** | Boolean | Different value per company | `company_dependent=True` |
| **translate** | Boolean | Can be translated to other languages | `translate=True` |

### Viewing Field Properties in Developer Mode

Want to see these properties for any field in Odoo? Here's how:

1. Enable **Developer Mode** (Settings → bottom of page → Activate Developer Mode)
2. Go to any form view and **hover over a field label**
3. A tooltip appears showing the field's technical name
4. Click **Debug icon (bug) → View Fields** to see all fields and their properties

**Or via Technical menu:** Settings → Technical → Database Structure → Models → find your model → Fields tab

## Model vs View Properties

::: warning Same Property, Different Place
Some properties can be set in **two places** with different effects:

| Property | On Model (Python) | On View (XML) |
|----------|------------------|---------------|
| **required** | Always enforced, even via API | Only enforced in this specific view |
| **readonly** | Cannot be changed via UI or code (with exceptions) | Cannot be changed in this view only |
| **invisible** | N/A (use groups to hide) | Hidden in this view only |

**Rule of thumb:** Model-level properties are enforced everywhere. View-level properties only affect that specific view.
:::

## ondelete for Many2one Fields

### What Happens When Linked Record Is Deleted?

| ondelete Value | Behavior | Use Case |
|----------------|----------|----------|
| `'set null'` | Set field to empty | Optional relationships (default) |
| `'restrict'` | Prevent deletion | Critical references (can't delete customer with orders) |
| `'cascade'` | Delete this record too | Child records (delete order lines with order) |

## Company-Dependent Fields (Multi-Company)

::: danger What Are Company-Dependent Fields?
In a multi-company environment, some field values need to be **different for each company**. For example, a product might have different costs, accounting configurations, or warehouse settings per company.
:::

### Real-World Analogy

Think of a franchise business. The same product "Burger Meal" exists across all locations, but:
- The **price** might be different in each city
- The **supplier** might be different per region
- The **tax rate** varies by country

Company-dependent fields solve exactly this - **one record, multiple company-specific values**.

### How It Works Technically

When a field has `company_dependent=True`:
- The value is stored as **JSONB** in the database with company IDs as keys
- When you read the field, Odoo automatically returns the value for your **current company**
- Fallback values can be set via `ir.default` (System Parameters)

```python
# Database storage example:
{"1": 100.00, "2": 95.50, "3": 110.00}
# Company 1 sees: 100.00
# Company 2 sees: 95.50
# Company 3 sees: 110.00
```

### Common Company-Dependent Fields in Odoo

| Location | Field | Why Company-Dependent? |
|----------|-------|----------------------|
| Product → General Information | Cost (standard_price) | Each company may have different purchase costs for the same product |
| Product → Accounting | Income Account / Expense Account | Each company has its own Chart of Accounts |
| Product → Inventory | Stock Valuation Account | Inventory valuation accounts differ per company |
| Contact → Sales & Purchase | Customer Payment Terms / Vendor Payment Terms | Different payment agreements per company |
| Contact → Accounting | Account Receivable / Account Payable | Different receivable/payable accounts per Chart of Accounts |
| Contact → Sales & Purchase | Fiscal Position | Tax rules vary by company/country |
| Contact → Sales & Purchase | Pricelist | Different pricing strategies per company |
| User Preferences | Default Warehouse | Users work with different warehouses per company |
| Contact → Purchase | Delivery Method | Shipping carriers vary per company location |

::: warning Important for Functional Consultants
- **Always check your current company** when configuring these fields
- If a field shows different values when switching companies, it's likely company-dependent
- Use **Developer Mode** → hover over field → check for "company_dependent" in technical info
- When importing data, make sure you're in the correct company context
:::

## Properties Field (Dynamic Custom Fields)

::: danger What Is the Properties Field?
The **Properties** field type (added in Odoo 16/17) lets you create **dynamic custom fields on the fly** without modifying the database structure. Think of it as flexible "extra attributes" that can be different for each parent record.
:::

### Real-World Analogy

Imagine a Project Management system:
- **Project A (Website Redesign)** needs fields: "Design Tool", "Browser Compatibility", "Mobile First?"
- **Project B (Office Move)** needs fields: "Moving Company", "Insurance Policy", "Floor Plan Approved?"

With Properties, each project can have **its own custom fields** for tasks, without creating hundreds of unused fields in the database!

### How Properties Work

**Key Concept:** The property *definition* (field names, types) is stored on the parent. The property *values* are stored on each child as JSON.

```
Container Record (e.g., Project)     →     Child Records (e.g., Tasks)
   Defines the property structure              Store only the values
```

### Supported Property Types

| Type | Description | Example Use |
|------|-------------|-------------|
| `char` | Short text | Version number, code name |
| `text` | Long text | Detailed notes |
| `html` | Rich text (HTML) | Formatted descriptions, instructions |
| `integer` | Whole number | Priority score, count |
| `float` | Decimal number | Percentage, rating |
| `boolean` | Yes/No checkbox | Is approved?, Is urgent? |
| `date` | Date picker | Target date, review date |
| `datetime` | Date and time | Meeting time, deadline |
| `selection` | Dropdown options | Status, category |
| `tags` | Multiple tags | Labels, skills required |
| `many2one` | Link to another record | Assigned vendor, related contact |
| `many2many` | Multiple links | Related documents, team members |
| `monetary` | Currency amount | Budget, estimated cost |
| `separator` | Visual divider | Grouping properties visually |

### Where You'll Find Properties in Standard Odoo

- **Project Tasks** - Each project can define custom properties for its tasks
- **CRM Leads** - Different sales teams can have different lead attributes
- **Helpdesk Tickets** - Each helpdesk team can customize ticket fields

### Properties vs Traditional Custom Fields

| Aspect | Properties Field | Traditional Custom Field |
|--------|-----------------|-------------------------|
| **Database Impact** | No schema change (stored as JSON) | Adds column to table |
| **Flexibility** | Different fields per parent record | Same fields for all records |
| **Search/Filter** | Supported (with some limitations) | Full support |
| **Reporting** | Limited in standard reports | Full reporting support |
| **Best For** | Flexible, per-parent customization | Consistent fields across all records |

::: warning When to Use What?
- **Use Properties** when different parent records need different "child attributes" (e.g., different projects need different task fields)
- **Use Traditional Fields** when ALL records need the same field (e.g., all products need a "brand" field)
- **Use Studio** (Enterprise) for quick custom fields without code when Properties isn't suitable
:::

## Conditional Field Properties in Views

Properties can be set dynamically in views using conditions:

```xml
<!-- Required only in certain states -->
<field name="delivery_date" required="state == 'confirmed'"/>

<!-- Readonly after confirmation -->
<field name="partner_id" readonly="state != 'draft'"/>

<!-- Invisible based on type -->
<field name="vehicle_vin" invisible="product_type != 'vehicle'"/>
```

### Common Conditional Patterns

| Pattern | XML Attribute | Use Case |
| :--- | :--- | :--- |
| Required when confirmed | `required="state == 'confirmed'"` | Enforce fields at specific stages |
| Readonly after draft | `readonly="state != 'draft'"` | Lock fields after workflow progress |
| Show for specific type | `invisible="type != 'service'"` | Different fields for different record types |
| Hide from non-managers | `groups="base.group_system"` | Security-based visibility |

## Knowledge Check

::: details Q1: What's the difference between required on model vs view?
**Answer: Model-level is enforced everywhere, view-level only in that view**

- `required=True` in Python: Enforced via API, imports, and all views
- `required="1"` in XML: Only enforced in that specific view

Use model-level for business rules that must always apply.
:::

::: details Q2: A field shows different values when switching companies. Why?
**Answer: It's a company-dependent field**

Fields with `company_dependent=True` store different values per company as JSONB. The value displayed depends on the user's current company context.
:::

::: details Q3: When should you use the Properties field type?
**Answer: When different parent records need different child attributes**

Properties are ideal when each project/team/category needs its own custom fields for child records, without creating unused fields across all records.
:::

::: details Q4: What does ondelete='restrict' do?
**Answer: Prevents deletion of the linked record**

If you try to delete a customer that has invoices, and the invoice's `partner_id` has `ondelete='restrict'`, the deletion is blocked with an error.
:::

::: details Q5: How do you check a field's properties in Odoo?
**Answer: Developer Mode → Debug icon → View Fields, or Settings → Technical → Fields**

Enable Developer Mode, then either hover over a field and use the debug menu, or navigate to Settings → Technical → Database Structure → Fields.
:::
