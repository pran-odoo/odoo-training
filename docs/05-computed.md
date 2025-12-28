# Computed Fields Explained

::: info What Is a Computed Field?
A **computed field** is a field whose value is calculated automatically based on other fields.
Think of it like an **Excel formula**: `Total = Qty * Price`.
When you change the source fields, the computed field updates automatically!
:::

## Common Computed Fields You Use Every Day

| Field | Model | How It's Calculated |
| :--- | :--- | :--- |
| `amount_total` | `sale.order` | Sum of all order lines + taxes |
| `price_subtotal` | `sale.order.line` | quantity × unit price (with discounts) |
| `display_name` | `res.partner` | Combines name + company info |
| `age` | `hr.employee` | Today's date - birthday |
| `qty_available` | `product.product` | Sum of all stock quantities |
| `delivery_status` | `sale.order` | Checks if all shipments are done |
| `amount_due` | `account.move` | Total - Amount Paid |

## The Five Configurations of Computed Fields

| Configuration | Stored? | Editable? | Can Filter/Group? | When to Use |
| :--- | :--- | :--- | :--- | :--- |
| **Computed, Not Stored** | No | No | No | Dynamic values (age, days remaining) |
| **Computed, Stored** | Yes | No | Yes | Calculated values for reporting (totals) |
| **Computed, Stored, Editable** | Yes | Yes (overwrite) | Yes | Default value user can override |
| **Computed with Inverse** | Optional | Yes (bidirectional) | If stored | Two-way binding |
| **Computed with Precompute** | Yes | Optional | Yes | Compute BEFORE record creation (Odoo 16+) |

::: info Key Behaviors to Remember
- **Default store:** Computed fields are `store=False` by default
- **Default readonly:** Computed fields are readonly UNLESS they have an `inverse`
- **Default copy:** Computed fields are NOT copied on duplicate, unless stored AND not readonly
- **Precompute:** Only works on stored fields - computes value BEFORE record creation (faster)
- **@api.depends:** Required for stored computed fields to know when to recalculate
:::

### Real Examples in Odoo

| Where | Field | Configuration | Why? |
| :--- | :--- | :--- | :--- |
| Sales Order | Pricelist | Computed, Stored, Editable, Precompute | Default from customer, user can change |
| Sales Order | Currency | Computed, Stored, Editable, Precompute | Default from pricelist, editable |
| Event Track | Track Date | Computed, Inverse, Stored | Edit track date → updates event timing |
| Link Tracker | Short URL Code | Computed, Inverse, Editable | Auto-generated code, but customizable |

## The @api.depends Decorator - What Triggers Recalculation?

For stored computed fields, `@api.depends` tells Odoo **when to recalculate**:

```python
@api.depends('price_unit', 'quantity')
def _compute_subtotal(self):
    for line in self:
        line.price_subtotal = line.quantity * line.price_unit
```

| Dependency Syntax | Meaning |
| :--- | :--- |
| `@api.depends('price_unit', 'quantity')` | Recalculate when price or quantity changes |
| `@api.depends('order_line.price_subtotal')` | Recalculate when any order line subtotal changes |
| `@api.depends('partner_id.country_id')` | Recalculate when the customer's country changes |

::: warning The Dependency Trap
If a field is used in the calculation but **missing** from `@api.depends`, the result won't update automatically!

Example:
- `@api.depends('partner_id.country_id')` watches `partner_id` and `country_id`
- ✓ Change the customer → Field updates
- ✓ Change the customer's country → Field updates
- ✗ Change the customer's city → Field does NOT update (city isn't watched)
:::

## Context-Dependent Fields - Same Product, Different Values

Some computed fields show different values depending on **context**:

### The "Quantity Available" Mystery

| Location | "Laptop" qty_available |
| :--- | :--- |
| Warehouse A | 50 units |
| Warehouse B | 30 units |
| Product form (total) | 80 units |

This is because `qty_available` is a **context-dependent** computed field!

### How Context Works

When you open a product from different places, Odoo passes different context:
- From Warehouse A screen → `{'warehouse': 'WH-A'}`
- From Company X → `{'company': 'Company X'}`
- From a specific date report → `{'date': '2024-01-15'}`

The computed field uses this context to show the **relevant** value.

::: danger Context-Dependent Fields Cannot Be Stored
These fields are NEVER stored because:
- The value changes based on who's viewing and from where
- You can't store 50 different values for 50 warehouses in one column

This is why you can't filter or group by "Quantity Available" - it's always calculated fresh.
:::

## Editable Computed Fields (Inverse)

Some computed fields let you **edit them**, and the change flows back to the source:

| Field | What Happens When You Edit |
| :--- | :--- |
| Margin % | Edit margin → price updates to match |
| Total with Tax | Edit total → quantity adjusts |
| Track Date | Edit date → event timing updates |

This is called an **inverse** - the field works in both directions.

### How to Recognize Editable Computed Fields

- The field appears **editable** (not grayed out)
- You can type in it, and other fields change automatically
- Common in pricing, quantities, and percentage calculations

## Business Scenario: When to Store Computed Fields

| Scenario | Store? | Reason |
| :--- | :--- | :--- |
| Invoice total amount | Yes | Need to group invoices by amount in reports |
| Days until deadline | No | Changes every day, would need constant recalculation |
| Profit margin % | Yes | Want to filter "orders with margin > 20%" |
| Full address (combined) | No | Just for display, don't need to search by it |
| Order status | Yes | Want to filter/group orders by status |

## Troubleshooting Guide

| Problem | Likely Cause | Solution |
| :--- | :--- | :--- |
| Field shows 0 or empty | Source fields are empty | Check if required source fields have values |
| Field doesn't update after change | Changed field not in depends | Try saving the record first |
| Field shows wrong value | Stale cached data | Refresh page, clear browser cache |
| Different users see different values | Context-dependent field | Check if users have different company/warehouse settings |
| Can't filter/group by the field | Field is not stored | Ask developer to add `store=True` |
| Field is very slow to load | Heavy computation | Developer may need to optimize or store it |

## When to Ask Developer for Changes

### Request: "Please store this computed field"

Ask for `store=True` when:
- You need to **filter or group by** the field in list views
- The field is **slow to load** because calculation is complex
- You need the field in **reports** that query the database directly
- You want to **export** the field to Excel with correct values

### Request: "Please add X to the depends list"

Ask for additional dependencies when:
- Changing a field doesn't trigger the expected recalculation
- You have to manually save/refresh to see updated values

## Code Reference (For Developers)

```python
# Basic computed field
total = fields.Float(
    compute='_compute_total',
    store=True,  # Save to database
)

@api.depends('quantity', 'price_unit')
def _compute_total(self):
    for record in self:
        record.total = record.quantity * record.price_unit

# Editable computed field with inverse
margin_percent = fields.Float(
    compute='_compute_margin',
    inverse='_inverse_margin',
    store=True,
    readonly=False,
)

@api.depends('cost', 'price')
def _compute_margin(self):
    for record in self:
        if record.price:
            record.margin_percent = (record.price - record.cost) / record.price * 100

def _inverse_margin(self):
    for record in self:
        if record.margin_percent and record.cost:
            record.price = record.cost / (1 - record.margin_percent / 100)
```

## Knowledge Check

::: details Q1: Can't Group By a computed field?
**Answer: The field is not stored**

Only stored fields exist in the database for SQL grouping. Ask developer to add `store=True`.
:::

::: details Q2: Computed field requires save to update?
**Answer: Missing dependency**

The `@api.depends` decorator is likely missing the field you just changed. Report to developer.
:::

::: details Q3: How to make a computed field editable?
**Answer: Add an inverse method**

An `inverse` method allows writing values back to the source fields, enabling two-way binding.
:::

::: details Q4: Why do two users see different qty_available values?
**Answer: Context-dependent field**

`qty_available` is calculated based on the user's current warehouse/company context. This is normal behavior.
:::

::: details Q5: A computed field is slow. What can be done?
**Answer: Store it or optimize the calculation**

Stored computed fields only calculate when source data changes. Non-stored fields calculate every time you view them.
:::
