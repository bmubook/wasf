import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { LogIn, UserPlus, Mail, Lock, Phone, AlertCircle, Sparkles } from 'lucide-react'

export default function AuthScreen({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [countryCode, setCountryCode] = useState('+966')
  const [phoneNum, setPhoneNum] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (isSignUp) {
        // تنظيف رقم الهاتف وإزالة الصفر في البداية إن وجد (مثل 05xxxxxxxx)
        let cleanPhone = phoneNum.trim()
        if (cleanPhone.startsWith('0')) {
          cleanPhone = cleanPhone.substring(1)
        }
        const finalPhoneNumber = `${countryCode}${cleanPhone}`

        // إنشاء حساب جديد في Supabase Auth مع إرفاق رقم الهاتف المدمج في البيانات الوصفية
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone_number: finalPhoneNumber
            }
          }
        })

        if (error) throw error

        if (data?.user && data?.session) {
          setSuccessMsg('تم إنشاء الحساب وتسجيل الدخول بنجاح!')
          setTimeout(() => onAuthSuccess(data.user), 1500)
        } else {
          setSuccessMsg('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد التسجيل (إذا كان تفعيل البريد إجبارياً في إعدادات Supabase).')
        }
      } else {
        // تسجيل الدخول لحساب قائم
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        if (data?.user) {
          setSuccessMsg('تم تسجيل الدخول بنجاح! جاري تحويلك...')
          setTimeout(() => onAuthSuccess(data.user), 1000)
        }
      }
    } catch (err) {
      console.error('خطأ في عملية المصادقة:', err.message)
      if (err.message.includes('Invalid login credentials')) {
        setErrorMsg('بيانات الدخول غير صحيحة. يرجى التحقق من البريد والرقم السري.')
      } else if (err.message.includes('User already registered')) {
        setErrorMsg('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.')
      } else {
        setErrorMsg(err.message || 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (err) {
      console.error('خطأ في الاتصال بجوجل:', err.message)
      setErrorMsg(err.message || 'فشل الاتصال بحساب جوجل.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-[#111318] border border-[#2e3039] p-8 rounded-2xl shadow-2xl backdrop-blur-lg">
        
        {/* شعار المنصة وعنوانها */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-purple-600/10 rounded-xl border border-purple-500/20 text-purple-400 mb-4 animate-pulse">
            <Sparkles className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">منصة وصف</h2>
          <p className="mt-2 text-sm text-gray-400">
            توليد أوصاف ومحتوى تسويقي ذكي للمتاجر السعودية بلهجة محلية بيضاء
          </p>
        </div>

        {/* التبديل بين تسجيل الدخول والتسجيل الجديد */}
        <div className="flex border-b border-[#2e3039]">
          <button
            onClick={() => { setIsSignUp(false); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-center font-medium text-sm transition-colors ${!isSignUp ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => { setIsSignUp(true); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-center font-medium text-sm transition-colors ${isSignUp ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {/* رسائل التنبيه والنجاح */}
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

        {/* نموذج الإدخال */}
        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="space-y-4">
            
            {/* البريد الإلكتروني */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#161920] border border-[#2e3039] rounded-xl py-3 px-10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-left"
                />
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
              </div>
            </div>

            {/* رقم الواتساب ومفاتيح الدول (في حال التسجيل الجديد) */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">رقم الجوال (الواتساب)</label>
                <div className="flex gap-2">
                  {/* القائمة المنسدلة لمفاتيح الدول */}
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-[#161920] border border-[#2e3039] rounded-xl py-3 px-3 text-white focus:outline-none focus:border-purple-500 text-xs font-bold shrink-0"
                  >
                    <option value="+966">السعودية 🇸🇦 (+966)</option>
                    <option value="+971">الإمارات 🇦🇪 (+971)</option>
                    <option value="+965">الكويت 🇰🇼 (+965)</option>
                    <option value="+973">البحرين 🇧🇭 (+973)</option>
                    <option value="+968">عُمان 🇴🇲 (+968)</option>
                    <option value="+974">قطر 🇶🇦 (+974)</option>
                    <option value="+20">مصر 🇪🇬 (+20)</option>
                    <option value="+962">الأردن 🇯🇴 (+962)</option>
                  </select>
                  
                  {/* حقل إدخال رقم الهاتف الجوال */}
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      required
                      value={phoneNum}
                      onChange={(e) => setPhoneNum(e.target.value)}
                      placeholder="5xxxxxxxx"
                      className="w-full bg-[#161920] border border-[#2e3039] rounded-xl py-3 px-10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-left"
                    />
                    <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </div>
            )}

            {/* الرقم السري */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#161920] border border-[#2e3039] rounded-xl py-3 px-10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-left"
                />
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
              </div>
            </div>

          </div>

          {/* زر التأكيد */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 disabled:bg-purple-800 disabled:opacity-50"
            >
              {loading ? 'جاري التحميل...' : (isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول')}
            </button>
          </div>

          {/* فاصل */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2e3039]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#111318] px-2 text-gray-500 font-medium">أو عبر</span>
            </div>
          </div>

          {/* زر جوجل */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-[#2e3039] text-sm font-semibold rounded-xl text-white bg-[#161920] hover:bg-[#1f232d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>الدخول بواسطة Google</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
