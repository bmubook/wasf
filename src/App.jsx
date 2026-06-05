import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { getProductHistory, deleteGeneratedProduct } from './services/dbService'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'
import AdminPanel from './components/AdminPanel'
import HistoryList from './components/HistoryList'
import { Sparkles, LayoutDashboard } from 'lucide-react'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard', 'admin', 'history'
  const [history, setHistory] = useState([])
  const [activeProduct, setActiveProduct] = useState(null)

  // 1. فحص جلسة تسجيل الدخول الحالية لـ Supabase عند فتح التطبيق
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    checkUser()

    // الاستماع لأي تغيير في حالة التوثيق (تسجيل دخول/خروج)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session) {
        setCurrentView('dashboard') // العودة للواجهة عند تسجيل الخروج
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. جلب السجل التاريخي للمستخدم الحالي
  const fetchHistory = async () => {
    if (!user) return
    try {
      const data = await getProductHistory(user.id)
      setHistory(data)
    } catch (err) {
      console.error('خطأ في جلب السجل:', err.message)
    }
  }

  useEffect(() => {
    if (user) {
      fetchHistory()
    }
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleDeleteProduct = async (productId) => {
    try {
      await deleteGeneratedProduct(productId)
      if (activeProduct && activeProduct.id === productId) {
        setActiveProduct(null)
      }
      await fetchHistory()
    } catch (err) {
      console.error('خطأ أثناء حذف المنتج:', err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 text-sm font-semibold">جاري تهيئة منصة وصف...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-gray-200">
      
      {/* البار الرئيسي للموقع */}
      <header className="border-b border-[#2e3039] bg-[#111318]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-600 rounded-xl text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">وصف <span className="text-purple-400 text-xs font-normal">Wasf</span></span>
          </div>
          {user && (
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${currentView === 'dashboard' ? 'bg-purple-600 text-white' : 'bg-[#161920] border border-[#2e3039] text-gray-300 hover:text-white'}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                لوحة التحكم
              </button>
            </div>
          )}
        </div>
      </header>

      {/* عرض الشاشة المناسبة بناءً على حالة المستخدم والدخول */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user ? (
          <AuthScreen onAuthSuccess={(usr) => setUser(usr)} />
        ) : (
          <>
            <div className={currentView === 'dashboard' ? 'block' : 'hidden'}>
              <Dashboard 
                user={user} 
                onSignOut={handleSignOut}
                onOpenAdmin={() => setCurrentView('admin')}
                onOpenHistory={async () => {
                  await fetchHistory()
                  setCurrentView('history')
                }}
                activeProduct={activeProduct}
                setActiveProduct={setActiveProduct}
              />
            </div>

            {currentView === 'admin' && (
              <AdminPanel onBackToDashboard={() => setCurrentView('dashboard')} />
            )}

            {currentView === 'history' && (
              <HistoryList 
                history={history}
                onSelectProduct={(product) => {
                  setActiveProduct(product)
                  setCurrentView('dashboard')
                }}
                onBackToGenerator={() => setCurrentView('dashboard')}
                onDeleteProduct={handleDeleteProduct}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
