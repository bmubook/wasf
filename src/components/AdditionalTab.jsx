import { useState, useEffect } from 'react'
import { Copy, Check, Pencil, Save, Award } from 'lucide-react'

export default function AdditionalTab({
  content,
  productId,
  handleCopy,
  copiedField,
  onUpdateProduct
}) {
  const [editedHaraj, setEditedHaraj] = useState('')
  const [editedWhatsapp, setEditedWhatsapp] = useState('')

  const [editModes, setEditModes] = useState({
    haraj: false,
    whatsapp: false
  })

  // Sync state on product change
  useEffect(() => {
    if (content) {
      const marketing = content.additional_marketing || {}
      setEditedHaraj(marketing.haraj_copy || '')
      setEditedWhatsapp(marketing.whatsapp_copy || '')
    }
  }, [content, productId])

  const toggleEdit = async (field) => {
    const isEditing = editModes[field]
    if (isEditing) {
      try {
        const marketing = { ...(content.additional_marketing || {}) }
        marketing[field === 'haraj' ? 'haraj_copy' : 'whatsapp_copy'] = field === 'haraj' ? editedHaraj : editedWhatsapp
        await onUpdateProduct({ additional_marketing: marketing })
      } catch (err) {
        console.error('خطأ أثناء حفظ التعديل:', err.message)
        alert('فشل حفظ التعديل: ' + err.message)
        return
      }
    }
    setEditModes(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const additionalMarketing = content.additional_marketing || {}

  return (
    <div className="space-y-6">
      {/* منشور منصة حراج */}
      <div className="bg-[#161920] border border-[#2e3039] p-4 rounded-xl relative group">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-bold text-gray-400">إعلان جاهز لمنصة حراج 🇸🇦</label>
          <button
            type="button"
            onClick={() => toggleEdit('haraj')}
            className="p-1 hover:bg-[#111318] rounded text-gray-400 hover:text-purple-400 transition-all"
          >
            {editModes.haraj ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
        </div>

        {editModes.haraj ? (
          <textarea
            value={editedHaraj}
            onChange={(e) => setEditedHaraj(e.target.value)}
            rows="5"
            className="w-full bg-[#111318] border border-[#2e3039] rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-purple-500 text-sm text-right pr-10 resize-y"
          />
        ) : (
          <p className="text-gray-200 text-sm whitespace-pre-wrap pr-10 leading-relaxed">{editedHaraj}</p>
        )}

        <button
          onClick={() => handleCopy(editedHaraj, 'haraj')}
          className="absolute left-3 bottom-3 p-2 bg-[#111318] hover:bg-purple-600/10 rounded-lg text-gray-400 hover:text-purple-400 border border-[#2e3039]"
        >
          {copiedField === 'haraj' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* رسالة الواتساب */}
      <div className="bg-[#161920] border border-[#2e3039] p-4 rounded-xl relative group">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-bold text-green-400">رسالة ترويجية للواتساب 💬</label>
          <button
            type="button"
            onClick={() => toggleEdit('whatsapp')}
            className="p-1 hover:bg-[#111318] rounded text-gray-400 hover:text-purple-400 transition-all"
          >
            {editModes.whatsapp ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
        </div>

        {editModes.whatsapp ? (
          <textarea
            value={editedWhatsapp}
            onChange={(e) => setEditedWhatsapp(e.target.value)}
            rows="4"
            className="w-full bg-[#111318] border border-[#2e3039] rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-purple-500 text-sm text-right pr-10 resize-y"
          />
        ) : (
          <p className="text-gray-200 text-sm whitespace-pre-wrap pr-10 leading-relaxed">{editedWhatsapp}</p>
        )}

        <button
          onClick={() => handleCopy(editedWhatsapp, 'whatsapp')}
          className="absolute left-3 bottom-3 p-2 bg-[#111318] hover:bg-purple-600/10 rounded-lg text-gray-400 hover:text-purple-400 border border-[#2e3039]"
        >
          {copiedField === 'whatsapp' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* العروض الترويجية المقترحة */}
      <div className="bg-[#161920] border border-[#2e3039] p-4 rounded-xl">
        <label className="block text-xs font-bold text-gray-400 mb-3">أفكار العروض الترويجية المقترحة 💡</label>
        <ul className="space-y-2">
          {additionalMarketing.promo_ideas?.map((idea, index) => (
            <li key={index} className="text-gray-200 text-sm flex items-start gap-2 bg-[#0b0c10]/40 p-2.5 rounded-lg border border-[#2e3039]/30">
              <span className="w-5 h-5 bg-purple-600/20 text-purple-400 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">{index + 1}</span>
              <span>{idea}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* بطاقة تقييم جودة المنتج الاستشارية */}
      <div className="bg-[#161920] border border-purple-500/20 p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2e3039] pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500 animate-bounce" />
            <span className="text-sm font-bold text-white">تقييم جودة بطاقة المنتج</span>
          </div>
          <div className="text-lg font-black text-purple-400 bg-purple-600/10 px-3 py-1 rounded-lg border border-purple-500/20">
            {additionalMarketing.quality_score} / 10
          </div>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">نصيحة مستشار وصف 🧠</span>
          <p className="text-yellow-100 text-xs italic leading-relaxed">"{additionalMarketing.quality_tip}"</p>
        </div>
      </div>
    </div>
  )
}
