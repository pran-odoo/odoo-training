# Views - Form, List, Kanban, and More

## What Are Views?

**Views** determine **how data is displayed** to users. The same data can be shown in different ways.

Views are defined in XML files and control:
- Which fields are visible
- How fields are arranged
- What buttons and actions are available
- Conditional formatting and visibility

::: info Same Data, Different Views
A Sales Order can be viewed as:
- **Form View**: Detailed editing of one order
- **List View**: Table of all orders
- **Kanban View**: Cards grouped by stage
- **Calendar View**: Orders on a calendar by date
- **Pivot View**: Sales analysis by dimension
:::

## View Types in Odoo

| View Type | XML Tag | Purpose | Best For |
| :--- | :--- | :--- | :--- |
| **Form** | `<form>` | View/edit one record | Detailed data entry |
| **List** | `<list>` | Table view of multiple records | Quick overview, bulk actions |
| **Kanban** | `<kanban>` | Cards in columns | Pipeline/stage management |
| **Calendar** | `<calendar>` | Records on calendar | Scheduling, deadlines |
| **Graph** | `<graph>` | Charts and graphs | Data visualization |
| **Pivot** | `<pivot>` | Pivot table analysis | Business intelligence |
| **Gantt** | `<gantt>` | Timeline view | Project planning (Enterprise) |
| **Map** | `<map>` | Geographic map | Location-based data (Enterprise) |
| **Cohort** | `<cohort>` | Cohort analysis | Retention, churn (Enterprise) |
| **Activity** | `<activity>` | Activity scheduling | Task/follow-up management |
| **Search** | `<search>` | Filter definitions | Defining search options |

::: info Note on Terminology
List views use the `<list>` XML tag. You may see older documentation or code using `<tree>` - both work, but `<list>` is the current standard.
:::

## Form View - Editing a Single Record

### Form View Structure

Every form view in Odoo follows a consistent structure:

```
┌─────────────────────────────────────────────────────────────┐
│ [HEADER] Status bar: Draft → Confirmed → Done    [Buttons]  │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐   │
│ │ [SHEET] Main content area                             │   │
│ │                                                       │   │
│ │  [Avatar/Image]  Order Reference: SO001               │   │
│ │                  Customer: Acme Corp                  │   │
│ │                                                       │   │
│ │  ┌─────────────────┐  ┌─────────────────┐            │   │
│ │  │ [GROUP]         │  │ [GROUP]         │            │   │
│ │  │ Invoice Address │  │ Delivery Address│            │   │
│ │  │ ...            │  │ ...            │            │   │
│ │  └─────────────────┘  └─────────────────┘            │   │
│ │                                                       │   │
│ │  ┌─────────────────────────────────────────────────┐ │   │
│ │  │ [NOTEBOOK] Order Lines | Other Info | Notes     │ │   │
│ │  ├─────────────────────────────────────────────────┤ │   │
│ │  │ Product    │ Qty │ Price │ Subtotal             │ │   │
│ │  │ Laptop     │ 2   │ $999  │ $1998                │ │   │
│ │  └─────────────────────────────────────────────────┘ │   │
│ └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ [CHATTER] Messages, Activities, Followers                   │
└─────────────────────────────────────────────────────────────┘
```

### Form View Elements

| What You See | XML Element | Purpose |
| :--- | :--- | :--- |
| Status bar with stages | `<header>` | Workflow buttons and status |
| White card area | `<sheet>` | Main content container |
| Fields in columns | `<group>` | Organizes fields side-by-side |
| Tabs at bottom | `<notebook>` + `<page>` | Tabbed sections |
| Message/activity panel | `<chatter>` | Communication history |

### Form View XML Example

```xml
<form string="Sales Order">
    <header>
        <button name="action_confirm" string="Confirm"
                type="object" invisible="state != 'draft'"/>
        <field name="state" widget="statusbar"
               statusbar_visible="draft,sent,sale"/>
    </header>
    <sheet>
        <div class="oe_title">
            <h1><field name="name"/></h1>
        </div>
        <group>
            <group>
                <field name="partner_id"/>
                <field name="date_order"/>
            </group>
            <group>
                <field name="user_id"/>
                <field name="company_id"/>
            </group>
        </group>
        <notebook>
            <page string="Order Lines">
                <field name="order_line">
                    <list editable="bottom">
                        <field name="product_id"/>
                        <field name="product_uom_qty"/>
                        <field name="price_unit"/>
                        <field name="price_subtotal"/>
                    </list>
                </field>
            </page>
        </notebook>
    </sheet>
    <chatter/>
</form>
```

## List View - Viewing Multiple Records

List views show records in a table format with sortable columns.

### List View Features

| Feature | What It Does | How to Request |
| :--- | :--- | :--- |
| **Row colors** | Highlight rows by condition | "Make overdue items red" |
| **Default sorting** | Initial sort order | "Sort by date descending" |
| **Inline editing** | Edit in place | "Allow editing without opening form" |
| **Column totals** | Sum/average at bottom | "Show total amount at bottom" |
| **Optional columns** | User can show/hide | "Let users choose which columns" |
| **Multi-edit** | Edit multiple selected | "Change status of multiple at once" |

### Row Color Options (Decorations)

| Color | Attribute | Typical Use |
| :--- | :--- | :--- |
| Green | `decoration-success` | Completed, positive |
| Blue | `decoration-info` | Draft, information |
| Orange | `decoration-warning` | Attention needed |
| Red | `decoration-danger` | Error, cancelled, overdue |
| Gray | `decoration-muted` | Inactive, archived |
| Bold | `decoration-bf` | Important items |
| Italic | `decoration-it` | Special cases |

**Example:** "Make overdue invoices red"
```xml
<list decoration-danger="date_due &lt; current_date and state == 'posted'">
```

### List View XML Example

```xml
<list string="Sales Orders"
      decoration-info="state == 'draft'"
      decoration-success="state == 'sale'"
      decoration-muted="state == 'cancel'">
    <field name="name"/>
    <field name="partner_id"/>
    <field name="date_order"/>
    <field name="amount_total" sum="Total"/>
    <field name="state"/>
</list>
```

## Kanban View - Pipeline Management

Think of a Kanban view like a **Trello board** or **sticky notes on a whiteboard**:

- Each **column** represents a stage (New, In Progress, Done)
- Each **card** is a record (a task, a lead, an opportunity)
- **Drag and drop** moves records between stages

### Kanban Features

| Feature | What It Does | Example |
| :--- | :--- | :--- |
| Quick Create | Add new record in column | "+" button at top of column |
| Progress Bar | Shows status at column header | Green/yellow/red indicator |
| Card Colors | Visual priority/status | Red border for urgent items |
| Folded Columns | Hide completed stages | "Done" column collapsed |
| Card Actions | Quick actions on cards | Archive, Edit, Delete |
| Aggregates | Column totals | "Total Revenue: $50,000" |

### Common Kanban Use Cases

| Module | Grouped By | Cards Show |
| :--- | :--- | :--- |
| CRM Pipeline | Stage (New → Won) | Opportunity name, revenue, contact |
| Project Tasks | Stage (To Do → Done) | Task name, assignee, deadline |
| Recruitment | Stage (New → Hired) | Applicant name, job position |
| Helpdesk | Stage (New → Solved) | Ticket subject, priority, customer |

## Calendar View

Calendar views display records on a date-based calendar.

### Calendar View Attributes

| Attribute | Purpose | Example |
| :--- | :--- | :--- |
| `date_start` | Start date/time field | `date_start="start_datetime"` |
| `date_stop` | End date/time field | `date_stop="stop_datetime"` |
| `date_delay` | Duration in hours | `date_delay="duration"` |
| `color` | Color coding field | `color="user_id"` |
| `mode` | Default view (day/week/month) | `mode="month"` |

**Example:**
```xml
<calendar string="Meetings" date_start="start" date_stop="stop" color="user_id">
    <field name="name"/>
    <field name="partner_ids"/>
</calendar>
```

## Graph and Pivot Views

### Graph View

For visual charts and graphs:

| Type | Use Case |
| :--- | :--- |
| `bar` | Comparing quantities (Sales by month) |
| `line` | Trends over time (Revenue growth) |
| `pie` | Proportions (Sales by category) |

```xml
<graph string="Sales Analysis" type="bar">
    <field name="date_order" type="row"/>
    <field name="amount_total" type="measure"/>
</graph>
```

### Pivot View

For business intelligence analysis:

```xml
<pivot string="Sales Analysis">
    <field name="partner_id" type="row"/>
    <field name="product_id" type="col"/>
    <field name="amount_total" type="measure"/>
</pivot>
```

## Search View

The search view defines what filters and groupings are available:

```xml
<search>
    <!-- Searchable fields -->
    <field name="name"/>
    <field name="partner_id"/>

    <!-- Predefined filters -->
    <filter name="my_orders" string="My Orders"
            domain="[('user_id', '=', uid)]"/>
    <filter name="this_month" string="This Month"
            domain="[('date_order', '>=', (context_today() - relativedelta(day=1)).strftime('%Y-%m-%d'))]"/>

    <!-- Separator between filter groups -->
    <separator/>

    <!-- Group By options -->
    <group expand="0" string="Group By">
        <filter name="group_partner" string="Customer"
                context="{'group_by': 'partner_id'}"/>
        <filter name="group_state" string="Status"
                context="{'group_by': 'state'}"/>
    </group>
</search>
```

::: tip Key Points
- **Fields** in search view = what you can type to search
- **Filters** = predefined filter buttons (can be starred as favorites)
- **Group By** = grouping options in the dropdown
- Filters can be combined with AND/OR logic
:::

## View Inheritance

Views can be extended by other modules:

```xml
<!-- Original view in base module -->
<record id="view_partner_form" model="ir.ui.view">
    <field name="name">res.partner.form</field>
    <field name="model">res.partner</field>
    <field name="arch" type="xml">
        <form>
            <field name="name"/>
        </form>
    </field>
</record>

<!-- Inherited view adding fields -->
<record id="view_partner_form_custom" model="ir.ui.view">
    <field name="name">res.partner.form.custom</field>
    <field name="model">res.partner</field>
    <field name="inherit_id" ref="base.view_partner_form"/>
    <field name="arch" type="xml">
        <field name="name" position="after">
            <field name="custom_field"/>
        </field>
    </field>
</record>
```

### Inheritance Positions

| Position | Effect |
| :--- | :--- |
| `after` | Add after the element |
| `before` | Add before the element |
| `inside` | Add inside the element (at end) |
| `replace` | Replace the element entirely |
| `attributes` | Modify element attributes |

## Common View Requests

| User Request | View Type | Developer Action |
| :--- | :--- | :--- |
| "Add field X to the form" | Form | Add `<field name="x"/>` to form XML |
| "Show field X in the list" | List | Add `<field name="x"/>` to list XML |
| "Make cancelled orders gray" | List | Add `decoration-muted="state == 'cancel'"` |
| "Add filter for my records" | Search | Add filter with `domain="[('user_id', '=', uid)]"` |
| "Let me group by category" | Search | Add group filter with `context="{'group_by': 'categ_id'}"` |
| "Hide field when status is done" | Form | Add `invisible="state == 'done'"` to field |

## Knowledge Check

::: details Q1: User sees field on form but not in list. Why?
**Answer: The field is in the Form view XML but not in the List view XML**

Each view type has its own XML definition that specifies which fields to display. A field can exist in one view but not another.
:::

::: details Q2: Want Sales Orders as visual cards grouped by stage. Which view?
**Answer: Kanban View**

Kanban views display records as cards organized into columns (typically by a stage or status field). They're ideal for visual pipeline management.
:::

::: details Q3: What does the `invisible` attribute do?
**Answer: It hides the field from display (conditionally or always)**

The field still exists and stores data - it's just not shown. Can be conditional: `invisible="state != 'draft'"`.
:::

::: details Q4: How to make overdue invoices appear red in the list?
**Answer: Add decoration-danger with a condition**

```xml
<list decoration-danger="date_due &lt; current_date">
```
This highlights rows where the due date has passed.
:::

::: details Q5: What's the difference between `<list>` and `<tree>`?
**Answer: They're the same - `<list>` is the current standard**

Older Odoo versions used `<tree>` for list views. Both still work, but `<list>` is preferred in modern Odoo.
:::
