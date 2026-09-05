
import { GoogleGenAI } from "@google/genai";
import { Order, Product } from "./types";

/**
 * Generates beauty advice based on user query and preferences using Gemini.
 * Optimized for basic text tasks with thinkingBudget: 0 for speed.
 */
export async function getBeautyAdvice(userQuery: string, products: Product[], skinType: string = 'غير محدد') {
  const catalogSummary = products.map(p => 
    `${p.name_ar} (${p.brand}, ${p.price} ج.س, ${p.category})`
  ).join('\n');

  const systemInstruction = `
    أنت مساعد جمال خبير لشركة Tips Beauty (تيبس بيوتي). 
    شعارنا هو "Beauty you can trust".
    مهمتك مساعدة المستخدمين في اختيار أفضل منتجات التجميل من الكتالوج المتوفر وتقديم نصائح للعناية بالبشرة.
    الرد باللغة العربية بلهجة سودانية رقيقة، مهنية، ومحفزة للجمال.
    
    المنتجات المتوفرة حالياً في متجر تيبس بيوتي:
    ${catalogSummary}

    إذا سأل المستخدم عن منتج غير موجود، اقترح بديلاً قريباً من القائمة أو اذكر عدم توفره بلطف مع وعد بتوفيره.
    كن موجزاً جداً لتوفير استهلاك البيانات للمستخدم.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userQuery,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 600,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "عذراً، حدث خطأ في الاتصال بمساعد تيبس بيوتي. حاولي مرة أخرى لاحقاً.";
  }
}

/**
 * Generates business insights for administrators based on order data.
 */
export async function getAdminInsights(orders: Order[]) {
  const orderSummary = orders.map(o => 
    `طلب #${o.id}: الإجمالي ${o.total}, الحالة ${o.status}, المدينة ${o.city}`
  ).join('\n');
  
  const systemInstruction = `
    أنت خبير تحليل بيانات لشركة Tips Beauty في السودان.
    بناءً على الطلبات المقدمة، قدم تقريراً استراتيجياً موجزاً جداً (باللغة العربية) يشمل:
    1. أداء مبيعات تيبس بيوتي.
    2. تحليل للمناطق الجغرافية الأكثر نشاطاً.
    3. نصيحة تسويقية واحدة لزيادة الثقة (Beauty you can trust) في السوق السوداني.
    تحدث بلهجة مهنية ومباشرة.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `حلل هذه البيانات:\n${orderSummary || 'لا توجد طلبات بعد'}`,
      config: {
        systemInstruction,
        temperature: 0.5,
        maxOutputTokens: 800,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "تعذر الحصول على التحليلات الذكية حالياً.";
  }
}
