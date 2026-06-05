/**
 * خدمة الاتصال بـ Gemini API لتوليد الأوصاف التسويقية والـ SEO والمحتوى الترويجي.
 * تدعم هذه الخدمة قراءة الصور وملفات الـ PDF المرفوعة وتوليد مخرجات JSON موحدة.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-3.1-flash-lite'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

/**
 * تحويل كائن ملف (File) إلى صيغة inlineData المتوافقة مع Gemini API (base64)
 * @param {File} file - الملف المرفوع
 * @returns {Promise<{mimeType: string, data: string}>}
 */
export const fileToGenerativePart = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1]
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      })
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

/**
 * توليد المحتوى التسويقي الشامل للمنتج
 * @param {Object} params - معطيات المدخلات
 * @param {string} params.productName - اسم المنتج
 * @param {string} params.category - تصنيف المنتج
 * @param {Array<string>} params.keywords - الكلمات المفتاحية
 * @param {string} params.dialect - نوع اللهجة (saudi_white أو fusha)
 * @param {string} params.tone - نبرة الصوت
 * @param {Object} [params.imagePart] - الصورة بصيغة inlineData
 * @param {Object} [params.pdfPart] - ملف الـ PDF بصيغة inlineData
 * @returns {Promise<Object>} المخرجات ككائن JSON منسق
 */
export const generateProductContent = async ({
  productName,
  category,
  keywords,
  dialect,
  tone,
  imagePart,
  pdfPart,
  additionalNotes
}) => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('your-gemini-api-key')) {
    throw new Error('مفتاح Gemini API غير معرف أو غير صحيح في ملف .env')
  }

  // صياغة اللهجة المحددة
  const dialectInstruction = dialect === 'saudi_white' 
    ? 'اللهجة البيضاء السعودية المحلية (التي تلامس ثقافة المستهلك المحلي وتبتعد عن الفصحى الجافة والكلمات الدخيلة)' 
    : 'اللغة العربية الفصحى المبسطة والتسويقية الأنيقة';

  // صياغة تعليمات السكربت الصوتي بناءً على اللهجة لتمكين اللهجة السعودية الطبيعية في محركات النطق
  const voiceScriptInstruction = dialect === 'saudi_white'
    ? 'مكتوب باللهجة البيضاء السعودية المحلية البسيطة والدارجة تسويقياً (مثل استخدام كلمات: يا هلا، حياكم، وفرناه لكم، وش تنتظرون، رهيب، ميزته، إلخ). ويجب أن يكون النص طبيعياً وخالياً من أي تشكيل أو حركات برمجية تماماً لمنع تعطل أو تشويه نبرة النطق، وتجنب اللكنات الأجنبية.'
    : 'مكتوب باللغة العربية الفصحى التسويقية الأنيقة والمبسطة والمفهومة للجميع. ويجب أن يكون النص طبيعياً وخالياً من أي تشكيل أو حركات برمجية تماماً لمنع تشوه نبرة النطق.';

  const prompt = `
أنت خبير تسويق إلكتروني سعودي ومتخصص في تهيئة محركات البحث (SEO) للمتاجر الإلكترونية الكبرى مثل سلة وزد.
مهمتك هي تحليل المنتج وصياغة محتوى تسويقي احترافي متكامل وجذاب جداً لزيادة المبيعات والتحويلات.
 
يجب أن تلتزم بالقواعد التالية في الصياغة:
1. صياغة النص الرئيسي والترويجي بـ ${dialectInstruction}.
2. استخدام نبرة صوت تسويقية تتبع الأسلوب: ${tone}.
3. استخدام الكلمات المفتاحية التالية بشكل طبيعي وذكي في النص والـ SEO: ${keywords.join(', ')}.
 
تأتي إليك مدخلات المنتج كالتالي:
- اسم المنتج: ${productName}
- تصنيف المنتج: ${category}
${additionalNotes ? `- تفاصيل ومواصفات المنتج الإضافية وآلية عمله وأهميته: ${additionalNotes}` : ''}
${imagePart ? '- تم إرفاق صورة للمنتج، قم بتحليلها بصرياً وتضمين محتوياتها وألوانها ومميزاتها في الوصف والنص البديل.' : ''}
${pdfPart ? '- تم إرفاق ملف PDF يحتوي على كتيب تعليمات أو مواصفات المنتج، يرجى استخراج البيانات الفنية والفوائد بدقة وصياغتها بالعربية.' : ''}
 
أرجع الإجابة حتماً وبشكل صارم بصيغة كائن JSON فقط (دون كتابة \`\`\`json أو أي نصوص تمهيدية قبل أو بعد الـ JSON) بالهيكل التالي تماماً:
{
  "generated_title": "عنوان منتج جذاب ومحسن للبحث (أقل من 60 حرفاً)",
  "generated_description": "وصف تسويقي بيعي مقنع يركز على الفوائد والمشاعر ومشاكل العميل وحلولها، مقسم إلى نقاط واضحة وعناوين فرعية لتسهيل القراءة من الجوال",
  "seo_title": "عنوان صفحة الـ SEO لنتائج بحث جوجل وجذاب للنقر يحتوي على الكلمة المفتاحية الرئيسية (أقل من 60 حرفاً)",
  "seo_description": "وصف الـ SEO التعريفي لنتائج بحث جوجل مشوق ومحفز للنقر يحتوي على الكلمات المفتاحية (أقل من 160 حرفاً)",
  "image_alt_text": "نص بديل للصور ذكي ومحسن يصف الصورة المرفقة بوضوح لمحركات البحث (أقل من 80 حرفاً)",
  "social_media_copy": {
    "tiktok": "نص منشور تيك توك ترويجي وتفاعلي وقصير يحتوي على الهاشتاقات السعودية الشهيرة وإيموجيز مناسبة",
    "instagram": "نص منشور انستقرام جذاب يركز على المظهر والقيمة والهاشتاقات",
    "x": "تغريدة ترويجية قصيرة وجذابة لـ منصة إكس تتضمن الهاشتاقات لسهولة الانتشار"
  },
  "voice_script": "سكربت إعلان صوتي أو فيديو قصير مشوق ومعد خصيصاً للإلقاء الصوتي البشري ويكون ${voiceScriptInstruction}، ويجب أن يكون النص قصيراً ومكثفاً جداً (أقل من 600 حرف إجمالاً وبدون أي تشكيل أو حركات)، ويكتب كنص متصل للنسخ المباشر دون أي توجيهات مسرحية أو مؤثرات موسيقية أو إشارات إخراجية أو أسماء شخصيات (مثال: يمنع كتابة '[صوت موسيقى]' أو 'الراوي:' أو 'صوت المعلق:') بل النص المنطوق الفعلي فقط لكي يمرر مباشرة لمحرك توليد الصوت",
  "additional_marketing": {
    "haraj_copy": "منشور جاهز ومختصر ومنسق مخصص للبيع عبر منصة حراج السعودية (يحتوي على اسم المنتج، المميزات الرئيسية، الوسوم المناسبة للبحث، وصيغة تواصل جذابة)",
    "whatsapp_copy": "رسالة واتساب ترويجية منسقة بالإيموجيز والتحية الجذابة جاهزة للإرسال المباشر للزبائن للتفاعل الفوري",
    "promo_ideas": [
      "فكرة عرض ترويجي مبتكر رقم 1 للمنتج لجذب المشترين",
      "فكرة عرض ترويجي مبتكر رقم 2 للمنتج لزيادة حجم السلة الشرائية"
    ],
    "quality_score": 8,
    "quality_tip": "نصيحة استشارية تسويقية واحدة سريعة باللهجة المحددة لتحسين بطاقة المنتج وجعلها أكثر إقناعاً للعملاء"
  }
}
`;

  try {
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt }
        ]
      }]
    }

    // إدراج الصورة أو الـ PDF في طلب الـ API إذا توفرا
    if (imagePart) {
      requestBody.contents[0].parts.push(imagePart)
    }
    if (pdfPart) {
      requestBody.contents[0].parts.push(pdfPart)
    }

    const maxAttempts = 3
    let attempt = 0
    let backoff = 1000
    let responseText = ''
    let responseData = null

    while (attempt < maxAttempts) {
      try {
        const response = await fetch(GEMINI_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })

        const data = await response.json()
        responseData = data

        if (response.status === 429) {
          attempt++
          if (attempt < maxAttempts) {
            console.warn(`تم تجاوز حد الطلبات لـ Gemini (429). جاري المحاولة مجدداً بعد ${backoff}ms...`)
            await new Promise(resolve => setTimeout(resolve, backoff))
            backoff *= 2
            continue
          }
          throw new Error('الخادم مشغول حالياً بسبب الضغط العالي. يرجى إعادة المحاولة بعد لحظات.')
        }

        if (!response.ok) {
          throw new Error(data.error?.message || `فشل استدعاء Gemini API. رمز الخطأ: ${response.status}`)
        }

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
          throw new Error('لم يقم نموذج الذكاء الاصطناعي بإرجاع استجابة صالحة.')
        }

        responseText = data.candidates[0].content.parts[0].text.trim()
        break // الخروج من الحلقة بنجاح
      } catch (err) {
        attempt++
        if (attempt >= maxAttempts) {
          throw err
        }
        console.warn(`خطأ مؤقت أثناء الاتصال بـ Gemini (المحاولة ${attempt}): ${err.message}. جاري إعادة المحاولة...`)
        await new Promise(resolve => setTimeout(resolve, backoff))
        backoff *= 2
      }
    }

    // تنظيف النصوص الزائدة (مثل ```json أو علامات الاقتباس) إن وجدت
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
    }

    // تحليل كائن JSON الراجع
    try {
      const parsed = JSON.parse(responseText)
      parsed._usage = {
        promptTokens: responseData?.usageMetadata?.promptTokenCount || 0,
        completionTokens: responseData?.usageMetadata?.candidatesTokenCount || 0
      }
      return parsed
    } catch (parseError) {
      console.warn('فشل في تحليل النص كـ JSON، جاري تنظيف متطور للأقواس:', parseError)
      // تنظيف إضافي متطور في حال رجوع نصوص تشويشية قبل أو بعد الأقواس
      const jsonStart = responseText.indexOf('{')
      const jsonEnd = responseText.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const cleanJsonText = responseText.substring(jsonStart, jsonEnd + 1)
        const parsed = JSON.parse(cleanJsonText)
        parsed._usage = {
          promptTokens: responseData?.usageMetadata?.promptTokenCount || 0,
          completionTokens: responseData?.usageMetadata?.candidatesTokenCount || 0
        }
        return parsed
      }
      throw new Error('لم تتم صياغة استجابة الذكاء الاصطناعي كـ JSON صالح.')
    }
  } catch (err) {
    console.error('حدث خطأ في خدمة Gemini Service:', err.message)
    throw err
  }
}
