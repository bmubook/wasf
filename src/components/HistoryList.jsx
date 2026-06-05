import { Clock, Eye, Trash2, ArrowRight } from 'lucide-react'

export default function HistoryList({ history, onSelectProduct, onBackToGenerator, onDeleteProduct }) {
  
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-[#111318] border border-[#2e3039] p-6 rounded-2xl shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2e3039] pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            سجل الأوصاف التاريخية
          </h3>
          <p className="text-xs text-gray-400 mt-1">تصفح وانسخ مخرجاتك السابقة مجاناً ودون استهلاك أرصدة جديدة</p>
        </div>
        <button
          onClick={onBackToGenerator}
          className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للمولد الذكي
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 bg-[#0b0c10]/40 rounded-2xl border border-dashed border-[#2e3039] flex flex-col items-center justify-center gap-3">
          <Clock className="w-12 h-12 text-gray-600 animate-pulse" />
          <p className="text-gray-400 text-sm">لا يوجد لديك أي أوصاف منتجات سابقة حتى الآن.</p>
          <button
            onClick={onBackToGenerator}
            className="text-purple-400 text-xs font-bold hover:underline"
          >
            ابدأ بتوليد وصفك الأول الآن!
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#2e3039] text-gray-400 font-semibold">
                <th className="py-3 px-4">اسم المنتج</th>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4">تاريخ التوليد</th>
                <th className="py-3 px-4 text-left">التحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e3039]/60 text-gray-200">
              {history.map((product) => (
                <tr key={product.id} className="hover:bg-[#161920]/40 transition-colors">
                  <td className="py-4 px-4 font-medium text-white">{product.product_name}</td>
                  <td className="py-4 px-4">
                    <span className="bg-[#161920] border border-[#2e3039] px-2.5 py-1 rounded-lg text-xs text-gray-300">
                      {product.category || 'عام'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-xs text-gray-400">{formatDate(product.created_at)}</td>
                  <td className="py-4 px-4 text-left flex items-center justify-end gap-2">
                    <button
                      onClick={() => onSelectProduct(product)}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-[#161920] hover:bg-purple-600/10 text-gray-300 hover:text-purple-400 border border-[#2e3039] hover:border-purple-500/30 rounded-lg text-xs transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      استعراض المخرجات
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج وصفحة مخرجاته بالكامل من السجل؟')) {
                          await onDeleteProduct(product.id);
                        }
                      }}
                      className="inline-flex items-center justify-center p-1.5 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/30 rounded-lg transition-all"
                      title="حذف المنتج من السجل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
