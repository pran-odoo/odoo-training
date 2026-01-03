# 29. Databases App (Enterprise)

The **Databases** app is an Enterprise module designed for Odoo Partners and Accounting Firms who manage multiple client Odoo databases. It provides a centralized dashboard to monitor KPIs, synchronize data, and manage user access across a fleet of Odoo instances.

::: tip Enterprise Only
This module requires an Odoo Enterprise license (OEEL-1). It depends on the Project module.
:::

## Who Should Use This Module?

| User Type | Primary Use Case |
|-----------|-----------------|
| **Accounting Firms** | Monitor draft entries, tax returns, and documents across 50-500+ client databases |
| **Odoo Partners** | Track client implementations, manage consultant access to databases |
| **MSPs** | Centralized monitoring and mass user management |
| **Holding Companies** | Unified view of subsidiary databases |

## Key Features

- **Centralized Dashboard**: View all client databases in one list with KPI columns
- **Auto-Discovery**: Automatically fetch SaaS databases from your Odoo.com account
- **KPI Synchronization**: Pull documents count, draft entries, and tax return statuses
- **User Management**: Invite or remove users across multiple databases at once
- **SSO Connect**: One-click login to SaaS databases via Odoo.com

## Initial Setup

### Step 1: Install the Module

The module is available in Enterprise under **Apps**. Search for "Databases" and install it.

### Step 2: Configure Odoo.com API Credentials

For automatic SaaS database discovery, you need API credentials:

1. Go to **Databases > Configuration > Settings**
2. Find the "API credentials to Odoo.com" section

| Field | Where to Get It |
|-------|----------------|
| **API User** | Your Odoo.com login email (Partner Portal admin) |
| **API Key** | Generate at [odoo.com/my/security](https://odoo.com/my/security?debug=1) under "Developer API Keys" |

::: warning Important
The API user must be the Partner Portal administrator with access to client databases on Odoo.com. Regular users cannot list databases.
:::

### Step 3: Configure Project Template (Optional)

New databases created from synchronization use a template:

1. Go to **Databases > Configuration > Settings**
2. Select or create a **Project Template**
3. Configure default settings like:
   - Fetch Documents (enabled by default)
   - Fetch Draft Journal Entries (enabled by default)
   - Fetch Tax Returns (enabled by default)

## Hosting Types

Each database has a hosting type that determines how it connects:

| Type | Description | Auto-Discovery | Credentials Needed |
|------|-------------|----------------|-------------------|
| **Odoo Online** | Databases on `*.odoo.com` | Yes | Uses global Odoo.com API key |
| **Odoo.sh** | Databases on Odoo.sh platform | No | Per-database API key |
| **On Premise** | Self-hosted Odoo instances | No | Per-database API key |
| **Outside Odoo** | Non-Odoo systems (link only) | No | None (URL only) |

## Synchronization

### What Gets Synchronized

#### From Odoo.com (SaaS Discovery)
- Database name and URL
- API login (your email)
- Odoo version

#### From Each Database (KPI Sync)
| Data | Source Model | Description |
|------|--------------|-------------|
| **Documents** | `kpi.provider` | Count of documents in inbox folder |
| **Draft Entries** | `kpi.provider` | Draft journal entries per journal type |
| **Tax Returns** | `kpi.provider` | Tax return statuses with deadlines |
| **Users** | `res.users` | Internal users with last login date |
| **Version** | `/json/version` | Database Odoo version |

### Tax Return Status Indicators

| Status | Icon | Meaning |
|--------|------|---------|
| `late` | Red | Return is past deadline |
| `longterm` | White | Deadline is more than 3 months away |
| `to_do` | Yellow | Deadline is within 3 months |
| `to_submit` | Green/White | Ready but needs submission action |
| `done` | Green | All returns completed |

### How to Synchronize

#### Manual Synchronization

1. **All Databases**: Click the "Synchronize" button in the list view header
2. **Selected Databases**: Select rows, then use the "Synchronize" action
3. **Single Database**: Open database settings, click "Synchronize" button

#### Automatic Synchronization (Crons)

Two scheduled actions run daily:

| Cron | Purpose |
|------|---------|
| **Pull from Odoo.com** | Fetches new/updated databases from your Odoo.com account |
| **Synchronize All** | Pulls KPIs and users from each database |

::: info Sync Frequency
- Databases are only synced if last sync was more than 24 hours ago
- Databases with 5+ consecutive errors are skipped
- More than 20 databases triggers background processing
:::

## Adding Databases Manually

### For On-Premise or Odoo.sh Databases

1. Click **New** in the Databases list
2. Fill in basic project info (name, responsible)
3. Go to the **Database** tab
4. Configure:

| Field | Description |
|-------|-------------|
| **Hosting** | Select "On Premise" or "Odoo.sh" |
| **Database URL** | Full URL (e.g., `https://client.example.com`) |
| **Database Name** | PostgreSQL database name |
| **API Login** | Admin user's email on the remote database |
| **API Key** | Generated from that user's profile |

### Generating an API Key on Remote Database

On the client's database:
1. Login as the admin user
2. Go to **Settings > Users & Companies > Users**
3. Open the admin user's profile
4. Click **Action > Generate API Key**
5. Copy the key (it's only shown once)

::: warning API Key Permissions
The remote user needs sufficient permissions to:
- Read `res.users` (for user sync)
- Call `kpi.provider.get_kpi_summary()` (for KPIs)
- Call `res.users.web_create_users()` (for inviting users)
:::

## User Management

### Inviting Users to Multiple Databases

1. Select databases in list view (or open a single database)
2. Click **Invite Users** action
3. Select local users from your Odoo instance
4. Click **Invite**

**What happens:**
- System calls `res.users/web_create_users` on each remote database
- Creates accounts with the same email as login
- Password reset emails are NOT sent (`no_reset_password=True`)

::: tip User Matching
Users are matched by **email/login**. Ensure your local users have the same email addresses they'll use on client databases.
:::

### Removing Users from Databases

1. Select databases or open a single database
2. Click **Remove Users** action
3. Select users to remove
4. Click **Remove**

**What happens:**
- System searches for users by login on remote database
- Sets `active = False` (deactivates, doesn't delete)
- Removes from local tracking

### User List in Database Settings

Each database shows its users in the **Database** tab under "User Management":
- Name and login
- Last authentication date
- Link to local user (if matching email exists)
- Trash icon to remove individual users

## Connecting to a Database

Click the **Connect** button on any database row to open it:

| Hosting Type | Connection Method |
|--------------|------------------|
| **Odoo Online** | SSO via Odoo.com (redirects to `/my/databases/connect/{uuid}`) |
| **On Premise (17.2+)** | Opens `{url}/odoo` |
| **On Premise (older)** | Opens `{url}/web` |
| **Outside Odoo** | Opens the stored URL directly |

## Security Model

### User Groups

| Group | Access Level |
|-------|-------------|
| **Databases User** | View databases where they have an account |
| **Databases Administrator** | View all databases, manage settings, see API keys |

### Record Rules

- **Users** see only databases where their login matches a `databases.user` record
- **Administrators** see all databases with a hosting type set
- Regular **Project Managers** cannot see database-type projects

### Field Visibility

| Field | Visible To |
|-------|-----------|
| `database_api_login` | Databases User and above |
| `database_api_key` | Databases Administrator only |

## Troubleshooting

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "We are missing the database name, the api login or the api key" | Incomplete credentials | Fill all required fields in Database tab |
| "Invalid apikey" | Wrong Odoo.com API key | Regenerate at odoo.com/my/security |
| "Timeout" | Database unreachable or slow | Check network, verify URL is correct |
| "As it seems to be configured we have left it as is" | On-premise DB also found in SaaS list | Normal behavior - your credentials are preserved |

### Database Not Syncing

Check the `database_nb_synchro_errors` field:
- After 5 consecutive errors, the cron skips the database
- Fix the underlying issue (credentials, network, permissions)
- Reset the error count by successfully syncing manually

### Users Not Appearing

Ensure the remote database user has permission to read `res.users`. The API call filters for `share=False` (internal users only).

## Limitations

### Technical Limitations

| Limitation | Details |
|------------|---------|
| **kpi.provider required** | Remote database needs this model (available in `base_setup` since Odoo 16) |
| **API permissions** | Remote user needs access to create/deactivate users for user management |
| **JSON API fallback** | Falls back to XML-RPC if `/json/2/` endpoints unavailable |
| **15-second timeout** | API calls timeout after 15 seconds |

### Functional Limitations

| Limitation | Details |
|------------|---------|
| **Odoo only** | Cannot sync KPIs from non-Odoo systems |
| **One-way sync** | Only pulls data, doesn't push changes |
| **Email matching** | Users matched by email only |
| **Daily sync limit** | Cron only syncs databases once per 24 hours |
| **Immediate sync limit** | More than 20 databases runs in background |

## Data Model

```
project.project (extended)
├── database_hosting: Selection (saas/paas/premise/other)
├── database_url: Char (unique, required if hosting set)
├── database_name: Char
├── database_version: Char
├── database_api_login: Char
├── database_api_key: Char (managers only)
├── database_kpi_properties: Properties (dynamic KPIs)
├── database_user_ids: One2many → databases.user
│   ├── login: Char
│   ├── name: Char
│   ├── latest_authentication: Datetime
│   └── local_user_id: Many2one → res.users (computed)
├── database_nb_documents: Integer
├── database_nb_users: Integer (computed)
├── database_last_synchro: Datetime
└── database_nb_synchro_errors: Integer
```

## Best Practices

1. **Use Templates**: Configure fetch settings in the project template so all new databases inherit them

2. **Let Crons Handle Sync**: Rely on daily automated synchronization rather than manual syncing

3. **Consistent Emails**: Ensure consultant emails match between your central instance and client databases

4. **Rotate API Keys**: Periodically rotate API keys for security, especially for on-premise databases

5. **Monitor Error Counts**: Check databases with high error counts and investigate

6. **Use Tags**: Tag databases by consultant, industry, or status for easy filtering

7. **Limit Manual Access**: Use the Databases app to connect rather than bookmarking URLs - it ensures proper SSO flow

## Example Workflows

### Daily Monitoring for Accounting Firms

1. Open the **Databases** app each morning
2. Review KPI columns for yellow/red indicators
3. Click on databases with pending items
4. Use "Connect" to access the client database
5. Handle documents, draft entries, or tax returns

### Onboarding a New Consultant

1. Create a local user for the consultant
2. Select relevant client databases in the list
3. Click **Invite Users**
4. Select the new consultant
5. Consultant now has accounts on all selected databases

### Offboarding a Consultant

1. Open any database's form view
2. Go to **Database** tab > User Management
3. Find the consultant and click the trash icon
4. Confirm removal from all databases where they appear

### Adding a New On-Premise Client

1. Get API credentials from the client's database:
   - Generate API key from admin user profile
   - Note the database name and URL
2. Create new database from template
3. Fill in credentials in Database tab
4. Click **Synchronize** to pull initial data
