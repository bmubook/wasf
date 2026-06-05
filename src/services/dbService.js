import { supabase } from '../lib/supabaseClient'

/**
 * جلب الملف الشخصي للتاجر الحالي ومجموع أرصدته
 * @param {string} userId - معرّف المستخدم الموثق
 * @returns {Promise<Object>} بيانات الملف الشخصي
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('خطأ أثناء جلب ملف المستخدم:', error.message)
    throw error
  }
}

/**
 * التحقق من كفاية الأرصدة وخصمها من التاجر
 * @param {string} userId - معرّف المستخدم
 * @param {number} requiredCredits - عدد الأرصدة المطلوبة للعملية
 * @returns {Promise<boolean>} هل تمت العملية وخصم الرصيد بنجاح
 */
export const deductUserCredits = async (userId, requiredCredits) => {
  try {
    // 1. جلب الرصيد الحالي أولاً للتحقق
    const profile = await getUserProfile(userId)
    
    if (profile.credits < requiredCredits) {
      throw new Error(`رصيدك غير كافٍ. تحتاج إلى ${requiredCredits} رصيد على الأقل لتنفيذ هذه العملية.`)
    }

    // 2. الخصم وتحديث الرصيد الجديد
    const newCredits = profile.credits - requiredCredits
    const { error } = await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('خطأ أثناء خصم الأرصدة من التاجر:', error.message)
    throw error
  }
}

/**
 * حفظ المنتج والمخرجات المأتمتة المولدة بالكامل في قاعدة البيانات
 * @param {Object} productData - كائن يحتوي على معطيات المنتج والنتائج
 * @returns {Promise<Object>} السجل المحفوظ كاملاً
 */
export const saveGeneratedProduct = async (productData) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('خطأ أثناء حفظ المنتج المولد:', error.message)
    throw error
  }
}

/**
 * تحديث رابط الملف الصوتي المولد لمنتج قائم في قاعدة البيانات
 * @param {string} productId - معرّف المنتج
 * @param {string} voiceUrl - الرابط العام للملف الصوتي
 * @returns {Promise<Object>} السجل المحدث كاملاً
 */
export const updateProductVoiceUrl = async (productId, voiceUrl) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ voice_url: voiceUrl })
      .eq('id', productId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('خطأ أثناء تحديث رابط الصوت للمنتج:', error.message)
    throw error
  }
}


/**
 * جلب السجل التاريخي للمنتجات والأوصاف التي قام التاجر الحالي بتوليدها سابقاً
 * @param {string} userId - معرّف التاجر
 * @returns {Promise<Array>} قائمة المنتجات السابقة
 */
export const getProductHistory = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('خطأ أثناء جلب السجل التاريخي:', error.message)
    throw error
  }
}

/**
 * إرسال طلب اشتراك يدوياً مع إرفاق صورة إيصال الحوالة
 * @param {string} userId - معرّف المستخدم
 * @param {string} receiptUrl - رابط صورة إيصال الحوالة في R2
 * @returns {Promise<Object>} الطلب المحفوظ
 */
export const requestSubscription = async (userId, receiptUrl) => {
  try {
    const { data, error } = await supabase
      .from('subscription_requests')
      .insert([{ user_id: userId, bank_transfer_receipt: receiptUrl }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('خطأ أثناء إرسال طلب تفعيل الاشتراك:', error.message)
    throw error
  }
}

/**
 * جلب إحصائيات لوحة تحكم المشرف (Admins only)
 * @returns {Promise<Object>} إحصائيات عامة
 */
export const getAdminStats = async () => {
  try {
    // جلب إجمالي المستخدمين
    const { count: usersCount, error: err1 } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // جلب عدد المشتركين الفعالين
    const { count: premiumCount, error: err2 } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'premium_user')

    // جلب طلبات الاشتراك المعلقة
    const { count: pendingRequests, error: err3 } = await supabase
      .from('subscription_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // جلب إحصائيات استهلاك Gemini
    const { data: productsData, error: err4 } = await supabase
      .from('products')
      .select('gemini_prompt_tokens, gemini_completion_tokens')

    // جلب إحصائيات استهلاك ElevenLabs
    const { data: voicesData, error: err5 } = await supabase
      .from('product_voices')
      .select('elevenlabs_chars')

    if (err1) throw err1
    if (err2) throw err2
    if (err3) throw err3
    if (err4) throw err4
    if (err5) throw err5

    let totalPromptTokens = 0
    let totalCompletionTokens = 0
    let totalElevenLabsChars = 0

    if (productsData) {
      productsData.forEach(p => {
        totalPromptTokens += p.gemini_prompt_tokens || 0
        totalCompletionTokens += p.gemini_completion_tokens || 0
      })
    }

    if (voicesData) {
      voicesData.forEach(v => {
        totalElevenLabsChars += v.elevenlabs_chars || 0
      })
    }

    return {
      usersCount: usersCount || 0,
      premiumCount: premiumCount || 0,
      pendingRequestsCount: pendingRequests || 0,
      totalPromptTokens,
      totalCompletionTokens,
      totalElevenLabsChars
    }
  } catch (error) {
    console.error('خطأ أثناء جلب إحصائيات الإدارة:', error.message)
    throw error
  }
}

/**
 * جلب قائمة بكافة المستخدمين المسجلين للمشرف (Admins only)
 * @returns {Promise<Array>} قائمة المستخدمين
 */
export const getAdminUsersList = async () => {
  try {
    const { data: users, error: err1 } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (err1) throw err1

    // جلب معلومات استهلاك التوكنز للمنتجات
    const { data: products, error: err2 } = await supabase
      .from('products')
      .select('user_id, gemini_prompt_tokens, gemini_completion_tokens')

    if (err2) throw err2

    // جلب معلومات استهلاك المحارف للأصوات
    const { data: voices, error: err3 } = await supabase
      .from('product_voices')
      .select('user_id, elevenlabs_chars')

    if (err3) throw err3

    // دمج الإحصائيات مع المستخدمين
    const usersWithUsage = users.map(user => {
      const userProducts = products ? products.filter(p => p.user_id === user.id) : []
      const userVoices = voices ? voices.filter(v => v.user_id === user.id) : []

      const totalPromptTokens = userProducts.reduce((sum, p) => sum + (p.gemini_prompt_tokens || 0), 0)
      const totalCompletionTokens = userProducts.reduce((sum, p) => sum + (p.gemini_completion_tokens || 0), 0)
      const totalElevenLabsChars = userVoices.reduce((sum, v) => sum + (v.elevenlabs_chars || 0), 0)

      return {
        ...user,
        totalPromptTokens,
        totalCompletionTokens,
        totalElevenLabsChars
      }
    })

    return usersWithUsage
  } catch (error) {
    console.error('خطأ أثناء جلب قائمة المستخدمين مع تفاصيل الاستهلاك للمشرف:', error.message)
    throw error
  }
}

/**
 * جلب كافة طلبات الاشتراك اليدوية المعلقة لمراجعتها (Admins only)
 * @returns {Promise<Array>} قائمة طلبات الاشتراك
 */
export const getAdminSubscriptionRequests = async () => {
  try {
    const { data, error } = await supabase
      .from('subscription_requests')
      .select('*, profiles(email, phone_number)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('خطأ أثناء جلب طلبات الاشتراك للمشرف:', error.message)
    throw error
  }
}

/**
 * تفعيل الحساب وشحن الأرصدة للمشتركين بعد مراجعة الحوالة البنكية (Admins only)
 * @param {string} requestId - معرّف طلب التفعيل
 * @param {string} targetUserId - معرّف التاجر
 * @param {string} newStatus - الحالة الجديدة ('approved' أو 'rejected')
 * @param {number} chargeCredits - عدد الأرصدة المراد شحنها (مثلاً 150)
 * @returns {Promise<boolean>} هل اكتمل التفعيل بنجاح
 */
export const approveSubscriptionRequest = async (
  requestId,
  targetUserId,
  newStatus,
  chargeCredits = 150
) => {
  try {
    // 1. تحديث حالة طلب الاشتراك
    const { error: err1 } = await supabase
      .from('subscription_requests')
      .update({ status: newStatus })
      .eq('id', requestId)

    if (err1) throw err1

    // 2. إذا تمت الموافقة، نقوم بترقية دور الحساب وشحن الأرصدة
    if (newStatus === 'approved') {
      const { error: err2 } = await supabase
        .from('profiles')
        .update({ role: 'premium_user', credits: chargeCredits })
        .eq('id', targetUserId)

      if (err2) throw err2
    }

    return true
  } catch (error) {
    console.error('خطأ أثناء الموافقة على طلب التفعيل:', error.message)
    throw error
  }
}

/**
 * حفظ ملف صوتي جديد مرتبط بمنتج في قاعدة البيانات
 * @param {Object} voiceData - كائن يحتوي على معطيات الصوت
 * @returns {Promise<Object>} السجل المحفوظ
 */
export const saveProductVoice = async (voiceData) => {
  try {
    const { data, error } = await supabase
      .from('product_voices')
      .insert([voiceData])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('خطأ أثناء حفظ المقطع الصوتي الجديد:', error.message)
    throw error
  }
}

/**
 * جلب كافة الأصوات المولدة لمنتج محدد
 * @param {string} productId - معرّف المنتج
 * @returns {Promise<Array>} قائمة الأصوات المرتبطة بالمنتج
 */
export const getProductVoices = async (productId) => {
  try {
    const { data, error } = await supabase
      .from('product_voices')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('خطأ أثناء جلب أصوات المنتج:', error.message)
    throw error
  }
}

/**
 * حذف مقطع صوتي محدد من قاعدة البيانات
 * @param {string} voiceId - معرّف السجل الصوتي
 * @returns {Promise<boolean>} هل تم الحذف بنجاح
 */
export const deleteProductVoice = async (voiceId) => {
  try {
    const { error } = await supabase
      .from('product_voices')
      .delete()
      .eq('id', voiceId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('خطأ أثناء حذف المقطع الصوتي:', error.message)
    throw error
  }
}

/**
 * حذف منتج مولد بالكامل من السجل التاريخي لقاعدة البيانات
 * @param {string} productId - معرّف المنتج
 * @returns {Promise<boolean>} هل تم الحذف بنجاح
 */
export const deleteGeneratedProduct = async (productId) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('خطأ أثناء حذف المنتج المولد:', error.message)
    throw error
  }
}

/**
 * تحديث حقول معينة للمنتج في قاعدة البيانات
 * @param {string} productId - معرّف المنتج
 * @param {Object} fields - الحقول المراد تحديثها وقيمها الجديدة
 * @returns {Promise<Object>} السجل المحدث كاملاً
 */
export const updateProductFields = async (productId, fields) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(fields)
      .eq('id', productId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('خطأ أثناء تحديث حقول المنتج:', error.message)
    throw error
  }
}



