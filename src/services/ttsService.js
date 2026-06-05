import { supabase } from '../lib/supabaseClient'

/**
 * رفع أي ملف ثنائي (صوت، صورة، PDF) مباشرة إلى Supabase Storage
 * @param {string} fileKey - اسم ومسار الملف في الحاوية (مثال: voices/audio.mp3)
 * @param {Uint8Array|Blob|File} body - البيانات الثنائية للملف
 * @param {string} contentType - نوع المحتوى MIME (مثال: audio/mpeg)
 * @returns {Promise<string>} الرابط العام المباشر للملف المرفوع
 */
export const uploadFileToStorage = async (fileKey, body, contentType) => {
  try {
    const fileBody = body instanceof Uint8Array ? new Blob([body], { type: contentType }) : body;

    const { data, error } = await supabase.storage
      .from('wasf-assets')
      .upload(fileKey, fileBody, {
        contentType,
        upsert: true
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('wasf-assets')
      .getPublicUrl(fileKey)

    return publicUrl
  } catch (error) {
    console.error('حدث خطأ أثناء الرفع لـ Supabase Storage:', error.message)
    throw new Error(`فشل رفع الملف إلى التخزين السحابي: ${error.message}`)
  }
}

// دالة تنظيف النص المتقدمة للتعليق الصوتي لضمان إرسال نصوص عربية نقية خالية من المشتتات والرموز البرمجية
const cleanTextForTTS = (text) => {
  if (!text) return ''
  
  let clean = text
  
  // 1. إزالة توجيهات المخرج داخل الأقواس المربعة [مثل: صوت موسيقى] أو الأقواس العادية (مثل: مؤثرات)
  clean = clean.replace(/\[.*?\]/g, '')
  clean = clean.replace(/\(.*?\)/g, '')
  
  // 2. إزالة نجوم الماركداون والشرطات والتنسيقات
  clean = clean.replace(/\*/g, '')
  clean = clean.replace(/#/g, '')
  clean = clean.replace(/_/g, '')
  clean = clean.replace(/-/g, ' ')
  
  // 3. إزالة تسميات الأدوار الشائعة في السكربتات (مثل: "الراوي:", "المذيع:", "صوت الراوي:")
  const rolesToRemove = [
    /الراوي\s*:/g,
    /المذيع\s*:/g,
    /صوت الراوي\s*:/g,
    /صوت المذيع\s*:/g,
    /التعليق الصوتي\s*:/g,
    /التعليق\s*:/g,
    /المعلق\s*:/g,
    /Narrator\s*:/gi,
    /Voiceover\s*:/gi,
    /Speaker\s*:/gi,
    /Voice\s*:/gi
  ]
  
  rolesToRemove.forEach(roleRegex => {
    clean = clean.replace(roleRegex, '')
  })

  // 4. استبدال السطور الفارغة المتكررة بمسافة واحدة
  clean = clean.replace(/\s+/g, ' ')
  
  return clean.trim()
}

/**
 * توليد الصوت عبر Supabase Edge Function التي تستدعي ElevenLabs من السيرفر
 * @param {string} text - النص المنظف المراد تحويله
 * @param {string} voiceKey - مفتاح الصوت المحدد ('male_1', 'male_2', 'female_1', 'female_2')
 * @returns {Promise<Blob>} البيانات الثنائية للملف الصوتي MP3
 */
const generateSpeechViaEdge = async (text, voiceKey) => {
  console.log('[TTS] بدء استدعاء Edge Function لتوليد الصوت (ElevenLabs)...', { textLength: text.length, voiceKey })

  const { data, error } = await supabase.functions.invoke('tts-generate', {
    body: { text, voiceKey }
  })

  if (error) {
    console.error('[TTS] خطأ من Edge Function (ElevenLabs):', error)
    throw new Error(error.message || 'فشل استدعاء دالة التحويل الصوتي.')
  }

  // supabase.functions.invoke يعيد ArrayBuffer لـ application/octet-stream
  let audioBlob

  if (data instanceof ArrayBuffer) {
    audioBlob = new Blob([data], { type: 'audio/mpeg' })
  } else if (data instanceof Blob) {
    audioBlob = data
  } else {
    console.error('[TTS] نوع البيانات الراجعة غير متوقع:', typeof data)
    throw new Error('البيانات الصوتية الراجعة بتنسيق غير متوقع.')
  }

  console.log('[TTS] استلام ملف صوتي بحجم:', audioBlob.size, 'bytes')

  if (audioBlob.size < 1000) {
    throw new Error('الملف الصوتي الراجع صغير جداً وقد يكون تالفاً.')
  }

  return audioBlob
}

/**
 * توليد تعليق صوتي مسموع من النص وحفظه سحابياً في Supabase Storage
 * @param {string} text - النص المراد تحويله لصوت (السكربت الإعلاني)
 * @param {string} voiceKey - مفتاح الصوت المحدد ('male_1', 'male_2', 'female_1', 'female_2')
 * @returns {Promise<Object>} رابط الصوت وعدد الحروف الملقاة
 */
export const generateSpeechAndUpload = async (text, voiceKey = 'male_1') => {
  // تنظيف السكربت الصوتي بشكل متقدم
  const cleanText = cleanTextForTTS(text)
  console.log('[TTS] نص منظف لجهاز القارئ:', cleanText.substring(0, 80), '...')

  try {
    // الخطوة 1: توليد الصوت عبر Edge Function
    console.log('[TTS] الخطوة 1: استدعاء Edge Function...')
    const audioData = await generateSpeechViaEdge(cleanText, voiceKey)
    console.log('[TTS] الخطوة 1 نجحت - حجم الصوت:', audioData.size, 'bytes')

    // الخطوة 2: رفع الملف الصوتي إلى Supabase Storage
    const contentType = audioData.type || 'audio/mpeg'
    const isWav = contentType.includes('wav')
    const fileExt = isWav ? 'wav' : 'mp3'
    const fileName = `voices/${Date.now()}_voice.${fileExt}`
    console.log('[TTS] الخطوة 2: رفع لـ Supabase Storage ->', fileName)
    const audioUrl = await uploadFileToStorage(fileName, audioData, contentType)
    console.log('[TTS] الخطوة 2 نجحت - رابط الصوت:', audioUrl)

    return { audioUrl, charCount: cleanText.length }
  } catch (error) {
    console.error('[TTS] ❌ فشل في خدمة TTS:', error.message, error)
    throw error
  }
}

