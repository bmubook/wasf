import { useState, useEffect } from 'react'
import { getAdminStats, getAdminUsersList, getAdminSubscriptionRequests, approveSubscriptionRequest } from '../services/dbService'
import { Users, CreditCard, Clock, Check, X, ShieldAlert, ExternalLink, RefreshCw, MessageSquare, Zap, Volume2, Sparkles } from 'lucide-react'

export default function AdminPanel({ onBackToDashboard }) {
  const [stats, setStats] = useState({
    usersCount: 0,
    premiumCount: 0,
    pendingRequestsCount: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalElevenLabsChars: 0
  })
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const fetchAdminData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const adminStats = await getAdminStats()
      const usersList = await getAdminUsersList()
      const requestsList = await getAdminSubscriptionRequests()
      
      setStats(adminStats)
      setUsers(usersList)
      setRequests(requestsList)
    } catch (err) {
      console.error('خطأ في جلب بيانات الإدارة:', err.message)
      setErrorMsg('فشل جلب البيانات. تأكد من أن حسابك يمتلك صلاحيات المشرف (admin).')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, [])

  const handleApprove = async (requestId, userId, status) => {
    setActionLoading(true)
    try {
      // شحن 553 نقطة افتراضياً عند الموافقة (باقة الـ 20 ريال)
      await approveSubscriptionRequest(requestId, userId, status, 553)
      await fetchAdminData() // تحديث البيانات الحية
    } catch (err) {
      console.error('خطأ في معالجة طلب الاشتراك:', err.message)
      alert('فشل معالجة الطلب: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-10 h-10 text-purple-500 animate-spin" />
        <p className="text-gray-400 text-sm">جاري تحميل لوحة المشرف السحابية...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 bg-[#0b0c10] min-h-screen text-gray-200">
      
      {/* رأس الصفحة وأزرار العودة */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2e3039] pb-5">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-purple-400" />
            لوحة الإدارة والمشرفين (الوزراء)
          </h2>
          <p className="text-xs text-gray-400 mt-1">شحن الأرصدة، وتفعيل الاشتراكات اليدوية للتحويل البنكي، ومتابعة نمو المنصة</p>
        </div>
        <button
          onClick={onBackToDashboard}
          className="py-2.5 px-5 bg-[#161920] hover:bg-purple-600/10 text-gray-300 hover:text-purple-400 border border-[#2e3039] rounded-xl text-xs font-semibold transition-all w-full sm:w-auto"
        >
          العودة للوحة تحكم التاجر
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
          {errorMsg}
        </div>
      )}

      {/* لوحة الإحصائيات (الإجمالي والطلبات المعلقة) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111318] border border-[#2e3039] p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-500/20 text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">إجمالي التجار</span>
            <span className="text-2xl font-black text-white">{stats.usersCount}</span>
          </div>
        </div>

        <div className="bg-[#111318] border border-[#2e3039] p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-green-600/10 rounded-xl border border-green-500/20 text-green-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">المشتركون (Premium)</span>
            <span className="text-2xl font-black text-white">{stats.premiumCount}</span>
          </div>
        </div>

        <div className="bg-[#111318] border border-yellow-500/20 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-yellow-600/10 rounded-xl border border-yellow-500/20 text-yellow-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">التحويلات المعلقة</span>
            <span className="text-2xl font-black text-white">{stats.pendingRequestsCount}</span>
          </div>
        </div>
      </div>

      {/* إحصائيات استهلاك الـ API Key للمطور (Gemini & ElevenLabs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        <div className="bg-[#111318] border border-[#2e3039] p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-purple-600/10 rounded-xl border border-purple-500/20 text-purple-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">استهلاك Gemini (مدخلات)</span>
            <span className="text-lg font-black text-white">{(stats.totalPromptTokens || 0).toLocaleString()} توكن</span>
            <span className="block text-[10px] text-gray-500 mt-0.5">تكلفة: {(((stats.totalPromptTokens || 0) * 0.000000075) * 3.75).toFixed(4)} ر.س (${((stats.totalPromptTokens || 0) * 0.000000075).toFixed(4)})</span>
          </div>
        </div>

        <div className="bg-[#111318] border border-[#2e3039] p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">استهلاك Gemini (مخرجات)</span>
            <span className="text-lg font-black text-white">{(stats.totalCompletionTokens || 0).toLocaleString()} توكن</span>
            <span className="block text-[10px] text-gray-500 mt-0.5">تكلفة: {(((stats.totalCompletionTokens || 0) * 0.00000030) * 3.75).toFixed(4)} ر.س (${((stats.totalCompletionTokens || 0) * 0.00000030).toFixed(4)})</span>
          </div>
        </div>

        <div className="bg-[#111318] border border-[#2e3039] p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-pink-600/10 rounded-xl border border-pink-500/20 text-pink-400">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">محارف ElevenLabs الملقاة</span>
            <span className="text-lg font-black text-white">{(stats.totalElevenLabsChars || 0).toLocaleString()} حرف</span>
            <span className="block text-[10px] text-gray-500 mt-0.5">تكلفة (Pro): {(((stats.totalElevenLabsChars || 0) * 0.00018) * 3.75).toFixed(2)} ر.س (${((stats.totalElevenLabsChars || 0) * 0.00018).toFixed(2)})</span>
          </div>
        </div>
      </div>

      {/* طلبات تفعيل الاشتراكات المعلقة */}
      <div className="bg-[#111318] border border-[#2e3039] p-6 rounded-2xl shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 border-b border-[#2e3039] pb-3">طلبات تفعيل التحويل البنكي</h3>
        {requests.length === 0 ? (
          <p className="text-center py-6 text-sm text-gray-500">لا توجد أي طلبات تفعيل اشتراكات حالياً.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2e3039] text-gray-400 font-semibold">
                  <th className="py-2.5 px-3">البريد الإلكتروني</th>
                  <th className="py-2.5 px-3">رقم الهاتف</th>
                  <th className="py-2.5 px-3">إيصال الحوالة</th>
                  <th className="py-2.5 px-3">الحالة</th>
                  <th className="py-2.5 px-3 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2e3039]/60 text-gray-300">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#161920]/20">
                    <td className="py-3.5 px-3 font-semibold text-white">{req.profiles?.email || 'غير معروف'}</td>
                    <td className="py-3.5 px-3 text-xs">{req.profiles?.phone_number || '-'}</td>
                    <td className="py-3.5 px-3 text-xs text-purple-400">
                      <a href={req.bank_transfer_receipt} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                        عرض الإيصال
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : req.status === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {req.status === 'pending' ? 'معلق' : req.status === 'approved' ? 'مقبول' : 'مرفوض'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-left">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(req.id, req.user_id, 'approved')}
                            disabled={actionLoading}
                            className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
                            title="تفعيل الحساب وشحن 150 رصيد"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleApprove(req.id, req.user_id, 'rejected')}
                            disabled={actionLoading}
                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                            title="رفض الطلب"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* قائمة بكافة الأعضاء والمسجلين بالمنصة */}
      <div className="bg-[#111318] border border-[#2e3039] p-6 rounded-2xl shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 border-b border-[#2e3039] pb-3">إدارة رتب وأرصدة التجار وتتبع استهلاكهم</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#2e3039] text-gray-400 font-semibold">
                <th className="py-2.5 px-3">البريد الإلكتروني</th>
                <th className="py-2.5 px-3">الهاتف</th>
                <th className="py-2.5 px-3">الرتبة (الدور)</th>
                <th className="py-2.5 px-3">الأرصدة</th>
                <th className="py-2.5 px-3">استهلاك Gemini (رموز)</th>
                <th className="py-2.5 px-3">استهلاك الصوت (حروف)</th>
                <th className="py-2.5 px-3 text-left">مراسلة سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e3039]/60 text-gray-300">
              {users.map((user) => {
                const totalPromptTokens = user.totalPromptTokens || 0;
                const totalCompletionTokens = user.totalCompletionTokens || 0;
                const totalTokens = totalPromptTokens + totalCompletionTokens;
                const totalElevenLabsChars = user.totalElevenLabsChars || 0;

                // حساب التكاليف الفعلية
                const geminiCostUSD = (totalPromptTokens * 0.000000075) + (totalCompletionTokens * 0.00000030);
                const geminiCostSAR = geminiCostUSD * 3.75;

                const elevenlabsCostUSD = totalElevenLabsChars * 0.00018; // باقة Pro كمرجع
                const elevenlabsCostSAR = elevenlabsCostUSD * 3.75;

                const totalUsageCostSAR = geminiCostSAR + elevenlabsCostSAR;

                return (
                  <tr key={user.id} className="hover:bg-[#161920]/20">
                    <td className="py-3.5 px-3 font-semibold text-white">
                      <div>{user.email}</div>
                      <div className="text-[10px] text-gray-500 font-normal">إجمالي التكلفة: {totalUsageCostSAR.toFixed(3)} ر.س</div>
                    </td>
                    <td className="py-3.5 px-3 text-xs">{user.phone_number || '-'}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : user.role === 'premium_user' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                        {user.role === 'admin' ? 'مشرف' : user.role === 'premium_user' ? 'مشترك' : 'مجاني'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-white">{user.credits}</td>
                    <td className="py-3.5 px-3 text-xs">
                      <div className="font-medium text-purple-400">{totalTokens.toLocaleString()} توكن</div>
                      <div className="text-gray-500 text-[10px]">{geminiCostSAR.toFixed(4)} ر.س (${geminiCostUSD.toFixed(4)})</div>
                    </td>
                    <td className="py-3.5 px-3 text-xs">
                      <div className="font-medium text-pink-400">{totalElevenLabsChars.toLocaleString()} حرف</div>
                      <div className="text-gray-500 text-[10px]">{elevenlabsCostSAR.toFixed(2)} ر.س (${elevenlabsCostUSD.toFixed(3)})</div>
                    </td>
                    <td className="py-3.5 px-3 text-left">
                      {user.phone_number && (
                        <a
                          href={`https://wa.me/${user.phone_number.replace('+', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          واتساب
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
