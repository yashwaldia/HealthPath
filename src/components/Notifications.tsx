
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Notification, NotificationType, View } from '../types';
import { BellIcon, CloseIcon, SparklesIcon, HeartPulseIcon, CalendarDaysIcon, TestTubeIcon, ChildIcon, TrashIcon } from './Icons';

const NOTIFICATIONS_KEY = 'healthpath_notifications';

// --- Custom Hook for Notification State Management ---
export const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = useCallback(() => {
        const stored = localStorage.getItem(NOTIFICATIONS_KEY);
        const loaded: Notification[] = stored ? JSON.parse(stored) : [];
        loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotifications(loaded);
        setUnreadCount(loaded.filter(n => !n.isRead).length);
    }, []);

    useEffect(() => {
        loadNotifications();
        window.addEventListener('notificationsUpdated', loadNotifications);
        return () => {
            window.removeEventListener('notificationsUpdated', loadNotifications);
        };
    }, [loadNotifications]);

    const updateStoredNotifications = (updated: Notification[]) => {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
        loadNotifications(); // Reload to ensure state is synced
    };

    const markAsRead = (id: string) => {
        const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
        updateStoredNotifications(updated);
    };

    const markAllAsRead = () => {
        const updated = notifications.map(n => ({ ...n, isRead: true }));
        updateStoredNotifications(updated);
    };

    const deleteNotification = (id: string) => {
        const updated = notifications.filter(n => n.id !== id);
        updateStoredNotifications(updated);
    };

    const clearAll = () => {
        updateStoredNotifications([]);
    };

    return { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll };
};

// --- Notification Bell Icon ---
export const NotificationBell: React.FC<{ count: number; onClick: () => void }> = ({ count, onClick }) => {
    return (
        <button onClick={onClick} className="relative p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label={`Notifications (${count} unread)`}>
            <BellIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            {count > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{count}</span>
                </span>
            )}
        </button>
    );
};


// --- Notification Panel (Slide-out Drawer) ---
const timeSince = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
};

const TypeIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    const icons: Record<NotificationType, React.ReactNode> = {
        'Vitals': <HeartPulseIcon className="w-5 h-5 text-red-500" />,
        'AI Insight': <SparklesIcon className="w-5 h-5 text-blue-500" />,
        'Reminder': <CalendarDaysIcon className="w-5 h-5 text-yellow-500" />,
        'Lifestyle': <HeartPulseIcon className="w-5 h-5 text-green-500" />,
        'Child Health': <ChildIcon className="w-5 h-5 text-teal-500" />,
        'Radiology': <TestTubeIcon className="w-5 h-5 text-indigo-500" />,
        'Message': <SparklesIcon className="w-5 h-5 text-slate-500" />,
    };
    return <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full">{icons[type] || icons['Message']}</div>;
};

export const NotificationPanel: React.FC<{ isOpen: boolean; onClose: () => void; setView: (view: View) => void; }> = ({ isOpen, onClose, setView }) => {
    const { notifications, deleteNotification, clearAll } = useNotifications();
    const [filter, setFilter] = useState<NotificationType | 'All'>('All');

    const filteredNotifications = useMemo(() => {
        if (filter === 'All') return notifications;
        return notifications.filter(n => n.type === filter);
    }, [notifications, filter]);
    
    const handleViewDetails = (link: View) => {
        setView(link);
        onClose();
    };
    
    const filterOptions: (NotificationType | 'All')[] = ['All', 'Vitals', 'AI Insight', 'Reminder', 'Child Health', 'Lifestyle'];

    return (
        <>
            <div className={`fixed inset-0 bg-black/60 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold text-lg">Notifications</h3>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><CloseIcon className="w-6 h-6"/></button>
                    </header>
                    
                    {/* Filters */}
                    <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {filterOptions.map(f => (
                                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${filter === f ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>{f}</button>
                            ))}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredNotifications.length > 0 ? (
                            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredNotifications.map(n => (
                                    <div key={n.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${!n.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                        <div className="flex gap-4">
                                            <TypeIcon type={n.type} />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-sm">{n.title}</p>
                                                    <span className="text-xs text-slate-500 whitespace-nowrap">{timeSince(n.timestamp)}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                                                <div className="flex gap-2 mt-2">
                                                    <button onClick={() => handleViewDetails(n.link)} className="text-xs font-semibold text-primary dark:text-primary-light">View Details</button>
                                                    <button onClick={() => deleteNotification(n.id)} className="text-xs font-semibold text-red-500">Dismiss</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-16">
                                <BellIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                                <p className="mt-4 text-sm text-slate-500">You're all caught up!</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                         <footer className="p-2 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={clearAll} className="w-full flex items-center justify-center gap-2 text-sm text-red-500 font-semibold p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50">
                                <TrashIcon className="w-4 h-4" /> Clear All Notifications
                            </button>
                        </footer>
                    )}
                </div>
            </div>
        </>
    );
};