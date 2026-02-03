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

<div class="playground-nav">
  <a href="/15-integration" class="nav-back-btn">
    <span class="nav-arrow">←</span>
    <span class="nav-label">
      <span class="nav-hint">Back to</span>
      <span class="nav-title">Integration Guide</span>
    </span>
  </a>
</div>

<style>
.playground-nav {
  margin: 2rem 0;
}

.nav-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  text-decoration: none !important;
  color: var(--vp-c-text-1) !important;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-back-btn:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  transform: translateX(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.nav-back-btn::after {
  display: none !important;
}

.nav-arrow {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  transition: transform 0.25s ease;
}

.nav-back-btn:hover .nav-arrow {
  transform: translateX(-3px);
}

.nav-label {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.nav-hint {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-title {
  font-size: 1rem;
  font-weight: 600;
}
</style>
