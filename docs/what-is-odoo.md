# What is Odoo?

## The Technology Stack

Understanding what powers Odoo helps you troubleshoot issues and communicate with developers.

| Layer | Technology | What It Does |
| :--- | :--- | :--- |
| **Database** | PostgreSQL (psql) | Stores all your data - customers, orders, products, everything. Each Odoo database is a separate PostgreSQL database. |
| **Backend** | Python 3 | The brain of Odoo. All business logic, calculations, workflows, and data processing happen in Python. |
| **Frontend** | JavaScript (OWL Framework) | What you see in the browser. OWL (Odoo Web Library) is Odoo's own reactive framework, similar to React or Vue. |
| **Web Server** | Werkzeug (Python) | Handles HTTP requests. Odoo runs its own web server - no Apache or Nginx required (though often used as proxy). |
| **API** | XML-RPC / JSON-RPC | How external systems talk to Odoo. Used for integrations, mobile apps, and automation scripts. |
| **Templating** | QWeb (XML) | Odoo's template engine for reports, website pages, and email templates. Similar to Jinja2 but XML-based. |

### How It All Connects

<div class="architecture-diagram">

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          YOUR BROWSER                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 JAVASCRIPT FRONTEND (OWL)                        │   │
│  │     OWL Components  │  Web Client  │  Widgets  │  Actions       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ JSON-RPC / HTTP
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       ODOO SERVER (Python)                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Werkzeug (HTTP)  │  Controllers  │  Authentication             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │     Models (ORM)  │  Business Logic  │  Reports (QWeb)          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ SQL (via ORM)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL DATABASE                                │
│     res_partner  │  sale_order  │  product_product  │  account_move     │
│      (Contacts)  │   (Sales)    │    (Products)     │    (Invoices)     │
└─────────────────────────────────────────────────────────────────────────┘
```

</div>

### Key Terminology

| Term | What It Means | Example |
| :--- | :--- | :--- |
| **Module / App** | A self-contained package of features that can be installed or uninstalled | `sale`, `stock`, `hr` |
| **Model** | A database table that stores a specific type of data | `res.partner` (contacts), `sale.order` (quotations) |
| **Record** | A single row in a model (one customer, one order) | Customer "Acme Corp" with ID 42 |
| **Field** | A column in a model that stores a specific piece of data | `name`, `email`, `amount_total` |
| **View** | How data is displayed to users (form, list, kanban, etc.) | The sales order form you fill out |
| **ORM** | Object-Relational Mapping - Python code that talks to the database | `self.env['res.partner'].search([])` |
| **XML-ID / External ID** | A unique identifier for records, used in data files and code | `base.main_company`, `sale.action_orders` |
| **Context** | A dictionary of parameters passed around to control behavior | `{'default_partner_id': 5, 'lang': 'en_US'}` |
| **Domain** | A filter condition written as a list of tuples | `[('state', '=', 'sale'), ('amount_total', '>', 1000)]` |

### Common File Types

| Extension | Purpose | Where You'll See It |
| :--- | :--- | :--- |
| `.py` | Python code - models, business logic, controllers | `models/sale_order.py` |
| `.xml` | Views, actions, menus, demo data, security rules | `views/sale_order_views.xml` |
| `.js` | JavaScript - custom widgets, frontend logic | `static/src/js/my_widget.js` |
| `.scss` / `.css` | Styling - colors, layouts, fonts | `static/src/scss/style.scss` |
| `.csv` | Data import files (demo data, initial records) | `data/res.country.csv` |
| `.po` / `.pot` | Translation files | `i18n/fr.po` |
