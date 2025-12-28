# Common Mistakes & How to Avoid Them

::: danger Learning from Mistakes
This section covers the most common mistakes made by functional consultants and how to avoid them. Understanding these pitfalls will save you hours of troubleshooting and help you design better solutions.
:::

## Data Model Mistakes

### Mistake 1: Using Non-Stored Fields in Group By

::: danger Wrong Approach
"I want to group orders by customer country"

Uses: `partner_id.country_id` (related, not stored)

**Result:** Error or empty grouping
:::

::: tip Correct Approach
Create a stored related field:

```python
partner_country_id = fields.Many2one(
    related='partner_id.country_id',
    store=True
)
```

**Result:** Works perfectly
:::

**Why this happens:** Group By uses SQL `GROUP BY` which requires actual database columns. Non-stored fields have no column.

### Mistake 2: Confusing Field Type and Widget

::: danger Wrong Thinking
"I need a radio button field"

Creates a new field type
:::

::: tip Correct Understanding
"I need a Selection field displayed as radio buttons"

Uses: `Selection` field with `widget="radio"` in the view
:::

**Key insight:** Field type = how data is stored. Widget = how data is displayed.

| What You Want | Field Type | Widget |
| :--- | :--- | :--- |
| Radio buttons | Selection | `radio` |
| Star rating | Selection | `priority` |
| Progress bar | Float | `progressbar` |
| Tags | Many2many | `many2many_tags` |
| User avatar | Many2one | `many2one_avatar_user` |

### Mistake 3: Over-Using Many2many

::: danger Wrong Design
"Product can have multiple suppliers"

Uses: Many2many between product and supplier

**Problem:** Can't store price per supplier!
:::

::: tip Correct Design
Create a "Product Supplier" intermediate model with:
- Many2one to product
- Many2one to supplier
- Price field
- Lead time field
- Minimum quantity field

This is what `product.supplierinfo` does.
:::

**Rule:** If you need ANY extra data about the relationship, use an intermediate model.

### Mistake 4: Forgetting ondelete

::: warning The Problem
You have orders linked to customers. If someone deletes a customer, what happens to their orders?
:::

| ondelete Value | What Happens | When to Use |
| :--- | :--- | :--- |
| `set null` (default) | Field becomes empty | Rarely appropriate |
| `cascade` | Related records deleted too | Parent-child only |
| `restrict` | Deletion blocked | Important relationships |

::: danger Real Consequences
- **set null:** Orders remain but "orphaned" - customer field is empty, data corrupted
- **cascade:** All customer's orders deleted - massive data loss
- **restrict:** Safe - forces user to handle orders first
:::

**Best Practice:** Always specify `ondelete='restrict'` for important business relationships.

### Mistake 5: Creating Circular Dependencies

::: danger Wrong Design
```python
# Model A
b_id = fields.Many2one('model.b')

# Model B
a_id = fields.Many2one('model.a')
```

Both required = can't create either record first!
:::

::: tip Solutions
1. Make one field optional
2. Create records in two steps (save draft, then link)
3. Rethink the relationship (maybe one should be computed)
:::

## Automation Mistakes

### Mistake 6: Creating Infinite Loops

::: danger Wrong Automation
Automated Action on `sale.order`:
- Trigger: On Update
- Action: Update a field on the same order

**Result:** Update triggers automation, which triggers update, which triggers automation... 🔄
:::

::: tip Correct Approach
1. Use **Trigger Fields** to limit when automation fires
2. Don't update fields that trigger the same automation
3. Use a "processing" flag to prevent re-entry
:::

### Mistake 7: Expecting AI to Replace Everything

::: danger Wrong Assumption
"Odoo 19 AI will predict lead conversion using GPT"

**Reality:** Lead probability still uses Bayesian PLS algorithm, not LLM
:::

::: tip Correct Understanding
AI in Odoo 19 is for:
- **Text generation** (emails, descriptions)
- **Document digitization** (OCR)
- **Chat assistants**

PLS (Predictive Lead Scoring) remains statistical/Bayesian

AI ≠ Machine Learning ≠ Statistical Models
:::

### Mistake 8: Using Server Actions for Everything

::: danger Wrong Pattern
Using Server Actions for processes that should be automated:
- Daily cleanup → Should be Scheduled Action
- On-save notifications → Should be Automated Action
:::

| Use Case | Correct Action Type |
| :--- | :--- |
| User clicks button | Server Action |
| Record created/updated | Automated Action |
| Daily/weekly task | Scheduled Action |
| Bulk update | Server Action |
| Email on status change | Automated Action |

## Security Mistakes

### Mistake 9: Using Domains Instead of Record Rules

::: danger Wrong Approach
"Salespeople should only see their leads"

Uses: Domain filter in the view

**Problem:** Power users can remove the filter, API access ignores it
:::

::: tip Correct Approach
Use a Record Rule:
```python
[('user_id', '=', user.id)]
```

**Result:** Cannot be bypassed by any means
:::

**Rule:** If it's a security requirement, use Record Rules. If it's just convenience, use Domains.

### Mistake 10: Giving Too Many Admin Rights

::: danger Wrong Approach
"User needs to see all orders" → Makes them Sales Manager

**Problem:** Manager can also delete, configure, access reports they shouldn't
:::

::: tip Correct Approach
1. Create custom group: "Sales Viewer"
2. Grant only Read access to sale.order
3. Add record rule if needed for filtering
:::

## View Mistakes

### Mistake 11: Not Using Tracking

::: tip Best Practice
For important fields (status, assigned user, amounts), add `tracking=True`.

This creates an audit trail in the chatter showing who changed what and when.

**Critical for:** Financial fields, status changes, assignments
:::

### Mistake 12: Ignoring Performance in List Views

::: danger Wrong Approach
Adding many computed/related fields to list view without storing them

**Result:** Slow list loads, timeout errors
:::

::: tip Correct Approach
1. Check if fields are stored: Settings → Technical → Fields
2. Add `store=True` to computed/related fields in list views
3. Limit list view to essential columns
:::

### Mistake 13: Making Everything Required

::: danger Over-Restriction
Making 15 fields required on a form

**Result:** Users can't save drafts, abandon forms, work around by entering garbage data
:::

::: tip Balanced Approach
- Required at model level: Only truly mandatory fields
- Required at state: Add requirements as workflow progresses
- Required in view: For specific contexts only

```xml
<field name="delivery_date" required="state == 'confirmed'"/>
```
:::

## Configuration Mistakes

### Mistake 14: Testing in Production

::: danger Never Do This
"Let me just try this automation in production..."

**Risk:** Bad automation can corrupt data, send emails to customers, break workflows
:::

::: tip Always
1. Test in staging first
2. Use Odoo.sh or create test database
3. Verify with sample data
4. Only then deploy to production
:::

### Mistake 15: Not Documenting Changes

::: warning Common Problem
Making Studio changes or configurations without documentation

Six months later: "Why is this field here? What does this automation do?"
:::

::: tip Best Practices
| Change Type | Document Where |
| :--- | :--- |
| Field purpose | Field help text |
| Automation logic | Automation description field |
| View modifications | Changelog document |
| Custom reports | Report description |
| Studio changes | Export and version control |
:::

## Integration Mistakes

### Mistake 16: Syncing Too Frequently

::: danger Over-Integration
Syncing data every minute when hourly is sufficient

**Result:** Performance degradation, API rate limits, wasted resources
:::

::: tip Right Approach
| Data Type | Sync Frequency |
| :--- | :--- |
| Real-time critical (payments) | Webhook/immediate |
| Orders | Every 15-30 minutes |
| Product catalog | Daily |
| Historical data | Weekly/monthly |
:::

### Mistake 17: Not Handling Errors

::: danger Wrong Implementation
API integration that fails silently

**Result:** Missing orders, duplicate records, data corruption - discovered weeks later
:::

::: tip Correct Implementation
1. Log all API calls and responses
2. Create error records for failures
3. Set up alerts for repeated failures
4. Implement retry logic with backoff
:::

## Quick Reference: Error Messages and Solutions

| Error Message | Likely Cause | Solution |
| :--- | :--- | :--- |
| "Field X does not exist" | Typo in field name or module not installed | Check spelling, install module |
| "Access denied" | User lacks permissions | Check access rights and record rules |
| "Cannot group by X" | Field not stored | Add `store=True` or use different field |
| "Constraint violation" | Required field empty or unique violation | Fill required fields, check uniqueness |
| "Recursion error" | Circular dependency in computed fields | Check `@api.depends` chains |
| "Record does not exist" | Deleted or wrong ID | Check if record was deleted |
| "Singleton error" | Operation on multiple records expected one | Use `ensure_one()` or loop |
| "Validation error" | Python constraint failed | Check `@api.constrains` logic |
| "Integrity error" | Database constraint violated | Check foreign keys, unique constraints |

## Checklist: Before Going Live

### Data Model Review
- [ ] All relational fields have appropriate `ondelete`
- [ ] Stored fields for list views and filters
- [ ] No circular dependencies
- [ ] Proper use of Many2many vs intermediate models

### Security Review
- [ ] Record rules for data isolation
- [ ] Access rights per group
- [ ] No excessive admin permissions
- [ ] Tested with different user roles

### Automation Review
- [ ] No infinite loop potential
- [ ] Trigger fields specified
- [ ] Error handling configured
- [ ] Tested in staging environment

### Performance Review
- [ ] List view fields are stored
- [ ] Indexes on frequently searched fields
- [ ] No complex record rules
- [ ] Reasonable automation triggers

## Knowledge Check

::: details Q1: Why can't you group by partner_id.country_id directly?
**Answer: It's not stored in the database**

Related fields without `store=True` are computed on-the-fly. SQL GROUP BY requires an actual column. Create a stored related field instead.
:::

::: details Q2: What's wrong with Many2many for Product-Supplier?
**Answer: Can't store per-supplier data like price**

Many2many only links records. It can't store price, lead time, or other relationship-specific data. Use an intermediate model instead.
:::

::: details Q3: User can clear a domain filter and see all records. Security issue?
**Answer: Yes - use Record Rules for security**

Domains are for convenience. Record Rules enforce security that cannot be bypassed through UI, API, or any other means.
:::

::: details Q4: Automation triggers itself endlessly. How to fix?
**Answer: Add Trigger Fields to limit when it fires**

Specify which fields should trigger the automation. If updating field X, don't include X in trigger fields (or use a processing flag).
:::

::: details Q5: When should ondelete='cascade' be used?
**Answer: Only for true parent-child relationships where children can't exist alone**

Example: Order Lines should be deleted when Order is deleted. But Orders should NOT be deleted when Customer is deleted (use restrict).
:::

