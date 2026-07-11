'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';

// Activity feed item component
function ActivityFeedItem({ activity }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'hike_completed': return '🥾';
      case 'review_posted': return '⭐';
      case 'photo_uploaded': return '📸';
      case 'trail_saved': return '💾';
      case 'achievement': return '🏆';
      default: return '📍';
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'hike_completed':
        return `completed ${activity.trailName}`;
      case 'review_posted':
        return `reviewed ${activity.trailName}`;
      case 'photo_uploaded':
        return `added photos to ${activity.trailName}`;
      case 'trail_saved':
        return `saved ${activity.trailName}`;
      case 'achievement':
        return `earned the "${activity.achievement}" badge`;
      default:
        return 'was active';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:bg-slate-800/50 transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg flex-shrink-0">
        {getActivityIcon(activity.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm">
          <span className="font-semibold">{activity.userName}</span>
          <span className="text-slate-400"> {getActivityText(activity)}</span>
        </p>
        <p className="text-slate-500 text-xs mt-1">{formatTime(activity.timestamp)}</p>
      </div>
    </motion.div>
  );
}

// Main social features component
export default function SocialFeatures() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('feed');
  const [activities, setActivities] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);

  useEffect(() => {
    if (session?.user) {
      fetchSocialData();
    }
  }, [session]);

  const fetchSocialData = async () => {
    try {
      // Fetch activities
      const activitiesRes = await fetch('/api/social/activities');
      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.activities || []);
      }

      // Fetch following/followers
      const socialRes = await fetch('/api/social/connections');
      if (socialRes.ok) {
        const data = await socialRes.json();
        setFollowing(data.following || []);
        setFollowers(data.followers || []);
      }
    } catch (error) {
      console.error('Error fetching social data:', error);
    }
  };

  const tabs = [
    { id: 'feed', label: 'Activity Feed', icon: '📰' },
    { id: 'following', label: 'Following', icon: '👥' },
    { id: 'followers', label: 'Followers', icon: '👤' },
  ];

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Social</h2>
        <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
          Find Friends
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {activities.length > 0 ? (
              activities.map(activity => (
                <ActivityFeedItem key={activity.id} activity={activity} />
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">No recent activity</p>
                <p className="text-xs mt-1">Follow friends to see their adventures!</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'following' && (
          <motion.div
            key="following"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {following.length > 0 ? (
              following.map(user => (
                <UserCard key={user.id} user={user} isFollowing={true} />
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Not following anyone yet</p>
                <p className="text-xs mt-1">Discover hikers with similar interests!</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'followers' && (
          <motion.div
            key="followers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {followers.length > 0 ? (
              followers.map(user => (
                <UserCard key={user.id} user={user} isFollowing={false} />
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">No followers yet</p>
                <p className="text-xs mt-1">Share your adventures to gain followers!</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// User card for follow/unfollow
function UserCard({ user, isFollowing }) {
  const [following, setFollowing] = useState(isFollowing);

  const handleFollowToggle = async () => {
    try {
      const res = await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: following ? 'unfollow' : 'follow' })
      });

      if (res.ok) {
        setFollowing(!following);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
        {user.name?.charAt(0).toUpperCase() || 'U'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate">{user.name}</p>
        <p className="text-slate-400 text-xs">{user.hikesCompleted || 0} hikes completed</p>
      </div>
      <button
        onClick={handleFollowToggle}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          following
            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            : 'bg-indigo-500 text-white hover:bg-indigo-600'
        }`}
      >
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}

// Share modal component
export function ShareModal({ isOpen, onClose, item }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/trail/${item.id}`
    : '';

  const shareText = `Check out ${item.name} on Odyssey!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.name,
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const sharePlatforms = [
    { name: 'Twitter', icon: '𝕏', color: 'bg-black', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { name: 'Facebook', icon: '📘', color: 'bg-blue-600', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
    { name: 'WhatsApp', icon: '💬', color: 'bg-green-500', url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}` },
    { name: 'Email', icon: '✉️', color: 'bg-slate-600', url: `mailto:?subject=${encodeURIComponent(item.name)}&body=${encodeURIComponent(shareText + ' ' + shareUrl)}` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl"
      >
        <h3 className="text-xl font-bold text-white mb-4">Share {item.name}</h3>

        {/* Native Share Button */}
        {navigator.share && (
          <button
            onClick={handleNativeShare}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors mb-4 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share via...
          </button>
        )}

        {/* Share Platforms */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {sharePlatforms.map(platform => (
            <a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${platform.color} hover:opacity-80 text-white p-3 rounded-xl flex flex-col items-center gap-1 transition-opacity`}
            >
              <span className="text-2xl">{platform.icon}</span>
              <span className="text-xs">{platform.name}</span>
            </a>
          ))}
        </div>

        {/* Copy Link */}
        <div className="flex gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300"
          />
          <button
            onClick={handleCopyLink}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl font-medium transition-colors"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

// Achievement badges component
export function Achievements({ userId }) {
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    fetchAchievements();
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      const res = await fetch(`/api/social/achievements?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-4">Achievements</h3>
      <div className="grid grid-cols-4 gap-3">
        {achievements.map(achievement => (
          <div
            key={achievement.id}
            className="flex flex-col items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
            title={achievement.description}
          >
            <span className="text-3xl mb-1">{achievement.icon}</span>
            <span className="text-xs text-slate-300 text-center">{achievement.name}</span>
          </div>
        ))}
        {achievements.length === 0 && (
          <div className="col-span-4 text-center py-4 text-slate-400 text-sm">
            No achievements yet. Start hiking to earn badges!
          </div>
        )}
      </div>
    </div>
  );
}
