# Field Storage - store=True vs store=False

::: danger Why This Matters
Whether a field is **stored** determines:
- Can you **filter** by it?
- Can you **group** reports by it?
- How fast is it to read?
- Does it take database space?
:::

## The Two Storage Options

| Feature | `store=True` | `store=False` |
| :--- | :--- | :--- |
| **Database** | Has a column | No column (Virtual) |
| **Value** | Saved permanently | Calculated on-the-fly |
| **Performance** | Fast read | Slower (calculates every time) |
| **Group By** | **Yes** | **No** |
| **Filtering** | Fast (indexed) | Slow (computed during search) |
| **Default For** | Char, Integer, Many2one | Computed, One2many, Related |

::: tip Analogy: Calculator vs Notebook
- **Stored**: Writing the answer in a notebook. (Fast to read, takes space).
- **Not Stored**: Using a calculator every time. (Slow, always fresh, takes no space).
:::

## Practical Impact

### Example: Invoice Total

The field `amount_total` on an invoice is **Computed** (sum of lines) but **Stored** (`store=True`).

| If `store=False` | If `store=True` |
| :--- | :--- |
| Calculated by summing all lines each time you view | Stored in database column |
| Always accurate | Must be recalculated when lines change |
| Cannot group invoices by total | Can group "Invoices by Total Amount" |

**Odoo's Choice:** `amount_total` is stored (store=True) so you can use it in reports!

### Which Fields Are NOT Stored?

| Field Type | Why Not Stored | Example |
| :--- | :--- | :--- |
| **One2many** | Virtual (reads child records) | Order Lines on Sales Order |
| **Computed** (default) | Calculated fresh each time | Employee age, Days until deadline |
| **Related** (default) | Reads from linked record | Customer Country on Order |
| **Context-Dependent** | Changes based on who's viewing | Stock Quantity (varies by warehouse) |

## Why Can't I Group By Some Fields?

::: danger The Group By Limitation
**Database Rule**: You can only GROUP BY columns that exist in the database table.
If a field is `store=False`, it has no column, so SQL cannot group by it.

**Exception:** Some fields may *appear* as "Stored: False" in Developer Mode but still work for Group By. This happens when Odoo uses SQL translation tricks (like `_field_to_sql`) to redirect queries to an underlying stored field.
:::

### Common Frustration: "Why can't I group by this field?"

If you're trying to group records by a field and it doesn't work, check if it's:
- A computed field without `store=True`
- A related field without `store=True`
- A One2many field (never works for grouping)

**Solution**: Ask a developer to make the field stored, or group by a different field.

## Real Examples: Stored vs Not Stored

| Field | Stored? | Why? |
| :--- | :--- | :--- |
| Invoice Total (`amount_total`) | **Yes** | Finance needs to filter/group invoices by amount |
| Employee Age | **No** | Changes every day - would need daily recalculation |
| Order Margin % | **Yes** | Sales managers filter "orders with margin > 20%" |
| Stock Quantity (`qty_available`) | **No** | Different per warehouse - can't store one value |
| Customer Country on Order | **Depends** | Not stored if just for display; stored if used in reports |

## Context-Dependent Fields

Some fields show different values depending on who is looking or where they are looking from. These **cannot be stored**.

### Example: Why Stock Quantity Isn't Stored

A product might have:
- 50 units in Paris warehouse
- 120 units in London warehouse
- 0 units in New York warehouse

If you stored "qty_available = 50", users in London would see wrong data. So it's computed each time based on which warehouse the user is viewing.

### Other Context-Dependent Examples

| Field | Depends On | Why Can't Store |
| :--- | :--- | :--- |
| `qty_available` | Selected warehouse | Different per location |
| `standard_price` | Current company | Different cost per company |
| My Tasks | Current user | Each user sees own tasks |
| Pricelist price | Selected pricelist | Different per customer |

## When Stored Fields Don't Update

::: warning The "Stale Data" Problem
Stored computed fields can sometimes show outdated values. This happens when:
- The "trigger" fields weren't defined correctly by the developer
- Data was imported/modified bypassing normal Odoo flows
- A bug prevents recalculation
:::

**Quick fix:** Edit and save the record to trigger recalculation. For bulk fixes, ask a developer to run a recomputation.

## Storage Decision Quick Reference

### When Would a Field Need to Be Stored?

| Requirement | Should Be Stored? |
| :--- | :--- |
| Need to Group By it | **Must be stored** |
| Need to filter/search frequently | **Should be stored (faster)** |
| Used in reports/dashboards | **Usually needs to be stored** |
| Changes based on current date | Should NOT be stored |
| Changes based on current user | Cannot be stored |
| Varies by warehouse/company | Cannot be stored |

## Case Study: Employee Department Grouping

::: info The Mystery
In the Employee list, you can **Group By Department**, even though `department_id` appears as `Stored: False` in developer mode. Why?
:::

### Investigation

Looking at `hr.employee` in Odoo 19+:

```python
class HrEmployee(models.Model):
    _name = 'hr.employee'
    _inherits = {'hr.version': 'version_id'}  # Delegation inheritance

    # NOT stored!
    version_id = fields.Many2one('hr.version',
        compute='_compute_version_id', store=False)

    # THIS ONE IS STORED!
    current_version_id = fields.Many2one('hr.version',
        compute='_compute_current_version_id', store=True)
```

### The Magic: SQL Translation

```python
def _field_to_sql(self, alias, field_expr, query=None):
    """Swap version_id for current_version_id in SQL"""
    if field_expr == 'version_id':
        field_expr = 'current_version_id'  # ← Redirects to stored field!
    return super()._field_to_sql(alias, field_expr, query)
```

When you search or group by fields accessed through `version_id`, Odoo automatically translates it to use `current_version_id` instead - which IS stored!

### The Actual Stored Field

In `hr.version`:
```python
department_id = fields.Many2one('hr.department',
    check_company=True, tracking=True, index=True)  # ← Stored with index!
```

### Why Two Version Links? (Odoo 19+)

Odoo 19 introduced **employee versioning** to track history:

| Field | Stored? | Purpose |
| :--- | :--- | :--- |
| `version_id` | No (computed) | Points to version you're VIEWING (can be historical) |
| `current_version_id` | **Yes** | Always points to the CURRENT active version |

For searching and grouping, Odoo uses `current_version_id` to join to `hr_version` where `department_id` lives.

### How Group By Actually Works

1. Odoo sees `group_by: 'department_id'`
2. Since `department_id` comes through `version_id` (via `_inherits`)
3. The `_field_to_sql` method translates `version_id` → `current_version_id`
4. `current_version_id` IS stored, so Odoo can JOIN to `hr_version`
5. `department_id` IS stored in `hr_version` with an index
6. Database performs: `GROUP BY hr_version.department_id`
7. Result: Employees grouped by department!

::: warning Why Does Developer Mode Show "Stored: False"?
Developer Mode shows the "direct" storage status from the model's perspective. Behind the scenes, Odoo may have special handling (like `_field_to_sql`) that makes searching/grouping work anyway!

**Lesson:** Don't trust Developer Mode's "Stored: False" indicator alone when investigating Group By issues.
:::

## Quick Check: Is It Stored?

| Field Type | Stored? | Can Group By? |
| :--- | :--- | :--- |
| Regular (Char, Int, Many2one) | ✅ Yes | ✅ Yes |
| Field via `_inherits` delegation | ✅ Yes (in parent table) | ✅ Yes |
| Computed with `store=True` | ✅ Yes | ✅ Yes |
| Computed with `store=False` | ❌ No | ❌ No |
| Related with `store=True` | ✅ Yes | ✅ Yes |
| Related with `store=False` | ❌ No | ❌ No |
| One2many | ❌ Never | ❌ Never |

## Knowledge Check

::: details Q1: Can you Group By a non-stored computed field?
**Answer: No - the field must have store=True**

Group By uses SQL, which requires real database columns. Non-stored fields have no column.
:::

::: details Q2: Which field type is NEVER stored?
**Answer: One2many**

One2many is always virtual - it reads from the child relationship. It has no database column of its own.
:::

::: details Q3: Why can't Stock Quantity (qty_available) be stored?
**Answer: It varies by warehouse**

A product can have 50 units in Paris, 120 in London, 0 in New York. There's no single "right" value to store - it depends on which warehouse you're viewing.
:::

::: details Q4: A stored computed field shows wrong value. What happened?
**Answer: Stale data - the field wasn't recalculated**

This happens when trigger fields aren't defined correctly, data was imported directly, or a bug prevented recalculation. Fix: Edit and save the record, or ask a developer to run recomputation.
:::

::: details Q5: Developer Mode shows "Stored: False" but Group By works. Why?
**Answer: Delegation inheritance with SQL translation**

The field might be accessed through `_inherits` delegation, and Odoo uses `_field_to_sql` to redirect queries to an underlying stored field. The display in Developer Mode doesn't reflect this special handling.
:::
