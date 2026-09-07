import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Flame, Gem, Gift, Sparkles, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from '../../components/ui/ProductCard';
import { Category, Product } from '../../types';
import { RecentlyViewed } from '../../components/ui/RecentlyViewed';
import { supabase } from '../../lib/supabase';

const CATEGORIES: Array<Category & { icon: string }> = [
  { id: '1', name_ar: 'مكياج', name_en: 'Makeup', icon: '💄' },
  { id: '2', name_ar: 'عناية بالبشرة', name_en: 'Skincare', icon: '✨' },
  { id: '3', name_ar: 'عناية بالشعر', name_en: 'Haircare', icon: '💆🏻‍♀️' },
  { id: '4', name_ar: 'عطور', name_en: 'Perfumes', icon: '🌸' },
  { id: '5', name_ar: 'أدوات تجميل', name_en: 'Beauty Tools', icon: '🪞' },
];

type Banner = { id: string; title_ar: string; subtitle_ar: string | null; image_url: string | null; action_type: 'collection' | 'category' | 'product' | 'url' | 'none'; action_value: string | null };
type SmartCollection = { id: string; slug: string; name_ar: string; description_ar: string | null; icon: string; product_ids: string[] };

const collectionIcon = (icon: string) => {
  if (icon === 'local-fire-department') return <Flame className="w-5 h-5" />;
  if (icon === 'sell') return <Tag className="w-5 h-5" />;
  if (icon === 'savings') return <Gift className="w-5 h-5" />;
  if (icon === 'new-releases') return <Sparkles className="w-5 h-5" />;
  return <Gem className="w-5 h-5" />;
};

export const HomePage: React.FC = () => {
  const { products, wishlist, addToCart, toggleWishlist } = useStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [activeBrand, setActiveBrand] = useState('الكل');
  const [sortBy, setSortBy] = useState('newest');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [collections, setCollections] = useState<SmartCollection[]>([]);
  const [activeBanner, setActiveBanner] = useState(0);

  useEffect(() => {
    const loadStorefront = async () => {
      const [bannerResult, collectionResult] = await Promise.all([
        supabase.from('storefront_banners').select('id,title_ar,subtitle_ar,image_url,action_type,action_value').order('display_order'),
        supabase.rpc('get_storefront_collections'),
      ]);
      if (!bannerResult.error) setBanners((bannerResult.data || []) as Banner[]);
      if (!collectionResult.error) setCollections((collectionResult.data || []) as SmartCollection[]);
    };
    void loadStorefront();
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const interval = window.setInterval(() => setActiveBanner((current) => (current + 1) % banners.length), 6500);
    return () => window.clearInterval(interval);
  }, [banners.length]);

  const availableBrands = useMemo(() => Array.from(new Set(products.map((product) => product.brand).filter(Boolean))), [products]);
  const sortedAndFilteredProducts = useMemo(() => {
    const result = products.filter((product) => {
      const text = `${product.name_ar || ''} ${product.name_en || ''} ${product.brand || ''}`.toLowerCase();
      return text.includes(searchQuery.toLowerCase()) && (activeCategory === 'الكل' || product.category === activeCategory) && (activeBrand === 'الكل' || product.brand === activeBrand);
    });
    return [...result].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'popular') return (b.reviewCount || 0) - (a.reviewCount || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeBrand, activeCategory, products, searchQuery, sortBy]);

  const collectionProducts = (collection: SmartCollection) => collection.product_ids
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));

  const handleBanner = (banner: Banner) => {
    if (!banner.action_value || banner.action_type === 'none') return;
    if (banner.action_type === 'category') { setActiveCategory(banner.action_value); window.scrollTo({ top: 520, behavior: 'smooth' }); return; }
    if (banner.action_type === 'product') { navigate(`/product/${banner.action_value}`); return; }
    if (banner.action_type === 'url') { navigate(banner.action_value); return; }
    const target = document.getElementById(`collection-${banner.action_value}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderProductCard = (product: Product) => {
    const discountedPrice = product.discountPercentage && product.discountPercentage > 0 ? product.price * (1 - product.discountPercentage / 100) : product.price;
    return <ProductCard key={product.id} product={product} discountedPrice={discountedPrice} isHighlyPromoted={false} isInWishlist={wishlist.includes(product.id)} onToggleWishlist={toggleWishlist} onAddToCart={addToCart} />;
  };

  const currentBanner = banners[activeBanner];
  return <div className="animate-fadeIn pb-20">
    <section className="max-w-6xl mx-auto px-4 pt-5 md:pt-8">
      {currentBanner ? <div className="relative min-h-[255px] md:min-h-[330px] overflow-hidden rounded-[2rem] bg-brand-blue shadow-xl shadow-blue-900/10">
        {currentBanner.image_url && <img src={currentBanner.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-l from-white/95 via-white/80 to-brand-blue/20" />
        <div className="relative z-10 flex min-h-[255px] md:min-h-[330px] max-w-xl flex-col justify-center px-7 py-8 md:px-14">
          <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-black text-brand-blue"><Sparkles className="w-3.5 h-3.5" /> TIPS Beauty</span>
          <h1 className="max-w-md text-3xl font-black leading-tight text-slate-900 md:text-5xl">{currentBanner.title_ar}</h1>
          {currentBanner.subtitle_ar && <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600 md:text-base">{currentBanner.subtitle_ar}</p>}
          {currentBanner.action_type !== 'none' && <button onClick={() => handleBanner(currentBanner)} className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-blue/25 transition hover:-translate-y-0.5 hover:bg-sky-700">اكتشفي الآن <ChevronLeft className="w-4 h-4" /></button>}
        </div>
        {banners.length > 1 && <div className="absolute bottom-5 left-6 z-20 flex gap-2" dir="ltr">{banners.map((banner, index) => <button key={banner.id} aria-label={`عرض ${index + 1}`} onClick={() => setActiveBanner(index)} className={`h-2.5 rounded-full transition-all ${activeBanner === index ? 'w-7 bg-brand-blue' : 'w-2.5 bg-slate-400/50 hover:bg-slate-500'}`} />)}</div>}
      </div> : <div className="relative min-h-[255px] overflow-hidden rounded-[2rem] bg-gradient-to-l from-brand-blue via-sky-600 to-teal-500 px-7 py-10 text-white shadow-xl"><div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-2xl" /><div className="relative max-w-md"><span className="text-sm font-bold text-blue-100">أهلاً بكِ في تيبس بيوتي</span><h1 className="mt-3 text-4xl font-black leading-tight">اكتشفي جمالك الطبيعي</h1><p className="mt-4 text-sm leading-6 text-blue-50">تشكيلة مختارة من منتجات الجمال والعناية تصل حتى بابك.</p></div></div>}
    </section>

    <div className="max-w-6xl mx-auto px-4 pt-7">
      <section className="mb-8 rounded-3xl border border-brand-blue-soft bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-black text-slate-900">تسوقي حسب القسم</h2><p className="mt-1 text-xs text-slate-500">اختاري ما يناسب روتينك اليومي</p></div><button onClick={() => { setActiveCategory('الكل'); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-xs font-black text-brand-blue hover:underline">عرض كل المنتجات</button></div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{CATEGORIES.map((category) => <button key={category.id} onClick={() => { setActiveCategory(category.name_ar); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="group rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center transition hover:-translate-y-0.5 hover:border-brand-blue-soft hover:bg-blue-50"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm group-hover:scale-110 transition">{category.icon}</span><span className="mt-2 block text-xs font-bold text-slate-700">{category.name_ar}</span></button>)}</div>
      </section>

      {collections.map((collection) => {
        const items = collectionProducts(collection);
        if (!items.length) return null;
        return <section id={`collection-${collection.slug}`} key={collection.id} className="mb-10 scroll-mt-24">
          <div className="mb-5 flex items-end justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-brand-blue-soft p-2.5 text-brand-blue">{collectionIcon(collection.icon)}</div><div><h2 className="text-xl font-black text-slate-900 md:text-2xl">{collection.name_ar}</h2>{collection.description_ar && <p className="mt-1 text-xs text-slate-500">{collection.description_ar}</p>}</div></div><button onClick={() => { if (collection.slug === 'today-deals') setSortBy('popular'); if (collection.slug === 'under-10000') setSortBy('price-low'); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); }} className="shrink-0 text-xs font-black text-brand-blue hover:underline">عرض الكل</button></div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{items.slice(0, 4).map(renderProductCard)}</div>
        </section>;
      })}

      <section id="catalog" className="scroll-mt-24 rounded-[2rem] bg-slate-50/80 p-4 md:p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-black text-slate-900">كل المنتجات</h2><p className="mt-1 text-xs text-slate-500">ابحثي، قارني، ثم أضيفي إلى السلة.</p></div><div className="relative w-full md:max-w-md"><input type="search" placeholder="ابحثي عن منتجات الجمال أو الماركة..." className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-5 pl-12 text-sm outline-none shadow-sm transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /><span className="absolute left-4 top-1/2 -translate-y-1/2">🔍</span></div></div>
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">{['الكل', ...CATEGORIES.map((category) => category.name_ar)].map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${activeCategory === category ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' : 'border border-brand-blue-soft bg-white text-slate-600 hover:border-brand-blue'}`}>{category}</button>)}</div><div className="flex gap-2"><select value={activeBrand} onChange={(event) => setActiveBrand(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"><option value="الكل">كل الماركات</option>{availableBrands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"><option value="newest">الأحدث</option><option value="popular">الأكثر طلباً</option><option value="price-low">السعر: الأقل</option><option value="price-high">السعر: الأعلى</option><option value="rating">الأعلى تقييماً</option></select></div></div>
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-600"><span>النتائج</span><span className="rounded-full bg-white px-2 py-0.5 text-xs text-brand-blue shadow-sm">{sortedAndFilteredProducts.length}</span></div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{sortedAndFilteredProducts.map(renderProductCard)}</div>
        {!sortedAndFilteredProducts.length && <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center"><p className="font-bold text-slate-600">لا توجد منتجات تطابق بحثك</p><button onClick={() => { setSearchQuery(''); setActiveCategory('الكل'); setActiveBrand('الكل'); }} className="mt-3 text-sm font-black text-brand-blue hover:underline">عرض كل المنتجات</button></div>}
      </section>
      <RecentlyViewed />
    </div>
  </div>;
};
