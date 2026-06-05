// 1. استيراد مفاتيح إعدادات الخدمات من ملف الـ .env
const azureSpeechKey = import.meta.env.VITE_AZURE_SPEECH_KEY
const azureSpeechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION
const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY

/**
 * تحويل الصوت إلى نص باستخدام الموفر المتاح في ملف الـ .env
 * يفضل استخدام OpenAI Whisper لدقته في اللهجة السعودية، أو Azure كخيار افتراضي مفعل.
 * @param {Blob} audioBlob - ملف الصوت المسجل من الميكروفون
 * @returns {Promise<string>} النص المكتوب الناتج عن التفريغ الصوتي
 */
export const transcribeAudio = async (audioBlob) => {
  // 1. التحقق من توفر مفتاح OpenAI لاستخدام Whisper (الأفضل للهجات)
  if (openaiApiKey && !openaiApiKey.includes('your-openai-api-key')) {
    try {
      return await transcribeWithWhisper(audioBlob)
    } catch (err) {
      console.warn('فشل تفريغ الصوت بـ OpenAI Whisper، جاري التراجع لـ Azure:', err.message)
    }
  }

  // 2. التحقق من توفر مفاتيح Azure Speech (مفعلة تلقائياً في حساب المستخدم)
  if (azureSpeechKey && azureSpeechRegion) {
    try {
      return await transcribeWithAzure(audioBlob)
    } catch (err) {
      console.warn('فشل تفريغ الصوت بـ Azure Speech:', err.message)
      throw new Error(`فشل تفريغ الصوت: ${err.message}`)
    }
  }

  throw new Error('يرجى تهيئة مفاتيح Azure Speech أو OpenAI في ملف الـ .env لتفعيل التفريغ الصوتي.')
}

/**
 * تفريغ الصوت باستخدام OpenAI Whisper API
 */
const transcribeWithWhisper = async (audioBlob) => {
  const endpoint = 'https://api.openai.com/v1/audio/transcriptions'
  
  const formData = new FormData()
  // Whisper يتطلب ملف بامتداد صالح، نقوم بتسمية الملف صوت.webm
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', 'ar')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: formData
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.error?.message || `خطأ في OpenAI API. رمز الاستجابة: ${response.status}`)
  }

  const result = await response.json()
  return result.text || ''
}

/**
 * تفريغ الصوت باستخدام Microsoft Azure Speech-to-Text REST API
 */
const transcribeWithAzure = async (audioBlob) => {
  // استخدام اللهجة السعودية ar-SA لضمان فهم الكلمات واللكنة المحلية
  const endpoint = `https://${azureSpeechRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=ar-SA`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': azureSpeechKey,
      'Content-type': audioBlob.type || 'audio/webm; codecs=opus',
      'Accept': 'application/json'
    },
    body: audioBlob
  })

  if (!response.ok) {
    throw new Error(`خطأ في Microsoft Azure STT API. رمز الاستجابة: ${response.status}`)
  }

  const result = await response.json()
  
  if (result.RecognitionStatus === 'Success') {
    return result.DisplayText || ''
  } else if (result.RecognitionStatus === 'NoMatch') {
    throw new Error('لم يتمكن محرك النطق من فهم الكلمات المسجلة. يرجى التحدث بوضوح وقرب الميكروفون.')
  } else {
    throw new Error(`حالة التفريغ: ${result.RecognitionStatus}`)
  }
}
