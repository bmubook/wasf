-- إنشاء جدول أصوات المنتجات المتعددة
CREATE TABLE IF NOT EXISTS public.product_voices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    voice_url text NOT NULL,
    voice_gender text DEFAULT 'male'::text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- تفعيل الـ RLS
ALTER TABLE public.product_voices ENABLE ROW LEVEL SECURITY;

-- السياسات الأمنية لقاعدة البيانات
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'القراءة للمالك فقط' AND tablename = 'product_voices'
    ) THEN
        CREATE POLICY "القراءة للمالك فقط" ON public.product_voices
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'الإضافة للمالك فقط' AND tablename = 'product_voices'
    ) THEN
        CREATE POLICY "الإضافة للمالك فقط" ON public.product_voices
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'الحذف للمالك فقط' AND tablename = 'product_voices'
    ) THEN
        CREATE POLICY "الحذف للمالك فقط" ON public.product_voices
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;
