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

### Endpoint Format

```
POST https://your-odoo.com/json/2/{model}/{method}
```

### Authentication: Bearer Token

All JSON/2 requests require an API key passed as a Bearer token:

```http
POST /json/2/res.partner/search_read
Authorization: Bearer odoo_api_xxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

### JSON/2 API Characteristics

| Feature | Details |
|---------|---------|
| **Endpoint** | `/json/2/{model}/{method}` |
| **HTTP Method** | POST only |
| **Auth** | Bearer token (API key) |
| **Request Body** | JSON with method parameters |
| **Response** | Clean JSON (no RPC wrapper) |
| **Models Returned** | Converted to `list[int]` (record IDs) |

### Common Operations

::: info Parameter Structure
The JSON/2 API uses two categories of parameters:
- **`ids`** and **`context`**: Top-level parameters handled by the controller
- **Method parameters**: Passed directly to the Odoo method (e.g., `domain`, `fields`, `vals`)
:::

#### Search and Read Records

`search_read` is an `@api.model` method - no `ids` parameter needed.

```http
POST /json/2/res.partner/search_read
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "domain": [["is_company", "=", true]],
  "fields": ["name", "email", "phone"],
  "limit": 10,
  "offset": 0
}
```

#### Read Specific Records

`read` operates on a recordset - pass `ids` at the top level, `fields` as the method parameter.

```http
POST /json/2/res.partner/read
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "ids": [1, 2, 3],
  "fields": ["name", "email"]
}
```

#### Create Records

`create` takes `vals_list` - a list of dictionaries (or single dict for backward compatibility).

```http
POST /json/2/res.partner/create
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "vals_list": {
    "name": "New Customer",
    "email": "customer@example.com",
    "is_company": true
  }
}
```

Or for multiple records:

```http
POST /json/2/res.partner/create
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "vals_list": [
    {"name": "Customer 1", "email": "c1@example.com"},
    {"name": "Customer 2", "email": "c2@example.com"}
  ]
}
```

#### Update Records

`write` takes `vals` (dict) and operates on records specified by `ids`.

```http
POST /json/2/res.partner/write
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "ids": [42],
  "vals": {
    "phone": "+1 555-1234"
  }
}
```

#### Delete Records

`unlink` operates on records specified by `ids` - no additional parameters.

```http
POST /json/2/res.partner/unlink
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "ids": [42]
}
```

#### Call Any Public Method

Any public method can be called. Pass `ids` for methods that operate on recordsets.

```http
POST /json/2/sale.order/action_confirm
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "ids": [15]
}
```

### Using Context

Pass context to modify behavior (language, company, etc.):

```http
POST /json/2/product.product/search_read
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "domain": [["sale_ok", "=", true]],
  "fields": ["name", "list_price"],
  "context": {
    "lang": "fr_FR",
    "allowed_company_ids": [1, 2]
  }
}
```

## API Key Management

### Generating API Keys

API keys are generated per-user from their profile:

1. Go to **Settings > Users & Companies > Users**
2. Open your user profile
3. Click **Account Security** tab (or "API Keys" section)
4. Click **New API Key**
5. Enter a description (e.g., "Mobile App", "BI Dashboard")
6. Select duration (1 Day to 1 Year, or Persistent for admins)
7. Click **Generate Key**
8. **Copy the key immediately** - it's only shown once!

::: warning Security Note
API keys are hashed in the database. If you lose your key, you must generate a new one.
:::

### API Key Duration Limits

The maximum key duration depends on user group settings:

| User Type | Max Duration | Persistent Keys |
|-----------|--------------|-----------------|
| Regular User | Defined by group's `api_key_duration` | No |
| System Admin | Unlimited | Yes |

Groups can set `api_key_duration` (in days) to limit how long users can create API keys for.

### API Key Scopes

API keys can optionally have a **scope** that limits what they can access:

| Scope | Access |
|-------|--------|
| `None` (default) | Full access to all RPC methods |
| Specific scope | Limited to methods matching that scope |

### Automatic Key Cleanup

Expired API keys are automatically deleted by a scheduled action (`_gc_user_apikeys`).

## Error Handling

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `400` | Bad Request - invalid parameters |
| `401` | Unauthorized - invalid or missing API key |
| `403` | Forbidden - insufficient permissions |
| `404` | Not Found - model or method doesn't exist |
| `422` | Unprocessable Entity - invalid method call |
| `500` | Internal Server Error |

### Error Response Format

Errors are returned as JSON with a `message` field:

```json
{
  "message": "the model 'fake.model' does not exist"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `the model 'X' does not exist` | Invalid model name | Check spelling, use technical name |
| `cannot call X.Y with ids` | Called @api.model method with ids | Remove `ids` from request |
| `AccessError` | User lacks permission | Check access rights for API user |
| `ValidationError` | Constraint violated | Check required fields, constraints |

## Code Examples

### Python Client

```python
import requests

ODOO_URL = "https://your-odoo.com"
API_KEY = "odoo_api_xxxxxxxxxxxxxxxxxxxxxxxx"

def odoo_api(model, method, **kwargs):
    """Call Odoo JSON/2 API"""
    response = requests.post(
        f"{ODOO_URL}/json/2/{model}/{method}",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        json=kwargs,
    )
    response.raise_for_status()
    return response.json()

# Search partners (@api.model - no ids needed)
partners = odoo_api(
    "res.partner", "search_read",
    domain=[["is_company", "=", True]],
    fields=["name", "email"],
    limit=10,
)
print(partners)

# Create a partner (vals_list parameter)
new_id = odoo_api(
    "res.partner", "create",
    vals_list={"name": "New Customer", "email": "new@example.com"},
)
print(f"Created partner ID: {new_id}")

# Update a partner (ids + vals parameters)
odoo_api(
    "res.partner", "write",
    ids=[new_id],
    vals={"phone": "+1 555-0000"},
)

# Delete a partner (ids parameter only)
odoo_api("res.partner", "unlink", ids=[new_id])
```

### JavaScript/Node.js Client

```javascript
const ODOO_URL = "https://your-odoo.com";
const API_KEY = "odoo_api_xxxxxxxxxxxxxxxxxxxxxxxx";

async function odooApi(model, method, params = {}) {
  const response = await fetch(
    `${ODOO_URL}/json/2/${model}/${method}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || response.statusText);
  }

  return response.json();
}

// Search partners (@api.model - no ids needed)
const partners = await odooApi("res.partner", "search_read", {
  domain: [["is_company", "=", true]],
  fields: ["name", "email"],
  limit: 10,
});
console.log(partners);

// Create a partner (vals_list parameter)
const newId = await odooApi("res.partner", "create", {
  vals_list: { name: "New Customer", email: "new@example.com" },
});
console.log(`Created partner ID: ${newId}`);

// Update a partner (ids + vals parameters)
await odooApi("res.partner", "write", {
  ids: [newId],
  vals: { phone: "+1 555-0000" },
});

// Delete a partner
await odooApi("res.partner", "unlink", { ids: [newId] });
```

### cURL Examples

```bash
# Search partners
curl -X POST "https://your-odoo.com/json/2/res.partner/search_read" \
  -H "Authorization: Bearer odoo_api_xxx" \
  -H "Content-Type: application/json" \
  -d '{"domain": [["is_company", "=", true]], "fields": ["name"], "limit": 5}'

# Create a partner (vals_list parameter)
curl -X POST "https://your-odoo.com/json/2/res.partner/create" \
  -H "Authorization: Bearer odoo_api_xxx" \
  -H "Content-Type: application/json" \
  -d '{"vals_list": {"name": "Test Customer"}}'

# Update a partner (ids + vals parameters)
curl -X POST "https://your-odoo.com/json/2/res.partner/write" \
  -H "Authorization: Bearer odoo_api_xxx" \
  -H "Content-Type: application/json" \
  -d '{"ids": [42], "vals": {"phone": "+1 555-1234"}}'

# Delete a partner
curl -X POST "https://your-odoo.com/json/2/res.partner/unlink" \
  -H "Authorization: Bearer odoo_api_xxx" \
  -H "Content-Type: application/json" \
  -d '{"ids": [42]}'
```

## API Documentation Browser

Odoo 19 includes a built-in API documentation browser at `/doc`:

1. Install the `api_doc` module
2. Navigate to `https://your-odoo.com/doc`
3. Browse models, fields, and methods
4. View method signatures and documentation

::: tip Bearer Access
The API doc is also available via Bearer auth at `/doc-bearer/index.json` for programmatic access.
:::

## Batch Operations

### Bulk Create

Pass a list of dictionaries to `vals_list` to create multiple records:

```http
POST /json/2/res.partner/create
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "vals_list": [
    {"name": "Customer 1", "email": "c1@example.com"},
    {"name": "Customer 2", "email": "c2@example.com"},
    {"name": "Customer 3", "email": "c3@example.com"}
  ]
}
```

Returns: `[id1, id2, id3]`

### Bulk Update

Update multiple records at once by passing multiple `ids`:

```http
POST /json/2/res.partner/write
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "ids": [1, 2, 3, 4, 5],
  "vals": {
    "active": false
  }
}
```

### Bulk Delete

```http
POST /json/2/res.partner/unlink
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "ids": [10, 11, 12, 13]
}
```

## XML-RPC & JSON-RPC: Legacy APIs

::: danger Deprecation Notice
XML-RPC (`/xmlrpc`, `/xmlrpc/2`) and JSON-RPC (`/jsonrpc`) are **deprecated in Odoo 19** and will be removed in Odoo 20.

Migrate existing integrations to JSON/2 API.
:::

### Migration Guide: XML-RPC to JSON/2

| XML-RPC | JSON/2 Equivalent |
|---------|-------------------|
| `execute_kw(db, uid, pwd, model, method, args)` | `POST /json/2/{model}/{method}` |
| Session-based auth | Bearer token auth |
| `xmlrpc/2/common` authenticate | Generate API key in UI |
| RPC envelope response | Direct JSON response |

**Before (XML-RPC):**
```python
import xmlrpc.client
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')
partners = models.execute_kw(db, uid, password, 'res.partner', 'search_read',
    [[['is_company', '=', True]]], {'fields': ['name']})
```

**After (JSON/2):**
```python
import requests
response = requests.post(f'{url}/json/2/res.partner/search_read',
    headers={'Authorization': f'Bearer {api_key}'},
    json={'domain': [['is_company', '=', True]], 'fields': ['name']})
partners = response.json()
```

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

## Performance Considerations

### No Built-in Rate Limiting

Odoo does **not** have built-in API rate limiting. Consider:
- Implementing rate limiting at the reverse proxy level (nginx, Cloudflare)
- Using connection pooling in your clients
- Batching operations where possible

### Connection Timeouts

Default HTTP timeout is typically 60 seconds. For long operations:
- Use background jobs (Automated Actions)
- Process in smaller batches
- Consider async patterns with webhooks

### Best Practices

1. **Batch operations** - Create/update multiple records in one call
2. **Select only needed fields** - Don't fetch entire records
3. **Use domains efficiently** - Filter server-side, not client-side
4. **Cache static data** - Products, categories don't change often
5. **Handle errors gracefully** - Implement retry logic for transient failures
