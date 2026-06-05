import { useState, useEffect } from 'react'
import { generateProductContent, fileToGenerativePart } from '../services/geminiService'
import { uploadFileToStorage } from '../services/ttsService'
import { deductUserCredits, saveGeneratedProduct, getUserProfile, requestSubscription, updateProductVoiceUrl } from '../services/dbService'
import { Sparkles, FileText, Image, AlertCircle, RefreshCw, LogOut, ShieldAlert, Clock, CreditCard } from 'lucide-react'
import OutputView from './OutputView'
import VoiceRecorder from './VoiceRecorder'

export default function Dashboard({ user, onSignOut, onOpenAdmin, onOpenHistory, activeProduct, setActiveProduct }) {
  const [profile, setProfile] = useState(null)
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('')
  const [keywords, setKeywords] = useState([])
  const [currentKeyword, setCurrentKeyword] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [dialect, setDialect] = useState('saudi_white')
  const [tone, setTone] = useState('بيعية حماسية ترويجية')
  const [imageFile, setImageFile] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [receiptFile, setReceiptFile] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [generatedResult, setGeneratedResult] = useState(activeProduct || null)

  // مزامنة حالة المنتج النشط والمدخلات عند التغيير من الخارج (السجل التاريخي)
  useEffect(() => {
    if (activeProduct) {
      setGeneratedResult(activeProduct)
      setProductName(activeProduct.product_name || '')
      setCategory(activeProduct.category || '')
      setKeywords(Array.isArray(activeProduct.keywords) ? activeProduct.keywords : [])
      setAdditionalNotes(activeProduct.additional_notes || '')
      setDialect(activeProduct.dialect || 'saudi_white')
      setTone(activeProduct.tone || 'بيعية حماسية ترويجية')
    }
  }, [activeProduct])

  const fetchProfile = async () => {
    if (!user || !user.id) return
    try {
      const data = await getUserProfile(user.id)
      setProfile(data)
    } catch (err) {
      console.error('خطأ في جلب بيانات الملف الشخصي:', err.message)
      setErrorMsg(`فشل تحميل بيانات الحساب: ${err.message || 'خطأ في الاتصال بقاعدة البيانات'}`)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [user.id])

  // تحميل المسودة المحفوظة تلقائياً عند تحميل المكون
  useEffect(() => {
    if (!activeProduct) {
      const savedDraft = localStorage.getItem('wasf_draft')
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          if (draft.productName) setProductName(draft.productName)
          if (draft.category) setCategory(draft.category)
          if (draft.keywords) {
            setKeywords(draft.keywords)
          } else if (draft.keywordsInput) {
            setKeywords(draft.keywordsInput.split(',').map(k => k.trim()).filter(Boolean))
          }
          if (draft.additionalNotes) setAdditionalNotes(draft.additionalNotes)
          if (draft.dialect) setDialect(draft.dialect)
          if (draft.tone) setTone(draft.tone)
        } catch (e) {
          console.error('حدث خطأ أثناء تحميل المسودة:', e)
        }
      }
    }
  }, [activeProduct])

  // حفظ المسودة تلقائياً في التخزين المحلي عند تغيير أي من المدخلات
  useEffect(() => {
    // التحقق مما إذا كانت الحقول تطابق المنتج النشط المعروض لمنع حفظه كمسودة
    const matchesActiveProduct = activeProduct &&
      productName === (activeProduct.product_name || '') &&
      category === (activeProduct.category || '') &&
      JSON.stringify(keywords) === JSON.stringify(Array.isArray(activeProduct.keywords) ? activeProduct.keywords : []) &&
      additionalNotes === (activeProduct.additional_notes || '') &&
      dialect === (activeProduct.dialect || 'saudi_white') &&
      tone === (activeProduct.tone || 'بيعية حماسية ترويجية');

    const hasContent = productName || additionalNotes || category || keywords.length > 0
    
    if (hasContent && !matchesActiveProduct) {
      const draft = {
        productName,
        category,
        keywords,
        additionalNotes,
        dialect,
        tone
      }
      localStorage.setItem('wasf_draft', JSON.stringify(draft))
    } else if (!hasContent) {
      localStorage.removeItem('wasf_draft')
    }
  }, [productName, category, keywords, additionalNotes, dialect, tone, activeProduct])

  const handleClearDraft = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح كافة الحقول والمسودة المحفوظة؟')) {
      setProductName('')
      setCategory('')
      setKeywords([])
      setAdditionalNotes('')
      setCurrentKeyword('')
      setImageFile(null)
      setPdfFile(null)
      setGeneratedResult(null)
      if (setActiveProduct) {
        setActiveProduct(null)
      }
      localStorage.removeItem('wasf_draft')
      setSuccessMsg('تم مسح المسودة وإعادة تعيين الحقول بنجاح.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const handleSaveDraftManual = () => {
    const draft = {
      productName,
      category,
      keywords,
      additionalNotes,
      dialect,
      tone
    }
    localStorage.setItem('wasf_draft', JSON.stringify(draft))
    setSuccessMsg('تم حفظ المسودة بنجاح! 💾')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!profile) {
      setErrorMsg('جاري تحميل بيانات حسابك، يرجى الانتظار لحظة ثم المحاولة مجدداً.')
      return
    }
    if (profile.credits < 5) {
      setErrorMsg('رصيدك منخفض جداً لإجراء التوليد (تحتاج إلى 5 نقاط على الأقل كحد أمان). يرجى شحن الرصيد.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    setGeneratedResult(null)

    try {
      // 1. تحضير الملفات ورفعها لـ Cloudflare R2
      let imageUrl = ''
      let pdfUrl = ''
      let imagePart = null
      let pdfPart = null

      if (imageFile) {
        // التحقق من حجم الملف
        if (imageFile.size > 5 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت.')
        const fileName = `products/${Date.now()}_${imageFile.name}`
        imageUrl = await uploadFileToStorage(fileName, imageFile, imageFile.type)
        imagePart = await fileToGenerativePart(imageFile)
      }

      if (pdfFile) {
        if (pdfFile.size > 5 * 1024 * 1024) throw new Error('حجم ملف الـ PDF يجب ألا يتجاوز 5 ميجابايت.')
        const fileName = `instructions/${Date.now()}_${pdfFile.name}`
        pdfUrl = await uploadFileToStorage(fileName, pdfFile, pdfFile.type)
        pdfPart = await fileToGenerativePart(pdfFile)
      }

      // 2. استدعاء Gemini لتوليد المحتوى بالكامل في استدعاء واحد
      const result = await generateProductContent({
        productName,
        category,
        keywords,
        dialect,
        tone,
        imagePart,
        pdfPart,
        additionalNotes
      })

      // 3. حساب النقاط الفعلية بناءً على استهلاك الرموز (1 رصيد = 1 هللة تكلفة API)
      const promptTokens = result._usage?.promptTokens || 0
      const completionTokens = result._usage?.completionTokens || 0
      const costUSD = (promptTokens * 0.000000075) + (completionTokens * 0.00000030)
      const costHalalas = costUSD * 375
      const creditsToDeduct = Math.max(1, Math.ceil(costHalalas))

      await deductUserCredits(user.id, creditsToDeduct)

      // 4. حفظ النتائج في Supabase
      const savedProduct = await saveGeneratedProduct({
        user_id: user.id,
        product_name: productName,
        category,
        keywords,
        tone,
        dialect,
        image_url: imageUrl,
        pdf_url: pdfUrl,
        additional_notes: additionalNotes,
        generated_title: result.generated_title,
        generated_description: result.generated_description,
        seo_title: result.seo_title,
        seo_description: result.seo_description,
        image_alt_text: result.image_alt_text,
        social_media_copy: result.social_media_copy,
        voice_script: result.voice_script,
        additional_marketing: result.additional_marketing,
        gemini_prompt_tokens: promptTokens,
        gemini_completion_tokens: completionTokens
      })

      setProductName('')
      setCategory('')
      setKeywords([])
      setAdditionalNotes('')
      setCurrentKeyword('')
      setImageFile(null)
      setPdfFile(null)
      setGeneratedResult(savedProduct)
      if (setActiveProduct) {
        setActiveProduct(savedProduct)
      }
      setSuccessMsg(`تم توليد الوصف بنجاح وحفظه وخصم ${creditsToDeduct} نقاط من رصيدك!`)
      localStorage.removeItem('wasf_draft') // حذف المسودة تلقائياً بعد نجاح التوليد
      await fetchProfile() // تحديث الأرصدة في الواجهة
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'حدث خطأ أثناء التوليد. يرجى مراجعة إعدادات المفاتيح.')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadReceipt = async (e) => {
    e.preventDefault()
    if (!receiptFile) return
    setReceiptLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const fileName = `receipts/${Date.now()}_${receiptFile.name}`
      const receiptUrl = await uploadFileToStorage(fileName, receiptFile, receiptFile.type)
      await requestSubscription(user.id, receiptUrl)
      setSuccessMsg('تم إرسال إيصال الحوالة بنجاح! سيقوم المشرف بمراجعته وتفعيل باقتك قريباً.')
      setReceiptFile(null)
    } catch (err) {
      setErrorMsg(err.message || 'فشل إرسال الإيصال.')
    } finally {
      setReceiptLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* البار العلوي للمعلومات والتحكم */}
      <div className="bg-[#111318] border border-[#2e3039] p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600/10 p-2 rounded-xl text-purple-400 font-bold border border-purple-500/20 text-xs">
            الرصيد المتبقي: {profile ? profile.credits : '...'} نقطة
          </div>
          <span className="text-sm text-gray-400">مرحباً بك: <strong className="text-white">{profile?.email}</strong></span>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {profile?.role === 'admin' && (
            <button onClick={onOpenAdmin} className="flex-1 md:flex-none py-2 px-4 bg-purple-600/10 border border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 justify-center">
              <ShieldAlert className="w-4 h-4" />
              لوحة الإدارة
            </button>
          )}
          <button onClick={onOpenHistory} className="flex-1 md:flex-none py-2 px-4 bg-[#161920] border border-[#2e3039] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 justify-center">
            <Clock className="w-4 h-4" />
            سجل الأوصاف
          </button>
          <button onClick={onSignOut} className="py-2 px-3 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/30 rounded-xl text-xs transition-all flex items-center gap-1">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-200 text-sm gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center p-4 bg-green-900/20 border border-green-500/30 rounded-xl text-green-200 text-sm gap-2">
          <Sparkles className="w-5 h-5 text-green-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* لوحة العمل الرئيسية (قسمين متجاورين) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* القسم الأيمن: نموذج الإدخال */}
        <form onSubmit={handleGenerate} className="lg:col-span-5 bg-[#111318] border border-[#2e3039] p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#2e3039] pb-3 mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              بيانات المنتج المراد صياغته
            </h3>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleClearDraft}
                className="py-1 px-2.5 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                title="مسح كافة الحقول الحالية والمسودة المحفوظة"
              >
                مسح المسودة
              </button>
              <button
                type="button"
                onClick={handleSaveDraftManual}
                className="py-1 px-2.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                title="حفظ المدخلات الحالية كمسودة يدوياً"
              >
                حفظ المسودة
              </button>
              <span className="text-[9px] text-gray-500 font-medium bg-[#161920] px-2 py-1 rounded-md border border-[#2e3039]">تلقائي 💾</span>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">اسم المنتج *</label>
            <input type="text" required value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="مثال: سماعة بلوتوث لاسلكية" className="w-full bg-[#161920] border border-[#2e3039] rounded-xl py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-right" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">التصنيف</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثال: إلكترونيات" className="w-full bg-[#161920] border border-[#2e3039] rounded-xl py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-right" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">الكلمات المفتاحية للـ SEO (اكتب الكلمة واضغط Enter)</label>
            <div className="w-full bg-[#161920] border border-[#2e3039] rounded-xl p-2.5 flex flex-wrap gap-2 focus-within:border-purple-500 min-h-[46px] direction-rtl">
              {/* عرض الكلمات المضافة كمربعات/Chips */}
              {keywords.map((tag, idx) => (
                <span key={idx} className="bg-purple-600/10 text-purple-400 border border-purple-500/20 text-xs font-semibold py-1 px-2.5 rounded-lg flex items-center gap-1.5 direction-rtl">
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => setKeywords(prev => prev.filter((_, i) => i !== idx))}
                    className="hover:text-red-400 text-purple-400/60 font-bold text-xs"
                  >
                    ×
                  </button>
                </span>
              ))}

              {/* حقل الكتابة للكلمة الحالية */}
              <input
                type="text"
                value={currentKeyword}
                onChange={(e) => setCurrentKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); // منع إرسال الفورم الرئيسي
                    const trimmed = currentKeyword.trim();
                    if (trimmed) {
                      const hasSeparators = /[،,;؛|\n\r\t]/.test(trimmed) || trimmed.includes(' - ');
                      let newTags = [];
                      if (hasSeparators) {
                        newTags = trimmed.split(/[،,;؛|\n\r\t]|\s-\s/).map(k => k.trim()).filter(Boolean);
                      } else {
                        newTags = trimmed.split(/\s+/).map(k => k.trim()).filter(Boolean);
                      }
                      
                      if (newTags.length > 0) {
                        setKeywords(prev => {
                          const updated = [...prev];
                          newTags.forEach(tag => {
                            if (!updated.includes(tag)) {
                              updated.push(tag);
                            }
                          });
                          return updated;
                        });
                        setCurrentKeyword('');
                      }
                    }
                  }
                }}
                onBlur={() => {
                  const trimmed = currentKeyword.trim();
                  if (trimmed) {
                    const hasSeparators = /[،,;؛|\n\r\t]/.test(trimmed) || trimmed.includes(' - ');
                    let newTags = [];
                    if (hasSeparators) {
                      newTags = trimmed.split(/[،,;؛|\n\r\t]|\s-\s/).map(k => k.trim()).filter(Boolean);
                    } else {
                      newTags = trimmed.split(/\s+/).map(k => k.trim()).filter(Boolean);
                    }
                    
                    if (newTags.length > 0) {
                      setKeywords(prev => {
                        const updated = [...prev];
                        newTags.forEach(tag => {
                          if (!updated.includes(tag)) {
                            updated.push(tag);
                          }
                        });
                        return updated;
                      });
                      setCurrentKeyword('');
                    }
                  }
                }}
                placeholder={keywords.length === 0 ? "مثال: سماعة لاسلكية، ANC، صوت نقي..." : ""}
                className="flex-1 bg-transparent border-0 p-0 text-white placeholder-gray-600 focus:outline-none focus:ring-0 text-right min-w-[120px] text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-gray-400">مواصفات وتفاصيل المنتج الإضافية (طريقة العمل، الفوائد والأهمية)</label>
              <VoiceRecorder 
                value={additionalNotes}
                onChange={setAdditionalNotes}
                onError={(err) => setErrorMsg(err)}
                onSuccess={(msg) => setSuccessMsg(msg)}
              />
            </div>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="مثال: سماعة مقاومة للماء والتعرق بالكامل بمعيار IPX7، تدعم خاصية إلغاء الضوضاء النشط ANC، وتعمل باللمس مع بطارية تدوم 40 ساعة للاستخدام الشاق..."
              rows="3"
              className="w-full bg-[#161920] border border-[#2e3039] rounded-xl py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-right text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">اللهجة / اللغة</label>
              <select value={dialect} onChange={(e) => setDialect(e.target.value)} className="w-full bg-[#161920] border border-[#2e3039] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-purple-500 text-right">
                <option value="saudi_white">سعودية بيضاء 🇸🇦</option>
                <option value="fusha">عربية فصحى ✍️</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">نبرة الصوت</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-[#161920] border border-[#2e3039] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-purple-500 text-right">
                <option value="بيعية حماسية ترويجية">حماسية بيعية 🔥</option>
                <option value="ودية إقناعية مبسطة">ودية مقنعة 😊</option>
                <option value="فاخرة أنيقة">فاخرة أنيقة ✨</option>
                <option value="سرد قصصي">سرد قصصي 📖</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                <Image className="w-3.5 h-3.5" /> صورة المنتج
              </label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full text-xs text-gray-400 file:mr-0 file:ml-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600/10 file:text-purple-400 hover:file:bg-purple-600/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> ملف التعليمات PDF
              </label>
              <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files[0])} className="w-full text-xs text-gray-400 file:mr-0 file:ml-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600/10 file:text-purple-400 hover:file:bg-purple-600/20" />
            </div>
          </div>

          {/* عرض الرصيد الإجمالي المتاح للتاجر في نموذج الإضافة */}
          <div className="flex items-center justify-between bg-[#161920]/80 border border-[#2e3039] p-3 rounded-xl text-xs">
            <span className="text-gray-400 font-medium">رصيد النقاط الإجمالي المتاح:</span>
            <span className="font-bold text-purple-400 bg-purple-600/10 px-3 py-1 rounded-lg border border-purple-500/20">
              {profile ? `${profile.credits} نقطة` : 'جاري التحميل...'}
            </span>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'جاري التحليل والتوليد...' : `توليد وصف المنتج (نقاط مرنة)`}
          </button>
        </form>

        {/* القسم الأيسر: عرض المخرجات أو شحن الرصيد */}
        <div className="lg:col-span-7 h-full">
          {generatedResult ? (
            <OutputView 
              content={generatedResult}
              userCredits={profile?.credits || 0}
              userRole={profile?.role || 'free_user'}
              productId={generatedResult.id}
              userId={user.id}
              onSpeechGenerated={async (url, deductedCredits) => {
                // 1. خصم الأرصدة الفعلية لتوليد الصوت
                await deductUserCredits(user.id, deductedCredits)
                // 2. تحديث رصيد الحساب فقط
                await fetchProfile()
              }}
              onProductUpdated={(updatedProduct) => {
                setGeneratedResult(updatedProduct)
                if (setActiveProduct) {
                  setActiveProduct(updatedProduct)
                }
              }}
            />
          ) : (
            <div className="bg-[#111318] border border-[#2e3039] p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-6 min-h-[450px]">
              
              {/* واجهة شحن الأرصدة في حال الحاجة */}
              {profile?.credits === 0 ? (
                <form onSubmit={handleUploadReceipt} className="space-y-4 max-w-sm w-full">
                  <div className="inline-flex p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-yellow-400 mb-2">
                    <CreditCard className="w-8 h-8 animate-pulse" />
                  </div>
                  <h4 className="text-base font-bold text-white">نفد رصيدك! شحن باقة الـ 553 نقطة</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    يرجى التحويل البنكي لمبلغ **20 ريال سعودي** لحسابنا، ورفع صورة إيصال التحويل هنا لتفعيل حسابك يدوياً وشحن 553 نقطة تشغيلية.
                  </p>
                  <input type="file" accept="image/*" required onChange={(e) => setReceiptFile(e.target.files[0])} className="w-full text-xs text-gray-400 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600/10 file:text-purple-400 hover:file:bg-purple-600/20" />
                  <button type="submit" disabled={receiptLoading} className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5">
                    {receiptLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    إرسال إيصال الحوالة البنكية
                  </button>
                </form>
              ) : (
                <>
                  <Sparkles className="w-12 h-12 text-gray-600 animate-bounce" />
                  <div>
                    <h4 className="text-lg font-bold text-white">بانتظار توليد الوصف</h4>
                    <p className="text-xs text-gray-400 mt-2 max-w-md">
                      أدخل بيانات المنتج على اليمين واضغط توليد، وسيقوم الذكاء الاصطناعي بتحليل صورتك وملفك PDF وإرجاع مخرجات سلة وزد الاحترافية فوراً!
                    </p>
                  </div>
                </>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  )
}
