-- إضافة عمود الملاحظات الإضافية لجدول المنتجات (products)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS additional_notes TEXT;
