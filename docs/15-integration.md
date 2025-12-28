# 15. Integration Methods: Connecting Odoo with External Systems

## Four Ways to Exchange Data with Odoo

| Method | Direction | Best For |
|--------|-----------|----------|
| **Webhooks (Incoming)** | External → Odoo | Receiving data from external systems |
| **Webhooks (Outgoing)** | Odoo → External | Notifying external systems |
| **JSON/2 API** | Bidirectional | Modern app integration (Odoo 19+) |
| **XML-RPC / JSON-RPC** | Bidirectional | Legacy (deprecated in Odoo 19) |

## Incoming Webhooks: External Systems → Odoo

Incoming webhooks allow **external systems to send data INTO Odoo** by making a simple HTTP request to a special URL.

**Location:** Settings > Technical > Automation > Automated Actions (Trigger: On webhook)

### Example: Receive Orders from E-commerce

1. Create Automated Action on Sale Order model
2. Set **Trigger:** On webhook
3. Copy the **Secret URL** generated
4. In **Target Record**, write code to parse incoming data
5. Share the URL with your e-commerce developer

### How Incoming Webhooks Work

- **URL Format:** /web/hook/{unique-uuid}
- **Method:** Accepts GET and POST requests
- **Authentication:** Public endpoint - security through URL secrecy
- **Data Format:** Receives JSON or form data via `payload` variable
- **Response:** Returns `{"status": "ok"}` or `{"status": "error"}`

::: warning Best Practices
- **Security:** Keep the webhook URL secret
- **Regenerate URL:** Use "Rotate Secret" if compromised
- **Validation:** Always validate incoming data
- **Idempotency:** Check if record exists to avoid duplicates
:::

## Outgoing Webhooks: Odoo → External Systems

Outgoing webhooks allow **Odoo to send data to external systems** via HTTP POST when events happen.

**Location:** Settings > Technical > Actions > Server Actions (Action Type: Send Webhook)

### Example: Notify Warehouse of New Orders

1. Create Automated Action on Sale Order
2. Set **Trigger:** State is set to "sale"
3. Add Server Action: Send Webhook Notification
4. Set **Webhook URL:** https://warehouse.yourcompany.com/api/orders
5. Select **Fields to Send:** Order Number, Customer, Lines, Address

### How Outgoing Webhooks Work

- **Method:** HTTP POST with JSON payload
- **Payload:** Always includes _id, _model, _name + selected fields
- **Synchronous:** Blocks the Odoo transaction until complete
- **No Retry:** If external system is down, data is lost

## JSON/2 API: Modern RESTful Integration (Odoo 19+)

JSON/2 is Odoo's **modern, RESTful-style API** for external applications.

### Example: Mobile App Reading Products

```http
POST /json/2/product.product/search_read
Authorization: Bearer your-api-key-here
Content-Type: application/json

{
  "domain": [["sale_ok", "=", true]],
  "fields": ["name", "list_price", "image_128"]
}
```

### JSON/2 API Characteristics

- **Endpoint Format:** /json/2/{model}/{method}
- **Authentication:** Bearer token (API key)
- **Methods Available:** All public Odoo model methods
- **Response Format:** Clean JSON (not wrapped in RPC protocol)

::: tip When to Use JSON/2 API
- Building mobile applications
- Creating custom dashboards
- Modern web application integrations
- Any new integration project in Odoo 19+
:::

## XML-RPC & JSON-RPC: Legacy APIs

::: danger Deprecation Notice
XML-RPC (/xmlrpc, /xmlrpc/2) and JSON-RPC (/jsonrpc) are **deprecated in Odoo 19** and will be removed in Odoo 20.

Migrate existing integrations to JSON/2 API.
:::

## Comparison: Which Method to Use?

| Feature | Incoming Webhook | Outgoing Webhook | JSON/2 API |
|---------|-----------------|------------------|------------|
| **Direction** | External → Odoo | Odoo → External | Bidirectional |
| **Trigger** | External system | Odoo event | External app |
| **Authentication** | Secret URL | None (target system) | Bearer token |
| **Complexity** | Low | Low | Medium |
| **Configure in UI** | Yes | Yes | No (code required) |
| **Status** | Supported | Supported | Recommended |

## Decision Guide

**Use Incoming Webhooks when:**
- External system pushes data to Odoo
- Configure in Odoo UI without coding
- Single records sent occasionally (e-commerce orders)

**Use Outgoing Webhooks when:**
- Odoo needs to notify external system
- Configure in Odoo UI without coding
- External system has HTTP endpoint ready

**Use JSON/2 API when:**
- Building custom app needing full Odoo access
- Need to search, read, create, update, delete
- Want modern, RESTful-style integration

## Common Integration Scenarios

| Business Need | Recommended Method | Why |
|---------------|-------------------|-----|
| E-commerce → Create Odoo orders | Incoming Webhook | E-commerce pushes when placed |
| Payment gateway → Update invoice | Incoming Webhook | Gateway notifies on payment |
| Odoo order → Notify warehouse | Outgoing Webhook | Odoo event triggers notification |
| Mobile app accessing Odoo data | JSON/2 API | App needs full CRUD |
| Custom BI dashboard | JSON/2 API | Dashboard pulls data on demand |
| Middleware syncing two systems | JSON/2 API | Full control over sync logic |
