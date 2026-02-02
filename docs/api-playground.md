---
title: API Playground
description: Interactive Odoo JSON/2 API testing tool
layout: page
---

<script setup>
import ApiPlayground from './.vitepress/components/ApiPlayground.vue'
</script>

<ApiPlayground />

::: details Need an API Key?
1. Log into your Odoo instance as admin
2. Go to **Settings > Users & Companies > Users**
3. Open your user profile > **Account Security** tab
4. Click **New API Key** and copy it (starts with `odoo_api_`)
:::

::: details Connection Modes
**Proxy Mode** (default) - Works with any Odoo instance including Odoo.com sandboxes. Requests go through our server to bypass CORS.

**Direct Mode** - Faster, but requires CORS configuration on your Odoo server or a browser extension.
:::

---

[Back to Integration Guide](/15-integration)
