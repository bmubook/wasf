-- 1. إنشاء وظيفة وتريجر لمزامنة الدور (role) من profiles إلى auth.users (raw_app_meta_data) تلقائياً
CREATE OR REPLACE FUNCTION public.sync_user_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_updated ON public.profiles;
CREATE TRIGGER on_profile_role_updated
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_role_to_auth();

-- 2. مزامنة الأدوار لجميع المستخدمين المسجلين حالياً في قاعدة البيانات
UPDATE auth.users u
SET raw_app_meta_data = 
  coalesce(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE u.id = p.id;

-- 3. إعادة صياغة سياسات الحماية (RLS Policies) لجدول الملفات الشخصية (profiles) لتعتمد على JWT مباشرة
DROP POLICY IF EXISTS "يسمح للمشرفين بقراءة كافة الملفات الشخصية" ON public.profiles;
DROP POLICY IF EXISTS "يسمح للمستخدم بقراءة ملفه الشخصي فقط" ON public.profiles;
DROP POLICY IF EXISTS "يسمح للمستخدم بتحديث ملفه الشخصي فقط" ON public.profiles;

CREATE POLICY "يسمح للمستخدم بقراءة ملفه الشخصي فقط"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "يسمح للمستخدم بتحديث ملفه الشخصي فقط"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "يسمح للمشرفين بقراءة كافة الملفات الشخصية"
    ON public.profiles FOR ALL
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- 4. إعادة صياغة سياسات الحماية (RLS Policies) لجدول المنتجات (products) لتعتمد على JWT مباشرة
DROP POLICY IF EXISTS "يسمح للمستخدمين بالتحكم الكامل بمنتجاتهم الخاصة" ON public.products;
DROP POLICY IF EXISTS "يسمح للمشرفين بالتحكم الكامل بكافة المنتجات" ON public.products;

CREATE POLICY "يسمح للمستخدمين بالتحكم الكامل بمنتجاتهم الخاصة"
    ON public.products FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "يسمح للمشرفين بالتحكم الكامل بكافة المنتجات"
    ON public.products FOR ALL
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- 5. إعادة صياغة سياسات الحماية (RLS Policies) لجدول طلبات الاشتراك لتعتمد على JWT مباشرة
DROP POLICY IF EXISTS "يسمح للمستخدم بقراءة طلبات اشتراكه الخاصة" ON public.subscription_requests;
DROP POLICY IF EXISTS "يسمح للمستخدم بإرسال طلب اشتراك خاص به" ON public.subscription_requests;
DROP POLICY IF EXISTS "يسمح للمشرفين بالتحكم الكامل بطلبات الاشتراك" ON public.subscription_requests;

CREATE POLICY "يسمح للمستخدم بقراءة طلبات اشتراكه الخاصة"
    ON public.subscription_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "يسمح للمستخدم بإرسال طلب اشتراك خاص به"
    ON public.subscription_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "يسمح للمشرفين بالتحكم الكامل بطلبات الاشتراك"
    ON public.subscription_requests FOR ALL
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );
