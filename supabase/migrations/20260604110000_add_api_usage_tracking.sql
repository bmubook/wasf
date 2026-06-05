-- إضافة أعمدة لتتبع استهلاك الـ API Key في التطبيق
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS gemini_prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gemini_completion_tokens INTEGER DEFAULT 0;

ALTER TABLE public.product_voices
ADD COLUMN IF NOT EXISTS elevenlabs_chars INTEGER DEFAULT 0;
