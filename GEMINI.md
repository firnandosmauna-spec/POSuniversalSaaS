<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `antislop.md` (core) and then the skill for the task:
- UI / visual: `skills/antislop-ui/SKILL.md`
- Copy & text: `skills/antislop-copywriting/SKILL.md`
- People: `skills/antislop-human/SKILL.md`
- Mobile / responsive: `skills/antislop-layoutmobile/SKILL.md`
- Code comments: `skills/antislop-code/SKILL.md`
Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->

## Multi-Tenant SaaS Domain Architecture Rules
- **Domain Isolation & Switcher**: Aplikasi ini adalah Universal SaaS POS multi-tenant. Tipe bisnis aktif (`user.businessType`) tersimpan persisten via `localStorage` (`pos_active_business_type`) dan metadata pengguna.
- **Rute POS Modular**: Setiap pilihan tipe bisnis (`FNB`, `PRINTING`, `RETAIL`, `LAUNDRY`, `GROCERY`, `GYM`, `SALON`, `WORKSHOP`, `PHARMACY`, `DISTRIBUTOR`, `E_COMMERCE`) WAJIB mengarah secara otomatis ke antarmuka POS domain yang sesuai (`@/domains/[domain]/POSView`) tanpa pernah meriset atau tertukar dengan domain lain.
- **Tenant Data Isolation**: Semua transaksi, data produk, shift, pengeluaran, dan job order WAJIB terisolasi berdasarkan `tenant_id` pengguna dan `activeBranchId`.

