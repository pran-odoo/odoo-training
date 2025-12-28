# 10. Domain Filters - Controlling Data

## What Is a Domain?

A **domain** is a filter condition that limits which records are shown or selectable.

Domains are written as a list of conditions: `[('field', 'operator', 'value')]`

::: tip A Day Without Domains
Imagine you're setting up a Sales Order. When you click the Customer dropdown, you see EVERY contact in the system - 50,000 records including vendors, shipping addresses, employees, and archived contacts. Good luck finding your customer!

**Domains are the unsung heroes** that make Odoo actually usable - they filter what appears in dropdowns, power your saved searches, and enforce who can see what data.
:::

## Where You See Domains Every Day

| Where You See It | What's Happening | The Domain Behind It |
|-----------------|-----------------|---------------------|
| Customer dropdown shows only customers | Field domain filters contacts | `[('customer_rank', '>', 0)]` |
| "My Orders" filter in search | Search filter with domain | `[('user_id', '=', uid)]` |
| Quotations menu shows only quotes | Window action domain | `[('state', 'in', ['draft', 'sent'])]` |
| Salesperson only sees their sales | Record rule domain | `[('user_id', '=', user.id)]` |
| Products dropdown shows only stockable | Dynamic field domain | `[('detailed_type', '=', 'product')]` |

## How Domains Work

### Domain Structure

A domain is a **list of conditions** (called "leaves") combined with **logical operators**.

**Each condition is a tuple with 3 parts:**
1. **Field name** - The field to filter on (can use dot notation for related fields)
2. **Operator** - How to compare (=, !=, in, like, etc.)
3. **Value** - What to compare against

```
[('state', '=', 'draft'), ('amount', '>', 1000)]
   ↓         ↓       ↓
 field   operator  value
```

**Default behavior:** Multiple conditions are combined with AND (all must be true).

### Reading Domains Step by Step

**Simple domain:** `[('active', '=', True)]`
→ "Show records where active equals True"

**Multiple conditions:** `[('state', '=', 'sale'), ('amount', '>', 1000)]`
→ "Show records where state is 'sale' AND amount is greater than 1000"

**OR condition:** `['|', ('state', '=', 'draft'), ('state', '=', 'sent')]`
→ "Show records where state is 'draft' OR state is 'sent'"

**Dot notation:** `[('partner_id.country_id.code', '=', 'IN')]`
→ "Show records where the partner's country code is 'IN' (India)"

## Domain Operators

| Operator | Meaning | Example | Result |
|----------|---------|---------|--------|
| `=` | Equals | `[('state', '=', 'draft')]` | Records where state is draft |
| `!=` | Not equals | `[('state', '!=', 'cancel')]` | Records not cancelled |
| `>` | Greater than | `[('amount', '>', 1000)]` | Amount over 1000 |
| `<` | Less than | `[('amount', '<', 500)]` | Amount under 500 |
| `>=` | Greater or equal | `[('qty', '>=', 10)]` | Quantity 10 or more |
| `<=` | Less or equal | `[('date', '<=', '2024-12-31')]` | Date on or before Dec 31 |
| `in` | In list | `[('state', 'in', ['draft', 'sent'])]` | Draft OR sent |
| `not in` | Not in list | `[('state', 'not in', ['cancel', 'done'])]` | Not cancelled or done |
| `like` | Contains (case sensitive) | `[('name', 'like', 'Sales')]` | Name contains "Sales" |
| `ilike` | Contains (case insensitive) | `[('email', 'ilike', '@gmail')]` | Gmail addresses |
| `=like` | Pattern match | `[('ref', '=like', 'SO%')]` | Starts with "SO" |
| `=ilike` | Pattern (case insensitive) | `[('name', '=ilike', '%ltd')]` | Ends with "ltd" |
| `not like` | Does not contain (case sensitive) | `[('name', 'not like', 'Test')]` | Name doesn't contain "Test" |
| `not ilike` | Does not contain (case insensitive) | `[('email', 'not ilike', 'spam')]` | Email without "spam" |
| `=?` | Equals if value is set | `[('company_id', '=?', company_id)]` | Filter by company only if company_id has a value |
| `child_of` | Hierarchical child | `[('categ_id', 'child_of', 5)]` | Category 5 and children |
| `parent_of` | Hierarchical parent | `[('categ_id', 'parent_of', 10)]` | Parents of category 10 |
| `any` | Relational subdomain | `[('order_line', 'any', [('product_id.type', '=', 'service')])]` | Orders with service products |
| `not any` | Negated subdomain | `[('order_line', 'not any', [('qty_delivered', '>', 0)])]` | Orders with no delivered lines |

### The "any" and "not any" Operators

These operators filter through relational fields with complex conditions:

**The `any` operator:**
- Filter records where **at least one** related record matches a subdomain
- **Syntax:** `[('relation_field', 'any', [subdomain])]`

**The `not any` operator:**
- Filter records where **no** related records match a subdomain
- **Syntax:** `[('relation_field', 'not any', [subdomain])]`

```python
# Find sales orders with service products
[('order_line', 'any', [('product_id.type', '=', 'service')])]

# Find orders with NO delivered lines
[('order_line', 'not any', [('qty_delivered', '>', 0)])]

# Find partners with invoices to pay
[('partner_invoice_id', 'any', [('state', '=', 'posted')])]
```

::: info Note
The traditional dot notation `[('order_line.product_id.type', '=', 'service')]` is equivalent to using `any` and still works.
:::

### The "=?" Conditional Operator

The `=?` operator is special - it only applies the filter if the value is truthy:

```python
# Only filter by company if company_id is set
domain="[('company_id', '=?', company_id)]"

# This is equivalent to:
# If company_id is set: [('company_id', '=', company_id)]
# If company_id is False/empty: [] (no filter, show all)
```

**Common use case:** Field domains that should filter by company only when a company is selected.

## Pattern Matching with Wildcards

The `=like` and `=ilike` operators use SQL LIKE syntax with wildcards:

| Wildcard | Meaning | Example | Matches |
|----------|---------|---------|---------|
| `%` | Any characters (0 or more) | `[('ref', '=like', 'SO%')]` | SO001, SO123, SO |
| `_` | Exactly one character | `[('code', '=like', 'A_')]` | A1, AB, AX (not A, A12) |
| `%...%` | Contains anywhere | `[('name', '=ilike', '%sales%')]` | Sales Team, Pre-Sales, sales |

**Difference between `like` and `=like`:**
- `like` automatically adds `%` around your value → `%value%`
- `=like` uses your value exactly as provided (you control the wildcards)

```python
# These are equivalent:
[('name', 'like', 'Sales')]      # → matches '%Sales%'
[('name', '=like', '%Sales%')]   # → matches '%Sales%'

# But these are different:
[('ref', '=like', 'SO%')]        # Starts with SO
[('ref', 'like', 'SO')]          # Contains SO anywhere
```

## Combining Conditions

### AND, OR, NOT Logic (Prefix Notation)

Odoo uses **prefix notation** (Polish notation) where the operator comes BEFORE the conditions it applies to.

| Symbol | Meaning | How It Works |
|--------|---------|--------------|
| `&` (default) | AND - both must be true | Applied to the NEXT TWO conditions |
| `\|` | OR - either can be true | Applied to the NEXT TWO conditions |
| `!` | NOT - inverse | Applied to the NEXT ONE condition |

### Understanding Prefix Notation

**Key rule:** The operator applies to the conditions that follow it.

**Simple OR:**
```python
['|', ('state', '=', 'draft'), ('state', '=', 'sent')]
# → state is draft OR state is sent
```

**Chained OR (A OR B OR C):**
```python
['|', '|', ('a', '=', 1), ('b', '=', 2), ('c', '=', 3)]
# → A OR B OR C
```

**Mixed AND/OR (A AND (B OR C)):**
```python
['&', ('a', '=', 1), '|', ('b', '=', 2), ('c', '=', 3)]
# → A AND (B OR C)
```

### Common Domain Patterns

**1. Either/Or (A OR B):**
```python
['|', ('state', '=', 'draft'), ('state', '=', 'sent')]
```

**2. Multiple OR (A OR B OR C):**
```python
['|', '|', ('state', '=', 'a'), ('state', '=', 'b'), ('state', '=', 'c')]
# Easier alternative using 'in':
[('state', 'in', ['a', 'b', 'c'])]
```

**3. AND with OR ((A OR B) AND C):**
```python
['&', '|', ('type', '=', 'a'), ('type', '=', 'b'), ('active', '=', True)]
```

**4. NOT condition:**
```python
['!', ('state', '=', 'cancel')]  # state is NOT cancel
# Easier alternative:
[('state', '!=', 'cancel')]
```

**5. Complex: (A AND B) OR (C AND D):**
```python
['|', '&', ('a', '=', 1), ('b', '=', 2), '&', ('c', '=', 3), ('d', '=', 4)]
```

## Where Domains Are Used

| Location | Purpose | Example |
|----------|---------|---------|
| **Field Definition** | Limit dropdown choices | partner_id domain: only show customers |
| **Search Filters** | Predefined searches | "My Orders" filter |
| **Action Windows** | What records to show | Menu shows only quotations |
| **Record Rules** | Security restrictions | Users see only their company's data |
| **Reports** | Filter report data | Only confirmed invoices |

### Practical Examples

**1. Show only companies (not individuals) in dropdown:**
```python
[('is_company', '=', True)]
```

**2. Show only products in stock:**
```python
[('qty_available', '>', 0)]
```

**3. Show orders from last 30 days:**
```python
[('date_order', '>=', (context_today() - relativedelta(days=30)).strftime('%Y-%m-%d'))]
```

**4. Show only active, confirmed sales orders for current user:**
```python
[('active', '=', True), ('state', '=', 'sale'), ('user_id', '=', uid)]
```

## Domain Variables in XML

When writing domains in XML views, you can use special variables:

| Variable | Meaning | Example |
|----------|---------|---------|
| `uid` | Current user's ID | `[('user_id', '=', uid)]` |
| `user` | Current user record | `[('company_id', '=', user.company_id.id)]` |
| `company_id` | Current company ID | `[('company_id', '=', company_id)]` |
| `company_ids` | All allowed company IDs | `[('company_id', 'in', company_ids)]` |
| `context_today()` | Today's date | `[('date', '=', context_today())]` |
| `self` | Current field value (in filter_domain) | `[('categ_id', 'child_of', self)]` |
| `parent.field` | Parent record's field value | `[('partner_id', '=', parent.partner_id)]` |

## Dynamic Domains

### Making Dropdowns Change Based on Selections

One of the most powerful features: make a field's domain depend on another field's value.

**Scenario:** On a Sales Order, you want the Product dropdown to only show products from the selected Pricelist's allowed categories.

**In XML views, use field references:**
```xml
<field name="pricelist_id"/>
<field name="product_id" domain="[('categ_id', 'in', pricelist_id.item_ids.categ_id.ids)]"/>
```

**Common dynamic domain patterns:**

| Scenario | Domain |
|----------|--------|
| Products matching selected category | `[('categ_id', '=', categ_id)]` |
| Contacts from selected company | `[('parent_id', '=', company_partner_id)]` |
| Bank accounts of selected partner | `[('partner_id', '=', partner_id)]` |
| Employees in selected department | `[('department_id', '=', department_id)]` |

## Common Mistakes to Avoid

::: warning Domain Pitfalls

**❌ Wrong: Using = with a list**
```python
[('state', '=', ['draft', 'sent'])]  # WRONG!
```
**✅ Correct: Use 'in' for multiple values**
```python
[('state', 'in', ['draft', 'sent'])]  # Correct
```

**❌ Wrong: Forgetting prefix for OR**
```python
[('state', '=', 'draft'), '|', ('state', '=', 'sent')]  # WRONG!
```
**✅ Correct: Put '|' before the conditions**
```python
['|', ('state', '=', 'draft'), ('state', '=', 'sent')]  # Correct
```

**❌ Wrong: Comparing to None**
```python
[('partner_id', '=', None)]  # WRONG!
```
**✅ Correct: Use False for empty/null**
```python
[('partner_id', '=', False)]  # Correct - finds records without partner
```

**❌ Wrong: Uppercase operators**
```python
[('name', 'ILIKE', 'test')]  # Deprecated since Odoo 19
```
**✅ Correct: Always lowercase operators**
```python
[('name', 'ilike', 'test')]  # Correct
```
:::

## Domain Troubleshooting

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| Dropdown shows nothing | Domain too restrictive or typo in field name | Test with empty domain `[]` first, then add conditions one by one |
| Domain works in shell but not in view | Missing variable (uid, context_today, etc.) | Check if you're using view-only variables in Python code |
| "Invalid field" error | Field doesn't exist or wrong model | Verify field name in Developer Mode → View Fields |
| Domain ignored | Domain in wrong attribute or overridden | Check inherited views that might override the domain |
| OR logic not working | Prefix notation error | Remember: `\|` goes BEFORE the two conditions it joins |

## Test Your Knowledge

**Q1: You want to filter Sales Orders to show only those that are EITHER in "Sales Order" status OR have a total amount greater than $10,000. Which domain is correct?**

- A) `[('state', '=', 'sale'), ('amount_total', '>', 10000)]`
- B) `['|', ('state', '=', 'sale'), ('amount_total', '>', 10000)]` ✓
- C) `[('state', '=', 'sale'), '|', ('amount_total', '>', 10000)]`
- D) `[('state', '=', 'sale') | ('amount_total', '>', 10000)]`

::: details Answer
**Correct Answer: B**

Odoo uses Polish (prefix) notation for OR operators. The `'|'` must come BEFORE the two conditions it joins. Without the `'|'` prefix, conditions are implicitly ANDed together. Option A would show orders that are BOTH in sale status AND over $10,000.
:::

**Q2: On a Sales Order form, you want the "Warehouse" dropdown to only show warehouses belonging to the same company as the order. What domain variable would you use?**

- A) `[('company_id', '=', self.company_id.id)]`
- B) `[('company_id', '=', context.get('company_id'))]`
- C) `[('company_id', '=', uid)]`
- D) `[('company_id', '=', company_id)]` ✓

::: details Answer
**Correct Answer: D**

In view domains, you can reference other fields on the same record directly by their field name. `company_id` refers to the company selected on the current Sales Order form. This creates a dynamic domain that changes as the user changes the company field.
:::

**Q3: What does the domain operator `'ilike'` do compared to `'='`?**

- A) It matches the exact value, but case-sensitive
- B) It matches only integer values
- C) It performs a case-insensitive partial match (contains) ✓
- D) It matches the value at the beginning of the field only

::: details Answer
**Correct Answer: C**

The `'ilike'` operator performs a case-insensitive pattern match. `[('name', 'ilike', 'john')]` will match "John Smith", "JOHN DOE", and "johnny". The `'='` operator requires an exact match. Use `'like'` for case-sensitive partial matching.
:::
