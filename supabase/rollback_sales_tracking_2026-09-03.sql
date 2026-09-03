-- ROLLBACK POINT: 2026-09-03 before sales tracking changes.
-- Git source rollback is preserved on branch:
-- rollback-2026-09-03-before-sales-tracking
-- This script removes only the sales-tracking schema introduced by add_sales_tracking.
-- It does not modify existing businesses, sales reps, QR codes, feedback, or rating events.

begin;
drop table if exists public.sales_records;
commit;
