import { useState, useEffect } from 'react'
import { ShoppingBag } from 'lucide-react'
import { generateSpeechAndUpload } from '../services/ttsService'
import { saveProductVoice, getProductVoices, deleteProductVoice, updateProductFields } from '../services/dbService'
import BasicTab from './BasicTab'
import SocialTab from './SocialTab'
import AdditionalTab from './AdditionalTab'

export default function OutputView({ 
  content, 
  userCredits, 
  userRole = 'free_user',
  onSpeechGenerated,
  productId,
  userId,
  onProductUpdated
}) {
  const [activeTab, setActiveTab] = useState('basic')
  const [copiedField, setCopiedField] = useState(null)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [ttsError, setTtsError] = useState('')
  const [voices, setVoices] = useState([])
  const [selectedVoiceKey, setSelectedVoiceKey] = useState('male_1')

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const fetchVoices = async () => {
    if (!productId) return
    try {
      const list = await getProductVoices(productId)
      setVoices(list)
    } catch (err) {
      console.error('خطأ أثناء جلب أصوات المنتج:', err.message)
    }
  }

  useEffect(() => {
    fetchVoices()
  }, [productId])

  const handleGenerateVoice = async () => {
    const scriptLength = content.voice_script?.length || 0
    const voiceCostUSD = scriptLength * 0.00018
    const voiceCostHalalas = voiceCostUSD * 375
    const requiredVoiceCredits = Math.max(1, Math.ceil(voiceCostHalalas))

    if (userCredits < requiredVoiceCredits) {
      setTtsError(`رصيدك غير كافٍ لتوليد التعليق الصوتي. تحتاج إلى ${requiredVoiceCredits} نقطة، رصيدك الحالي هو ${userCredits} نقطة.`)
      return
    }

    setTtsLoading(true)
    setTtsError('')

    try {
      // توليد الصوت ورفعه لـ Supabase Storage
      const { audioUrl, charCount } = await generateSpeechAndUpload(content.voice_script, selectedVoiceKey)
      
      // حفظ المقطع الصوتي الجديد في جدول product_voices
      const newVoice = await saveProductVoice({
        product_id: productId,
        user_id: userId,
        voice_url: audioUrl,
        voice_gender: selectedVoiceKey,
        elevenlabs_chars: charCount
      })

      // تحديث قائمة الأصوات المولدة
      setVoices(prev => [newVoice, ...prev])

      // إبلاغ المكون الرئيسي لخصم الأرصدة
      if (onSpeechGenerated) {
        await onSpeechGenerated(audioUrl, requiredVoiceCredits)
      }
    } catch (err) {
      console.error('خطأ في توليد الصوت:', err.message)
      setTtsError(err.message || 'فشل توليد الصوت. يرجى مراجعة إعدادات الخدمة.')
    } finally {
      setTtsLoading(false)
    }
  }

  const handleDeleteVoice = async (voiceId) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المقطع الصوتي؟')) return
    try {
      await deleteProductVoice(voiceId)
      setVoices(prev => prev.filter(v => v.id !== voiceId))
    } catch (err) {
      console.error('خطأ أثناء حذف الصوت:', err.message)
      alert('فشل حذف المقطع الصوتي: ' + err.message)
    }
  }

  const handleUpdateProduct = async (updatedFields) => {
    try {
      const updatedProduct = await updateProductFields(productId, updatedFields)
      if (onProductUpdated) {
        onProductUpdated(updatedProduct)
      }
    } catch (err) {
      console.error('خطأ في تحديث المنتج:', err.message)
      throw err
    }
  }

  return (
    <div className="bg-[#111318] border border-[#2e3039] p-6 rounded-2xl shadow-xl h-full flex flex-col">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-[#2e3039] pb-3">
        <ShoppingBag className="w-5 h-5 text-purple-400" />
        مخرجات التوليد الذكي
      </h3>

      {/* التبويبات الثلاثة */}
      <div className="flex gap-2 bg-[#0b0c10] p-1.5 rounded-xl border border-[#2e3039] mb-6 animate-fade-in">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'basic' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
        >
          الوصف والـ SEO
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'social' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
        >
          الإعلان والصوت
        </button>
        <button
          onClick={() => setActiveTab('additional')}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'additional' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
        >
          أدوات ترويجية إضافية
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 max-h-[500px] pr-2">
        {activeTab === 'basic' && (
          <BasicTab 
            content={content} 
            productId={productId} 
            handleCopy={handleCopy} 
            copiedField={copiedField}
            onUpdateProduct={handleUpdateProduct}
          />
        )}

        {activeTab === 'social' && (
          <SocialTab 
            content={content}
            userCredits={userCredits}
            userRole={userRole}
            voices={voices}
            selectedVoiceKey={selectedVoiceKey}
            setSelectedVoiceKey={setSelectedVoiceKey}
            ttsLoading={ttsLoading}
            ttsError={ttsError}
            handleGenerateVoice={handleGenerateVoice}
            handleDeleteVoice={handleDeleteVoice}
            handleCopy={handleCopy}
            copiedField={copiedField}
            onUpdateProduct={handleUpdateProduct}
            productId={productId}
          />
        )}

        {activeTab === 'additional' && (
          <AdditionalTab 
            content={content} 
            productId={productId} 
            handleCopy={handleCopy} 
            copiedField={copiedField}
            onUpdateProduct={handleUpdateProduct}
          />
        )}
      </div>
    </div>
  )
}
