-- 1. تحديث القيمة الافتراضية للرصيد التجريبي ليكون 30 نقطة في جدول profiles
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 30;

-- 2. تحديث دالة التريجر لإنشاء الملف الشخصي لتمنح 30 نقطة بدلاً من 3 للمشتركين الجدد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, phone_number, role, credits)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
        'free_user',
        30 -- 30 رصيد تجريبي مجاني
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. تحديث رصيد الحساب التجريبي الحالي لـ bmubook@gmail.com ليكون 30 رصيداً
UPDATE public.profiles SET credits = 30 WHERE email = 'bmubook@gmail.com';
