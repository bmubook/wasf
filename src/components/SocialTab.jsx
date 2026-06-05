import { useState, useEffect } from 'react'
import { Copy, Check, Pencil, Save, Volume2, User, AlertCircle, VolumeX, Download, Trash2, Lock } from 'lucide-react'

export default function SocialTab({
  content,
  userCredits,
  userRole = 'free_user',
  voices,
  selectedVoiceKey,
  setSelectedVoiceKey,
  ttsLoading,
  ttsError,
  handleGenerateVoice,
  handleDeleteVoice,
  handleCopy,
  copiedField,
  onUpdateProduct,
  productId
}) {
  const [editedTiktok, setEditedTiktok] = useState('')
  const [editedInstagram, setEditedInstagram] = useState('')
  const [editedX, setEditedX] = useState('')
  const [editedVoiceScript, setEditedVoiceScript] = useState('')

  const [editModes, setEditModes] = useState({
    tiktok: false,
    instagram: false,
    x: false,
    voiceScript: false
  })

  const allVoices = [
    { key: 'male_1', name: 'المعلق ماجد (رجالي 1) 🇸🇦', gender: 'male', premium: false },
    { key: 'male_2', name: 'المعلق فيصل (رجالي 2) 🇸🇦', gender: 'male', premium: true },
    { key: 'female_1', name: 'المعلقة ليان (نسائي 1) 🇸🇦', gender: 'female', premium: true },
    { key: 'female_2', name: 'المعلقة سارة (نسائي 2) 🇸🇦', gender: 'female', premium: true }
  ]

  const isPremium = userRole === 'premium_user' || userRole === 'admin'
  const estimatedVoiceCredits = Math.max(1, Math.ceil((editedVoiceScript?.length || 0) * 0.00018 * 375))

  // Sync state on product change
  useEffect(() => {
    if (content) {
      const social = content.social_media_copy || {}
      setEditedTiktok(social.tiktok || '')
      setEditedInstagram(social.instagram || '')
      setEditedX(social.x || '')
      setEditedVoiceScript(content.voice_script || '')
    }
  }, [content, productId])

  const toggleEdit = async (field) => {
    const isEditing = editModes[field]
    if (isEditing) {
      try {
        if (field === 'voiceScript') {
          if (editedVoiceScript.length > 800) {
            alert('عذراً، يجب ألا يتجاوز السكربت الصوتي 800 حرف (الحد الأقصى لتفادي التكلفة العالية وضمان جودة الصوت).')
            return
          }
          await onUpdateProduct({ voice_script: editedVoiceScript })
        } else {
          const social = { ...(content.social_media_copy || {}) }
          social[field] = field === 'tiktok' ? editedTiktok : field === 'instagram' ? editedInstagram : editedX
          await onUpdateProduct({ social_media_copy: social })
        }
      } catch (err) {
        console.error('خطأ أثناء حفظ التعديل:', err.message)
        alert('فشل حفظ التعديل: ' + err.message)
        return
      }
    }
    setEditModes(prev => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <div className="space-y-6">
      {/* منشورات السوشيال ميديا */}
      <div className="grid grid-cols-1 gap-4">
        {['tiktok', 'instagram', 'x'].map((platform) => {
          const value = platform === 'tiktok' ? editedTiktok : platform === 'instagram' ? editedInstagram : editedX
          const setValue = platform === 'tiktok' ? setEditedTiktok : platform === 'instagram' ? setEditedInstagram : setEditedX

          return (
            <div key={platform} className="bg-[#161920] border border-[#2e3039] p-4 rounded-xl relative group">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-purple-400 uppercase">{platform}</label>
                <button
                  type="button"
                  onClick={() => toggleEdit(platform)}
                  className="p-1 hover:bg-[#111318] rounded text-gray-400 hover:text-purple-400 transition-all cursor-pointer"
                >
                  {editModes[platform] ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                </button>
              </div>

              {editModes[platform] ? (
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  rows="3"
                  className="w-full bg-[#111318] border border-[#2e3039] rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-purple-500 text-sm text-right pr-10 resize-y"
                />
              ) : (
                <p className="text-gray-200 text-sm whitespace-pre-wrap pr-10 leading-relaxed">{value}</p>
              )}

              <button
                onClick={() => handleCopy(value, platform)}
                className="absolute left-3 bottom-3 p-2 bg-[#111318] hover:bg-purple-600/10 rounded-lg text-gray-400 hover:text-purple-400 border border-[#2e3039] cursor-pointer"
              >
                {copiedField === platform ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )
        })}
      </div>

      {/* سكربت الصوت والتعليق الصوتي عند الطلب */}
      <div className="bg-[#161920] border border-[#2e3039] p-5 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <label className="block text-xs font-bold text-gray-400">سكربت الإعلان الصوتي (30 ثانية)</label>
            <span className="text-[10px] text-gray-500">({editedVoiceScript.length} / 800 حرف)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleEdit('voiceScript')}
              className="p-1.5 bg-[#111318] hover:bg-purple-600/10 rounded-lg text-gray-400 hover:text-purple-400 border border-[#2e3039] cursor-pointer"
              title={editModes.voiceScript ? "حفظ السكربت" : "تعديل السكربت"}
            >
              {editModes.voiceScript ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => handleCopy(editedVoiceScript, 'voice_script')}
              className="p-1.5 bg-[#111318] hover:bg-purple-600/10 rounded-lg text-gray-400 hover:text-purple-400 border border-[#2e3039] cursor-pointer"
            >
              {copiedField === 'voice_script' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {editModes.voiceScript ? (
          <textarea
            value={editedVoiceScript}
            onChange={(e) => setEditedVoiceScript(e.target.value)}
            rows="4"
            maxLength={800}
            className="w-full bg-[#111318] border border-[#2e3039] rounded-lg py-2 px-3 text-white focus:outline-none focus:border-purple-500 text-sm text-right pr-10 resize-y"
          />
        ) : (
          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{editedVoiceScript}</p>
        )}

        {/* تحويل النص لصوت (TTS) متعدد الخيارات */}
        <div className="border-t border-[#2e3039] pt-4 space-y-4">
          {ttsError && (
            <div className="flex items-center p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-xs gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{ttsError}</span>
            </div>
          )}

          {/* خيارات التوليد الصوتي */}
          <div className="bg-[#0b0c10]/40 p-4 rounded-xl border border-[#2e3039]/40 space-y-4">
            
            {/* اختيار معلق الصوت للإعلان */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-gray-300">اختر معلق الصوت للإعلان:</label>
                <span className="text-[10px] text-gray-500">يستهلك التوليد حوالي {estimatedVoiceCredits} نقطة (نظام مرن).</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allVoices.map((v) => {
                  const locked = v.premium && !isPremium
                  const selected = selectedVoiceKey === v.key

                  return (
                    <button
                      key={v.key}
                      type="button"
                      disabled={locked}
                      onClick={() => setSelectedVoiceKey(v.key)}
                      className={`relative p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                        selected 
                          ? 'bg-purple-600/10 border-purple-500 text-white shadow-md' 
                          : locked
                            ? 'bg-[#161920]/40 border-[#2e3039]/50 text-gray-600 cursor-not-allowed opacity-60'
                            : 'bg-[#111318] border-[#2e3039] text-gray-300 hover:text-white hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className={`w-4 h-4 ${selected ? 'text-purple-400' : 'text-gray-500'}`} />
                        <span className="text-xs font-semibold">{v.name}</span>
                      </div>
                      
                      {locked ? (
                        <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/20 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          ترقية 👑
                        </span>
                      ) : selected ? (
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleGenerateVoice}
              disabled={ttsLoading || editModes.voiceScript}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              {ttsLoading ? 'جاري التوليد الصوتي الفخم...' : editModes.voiceScript ? 'يرجى حفظ السكربت أولاً' : `توليد وحفظ ملف صوتي جديد (يستهلك ${estimatedVoiceCredits} نقطة)`}
            </button>
          </div>

          {/* قائمة الأصوات المولدة مسبقاً */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-400">الأصوات المحفوظة لهذا المنتج ({voices.length})</label>
            {voices.length === 0 ? (
              <div className="text-center py-4 bg-[#0b0c10]/20 rounded-xl border border-dashed border-[#2e3039] text-xs text-gray-600 flex flex-col items-center justify-center gap-1">
                <VolumeX className="w-5 h-5 text-gray-600" />
                <span>لا توجد أي أصوات مولدة للمنتج بعد.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {voices.map((v, index) => {
                  const matchedVoice = allVoices.find(voice => voice.key === v.voice_gender)
                  const voiceLabel = matchedVoice ? matchedVoice.name : (v.voice_gender.includes('female') ? 'صوت امرأة' : 'صوت رجل')
                  const isFemale = v.voice_gender.includes('female')
                  const providerName = 'ElevenLabs 🇸🇦'

                  return (
                    <div key={v.id} className="bg-[#0b0c10] p-3 rounded-xl border border-[#2e3039] flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="w-5 h-5 bg-purple-600/10 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {voices.length - index}
                        </span>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isFemale ? 'bg-pink-900/20 text-pink-400 border border-pink-500/20' : 'bg-blue-900/20 text-blue-400 border border-blue-500/20'}`}>
                            {voiceLabel}
                          </span>
                          {v.elevenlabs_chars > 0 && (
                            <span className="text-[9px] text-gray-400 mr-2">
                              {v.elevenlabs_chars} حرف
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500 block mt-1">
                            تم التوليد: {new Date(v.created_at).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <audio src={v.voice_url} controls className="h-7 max-w-full sm:w-44" />
                        {(() => {
                          const fileExt = v.voice_url ? v.voice_url.split('?')[0].split('.').pop() : 'mp3';
                          return (
                            <a
                              href={v.voice_url}
                              download={`voice_${v.id}.${fileExt}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-[#161920] hover:bg-purple-600/10 rounded-lg text-gray-400 hover:text-purple-400 border border-[#2e3039]"
                              title="تحميل الملف الصوتي"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )
                        })()}
                        <button
                          onClick={() => handleDeleteVoice(v.id)}
                          className="p-1.5 bg-[#161920] hover:bg-red-950/30 rounded-lg text-gray-400 hover:text-red-400 border border-[#2e3039]"
                          title="حذف الصوت"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
