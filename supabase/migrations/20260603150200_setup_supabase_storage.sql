-- 1. إنشاء حاوية التخزين wasf-assets في storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('wasf-assets', 'wasf-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. حذف أي سياسات قديمة للحاوية لتفادي التعارض
DROP POLICY IF EXISTS "الوصول العام للملفات" ON storage.objects;
DROP POLICY IF EXISTS "الرفع للمستخدمين الموثقين" ON storage.objects;

-- 3. سياسة السماح للجميع بقراءة الملفات العامة (SELECT)
CREATE POLICY "الوصول العام للملفات"
ON storage.objects FOR SELECT
USING (bucket_id = 'wasf-assets');

-- 4. سياسة السماح للمستخدمين الموثقين بالرفع (INSERT)
CREATE POLICY "الرفع للمستخدمين الموثقين"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wasf-assets');
