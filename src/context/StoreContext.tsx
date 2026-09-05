import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem } from '../types';
import { supabase } from '../lib/supabase';

interface StoreContextType {
    products: Product[];
    cart: CartItem[];
    clearCart: () => void;
    wishlist: string[];
    addToCart: (product: Product, variantId?: string) => void;
    removeFromCart: (productId: string, variantId?: string) => void;
    updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    toggleWishlist: (productId: string) => void;
    addToRecentlyViewed: (product: Product) => void;
    recentlyViewed: Product[];
    cartCount: number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        supabase.from('products').select('*').then(({ data }) => {
            if (data) {
                setProducts(data.map((p: any) => ({
                    ...p,
                    isImported: p.is_imported,
                    skinType: p.skin_type,
                    createdAt: p.created_at,
                    discountPercentage: p.discount_percentage,
                    costPrice: p.cost_price
                })));
            }
        });
    }, []);

    const [cart, setCart] = useState<CartItem[]>(() => {
        try {
            const saved = localStorage.getItem('sb_cart');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [wishlist, setWishlist] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('sb_wishlist');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
        try {
            const saved = localStorage.getItem('sb_recently_viewed');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    useEffect(() => localStorage.setItem('sb_cart', JSON.stringify(cart)), [cart]);
    useEffect(() => localStorage.setItem('sb_wishlist', JSON.stringify(wishlist)), [wishlist]);
    useEffect(() => localStorage.setItem('sb_recently_viewed', JSON.stringify(recentlyViewed)), [recentlyViewed]);

    const addToRecentlyViewed = React.useCallback((product: Product) => {
        setRecentlyViewed(prev => {
            const filtered = prev.filter(p => p.id !== product.id);
            return [product, ...filtered].slice(0, 10);
        });
    }, []);

    const addToCart = React.useCallback((product: Product, variantId?: string) => {
        console.log('addToCart called', product.id, variantId);
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && item.selectedVariantId === variantId);
            if (existing) {
                return prev.map(item => (item.id === product.id && item.selectedVariantId === variantId)
                    ? { ...item, quantity: item.quantity + 1 }
                    : item);
            }
            const variant = variantId ? product.variants?.find(v => v.id === variantId) : null;
            const price = variant?.priceOverride ?? product.price;
            let discountedPrice = price;
            if (product.discountPercentage && product.discountPercentage > 0) {
                discountedPrice = price * (1 - product.discountPercentage / 100);
            }
            const newItem = { ...product, quantity: 1, discountedPrice, selectedVariantId: variantId };
            return [...prev, newItem];
        });
    }, []);

    const removeFromCart = React.useCallback((productId: string, variantId?: string) => {
        setCart(prev => prev.filter(item => !(item.id === productId && item.selectedVariantId === variantId)));
    }, []);

    const updateQuantity = React.useCallback((productId: string, quantity: number, variantId?: string) => {
        if (quantity <= 0) {
            removeFromCart(productId, variantId);
            return;
        }
        setCart(prev => prev.map(item => (item.id === productId && item.selectedVariantId === variantId) ? { ...item, quantity } : item));
    }, [removeFromCart]);

    const clearCart = React.useCallback(() => setCart([]), []);

    const toggleWishlist = React.useCallback((productId: string) => {
        setWishlist(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    }, []);

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <StoreContext.Provider value={{ products, cart, clearCart, wishlist, recentlyViewed, addToCart, removeFromCart, updateQuantity, toggleWishlist, addToRecentlyViewed, cartCount }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStore must be used within a StoreProvider');
    return context;
};
