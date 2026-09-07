
import { Order, Product } from "./types";
import { supabase } from './lib/supabase';

/**
 * Generates beauty advice based on user query and preferences using Gemini.
 * Optimized for basic text tasks with thinkingBudget: 0 for speed.
 */
export async function getBeautyAdvice(userQuery: string, products: Product[], skinType: string = 'غير محدد') {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 'سجّلي الدخول أولاً لاستخدام مساعد تيبس بيوتي.';
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beauty-advice`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ query: userQuery, skin_type: skinType }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'تعذر الاتصال بالمساعد');
    return data.answer as string;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "عذراً، حدث خطأ في الاتصال بمساعد تيبس بيوتي. حاولي مرة أخرى لاحقاً.";
  }
}

/**
 * Generates business insights for administrators based on order data.
 */
export async function getAdminInsights(orders: Order[]) {
  return orders.length ? 'التحليل الذكي للإدارة متاح من لوحة التقارير بعد إعداد خدمة الخادم.' : 'لا توجد طلبات كافية لتحليلها حالياً.';
}
