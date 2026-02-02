---
title: API Playground
description: Interactive Odoo JSON/2 API testing tool
layout: page
---

<script setup>
import ApiPlayground from './.vitepress/components/ApiPlayground.vue'
</script>

<ApiPlayground />

## How to Use

### 1. Get Your API Key

1. Log into your Odoo instance as an admin
2. Go to **Settings > Users & Companies > Users**
3. Open your user profile
4. Click **Account Security** tab
5. Click **New API Key**
6. Copy the generated key (starts with `odoo_api_`)

### 2. Configure CORS (if needed)

If you get CORS errors, you have these options:

**Option A: Browser Extension**
- Install a CORS bypass extension for testing (e.g., "CORS Unblock" for Chrome)
- Enable it only for your Odoo domain

**Option B: Odoo Configuration**
Add to your Odoo config or nginx:
```nginx
add_header 'Access-Control-Allow-Origin' 'https://your-docs-site.com';
add_header 'Access-Control-Allow-Methods' 'POST, OPTIONS';
add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type';
```

### 3. Start Testing!

1. Enter your Odoo URL and API key
2. Click "Test Connection"
3. Select a template or write custom JSON
4. Click "Execute" to see results

::: warning Security Reminder
- Your API key is stored only in your browser's session storage
- It's sent directly from your browser to your Odoo instance
- We never see or store your credentials
- Close the tab to clear your API key
:::

## Templates Reference

| Category | Templates |
|----------|-----------|
| **Partners** | Search, Create, Update |
| **Products** | Search products, Check stock |
| **Sales** | Search orders, Create order, Confirm |
| **Invoices** | Search invoices, Post invoice |
| **Custom** | Empty template for any request |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Execute request |
| `Tab` | Navigate fields |

---

[Back to Integration Guide](/15-integration)
