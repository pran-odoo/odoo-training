# Odoo Studio Basics

::: info What Is Odoo Studio?
Odoo Studio is a **no-code customization tool** that lets functional consultants modify Odoo without writing code. With it you can:
- Add new fields to existing models
- Create new models (apps)
- Modify views (forms, lists, kanban, etc.)
- Create automated actions
- Build PDF reports
- Add approval workflows
- Export/import customizations

**Available in:** Odoo Enterprise only
:::

## Studio vs Custom Development

| Approach | When to Use | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Studio** | Simple customizations | No code, instant deploy | Limited logic, hard to version |
| **Custom Module** | Complex features | Full power, version controlled | Requires developer |
| **Both** | Common pattern | Studio for views, code for logic | Need coordination |

::: tip For Functional Consultants
Studio is your primary tool for rapid customizations. Know when to use it and when to escalate to development.
:::

## Accessing Studio

1. **Enable Developer Mode** (if not already)
   - Settings → General Settings → Developer Tools → Activate Developer Mode
2. **Open Studio**
   - Click the **Studio icon** (paint palette) in the top menu bar
   - Or press `Alt + Shift + S` keyboard shortcut

## What You Can Do in Studio

### Adding Fields

| Field Type | Studio Support | Notes |
| :--- | :--- | :--- |
| **Text/Char** | ✅ Full | Single line text |
| **Text (multiline)** | ✅ Full | Multi-line text area |
| **Integer/Float** | ✅ Full | Numeric fields |
| **Monetary** | ✅ Full | Currency amounts |
| **Date/DateTime** | ✅ Full | Date pickers |
| **Boolean** | ✅ Full | Checkbox |
| **Selection** | ✅ Full | Dropdown with fixed options |
| **Many2one** | ✅ Full | Link to another model |
| **One2many** | ✅ Full | Related records list |
| **Many2many** | ✅ Full | Multiple links |
| **Binary** | ✅ Full | File attachments |
| **Image** | ✅ Full | Image upload |
| **HTML** | ✅ Full | Rich text editor |
| **Related** | ✅ Full | Value from linked record |
| **Computed** | ⚠️ Limited | Simple formulas only |

### Modifying Views

| View Type | What You Can Do | Limitations |
| :--- | :--- | :--- |
| **Form View** | Add fields, rearrange, add groups/pages | Some structural changes limited |
| **List View** | Add columns, reorder, set widths | Can't add inline editing for all types |
| **Kanban View** | Modify card content, colors | Template structure changes limited |
| **Search View** | Add filters, group by options | Complex domains need code |
| **Calendar View** | Change date fields, colors | Limited customization |
| **Pivot/Graph** | Add measures, dimensions | Advanced options limited |

### Creating Applications

Studio can create entirely new applications (models):

1. Click **"New App"** in Studio
2. Define model name and menu location
3. Add fields using drag-and-drop
4. Configure views automatically generated

::: warning New App Limitations
- No computed fields with complex logic
- No Python constraints or onchange
- No custom buttons with code
- No workflow beyond simple states

For complex apps, start in Studio then export for developer enhancement.
:::

## Form View Customizations

### Rearranging Fields

1. Open form in Studio
2. Drag fields to new positions
3. Use **Groups** to create columns
4. Use **Tabs** (Notebook/Pages) for organization

### Adding Smart Buttons

Smart buttons appear at the top of forms showing counts/links:

1. In Studio, go to form view
2. Click the **Smart Buttons** area
3. Add new button linking to related records
4. Configure display (count, icon, label)

### Conditional Visibility

Make fields visible/invisible based on conditions:

1. Select a field in Studio
2. In properties panel, find **"Invisible"**
3. Add condition like `state != 'draft'`

### Making Fields Required/Readonly

1. Select field
2. Set **Required** or **Readonly** property
3. Add conditions for conditional behavior

## List View Customizations

### Setting Column Widths

1. Open Studio on your list view
2. Click on the column/field you want to resize
3. In properties panel, find **"Column Width (px)"**
4. Enter a value like `150` for 150 pixels

**Recommended widths:**
| Field Type | Suggested Width |
| :--- | :--- |
| Date fields | 100px |
| Reference numbers | 120px |
| Selection/Status | 100px |
| Names | 200px |
| Descriptions | 300px |
| Monetary amounts | 120px |

::: tip
If left empty, Odoo auto-computes optimal width based on content.
:::

### Row Decorations

Add color coding to list rows:

1. In list view properties
2. Set **Decorations** with conditions
3. Example: `decoration-danger` when `date_due < current_date`

### Optional Columns

Let users choose which columns to display:

1. Select a column
2. Enable **"Optional"** property
3. Choose default: show or hide

## Automated Actions in Studio

### Creating Email Notifications

1. Go to model in Studio
2. Click **Automations** tab
3. Create new automation
4. Set trigger (on create, update, etc.)
5. Add **Send Email** action
6. Configure template

### Updating Field Values

1. Create automation with trigger
2. Add **Update Record** action
3. Select field and new value
4. Can use expressions like `datetime.now()`

### Webhook Notifications

1. Create automation
2. Add **Send Webhook** action
3. Configure URL endpoint
4. Select fields to send

## Approval Workflows

Studio can add simple approval processes:

### Setting Up Approvals

1. Open model in Studio
2. Add a **Selection** field for status (draft, pending, approved)
3. Create **Automated Actions** for transitions
4. Add buttons for approve/reject actions

### Example: Purchase Approval

```
Draft → Submit for Approval → Approved
         ↓
        Rejected
```

1. Add `approval_state` selection field
2. Add `Submit` button that changes state
3. Create automation to notify approver
4. Add `Approve`/`Reject` buttons (visible only to approvers)

## Reports in Studio

### Creating PDF Reports

1. In Studio, go to **Reports** section
2. Click **Create Report**
3. Choose report type (PDF, Excel)
4. Design layout using drag-and-drop

### Report Elements

| Element | Use For |
| :--- | :--- |
| **Text** | Static labels, titles |
| **Field** | Dynamic data from record |
| **Image** | Logos, product images |
| **Table** | Line items, One2many data |
| **Subtotal/Total** | Calculated sums |

### Adding to Print Menu

Reports created in Studio automatically appear in the Print menu for that model.

## Exporting and Importing Studio Changes

### Export Customizations

1. In Studio, click **Export**
2. Choose which customizations to include
3. Download as a module (zip file)

### Import Customizations

1. Install the exported module on target database
2. Or in Studio, click **Import**
3. Upload the exported zip

::: warning Version Control
Studio changes are stored in the database, not in files. **Always export** before major changes and keep backups. Consider converting to proper modules for production.
:::

## Studio Best Practices

### Documentation

| What to Document | Where |
| :--- | :--- |
| Field purpose | Field help text |
| Automation logic | Automation description |
| View changes | Changelog document |
| Report layouts | Screenshots/notes |

### Testing

1. **Always test in staging first** - Never experiment in production
2. **Test edge cases** - Empty values, special characters
3. **Test automations** - Verify triggers and actions
4. **Test permissions** - Different user groups

### Organizing Changes

1. **Group related changes** - Don't scatter modifications
2. **Use meaningful names** - `x_approval_date` not `x_field_1`
3. **Add field help text** - Users need guidance
4. **Keep it simple** - Complex logic belongs in code

## When to Escalate to Development

| Requirement | Studio | Development |
| :--- | :--- | :--- |
| Add simple field | ✅ | |
| Rearrange form | ✅ | |
| Simple email automation | ✅ | |
| Complex computed field | | ✅ |
| Custom Python logic | | ✅ |
| API integration | | ✅ |
| Complex workflow | | ✅ |
| Custom PDF layout | | ✅ |
| Performance optimization | | ✅ |

::: danger Know Your Limits
Studio is powerful but has boundaries. If you find yourself fighting Studio to achieve something, it's time to involve a developer.
:::

## Troubleshooting Studio

### Common Issues

| Problem | Likely Cause | Solution |
| :--- | :--- | :--- |
| Field not showing | Wrong view mode | Check form vs list |
| Automation not triggering | Condition wrong | Check filter domain |
| Can't add field type | Model restriction | Check if model supports it |
| Changes lost | Browser cache | Hard refresh, re-export |
| Performance slow | Too many fields | Optimize, use stored |

### Resetting Changes

If Studio customizations cause problems:

1. Export current state (backup)
2. In Studio, use **Reset to Default**
3. Or restore from database backup
4. Or uninstall exported module

## Knowledge Check

::: details Q1: Can you create computed fields with complex Python logic in Studio?
**Answer: No - Studio only supports simple formulas**

Complex computed fields requiring Python code need custom development. Studio's computed fields are limited to basic arithmetic and simple field references.
:::

::: details Q2: How do you make a field visible only when status is "draft"?
**Answer: Set the Invisible property with condition `state != 'draft'`**

In Studio, select the field and in properties panel, set Invisible to `state != 'draft'`. The field shows when state equals draft and hides otherwise.
:::

::: details Q3: Should you test Studio changes in production?
**Answer: Never - Always test in staging first**

Studio changes take effect immediately. Always test in a staging/development environment first to avoid disrupting production users.
:::

::: details Q4: How do you preserve Studio customizations for deployment?
**Answer: Export as a module and install on target database**

Studio changes are stored in the database. Use Export to create a module (zip file), then install that module on other databases to replicate changes.
:::

::: details Q5: When should you escalate from Studio to custom development?
**Answer: When requiring complex logic, API integration, or custom Python**

Studio handles simple fields, view modifications, and basic automations. Complex computations, external integrations, and advanced workflows need developer involvement.
:::

