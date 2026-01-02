export interface Product {
    id: string;
    name_ar: string;
    name_en: string;
    price: number;
    discount_percentage?: number;
    cost_price?: number;
    category: string;
    brand: string;
    image: string;
    images?: string[];
    description: string;
    benefits: string[];
    ingredients: string[];
    usage: string;
    origin: string;
    expiry: string;
    stock: number;
    is_imported: boolean;
    skin_type?: string[];
    variants?: ProductVariant[];
    marketing_badge?: string;
    meta_title?: string;
    meta_description?: string;
    rating?: number;
    review_count?: number;
    created_at: string;
}

export interface ProductVariant {
    id?: string;
    name: string;
    sku?: string;
    stock: number;
    price_override?: number;
    image?: string;
}

