# Actions: Automation in Odoo

::: tip The Power of "It Just Happens"
Your client says: *"When a lead is marked as won, I want a project to be created automatically, the account manager notified, and the lead data synced to our accounting software."*

Without code, you can make all of this happen. Odoo's action system is one of the most powerful tools for functional consultants.
:::

## Three Types of Automation Actions

| Type | Purpose | Trigger | Location |
| :--- | :--- | :--- | :--- |
| **Server Actions** | Manual actions from UI | User clicks | Settings > Technical > Actions > Server Actions |
| **Scheduled Actions** | Time-based recurring tasks | Cron schedule | Settings > Technical > Automation > Scheduled Actions |
| **Automated Actions** | Event-driven rules | Record changes | Settings > Technical > Automation > Automated Actions |

## Server Actions (ir.actions.server)

Server Actions are **manual actions** that users trigger from the UI. They appear in the "Actions" menu or can be added as buttons.

### Action Types Available

| Action Type | What It Does | Example Use Case |
| :--- | :--- | :--- |
| **Update Record** | Modify field values on records | Bulk assign salesperson, Mark as priority |
| **Create Record** | Create new record with values | Create task from lead, Generate invoice |
| **Execute Code** | Run custom Python code | Complex calculations, integrations |
| **Send Email** | Send email using template | Notify customer, Alert manager |
| **Send Webhook** | POST data to external URL | Notify external system |
| **Add Followers** | Add users as followers | Include team in discussions |
| **Create Next Activity** | Schedule follow-up activity | Schedule call in 3 days |
| **Multi Actions** | Execute multiple actions | Update + email + create task |

### Example: Mark Leads as High Priority

**Scenario:** Sales manager wants a quick action to mark selected leads as high priority.

1. Go to **Settings > Technical > Actions > Server Actions**
2. Click **Create**
3. Set **Name:** "Mark as High Priority"
4. Set **Model:** CRM Lead (`crm.lead`)
5. Set **Action Type:** Update Record
6. Add field update: Priority = "3" (High)
7. Click **"Create Contextual Action"** to add to Actions menu

**Usage:** Select leads → Actions menu → "Mark as High Priority"

### Example: Send Data to External System

**Scenario:** Sync won opportunities to accounting software.

1. Create Server Action on CRM Lead model
2. Set **Action Type:** Send Webhook Notification
3. Set **Webhook URL:** `https://accounting.company.com/api/opportunities`
4. Select **Fields to Send:** Name, Partner, Expected Revenue, Date Closed

**Payload sent:**
```json
{
  "_id": 42,
  "_model": "crm.lead",
  "_name": "Sync Won Opportunities",
  "name": "Website Redesign Project",
  "partner_name": "TechCorp Solutions",
  "expected_revenue": 250000
}
```

## Incremental Mass Edit (List View Feature)

A built-in list view feature that allows you to update multiple records using mathematical operators.

### Supported Operators

| Operator | Meaning | Example | Result (if current = 100) |
| :--- | :--- | :--- | :--- |
| `+=` | Add to current value | `+=10` | 110 |
| `-=` | Subtract from current | `-=25` | 75 |
| `*=` | Multiply current value | `*=1.15` | 115 (15% increase) |
| `/=` | Divide current value | `/=2` | 50 |

### Example: 10% Price Increase

1. Go to **Sales > Products > Products**
2. Select products to update (checkbox)
3. Click on the **Sales Price** column header
4. Enter: `*=1.10`
5. Confirm the update

**Result:** Each selected product's price increases by 10%.

## Scheduled Actions (ir.cron)

Scheduled Actions run automatically at specified intervals. Perfect for maintenance, reports, and batch processing.

### Scheduling Options

| Interval Type | Example | Use Case |
| :--- | :--- | :--- |
| **Minutes** | Every 15 minutes | Real-time monitoring |
| **Hours** | Every 2 hours | Regular sync jobs |
| **Days** | Every 1 day at 9:00 AM | Daily reports |
| **Weeks** | Every Monday | Weekly summaries |
| **Months** | First of month | Monthly billing |

### Key Configuration Fields

| Field | Purpose |
| :--- | :--- |
| **Execute Every** | Interval value (e.g., "2" hours) |
| **Interval Unit** | Minutes, Hours, Days, Weeks, Months |
| **Next Execution Date** | When it will run next |
| **Number of Calls** | -1 = unlimited, or specific count |
| **Priority** | Lower number = higher priority |
| **Active** | Must be checked to run |

### How Scheduled Actions Work

- **Execution:** Runs in background worker thread
- **User Context:** Runs as the "OdooBot" user
- **Failure Handling:** After 5+ consecutive failures over 7+ days, auto-deactivates
- **Manual Trigger:** Use "Run Manually" button to test
- **Concurrency:** Only one instance runs at a time (prevents overlap)

### Example: Send Daily Report

1. Create Scheduled Action
2. Set **Model:** Sale Order (`sale.order`)
3. Set **Execute Every:** 1 Day
4. Set **Next Execution Date:** Tomorrow at 9:00 AM
5. Create Server Action: Execute Code → Generate and email report

## Automated Actions (base.automation)

Automated Actions trigger automatically when specific events occur. They're the backbone of workflow automation.

### Trigger Types

| Trigger | When It Runs | Example Use Case |
| :--- | :--- | :--- |
| **On Create** | New record created | Assign leads to salesperson |
| **On Update** | Record modified | Log changes, notify manager |
| **On Create or Update** | Either event | Validate data |
| **On Deletion** | Before record deleted | Archive instead of delete |
| **Stage is set to** | Specific stage reached | Create project when won |
| **User is set** | Responsible assigned | Notify assignee |
| **Tag is added** | Specific tag added | Notify when "urgent" |
| **State is set to** | State field changes | Create invoice on confirm |
| **Based on date field** | X days before/after date | Reminder before deadline |
| **After creation** | X time after created | Follow-up email 7 days later |
| **On incoming message** | Email received | Auto-reply to customers |
| **On webhook** | External HTTP request | Receive external data |

### Before/After Update Filters

For "On Update" triggers, use these domains to detect specific changes:

| Filter | Purpose | Example |
| :--- | :--- | :--- |
| **Before Update Filter** | State before change | `[('state', '=', 'draft')]` |
| **After Update Filter** | State after change | `[('state', '=', 'sale')]` |
| **Trigger Fields** | Only trigger for these fields | `['state', 'user_id']` |

### Example: Auto-Assign Leads by Region

1. Create Automated Action on CRM Lead
2. Set **Trigger:** On Create
3. Set **Apply on:** `[('state_id.name', '=', 'Maharashtra')]`
4. Add Server Action: Update Record → Sales Team = "Pune Regional"

**Result:** Leads from Maharashtra automatically assigned to Pune team.

### Example: Escalate Unassigned Tickets

1. Create Automated Action on Helpdesk Ticket
2. Set **Trigger:** After creation (2 hours)
3. Set **Apply on:** `[('user_id', '=', False)]`
4. Add Server Action: Send Email to manager + Update priority

**Result:** Unassigned tickets escalate after 2 hours.

## All Action Types Reference

Odoo has six distinct action types. While automation actions are most common, understanding all types helps with customization:

| Action Type | Technical Model | Purpose |
| :--- | :--- | :--- |
| **Window Actions** | `ir.actions.act_window` | Open views, navigate between records |
| **Server Actions** | `ir.actions.server` | Execute business logic |
| **URL Actions** | `ir.actions.act_url` | Open external URLs, downloads |
| **Client Actions** | `ir.actions.client` | Custom JS widgets, dashboards |
| **Report Actions** | `ir.actions.report` | Generate PDF/HTML reports |
| **Scheduled Actions** | `ir.cron` | Time-based recurring tasks |

### Window Actions

Window Actions open views and are used for:
- Menu items
- Smart buttons
- Action buttons that navigate to records

Key fields:
- **res_model:** Model to display
- **domain:** Filter which records
- **context:** Pass default values
- **view_mode:** Available views (list, form, kanban)
- **target:** current, new (popup), fullscreen

## Comparing the Three Automation Types

| Feature | Server Actions | Scheduled Actions | Automated Actions |
| :--- | :--- | :--- | :--- |
| **Trigger** | Manual (user clicks) | Time-based (recurring) | Event-driven (automatic) |
| **When to use** | User controls when | Regular maintenance | Respond to changes |
| **Runs on** | Selected records | All matching (batch) | Individual record |
| **User context** | Current user | Scheduler user | User who triggered |
| **Visibility** | Actions menu, buttons | Background | Background |
| **Performance** | Only when run | Periodic | Every matching change |

## Choosing the Right Action Type

### Use Server Actions when:
- Users need to decide when to run
- Works on multiple selected records
- Should not happen automatically
- Examples: Bulk updates, export data, custom workflows

### Use Scheduled Actions when:
- Needs to run at specific intervals
- Batch processing is more efficient
- Maintenance-related (cleanup, sync, reports)
- Examples: Daily reports, nightly sync, monthly billing

### Use Automated Actions when:
- Response should be immediate
- Rule should apply consistently
- Workflow needs to progress automatically
- Examples: Lead assignment, notifications, escalations

## Best Practices

::: warning Automation Best Practices
- **Use precise domains:** Don't trigger on all records; filter to relevant ones
- **Avoid infinite loops:** Be careful when automation updates fields that trigger other automations
- **Specify trigger fields:** For "On Update", list specific fields to avoid unnecessary triggers
- **Test thoroughly:** Use test records to verify automation works
- **Keep it simple:** Complex logic is better in custom code
- **Document rules:** Use Description field to explain purpose
- **Monitor performance:** Too many automation rules can slow saves
:::

## Knowledge Check

::: details Q1: Which action type for "10% price increase on selected products"?
**Answer: Server Action (Update Record)**

Server Actions work on selected records from the Actions menu. Use the incremental mass edit feature (`*=1.10`) for the actual update.
:::

::: details Q2: Which action type for "Send daily sales report at 9 AM"?
**Answer: Scheduled Action**

Scheduled Actions run at specified intervals. Set to run daily at 9 AM with a Server Action that generates and emails the report.
:::

::: details Q3: Which action type for "When lead is won, create project"?
**Answer: Automated Action**

Automated Actions respond to events. Use "Stage is set to" trigger with the "Won" stage, then Create Record action.
:::

::: details Q4: How to detect state change from draft to confirmed?
**Answer: Before Update Filter + After Update Filter**

Set Before: `[('state','=','draft')]` and After: `[('state','=','sale')]` to catch that specific transition.
:::

::: details Q5: Why might an automated action cause performance issues?
**Answer: It runs on every matching record change**

Unlike scheduled actions (periodic) or server actions (manual), automated actions fire on every save. Too many or complex ones slow down all saves.
:::
