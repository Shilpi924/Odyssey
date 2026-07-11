'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function StarRating({ rating, onRatingChange, readonly = false, size = 'md' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onRatingChange(star)}
          className={`transition-transform hover:scale-110 ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <svg
            className={`${sizes[size]} ${
              star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600 fill-slate-600'
            }`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, onHelpful, onReport }) {
  const [isHelpful, setIsHelpful] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);

  const handleHelpful = () => {
    if (!isHelpful) {
      setIsHelpful(true);
      setHelpfulCount(prev => prev + 1);
      onHelpful?.(review.id);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {review.userName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-white font-medium text-sm">{review.userName || 'Anonymous'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating rating={review.rating} readonly size="sm" />
              <span className="text-slate-400 text-xs">{formatDate(review.createdAt)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onReport?.(review.id)}
          className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          Report
        </button>
      </div>

      <p className="text-slate-300 text-sm leading-relaxed mb-3">{review.comment}</p>

      {review.photos && review.photos.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {review.photos.map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt={`Review photo ${index + 1}`}
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <button
          onClick={handleHelpful}
          className={`flex items-center gap-1.5 transition-colors ${
            isHelpful ? 'text-emerald-400' : 'hover:text-slate-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {helpfulCount} helpful
        </button>
        <button className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Reply
        </button>
      </div>
    </motion.div>
  );
}

export default function ReviewSystem({ trailId, trailName }) {
  const [reviews, setReviews] = useState([]);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '', photos: [] });
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    fetchReviews();
  }, [trailId]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?trailId=${trailId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (newReview.rating === 0 || !newReview.comment.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trailId,
          trailName,
          rating: newReview.rating,
          comment: newReview.comment,
          photos: newReview.photos
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReviews(prev => [data.review, ...prev]);
        setNewReview({ rating: 0, comment: '', photos: [] });
        setShowWriteReview(false);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // In a real app, you'd upload these to a storage service
      // For now, we'll use object URLs
      const photoUrls = files.map(file => URL.createObjectURL(file));
      setNewReview(prev => ({
        ...prev,
        photos: [...prev.photos, ...photoUrls].slice(0, 5) // Max 5 photos
      }));
    }
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'lowest') return a.rating - b.rating;
    return 0;
  });

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0
  }));

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
      {/* Rating Summary */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b border-slate-700/50">
        <div className="text-center sm:text-left">
          <div className="text-5xl font-bold text-white mb-1">{averageRating}</div>
          <div className="flex items-center justify-center sm:justify-start gap-1 mb-1">
            <StarRating rating={Math.round(averageRating)} readonly size="md" />
          </div>
          <p className="text-slate-400 text-sm">{reviews.length} reviews</p>
        </div>

        <div className="flex-1 space-y-2">
          {ratingDistribution.map(({ star, count, percentage }) => (
            <div key={star} className="flex items-center gap-3">
              <span className="text-slate-400 text-sm w-6">{star}★</span>
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-slate-400 text-sm w-8">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sort and Write Review */}
      <div className="flex items-center justify-between mb-6">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="recent">Most Recent</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>

        <button
          onClick={() => setShowWriteReview(!showWriteReview)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Write a Review
        </button>
      </div>

      {/* Write Review Form */}
      <AnimatePresence>
        {showWriteReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50"
          >
            <form onSubmit={handleSubmitReview}>
              <div className="mb-4">
                <label className="block text-white text-sm font-medium mb-2">Your Rating</label>
                <StarRating
                  rating={newReview.rating}
                  onRatingChange={(rating) => setNewReview(prev => ({ ...prev, rating }))}
                  size="lg"
                />
              </div>

              <div className="mb-4">
                <label className="block text-white text-sm font-medium mb-2">Your Review</label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your experience with this trail..."
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-white text-sm font-medium mb-2">Photos (optional)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    <span>Upload Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-slate-400 text-xs">{newReview.photos.length}/5 photos</span>
                </div>
                {newReview.photos.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {newReview.photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo}
                          alt={`Upload ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setNewReview(prev => ({
                            ...prev,
                            photos: prev.photos.filter((_, i) => i !== index)
                          }))}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Submitting...' : 'Submit Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWriteReview(false)}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedReviews.length > 0 ? (
          sortedReviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onHelpful={(id) => console.log('Marked helpful:', id)}
              onReport={(id) => console.log('Reported:', id)}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No reviews yet. Be the first to review!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export { StarRating, ReviewCard };
