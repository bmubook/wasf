import { useState, useEffect } from 'react'
import { Copy, Check, Pencil, Save } from 'lucide-react'

export default function BasicTab({ content, productId, handleCopy, copiedField, onUpdateProduct }) {
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedSeoTitle, setEditedSeoTitle] = useState('')
  const [editedSeoDescription, setEditedSeoDescription] = useState('')
  const [editedAltText, setEditedAltText] = useState('')

  const [editModes, setEditModes] = useState({
    title: false,
    desc: false,
    seoTitle: false,
    seoDesc: false,
    altText: false
  })

  // Sync state on product change
  useEffect(() => {
    if (content) {
      setEditedTitle(content.generated_title || '')
      setEditedDescription(content.generated_description || '')
      setEditedSeoTitle(content.seo_title || '')
      setEditedSeoDescription(content.seo_description || '')
      setEditedAltText(content.image_alt_text || '')
    }
  }, [content, productId])

  const toggleEdit = async (field) => {
    const isEditing = editModes[field]
    if (isEditing) {
      try {
        let fieldName = ''
        let value = ''
        if (field === 'title') { fieldName = 'generated_title'; value = editedTitle; }
        if (field === 'desc') { fieldName = 'generated_description'; value = editedDescription; }
        if (field === 'seoTitle') { fieldName = 'seo_title'; value = editedSeoTitle; }
        if (field === 'seoDesc') { fieldName = 'seo_description'; value = editedSeoDescription; }
        if (field === 'altText') { fieldName = 'image_alt_text'; value = editedAltText; }

        if (onUpdateProduct && fieldName) {
          await onUpdateProduct({ [fieldName]: value })
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
      {/* عنوان المنتج المولد */}
      <div className="bg-[#161920] border border-[#2e3039] p-4 rounded-xl relative group">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-bold text-gray-400">عنوان المنتج المقترح</label>
          <button
            type="button"
            onClick={() => toggleEdit('title')}
            className="p-1 hover:bg-[#111318] rounded text-gray-400 hover:text-purple-400 transition-all"
            title={editModes.title ? "حفظ التعديل" : "تعديل العنوان"}
          >
            {editModes.title ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
        </div>
        {editModes.title ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="w-full bg-[#111318] border border-[#2e3039] rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-purple-500 text-sm text-right pr-10"
          />
        ) : (
          <p className="text-white font-medium pr-10 leading-relaxed">{editedTitle}</p>
        )}
        <button
          onClick={() => handleCopy(editedTitle, 'title')}
          className="absolute left-3 bottom-3 p-2 bg-[#111318] hover:bg-purple-600/10 rounded-lg text-gray-400 hover:text-purple-400 border border-[#2e3039] transition-all"
        >
          {copiedField === 'title' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* الوصف البيعي المولد */}
      <div className="bg-[#161920] border border-[#2e3039] p-4 rounded-xl relative group">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-bold text-gray-400">الوصف التسويقي والفوائد</label>
          <button
            type="button"
            onClick={() => toggleEdit('desc')}
            className="p-1 hover:bg-[#111318] rounded text-gray-400 hover:text-purple-400 transition-all"
            title={editModes.desc ? "حفظ التعديل" : "تعديل الوصف"}
          >
            {editModes.desc ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
        </div>
        {editModes.desc ? (
          <textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            rows="6"
            className="w-full bg-[#111318] border border-[#2e3039] rounded-lg py-2 px-3 text-white focus:outline-none focus:border-purple-500 text-sm text-right pr-10 resize-y"
          />
        ) : (
          <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap pr-10">{editedDescription}</div>
        )}
        <button
          onClick={() => handleCopy(editedDescription, 'desc')}
          className="absolute left-3 bottom-3 p-2 bg-[#111318] hover:bg-purple-600/10 rounded-lg text-gray-400 hover:text-purple-400 border border-[#2e3039] transition-all"
        >
          {copiedField === 'desc' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* SEO Title & Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#161920] border border-[#2e3039] p-4 rounded-xl relative group">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-gray-400">عنوان الـ SEO (Meta Title)</label>
            <button
              type="button"
              onClick={() => toggleEdit('seoTitle')}
              className="p-1 hover:bg-[#111318] rounded text-gray-400 hover:text-purple-400 transition-all"
            >
              {editModes.seoTitle ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
          </div>
          {editModes.seoTitle ? (
            <input
              type="text"
              value={editedSeoTitle}
              onChange={(e) => setEditedSeoTitle(e.target.value)}
              className="w-full bg-[#111318] border border-[#2e3039] rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-purple-500 text-sm text-right pr-10"
            />
          ) : (
            <p className="text-gray-200 text-sm font-medium pr-10 leading-relaxed">{editedSeoTitle}</p>
          )}
          <button
            onClick={() => handleCopy(editedSeoTitle, 'seo_title')}
            className="absolute left-3 bottom-3 p-1.5 bg-[#111318] hover:bg-purple-600/10 rounded-lg text-gray-400 hover:text-purple-400 border border-[#2e3039]"
          >
            {copiedField === 'seo_title' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="bg-[#161920] border border-[#2e3039] p-4 rounded-xl relative group">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-gray-400">وصف الـ SEO (Meta Description)</label>
            <button
              type="button"
              onClick={() => toggleEdit('seoDesc')}
              className="p-1 hover:bg-[#111318] rounded text-gray-400 hover:text-purple-400 transition-all"
            >
              {editModes.seoDesc ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
          </div>
          {editModes.seoDesc ? (
            <textarea
              value={editedSeoDescription}
              onChange={(e) => setEditedSeoDescription(e.target.value)}
              rows="3"
              className="w-full bg-[#111318] border border-[#2e3039] rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-purple-500 text-sm text-right pr-10 resize-none"
            />
          ) : (
            <p className="text-gray-200 text-sm pr-10 leading-relaxed">{editedSeoDescription}</p>
          )}
          <button
            onClick={() => handleCopy(editedSeoDescription, 'seo_desc')}
            className="absolute left-3 bottom-3 p-1.5 bg-[#111318] hover:bg-purple-600/10 rounded-lg text-gray-400 hover:text-purple-400 border border-[#2e3039]"
          >
            {copiedField === 'seo_desc' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* النص البديل للصور */}
      <div className="bg-[#161920] border border-[#2e3039] p-4 rounded-xl relative group">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-bold text-gray-400">النص البديل للصور (Alt Text)</label>
          <button
            type="button"
            onClick={() => toggleEdit('altText')}
            className="p-1 hover:bg-[#111318] rounded text-gray-400 hover:text-purple-400 transition-all"
          >
            {editModes.altText ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
        </div>
        {editModes.altText ? (
          <input
            type="text"
            value={editedAltText}
            onChange={(e) => setEditedAltText(e.target.value)}
            className="w-full bg-[#111318] border border-[#2e3039] rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-purple-500 text-sm text-right pr-10"
          />
        ) : (
          <p className="text-gray-200 text-sm pr-10 leading-relaxed">{editedAltText}</p>
        )}
        <button
          onClick={() => handleCopy(editedAltText, 'alt_text')}
          className="absolute left-3 bottom-3 p-2 bg-[#111318] hover:bg-purple-600/10 rounded-lg text-gray-400 hover:text-purple-400 border border-[#2e3039] transition-all"
        >
          {copiedField === 'alt_text' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
