-- 1. تفعيل الإضافات المطلوبة (إذا لم تكن مفعلة)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. إنشاء جدول الملفات الشخصية للمستخدمين (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    phone_number TEXT,
    role TEXT NOT NULL DEFAULT 'free_user' CHECK (role IN ('free_user', 'premium_user', 'admin')),
    credits INTEGER NOT NULL DEFAULT 3 CHECK (credits >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. إنشاء جدول المنتجات والأوصاف المولدة (products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    category TEXT,
    keywords TEXT[] DEFAULT '{}'::TEXT[],
    tone TEXT,
    dialect TEXT NOT NULL DEFAULT 'saudi_white',
    image_url TEXT,
    pdf_url TEXT,
    generated_title TEXT,
    generated_description TEXT,
    seo_title TEXT,
    seo_description TEXT,
    image_alt_text TEXT,
    social_media_copy JSONB DEFAULT '{}'::JSONB,
    voice_script TEXT,
    voice_url TEXT,
    voice_settings JSONB DEFAULT '{}'::JSONB,
    additional_marketing JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. إنشاء جدول طلبات تفعيل الاشتراكات اليدوية (subscription_requests)
CREATE TABLE IF NOT EXISTS public.subscription_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bank_transfer_receipt TEXT NOT NULL, -- رابط صورة إيصال التحويل في Cloudflare R2
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. تفعيل حماية مستوى الصف (Row Level Security - RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- 6. سياسات الحماية لجدول الملفات الشخصية (Profiles Policies)
CREATE POLICY "يسمح للمستخدم بقراءة ملفه الشخصي فقط"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "يسمح للمستخدم بتحديث ملفه الشخصي فقط"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "يسمح للمشرفين بقراءة كافة الملفات الشخصية"
    ON public.profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 7. سياسات الحماية لجدول المنتجات (Products Policies)
CREATE POLICY "يسمح للمستخدمين بالتحكم الكامل بمنتجاتهم الخاصة"
    ON public.products FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "يسمح للمشرفين بالتحكم الكامل بكافة المنتجات"
    ON public.products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 8. سياسات الحماية لجدول طلبات الاشتراك (Subscription Requests Policies)
CREATE POLICY "يسمح للمستخدم بقراءة طلبات اشتراكه الخاصة"
    ON public.subscription_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "يسمح للمستخدم بإرسال طلب اشتراك خاص به"
    ON public.subscription_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "يسمح للمشرفين بالتحكم الكامل بطلبات الاشتراك"
    ON public.subscription_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 9. تريغر (Trigger) لإنشاء الملف الشخصي تلقائياً عند إنشاء مستخدم جديد في Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, phone_number, role, credits)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
        'free_user',
        3
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
