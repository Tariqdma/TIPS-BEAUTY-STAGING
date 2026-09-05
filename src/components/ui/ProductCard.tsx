import React from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Product } from '../../types';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

interface ProductCardProps {
    product: Product;
    discountedPrice: number;
    isHighlyPromoted: boolean;
    isInWishlist: boolean;
    onToggleWishlist: (id: string) => void;
    onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
    product,
    discountedPrice,
    isHighlyPromoted,
    isInWishlist,
    onToggleWishlist,
    onAddToCart,
}) => {
    return (
        <Link
            to={`/product/${product.id}`}
            className={clsx(
                "bg-white rounded-2xl overflow-hidden shadow-sm border cursor-pointer active:scale-95 transition-all relative group flex flex-col h-full",
                isHighlyPromoted ? "border-brand-blue-soft bg-brand-blue-soft/20" : "border-brand-blue-soft"
            )}
        >
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleWishlist(product.id);
                    }}
                    className="bg-white/90 p-1.5 rounded-full shadow-sm text-brand-blue hover:scale-110 transition-transform"
                >
                    <Heart className={clsx("w-4 h-4", isInWishlist ? "fill-current" : "")} />
                </button>
            </div>

            <div className="absolute top-2 right-2 z-10 flex flex-col gap-2 pointer-events-auto">
                <button
                    onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            if (navigator.share) {
                                await navigator.share({
                                    title: product.name_ar,
                                    text: `شاهدي هذا المنتج الرائع: ${product.name_ar}`,
                                    url: window.location.origin + `/product/${product.id}`
                                });
                            } else {
                                await navigator.clipboard.writeText(window.location.origin + `/product/${product.id}`);
                                alert('تم نسخ الرابط!');
                            }
                        } catch (err) {
                            console.log('Share failed', err);
                        }
                    }}
                    className="bg-white/90 p-1.5 rounded-full shadow-sm text-gray-600 hover:text-blue-500 hover:scale-110 transition-transform"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share-2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                </button>
            </div>

            <div className="relative aspect-[4/5] overflow-hidden shrink-0">
                <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={product.name_ar} />
                {isHighlyPromoted && (
                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
                        <span className="bg-brand-blue text-white text-[8px] px-2 py-0.5 rounded-full font-black shadow-lg animate-bounce uppercase tracking-tighter">
                            عرض خاص!
                        </span>
                    </div>
                )}
            </div>

            <div className="p-3 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-0.5">
                    <p className="text-[10px] text-brand-blue font-bold uppercase tracking-widest">{product.brand}</p>
                </div>
                <h3 className="text-xs font-bold text-gray-800 truncate mb-1">{product.name_ar}</h3>
                <div className="flex items-center gap-2 mb-3">
                    <p className={clsx(
                        "font-black text-sm",
                        isHighlyPromoted ? "text-brand-blue underline decoration-blue-200 decoration-2 underline-offset-2" : "text-brand-blue"
                    )}>
                        {discountedPrice.toLocaleString()} ج.س
                    </p>
                    {discountedPrice < product.price && (
                        <p className="text-[10px] text-gray-400 line-through decoration-blue-200 decoration-1">
                            {product.price.toLocaleString()}
                        </p>
                    )}
                </div>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onAddToCart(product);
                    }}
                    className={clsx(
                        "mt-auto w-full py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95",
                        isHighlyPromoted ? "bg-brand-blue hover:bg-blue-700 shadow-blue-200" : "bg-brand-blue hover:bg-blue-700 shadow-blue-100"
                    )}
                >
                    أضيفي للسلة <ShoppingCart className="w-3 h-3" />
                </button>
            </div>
        </Link>
    );
};
