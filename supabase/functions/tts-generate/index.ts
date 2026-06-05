import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Edge Function: tts-generate
 * تحويل النص العربي إلى كلام باللهجة السعودية الطبيعية عبر ElevenLabs
 * تعمل من السيرفر مباشرة لحماية مفتاح API ومنع مشاكل CORS
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // معالجة طلبات CORS المسبقة (Preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // 0. فحص أمني داخلي: التأكد من وجود مفتاح الوصول لمنع الاستخدام غير المصرح
    const authHeader = req.headers.get("authorization") || "";
    const apiKeyHeader = req.headers.get("apikey") || "";
    if (!authHeader && !apiKeyHeader) {
      return new Response(
        JSON.stringify({ error: "غير مصرح: يجب تمرير مفتاح الوصول." }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 1. قراءة مفتاح ElevenLabs ومعرفات الأصوات من متغيرات البيئة السرية (Secrets)
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const male1 = Deno.env.get("ELEVENLABS_MALE_1_ID") || Deno.env.get("ELEVENLABS_MALE_VOICE_ID") || "oJCdZCYaJobw2GlrIQm5";
    const male2 = Deno.env.get("ELEVENLABS_MALE_2_ID") || "2bnoa3wtrtcUW41TrSJM";
    const female1 = Deno.env.get("ELEVENLABS_FEMALE_1_ID") || Deno.env.get("ELEVENLABS_FEMALE_VOICE_ID") || "gVzwmdZzRgBrNjXaTmi5";
    const female2 = Deno.env.get("ELEVENLABS_FEMALE_2_ID") || "QtQamNJjpordEbNFIlz3";

    if (!elevenLabsApiKey) {
      return new Response(
        JSON.stringify({ error: "مفتاح ELEVENLABS_API_KEY غير مهيأ في متغيرات البيئة السرية." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 2. استخراج البيانات من جسم الطلب
    const { text, gender, voiceId, voiceKey } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "النص المطلوب تحويله للصوت (text) مفقود أو فارغ." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (text.trim().length > 800) {
      return new Response(
        JSON.stringify({ error: "النص المطلوب تحويله للصوت طويل جداً (الحد الأقصى 800 حرف شامل التشكيل)." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 3. تحديد معرف الصوت المستهدف
    let targetVoiceId = voiceId;
    if (!targetVoiceId) {
      if (voiceKey === "male_1") targetVoiceId = male1;
      else if (voiceKey === "male_2") targetVoiceId = male2;
      else if (voiceKey === "female_1") targetVoiceId = female1;
      else if (voiceKey === "female_2") targetVoiceId = female2;
      else {
        targetVoiceId = gender === "female" ? female1 : male1;
      }
    }

    console.log(`[TTS] Generating speech using ElevenLabs voice ID: ${targetVoiceId} (voiceKey: ${voiceKey}, gender: ${gender})`);

    // 4. استدعاء ElevenLabs TTS REST API
    const elevenLabsEndpoint = `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`;

    const response = await fetch(elevenLabsEndpoint, {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsApiKey,
        "Content-Type": "application/json",
        "accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      }),
    });

    // 5. فحص استجابة ElevenLabs
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`ElevenLabs TTS Error [${response.status}]:`, errorText);
      return new Response(
        JSON.stringify({
          error: `فشل توليد الصوت من ElevenLabs. رمز: ${response.status}`,
          details: errorText,
        }),
        { status: response.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 6. إعادة الملف الصوتي الثنائي مباشرة للمتصفح
    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/octet-stream",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Edge Function TTS Error:", error);
    return new Response(
      JSON.stringify({ error: `خطأ داخلي في الدالة: ${error.message}` }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
