"use client";
import React, { useState, useEffect, useCallback } from 'react';
import MasterPage from '@/components/MasterPage';
import GlassContainer from '@/components/GlassContainer';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import { useThemeMode } from '@/lib/ThemeContext';
import { useLanguage } from '@/lib/LanguageContext';

interface MessageItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  content?: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function MessagesPage() {
  const { language } = useLanguage();
  const { isDaylight } = useThemeMode();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'compose'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // حقول إنشاء رسالة جديدة
  const [newMessageTitle, setNewMessageTitle] = useState('');
  const [newMessageBody, setNewMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }
      setCurrentUserId(session.user.id);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.warn('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
      window.dispatchEvent(new Event('unread_counts_refresh'));
    } catch (err) {
      console.warn('Failed to mark read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUserId).eq('is_read', false);
      setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      window.dispatchEvent(new Event('unread_counts_refresh'));
      showToast(language === 'en' ? 'All messages marked as read' : 'تم تحديد جميع الرسائل كمقروءة', 'success');
    } catch (err) {
      console.warn('Failed mark all read:', err);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
      setMessages(prev => prev.filter(m => m.id !== id));
      window.dispatchEvent(new Event('unread_counts_refresh'));
      showToast(language === 'en' ? 'Message deleted' : 'تم حذف الرسالة بنجاح', 'info');
    } catch (err) {
      showToast(language === 'en' ? 'Failed to delete' : 'فشل حذف الرسالة', 'error');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageTitle.trim() || !newMessageBody.trim()) {
      showToast(language === 'en' ? 'Please fill title and message' : 'يرجى كتابة عنوان ونص الرسالة', 'warning');
      return;
    }
    if (!currentUserId) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from('notifications').insert([{
        user_id: currentUserId,
        title: newMessageTitle.trim(),
        message: newMessageBody.trim(),
        type: 'message',
        is_read: false
      }]);

      if (error) throw error;

      showToast(language === 'en' ? 'Message saved successfully' : 'تم إرسال الرسالة بنجاح 📨', 'success');
      setNewMessageTitle('');
      setNewMessageBody('');
      setActiveTab('all');
      fetchMessages();
      window.dispatchEvent(new Event('unread_counts_refresh'));
    } catch (err: any) {
      showToast(language === 'en' ? `Error: ${err.message}` : `خطأ أثناء الإرسال: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const displayedMessages = messages.filter(m => {
    if (activeTab === 'unread') return !m.is_read;
    return true;
  });

  const unreadTotal = messages.filter(m => !m.is_read).length;

  return (
    <MasterPage
      title={language === 'en' ? 'Messages & Communications' : 'الرسائل والمراسلات'}
      subtitle={language === 'en' ? 'Team notifications, system bulletins & communication hub' : 'الرسائل والمحادثات بين فرق العمل والتعاميم'}
      icon="✉️"
    >
      <div className="messages-page-wrapper" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: activeTab === 'all' 
                  ? '1px solid #C29B62' 
                  : (isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.1)'),
                background: activeTab === 'all' 
                  ? '#C29B62' 
                  : (isDaylight ? '#FFFFFF' : 'rgba(255,255,255,0.05)'),
                color: activeTab === 'all' ? '#FFFFFF' : (isDaylight ? '#0F172A' : '#F8FAFC')
              }}
            >
              📬 {language === 'en' ? 'All Messages' : 'جميع الرسائل'} ({messages.length})
            </button>

            <button
              onClick={() => setActiveTab('unread')}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: activeTab === 'unread' 
                  ? '1px solid #A8573C' 
                  : (isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.1)'),
                background: activeTab === 'unread' 
                  ? '#A8573C' 
                  : (isDaylight ? '#FFFFFF' : 'rgba(255,255,255,0.05)'),
                color: activeTab === 'unread' ? '#FFFFFF' : (isDaylight ? '#0F172A' : '#F8FAFC')
              }}
            >
              🔔 {language === 'en' ? 'Unread' : 'غير مقروءة'} {unreadTotal > 0 ? `(${unreadTotal})` : ''}
            </button>

            <button
              onClick={() => setActiveTab('compose')}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: activeTab === 'compose' 
                  ? '1px solid #4E734F' 
                  : (isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.1)'),
                background: activeTab === 'compose' 
                  ? '#4E734F' 
                  : (isDaylight ? '#FFFFFF' : 'rgba(255,255,255,0.05)'),
                color: activeTab === 'compose' ? '#FFFFFF' : (isDaylight ? '#0F172A' : '#F8FAFC')
              }}
            >
              ✍️ {language === 'en' ? 'New Memo / Message' : 'كتابة رسالة جديدة'}
            </button>
          </div>

          {unreadTotal > 0 && activeTab !== 'compose' && (
            <button
              onClick={markAllAsRead}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255,255,255,0.15)',
                background: isDaylight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                color: isDaylight ? '#475569' : '#CBD5E1'
              }}
            >
              ✓ {language === 'en' ? 'Mark all as read' : 'تحديد الكل كمقروء'}
            </button>
          )}
        </div>

        {/* Compose Form Tab */}
        {activeTab === 'compose' && (
          <GlassContainer style={{ padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: isDaylight ? '#0F172A' : '#F8FAFC' }}>
              ✍️ {language === 'en' ? 'Send New Internal Message' : 'إرسال تعميم أو رسالة داخلية'}
            </h3>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: isDaylight ? '#475569' : '#94A3B8' }}>
                  {language === 'en' ? 'Subject / Title' : 'موضوع الرسالة / العنوان'}
                </label>
                <input
                  type="text"
                  value={newMessageTitle}
                  onChange={e => setNewMessageTitle(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. Shift update notice...' : 'مثال: تعميم بخصوص تغيير مواعيد الورديات...'}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255,255,255,0.2)',
                    background: isDaylight ? '#FFFFFF' : 'rgba(0,0,0,0.2)',
                    color: isDaylight ? '#0F172A' : '#FFFFFF',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: isDaylight ? '#475569' : '#94A3B8' }}>
                  {language === 'en' ? 'Message Content' : 'نص الرسالة'}
                </label>
                <textarea
                  rows={5}
                  value={newMessageBody}
                  onChange={e => setNewMessageBody(e.target.value)}
                  placeholder={language === 'en' ? 'Write your message details here...' : 'اكتب تفاصيل الرسالة أو الملاحظة هنا...'}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255,255,255,0.2)',
                    background: isDaylight ? '#FFFFFF' : 'rgba(0,0,0,0.2)',
                    color: isDaylight ? '#0F172A' : '#FFFFFF',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.1)',
                    background: isDaylight ? '#F8FAFC' : 'rgba(255,255,255,0.05)',
                    color: isDaylight ? '#64748B' : '#94A3B8',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {language === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#C29B62',
                    color: '#FFFFFF',
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(194, 155, 98, 0.3)'
                  }}
                >
                  {isSending 
                    ? (language === 'en' ? 'Sending...' : 'جاري الإرسال...') 
                    : (language === 'en' ? 'Send Message 🚀' : 'إرسال الرسالة 🚀')}
                </button>
              </div>
            </form>
          </GlassContainer>
        )}

        {/* Message List */}
        {activeTab !== 'compose' && (
          <div>
            {isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: isDaylight ? '#64748B' : '#94A3B8' }}>
                ⏳ {language === 'en' ? 'Loading messages...' : 'جاري تحميل الرسائل...'}
              </div>
            ) : displayedMessages.length === 0 ? (
              <GlassContainer style={{ padding: '50px 20px', textAlign: 'center', borderRadius: '16px' }}>
                <div style={{ fontSize: '48px', marginBottom: '14px' }}>📭</div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: isDaylight ? '#0F172A' : '#F8FAFC' }}>
                  {activeTab === 'unread' 
                    ? (language === 'en' ? 'No unread messages' : 'لا توجد رسائل غير مقروءة')
                    : (language === 'en' ? 'Your message box is empty' : 'صندوق الرسائل فارغ حالياً')}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: isDaylight ? '#64748B' : '#94A3B8' }}>
                  {language === 'en' ? 'Any new alerts or memos will show up here.' : 'أي رسائل جديدة أو تعاميم ستظهر هنا فور وصولها.'}
                </p>
              </GlassContainer>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {displayedMessages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '14px',
                      border: msg.is_read
                        ? (isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.08)')
                        : '1px solid rgba(194, 155, 98, 0.4)',
                      background: msg.is_read
                        ? (isDaylight ? '#FFFFFF' : 'rgba(20, 24, 34, 0.75)')
                        : (isDaylight ? '#FFFDF8' : 'rgba(194, 155, 98, 0.1)'),
                      boxShadow: msg.is_read 
                        ? (isDaylight ? '0 2px 4px rgba(0,0,0,0.03)' : '0 2px 6px rgba(0,0,0,0.2)')
                        : '0 4px 12px rgba(194, 155, 98, 0.12)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '16px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '16px' }}>
                          {msg.type === 'message' ? '💬' : msg.type === 'alert' ? '🚨' : '📩'}
                        </span>
                        <h4 style={{ 
                          margin: 0, 
                          fontSize: '15px', 
                          fontWeight: msg.is_read ? 700 : 800,
                          color: isDaylight ? '#0F172A' : '#F8FAFC' 
                        }}>
                          {msg.title}
                        </h4>
                        {!msg.is_read && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: 'rgba(194, 155, 98, 0.2)',
                            color: '#C29B62'
                          }}>
                            {language === 'en' ? 'New' : 'جديد'}
                          </span>
                        )}
                      </div>
                      <p style={{ 
                        margin: '0 0 10px 0', 
                        fontSize: '14px', 
                        lineHeight: 1.6, 
                        color: isDaylight ? '#334155' : '#CBD5E1',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.message || msg.content}
                      </p>
                      <div style={{ fontSize: '12px', color: isDaylight ? '#94A3B8' : '#64748B' }}>
                        🕒 {new Date(msg.created_at).toLocaleString('ar-SA')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {!msg.is_read && (
                        <button
                          onClick={() => markAsRead(msg.id)}
                          title={language === 'en' ? 'Mark as read' : 'تحديد كمقروء'}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255,255,255,0.15)',
                            background: isDaylight ? '#F8FAFC' : 'rgba(255,255,255,0.08)',
                            color: isDaylight ? '#0F172A' : '#F8FAFC',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          ✓ {language === 'en' ? 'Read' : 'مقروء'}
                        </button>
                      )}
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        title={language === 'en' ? 'Delete' : 'حذف'}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#EF4444',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </MasterPage>
  );
}
