import React, { useState, useEffect } from 'react';
import { Star, User, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Review } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ReviewSectionProps {
    productId: string;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ productId }) => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [newReview, setNewReview] = useState({ userName: '', rating: 5, comment: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchReviews();
    }, [productId]);

    useEffect(() => {
        if (user) {
            setNewReview(prev => ({
                ...prev,
                userName: user.user_metadata.full_name || user.email || ''
            }));
        }
    }, [user]);

    const fetchReviews = async () => {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (data) {
                setReviews(data.map((r: any) => ({
                    id: r.id,
                    productId: r.product_id,
                    userName: r.user_name,
                    rating: r.rating,
                    comment: r.comment,
                    date: new Date(r.created_at).toLocaleDateString('ar-EG')
                })));
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('يرجى تسجيل الدخول لإضافة تقييم');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('reviews').insert([{
                product_id: productId,
                user_id: user.id,
                user_name: newReview.userName,
                rating: newReview.rating,
                comment: newReview.comment
            }]);

            if (error) throw error;

            // Refresh reviews
            fetchReviews();
            setNewReview({ userName: user.user_metadata.full_name || user.email || '', rating: 5, comment: '' });
            alert('شكراً لتقييمك!');
        } catch (error: any) {
            console.error(error);
            alert(`فشل إرسال التقييم: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                تقييمات العملاء
                <span className="text-sm font-normal text-gray-500">({reviews.length})</span>
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Reviews List */}
                <div className="space-y-4">
                    {loading ? (
                        <p>جاري التحميل...</p>
                    ) : reviews.length === 0 ? (
                        <div className="bg-gray-50 p-6 rounded-xl text-center text-gray-500">
                            لا توجد تقييمات بعد. كوني أول من يقيم هذا المنتج!
                        </div>
                    ) : (
                        reviews.map((review) => (
                            <div key={review.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-brand-blue-soft flex items-center justify-center text-brand-blue">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-gray-800">{review.userName}</span>
                                    </div>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {review.date}
                                    </span>
                                </div>
                                <div className="flex text-yellow-400 mb-2">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                                    ))}
                                </div>
                                <p className="text-gray-600 text-sm">{review.comment}</p>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Review Form */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-blue-soft h-fit">
                    <h3 className="font-bold text-lg mb-4">أضيفي تقييمك</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-1">الاسم</label>
                            <input
                                required
                                value={newReview.userName}
                                onChange={e => setNewReview({ ...newReview, userName: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-blue"
                                placeholder="اسمك"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-1">التقييم</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setNewReview({ ...newReview, rating: star })}
                                        className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                        <Star className={`w-8 h-8 ${star <= newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-1">تعليقك</label>
                            <textarea
                                required
                                value={newReview.comment}
                                onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-blue"
                                rows={3}
                                placeholder="اكتبي تجربتك مع المنتج..."
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-brand-blue hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                        >
                            {submitting ? 'جاري الإرسال...' : 'نشر التقييم'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
