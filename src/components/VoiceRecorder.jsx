import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'

/**
 * مكون مسجل ومفرغ الصوت الفوري الذكي (Real-time Speech-to-Text Dictation Component)
 * يستخدم واجهة Web Speech API (webkitSpeechRecognition) المدمجة بالمتصفح.
 * يتميز بالتفريغ الفوري (Real-time) للكلمات أثناء التحدث بدقة عالية جداً للهجة السعودية (ar-SA).
 */
export default function VoiceRecorder({ value, onChange, onError, onSuccess }) {
  const [recording, setRecording] = useState(false)
  const recognitionRef = useRef(null)
  const initialTextRef = useRef('')

  const startRecording = () => {
    if (onError) onError('')
    if (onSuccess) onSuccess('')

    // التحقق من دعم المتصفح لمحرك التعرف على الصوت
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      if (onError) onError('متصفحك لا يدعم خاصية تحويل الصوت إلى نص. يرجى استخدام متصفح Google Chrome أو Microsoft Edge.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true // تمكين النتائج المؤقتة لرؤية الكلمات فور نطقها
      recognition.lang = 'ar-SA' // ضبط اللهجة السعودية لضمان دقة الكلمات المحلية

      // حفظ النص الحالي قبل بدء التسجيل للبدء بالكتابة بعده
      initialTextRef.current = value || ''

      recognition.onstart = () => {
        setRecording(true)
      }

      recognition.onerror = (event) => {
        console.error('خطأ في التعرف على الصوت:', event.error)
        if (event.error === 'not-allowed') {
          if (onError) onError('فشل الوصول للميكروفون. يرجى تفعيل صلاحية الميكروفون في إعدادات المتصفح.')
        } else if (event.error === 'no-speech') {
          // تجاهل خطأ عدم وجود صوت لكي لا يقاطع المستخدم إذا صمت لحظياً
        } else {
          if (onError) onError(`حدث خطأ أثناء التسجيل: ${event.error}`)
        }
        setRecording(false)
      }

      recognition.onend = () => {
        setRecording(false)
      }

      recognition.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''

        // تجميع الكلمات المؤقتة والنهائية من المحرك
        for (let i = 0; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        // دمج النص الأصلي مع الكلام المفرغ الجديد
        const prefix = initialTextRef.current ? `${initialTextRef.current} ` : ''
        const updatedText = prefix + finalTranscript + interimTranscript

        // تحديث الصندوق في نفس اللحظة (Real-time feedback)
        if (onChange) {
          onChange(updatedText)
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error(err)
      if (onError) onError('فشل تشغيل محرك الصوت.')
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setRecording(false)
      if (onSuccess) onSuccess('تم إيقاف التسجيل الصوتي بنجاح واعتماد النص!')
    }
  }

  // تنظيف الموارد عند مغادرة الصفحة
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  return (
    <button
      type="button"
      onClick={recording ? stopRecording : startRecording}
      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
        recording 
          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse border-red-500 shadow-md shadow-red-500/20' 
          : 'bg-[#161920] hover:bg-purple-600/10 border-[#2e3039] text-purple-400 hover:text-purple-300'
      }`}
      title={recording ? 'إيقاف التسجيل واعتماد النص' : 'اضغط للشرح بالصوت ورؤية الكلمات تكتب فوراً'}
    >
      {recording ? (
        <>
          <MicOff className="w-3.5 h-3.5 text-white" />
          <span>جاري الاستماع... اضغط للإيقاف 🔴</span>
        </>
      ) : (
        <>
          <Mic className="w-3.5 h-3.5 text-purple-400" />
          <span>شرح بالصوت مباشر 🎙️</span>
        </>
      )}
    </button>
  )
}
