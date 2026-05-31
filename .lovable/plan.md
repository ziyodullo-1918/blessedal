## Maqsad

Lazer va Qadoq bo'limlarini Tikuv (Tikuvchilar) bo'limi singari to'liq mustaqil modulga aylantirish: Boshqaruv, Ishchilar, Tariflar (Mahsulotlar), Topshiriqlar, Oylik hisobot, Sozlamalar.

## Asosiy farqlar (bo'lim turi bo'yicha)

- **Lazer** — kunbay ish (har bir ish kuni uchun belgilangan stavka). Ishchi ish kunini belgilaydi, miqdor emas. Mahsulot bo'yicha tarif emas, kunlik stavka.
- **Qadoq** — ish bay (piece-rate): har bir qadoqlangan mahsulot uchun belgilangan mablag'. Mahsulot bo'yicha tarif (Tortuv kabi).
- **Qadoq** — Tortuv kabi worker-login (PIN/code orqali kirish) bilan ham mavjud bo'ladi.

## Ma'lumotlar bazasi (migratsiya)

1. `laser_daily_attendance` — kunbay ish kunlari:
   - `worker_id` (factory_workers.id), `work_date`, `daily_rate`, `note`, `created_at`
   - unique(worker_id, work_date)
2. `laser_daily_rates` — kunbay stavkalar tarixi:
   - `worker_id` nullable (null = umumiy), `rate_per_day`, `active`, `effective_from`
3. `packaging_piece_rates` — qadoqlash uchun mahsulot bo'yicha narx (salary_rates dan ajratilgan, mustaqil boshqariladi):
   - `product_name` nullable (null = default), `rate_per_unit`, `active`
4. `packaging_worker_sessions` — Tortuv kabi worker login session:
   - `worker_id`, `token`, `expires_at`
5. RPC: `packaging_worker_login(code, pin)` → session token qaytaradi.
6. RPC: `laser_record_attendance(worker_id, date, rate)` — bir kunda bir marta.

Eski `salary_rates` jadvaliga tegmaymiz — u Tikuv/Tortuv uchun mavjud holida qoladi. Lazer kunbay alohida, Qadoq ham alohida `packaging_piece_rates` da boshqariladi.

## Marshrutlar (yangi)

### Lazer bo'limi (admin)
- `/factory/laser` — Boshqaruv paneli (faol topshiriqlar, bugungi davomat, oylik xulosa)
- `/factory/laser/workers` — Ishchilar (faqat department='laser')
- `/factory/laser/rates` — Kunlik stavka (umumiy yoki ishchi bo'yicha)
- `/factory/laser/tasks` — `factory.dept.$dept.tsx` ning lazer ko'rinishi (avval mavjud edi — saqlanadi)
- `/factory/laser/attendance` — Davomat kiritish (kun + ishchi + stavka)
- `/factory/laser/report` — Oylik hisobot (har ishchi × ish kunlari × stavka)
- `/factory/laser/settings` — Sozlamalar (default stavka, eksport)

### Qadoq bo'limi (admin)
- `/factory/packaging` — Boshqaruv paneli
- `/factory/packaging/workers` — Ishchilar (department='packaging')
- `/factory/packaging/rates` — Mahsulot bo'yicha donaboshi narx
- `/factory/packaging/tasks` — `factory.dept.$dept.tsx` qadoq ko'rinishi (saqlanadi)
- `/factory/packaging/report` — Oylik hisobot (qadoqlangan mahsulot × narx)
- `/factory/packaging/settings` — Sozlamalar
- `/factory/packaging/worker-login` — Ishchi PIN login (Tortuv kabi)
- `/factory/packaging/worker` — Ishchi ichki ekrani (mening topshiriqlarim, qadoqlash, kunlik daromad)

## Sidebar tuzilishi

`AppShell.tsx` da Lazer va Qadoq guruhlari to'liq qayta tuziladi (Tikuvchilar/Tortuvchilar kabi 6 element):
- **Lazer bo'limi**: Boshqaruv, Ishchilar, Stavkalar, Topshiriqlar, Davomat, Oylik hisobot, Sozlamalar
- **Qadoq bo'limi**: Boshqaruv, Ishchilar, Tariflar, Topshiriqlar, Oylik hisobot, Sozlamalar

## Texnik tafsilotlar

- Ishchilar boshqaruvi `factory_workers` jadvalidan foydalanadi, `department` filtri bilan. Mavjud `listWorkers/createWorker/deleteWorker/toggleWorker` qayta ishlatiladi.
- Qadoq worker login Tortuv namunasi (`src/lib/tortuvchilar/*`) bo'yicha qilingan kichik kutubxona: `src/lib/factory/packaging-auth.ts` + sha256 PIN tekshiruvi server tomonda RPC orqali.
- Oylik hisobot: Lazer — `laser_daily_attendance` ni davr ichida yig'ish; Qadoq — `factory_stage_events` dan `department='packaging'`, `event_type='progress'` bo'yicha quantity × packaging_piece_rate.
- Realtime: stavka/davomat/event jadvallari uchun supabase realtime kanallari.

## Fayllar

**Yangi**:
- `src/lib/factory/laser.ts` (attendance, rates, report helpers)
- `src/lib/factory/packaging.ts` (rates, report, worker auth)
- `src/routes/factory.laser.index.tsx` (Boshqaruv)
- `src/routes/factory.laser.workers.tsx`
- `src/routes/factory.laser.rates.tsx`
- `src/routes/factory.laser.attendance.tsx`
- `src/routes/factory.laser.report.tsx`
- `src/routes/factory.laser.settings.tsx`
- `src/routes/factory.packaging.index.tsx`
- `src/routes/factory.packaging.workers.tsx`
- `src/routes/factory.packaging.rates.tsx`
- `src/routes/factory.packaging.report.tsx`
- `src/routes/factory.packaging.settings.tsx`
- `src/routes/factory.packaging.worker-login.tsx`
- `src/routes/factory.packaging.worker.tsx` (worker layout) + `.index.tsx`
- migration: jadval + RPC

**Tahrir**:
- `src/components/AppShell.tsx` — Lazer/Qadoq guruhlari yangilanadi
- Eski `/factory/dept/laser` va `/factory/dept/packaging` `/factory/laser/tasks` va `/factory/packaging/tasks` ga redirect qilinadi (yoki shu nom ostida saqlanadi).

## Eslatmalar

- Eski Tikuv (`/`, `/ishchilar`, ...) va Tortuv tegmaydi.
- Hozir mavjud `factory.dept.$dept.tsx` ish logikasi qayta ishlatiladi (ichki komponent), faqat URL tuzilmasi yangilanadi.
- Bu katta ko'lamli ish — taxminan 15+ yangi fayl va 1 migratsiya.

Tasdiqlasangiz, bosqichma-bosqich amalga oshiraman: avval migratsiya, keyin lib/helper, keyin marshrutlar, oxirida AppShell yangilanadi.
