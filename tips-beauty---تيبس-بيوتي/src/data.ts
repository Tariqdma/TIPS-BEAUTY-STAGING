
import { Product } from './types';

export const SUDANESE_STATES = [
  "الخرطوم", "الجزيرة", "البحر الأحمر", "نهر النيل", "الشمالية",
  "شمال دارفور", "غرب دارفور", "جنوب دارفور", "وسط دارفور", "شرق دارفور",
  "شمال كردفان", "جنوب كردفان", "غرب كردفان", "سنار", "النيل الأبيض",
  "النيل الأزرق", "القضارف", "كسلا"
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name_ar: 'زيت الصندل الأصلي',
    name_en: 'Authentic Sandalwood Oil',
    price: 4500,
    category: 'عطور',
    brand: 'تراث السودان',
    image: 'https://images.unsplash.com/photo-1615484477201-9f4953340fab?auto=format&fit=crop&q=80&w=800&h=800',
    images: [
      'https://images.unsplash.com/photo-1615484477201-9f4953340fab?auto=format&fit=crop&q=80&w=800&h=800',
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=800&h=800',
      'https://images.unsplash.com/photo-1547881338-646ca444c18b?auto=format&fit=crop&q=80&w=800&h=800'
    ],
    description: 'زيت صندل طبيعي 100% مستخلص من أجود أنواع خشب الصندل السوداني، يتميز برائحة عميقة ودافئة تدوم طويلاً.',
    benefits: ['رائحة زكية دائمة', 'يرطب البشرة', 'مناسب للمناسبات الرسمية والخاصة'],
    ingredients: ['زيت خشب الصندل النقي 100%', 'مستخلصات طبيعية مثبته'],
    usage: 'يوضع كمية بسيطة على نقاط النبض خلف الأذنين وعلى المعصمين، كما يمكن رشه على الملابس التقليدية.',
    origin: 'السودان (ولاية النيل الأزرق)',
    expiry: '2027-01',
    stock: 25,
    isImported: false,
    skinType: ['الكل'],
    createdAt: '2023-12-01',
    reviews: [
      { id: 'r1', productId: '1', userName: 'ليلى م.', rating: 5, comment: 'رائحته مذهلة وثابتة جداً. فخر الصناعة السودانية!', date: '2024-03-01' }
    ]
  },
  {
    id: '2',
    name_ar: 'مرطب البشرة CeraVe',
    name_en: 'CeraVe Moisturizing Cream',
    price: 12500,
    category: 'عناية بالبشرة',
    brand: 'CeraVe',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800&h=800',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800&h=800',
      'https://images.unsplash.com/photo-1616683693504-3ee7e1da6921?auto=format&fit=crop&q=80&w=800&h=800',
      'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?auto=format&fit=crop&q=80&w=800&h=800'
    ],
    description: 'كريم مرطب غني يطور بالتعاون مع أطباء الجلد، يعمل على ترطيب البشرة وحمايتها بفعالية عالية.',
    benefits: ['ترطيب يدوم 24 ساعة', 'إصلاح حاجز البشرة الطبيعي', 'مناسب جداً للمناخ الجاف في السودان'],
    ingredients: ['حمض الهيالورونيك', 'سيراميد 1, 3, 6-II', 'جليسرين', 'كوليسترول'],
    usage: 'يوضع كمية مناسبة على بشرة نظيفة وجافة، ويدلك بلطف حتى الامتصاص الكامل. يفضل استخدامه بعد الاستحمام مباشرة.',
    origin: 'الولايات المتحدة الأمريكية (أصلي)',
    expiry: '2026-06',
    stock: 12,
    isImported: true,
    skinType: ['الجافة', 'العادية'],
    createdAt: '2024-01-15',
    reviews: [
      { id: 'r2', productId: '2', userName: 'سارة أ.', rating: 5, comment: 'أفضل مرطب جربته لبشرتي الجافة في صيف الخرطوم.', date: '2024-02-15' }
    ]
  },
  {
    id: '3',
    name_ar: 'خمرة المسك الملكية',
    name_en: 'Royal Musk Khumra',
    price: 8000,
    category: 'عطور',
    brand: 'ريحة حبوبتي',
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800&h=800',
    description: 'خمرة سودانية تقليدية مصنوعة يدوياً بمزيج سري من المسك والضفرة والمحلب، لإطلالة أنثوية كلاسيكية.',
    benefits: ['رائحة سودانية أصيلة', 'ثبات عالي جداً', 'تركيبة طبيعية بالكامل'],
    ingredients: ['مسك مسحوق', 'ضفرة معتقة', 'محلب سوداني نقي', 'زيوت عطرية طبيعية'],
    usage: 'ترج الزجاجة جيداً قبل الاستخدام. توضع كميات بسيطة خلف الأذنين وعلى الرقبة والملابس.',
    origin: 'السودان (الخرطوم)',
    expiry: '2028-12',
    stock: 15,
    isImported: false,
    skinType: ['الكل'],
    createdAt: '2023-11-20',
    reviews: []
  },
  {
    id: '4',
    name_ar: 'كريم واقي شمس La Roche-Posay',
    name_en: 'La Roche-Posay Anthelios',
    price: 18500,
    category: 'عناية بالبشرة',
    brand: 'La Roche-Posay',
    image: 'https://images.unsplash.com/photo-1556229167-da318a2f7764?auto=format&fit=crop&q=80&w=800&h=800',
    images: [
      'https://images.unsplash.com/photo-1556229167-da318a2f7764?auto=format&fit=crop&q=80&w=800&h=800',
      'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&q=80&w=800&h=800'
    ],
    description: 'حماية فائقة من أشعة الشمس القوية (SPF 50+)، مثالي جداً للاستخدام اليومي في السودان.',
    benefits: ['حماية واسعة المدى', 'مقاوم للماء والعرق', 'قوام خفيف غير دهني'],
    ingredients: ['Mexoryl 400', 'مياه لاروش بوزيه الحرارية', 'جلسرين نباتي'],
    usage: 'يوضع على الوجه والرقبة قبل التعرض للشمس بـ 20 دقيقة. يعاد وضعه كل ساعتين أو بعد التعرق الشديد.',
    origin: 'فرنسا',
    expiry: '2025-09',
    stock: 8,
    isImported: true,
    skinType: ['الدهنية', 'المختلطة', 'الحساسة'],
    createdAt: '2024-02-10',
    reviews: [
      { id: 'r3', productId: '4', userName: 'أمل ح.', rating: 4, comment: 'ممتاز ولا يترك أثر أبيض، لكن سعره مرتفع قليلاً.', date: '2024-03-10' }
    ]
  }
];
