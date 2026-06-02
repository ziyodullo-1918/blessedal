
## 1. Lazer — Astar/Hakandoz progress

Maqsad: lazerda kesishda chalkashlikni oldini olish. "Brak" o'rniga 3 ta hisoblagich: **Asosiy**, **Astar**, **Hakandoz/Stirka**.

- Migratsiya: `factory_stages` ga `aux_completed jsonb default '{}'::jsonb` qo'shiladi (`{"main": n, "astar": n, "hakandoz": n}` lazer uchun ishlatiladi).
- Yangi RPC `laser_report_progress(_stage_id, _part, _delta, _worker_id, _note)` — `_part` qiymati: `main` | `astar` | `hakandoz`. `main` topshilganda hozirgi `factory_report_stage_progress` chaqiriladi (Tikuvga oqim eski tarzda). `astar`/`hakandoz` faqat `aux_completed` ni yangilaydi va event yozadi.
- Faqat **lazer** topshiriqlar kartochkasida 3 ta input/OK ko'rinadi. Boshqa bo'limlarda **Brak butunlay olib tashlanadi** — faqat "Bajarildi" + OK qoladi.
- `dept-tasks.tsx` lazer/non-lazer ko'rinishlari ajratiladi. Lazer kartochkasida har bir qism uchun progress: `Asosiy 0/100 · Astar 0/100 · Hakandoz 0/100`.

## 2. Qadoq — yangi oqim (Tortuvchilar uslubida)

Maqsad: qadoqda alohida "ishchi kabineti" va "tariflar" sahifalari kerakmas. Qadoq ishchisi standart auth bilan kiradi va ish yozadi.

- O'chiriladi: `factory.packaging.worker-login.tsx`, `factory.packaging.worker.tsx`, `factory.packaging.rates.tsx`, navigatsiyadan ham olinadi.
- Migratsiya: `packaging_box_entries` jadvali (`worker_id`, `product_id`, `color`, `pairs_per_box` default 5, `boxes`, `unit_price`, `total`, `work_date`).
  - Mahsulotga `pack_box_size int default 5` ustun (har mahsulot uchun karobka sig'imi).
  - Mahsulot saqlanganda forma'da `Qadoq karobka sig'imi` maydoni.
- "Topshiriqlar" sahifasi qadoqda yangi UI: ishchi (dropdown) → mahsulot → rang → karobka soni → OK.
  - Har karobka = `pairs_per_box` juft. Donalar = `boxes * pairs_per_box`.
  - Avtomatik `finished_inventory` ga insert va `factory_stage_events` (`progress`) yoziladi.
- Oylik hisobot bo'limi qoladi va `packaging_salary_report` qadoqdagi yangi entrylarni hisobga oladi (RPC yangilanadi).

## 3. Mahsulotlar → barcha bo'limlarda avtomatik

- Mahsulot saqlanganda **har 4 bo'lim uchun rate = 0** bo'lsa ham `salary_rates` (laser/sewing/stretching) va `packaging_piece_rates` ga upsert qilinadi → shu bilan "ro'yhatda paydo bo'lish" ta'minlanadi.
- Bo'lim ichidagi formula sahifasida ham `factory_products` dan dropdown.

## 4. Buyurtma yaratishda mahsulot ro'yhati

- `factory.orders.index.tsx` formani yangilaymiz:
  - "Mahsulot turi" — `factory_products` dan **Select** dropdown.
  - "Rang" — tanlangan mahsulotning `colors` massividan Select.
  - "Muhimlik" maydoni olib tashlanadi.

## 5. Umumiy Sozlamalar bo'limi

- Yangi route: `src/routes/sozlamalar.tsx` (allaqachon bor — kontentni yangilaymiz) yoki `factory.settings.tsx`. Bittasini ishlatib, AppShellda link.
- 4 ta tab/karta:
  1. **Bo'lim boshliqlari** — har bo'lim uchun foydalanuvchi tayinlash (admin tomonidan). Yangi jadval: `factory_department_heads(department, user_id, full_name)`.
  2. **Foydalanuvchilar va rollar** — `user_roles` jadvali (`app_role` enum: `admin`, `head`, `worker`). `has_role` SECURITY DEFINER funktsiya. Admin foydalanuvchiga rol bera oladi.
  3. **Qadoq qoidalari** — global default karobka sig'imi (`app_settings` jadval, key/value).
  4. **Zavod profili** — nom, manzil, telefon (`app_settings`).

## 6. Umumiy test (demo data)

- Migratsiyalardan keyin `supabase--insert` orqali:
  - 2 demo mahsulot (`Model-024`, `Model-015`) ranglari va karobka sig'imi bilan.
  - Bo'limga ishchilar (laser/sewing/stretching/packaging) — agar yo'q bo'lsa.
  - 1 demo buyurtma (`ORD-DEMO`) — 100 dona.
- Keyin runtime tekshirish: dev server xato bermaydi, har sahifa ochiladi, demo oqim ishlaydi.

## Texnik bosqichlar (tartib)

```text
1) Migratsiya A: aux_completed + pack_box_size + packaging_box_entries
                + laser_report_progress RPC + packaging_salary_report yangilash
                + finished_inventory ga avto-insert (box entries)
2) Migratsiya B: app_settings, factory_department_heads, user_roles + has_role
3) Frontend:
   - dept-tasks.tsx → lazer/qadoq/boshqa variantlarini ajratish
   - products.tsx → pack_box_size input
   - orders form → mahsulot/rang dropdown
   - factory.packaging.* tozalash (worker-login, worker, rates olib tashlash)
   - AppShell navigatsiyasini yangilash
   - sozlamalar sahifasi (4 ta blok)
4) lib/factory/laser.ts va packaging.ts yangi RPC chaqiruvlari
5) Demo seed (insert tool)
6) Smoke test
```

## Eslatma

- Tortuv (`tortuvchilar/pullers_*`) bo'limiga tegmaymiz — u alohida ishlaydi.
- Eski PIN-asosli qadoq ishchi sessiyalari (`packaging_worker_sessions`) DB da qoladi (zarar yo'q), faqat UI dan olib tashlanadi.
- PDF: `factory.payroll.tsx` allaqachon PDF chiqaradi — yangi qadoq formati ham unga ulanadi.

Bu reja juda katta. Tasdiqlasangiz boshlayman; xohlasangiz biror qismni kichikroq qilamiz yoki bo'lib bajaramiz.
