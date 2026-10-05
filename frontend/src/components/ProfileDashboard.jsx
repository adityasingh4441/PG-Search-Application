import { useEffect, useState } from 'react';
import { Bell, Bookmark, Building2, Check, ChevronRight, CircleAlert, Clock3, GraduationCap, Heart, LockKeyhole, LogOut, MessageCircle, Send, Settings2, Shield, Star, UserRound, X } from 'lucide-react';
import PGCard from './PGCard.jsx';
import { api, imageFor, money } from '../lib/api.js';

const tabs = [
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'saved', label: 'Saved PGs', icon: Heart },
  { id: 'enquiries', label: 'My Enquiries', icon: Building2 },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'reviews', label: 'My Reviews', icon: Star },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'recent', label: 'Recently Viewed', icon: Clock3 },
  { id: 'settings', label: 'Settings', icon: Settings2 },
  { id: 'safety', label: 'Safety & Reports', icon: Shield }
];

function ProfileHeading({ eyebrow, title, text }) {
  return <div className="profile-section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{text && <p>{text}</p>}</div>;
}

function EmptyPanel({ children }) {
  return <div className="profile-empty"><span><Bookmark size={19} /></span><p>{children}</p></div>;
}

export default function ProfileDashboard({ user, savedItems, onFavorite, onOpen, onProfileUpdate, onLogout, notificationCount, onNotificationCountChange }) {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(user);
  const [enquiries, setEnquiries] = useState([]);
  const [activeEnquiryId, setActiveEnquiryId] = useState('');
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [reports, setReports] = useState([]);
  const [pgs, setPgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function loadConversations() {
    const { items } = await api('/enquiries');
    setEnquiries(items);
    setActiveEnquiryId((current) => current || items[0]?._id || '');
  }

  useEffect(() => {
    setError('');
    setNotice('');
    let active = true;
    const loaders = {
      profile: async () => { const result = await api('/profile'); if (active) setProfile(result.user); },
      saved: async () => {},
      enquiries: loadConversations,
      messages: loadConversations,
      reviews: async () => { const result = await api('/profile/reviews'); if (active) setReviews(result.items); },
      notifications: async () => { const result = await api('/notifications'); if (active) { setNotifications(result.items); onNotificationCountChange(result.unread); } },
      recent: async () => { const result = await api('/profile/recently-viewed'); if (active) setRecentlyViewed(result.items); },
      settings: async () => { const result = await api('/profile'); if (active) setProfile(result.user); },
      safety: async () => {
        const [reportResult, pgResult] = await Promise.all([api('/reports'), api('/pgs?limit=48')]);
        if (active) { setReports(reportResult.items); setPgs(pgResult.items); }
      }
    };
    loaders[tab]?.().catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [tab, onNotificationCountChange]);

  async function submitProfile(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api('/profile', { method: 'PATCH', body: JSON.stringify(data) });
      setProfile(result.user);
      onProfileUpdate(result.user);
      setNotice('Profile updated.');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function submitPreferences(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const data = new FormData(event.currentTarget);
    const preferences = {
      location: data.get('location'),
      gender: data.get('gender'),
      minRent: data.get('minRent') ? Number(data.get('minRent')) : null,
      maxRent: data.get('maxRent') ? Number(data.get('maxRent')) : null,
      amenities: data.getAll('amenities')
    };
    const notificationSettings = {
      messages: data.get('messages') === 'on',
      listingUpdates: data.get('listingUpdates') === 'on'
    };
    try {
      const result = await api('/profile', { method: 'PATCH', body: JSON.stringify({ preferences, notificationSettings }) });
      setProfile(result.user);
      onProfileUpdate(result.user);
      setNotice('Preferences saved.');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function changePassword(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await api('/profile/password', { method: 'PATCH', body: JSON.stringify(data) });
      form.reset();
      setNotice('Password changed. Sign in again with your new password.');
      onLogout();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = String(new FormData(form).get('message') || '').trim();
    if (!message || !activeEnquiryId) return;
    setBusy(true);
    setError('');
    try {
      await api(`/enquiries/${activeEnquiryId}/messages`, { method: 'POST', body: JSON.stringify({ message }) });
      form.reset();
      await loadConversations();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function markRead(notification) {
    if (notification.readAt) return;
    try {
      await api(`/notifications/${notification._id}/read`, { method: 'PATCH' });
      setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item));
      onNotificationCountChange((current) => Math.max(0, current - 1));
    } catch (requestError) { setError(requestError.message); }
  }

  async function markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      setNotifications((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
      onNotificationCountChange(0);
    } catch (requestError) { setError(requestError.message); }
  }

  async function submitReport(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    setNotice('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api('/reports', { method: 'POST', body: JSON.stringify(data) });
      setReports((current) => [result.item, ...current]);
      form.reset();
      setNotice('Report received. Our team will review it.');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  const activeEnquiry = enquiries.find((item) => item._id === activeEnquiryId);
  const conversationMessages = activeEnquiry?.messages?.length
    ? activeEnquiry.messages
    : activeEnquiry ? [{ senderId: activeEnquiry.studentId, body: activeEnquiry.message, createdAt: activeEnquiry.createdAt }] : [];

  function setProfileField(name, value) {
    setProfile((current) => ({ ...current, [name]: value }));
  }

  return (
    <main className="profile-page">
      <div className="profile-page-heading">
        <div><p className="eyebrow">YOUR ROOMROOT ACCOUNT</p><h1>My Profile<span>.</span></h1><p>Manage your details, conversations, and saved PGs.</p></div>
        <button className="button button-outline profile-logout" onClick={onLogout}><LogOut size={15} /> Logout</button>
      </div>
      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-identity"><span className="profile-avatar">{profile.name?.slice(0, 1).toUpperCase()}</span><div><b>{profile.name}</b><span>{profile.email}</span></div></div>
          <label className="profile-mobile-select"><span>Profile section</span><select value={tab} onChange={(event) => setTab(event.target.value)}>{tabs.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <nav className="profile-tabs" aria-label="Profile sections">
            {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={16} /><span>{label}</span>{id === 'notifications' && notificationCount > 0 && <small>{notificationCount}</small>}<ChevronRight className="profile-tab-arrow" size={14} /></button>)}
          </nav>
          <button className="profile-sidebar-logout" onClick={onLogout}><LogOut size={15} /> Log out securely</button>
        </aside>

        <section className="profile-panel">
          {error && <div className="profile-feedback error" role="alert"><CircleAlert size={16} /> {error}</div>}
          {notice && <div className="profile-feedback success" role="status"><Check size={16} /> {notice}</div>}

          {tab === 'profile' && <>
            <ProfileHeading eyebrow="PERSONAL DETAILS" title="My Profile" text="Keep your contact and college details up to date." />
            <form className="profile-form" onSubmit={submitProfile}>
              <label>Full name<input name="name" autoComplete="name" value={profile.name || ''} onChange={(event) => setProfileField('name', event.target.value)} minLength="2" maxLength="80" required /></label>
              <label>Email address<input name="email" type="email" autoComplete="email" value={profile.email || ''} onChange={(event) => setProfileField('email', event.target.value)} required /></label>
              <label>Phone number<input name="phone" type="tel" autoComplete="tel" value={profile.phone || ''} onChange={(event) => setProfileField('phone', event.target.value)} maxLength="30" /></label>
              <label>College / university<input name="college" value={profile.college || ''} onChange={(event) => setProfileField('college', event.target.value)} maxLength="120" placeholder="GLA University" /></label>
              <button className="button button-primary" disabled={busy}>Save profile</button>
            </form>
          </>}

          {tab === 'saved' && <>
            <ProfileHeading eyebrow="YOUR SHORTLIST" title="Saved PGs" text={`${savedItems.length} ${savedItems.length === 1 ? 'PG' : 'PGs'} saved for later.`} />
            {savedItems.length ? <div className="profile-card-grid">{savedItems.map((item) => <PGCard key={item._id} item={item} favorite onFavorite={onFavorite} onOpen={onOpen} />)}</div> : <EmptyPanel>PGs you save will show up here.</EmptyPanel>}
          </>}

          {(tab === 'enquiries' || tab === 'messages') && <>
            <ProfileHeading eyebrow={tab === 'messages' ? 'OWNER CONVERSATIONS' : 'YOUR ACTIVITY'} title={tab === 'messages' ? 'Messages' : 'My Enquiries'} text="Keep all your PG enquiries and owner replies together." />
            {enquiries.length ? <div className="conversation-layout">
              <div className="conversation-list">{enquiries.map((item) => <button key={item._id} className={`conversation-choice ${activeEnquiryId === item._id ? 'active' : ''}`} onClick={() => setActiveEnquiryId(item._id)}><span><b>{item.pgId?.name || 'PG enquiry'}</b><small>{item.ownerId?.name || 'Owner'} · {item.status}</small></span><ChevronRight size={15} /></button>)}</div>
              {activeEnquiry && <div className="conversation-panel">
                <div className="conversation-title"><div><b>{activeEnquiry.pgId?.name || 'PG enquiry'}</b><span>{activeEnquiry.pgId?.area} · {activeEnquiry.status}</span></div>{activeEnquiry.pgId && <button className="text-link" onClick={() => onOpen(activeEnquiry.pgId)}>View PG</button>}</div>
                <div className="conversation-messages">{conversationMessages.map((item) => {
                  const senderId = typeof item.senderId === 'object' ? item.senderId?._id : item.senderId;
                  const ownMessage = String(senderId) === String(user.id);
                  return <article key={item._id || `${item.createdAt}-${item.body}`} className={`message-bubble ${ownMessage ? 'own' : ''}`}><span>{ownMessage ? 'You' : item.senderId?.name || (user.role === 'student' ? 'Owner' : 'Student')}</span><p>{item.body}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</small></article>;
                })}</div>
                <form className="message-composer" onSubmit={sendMessage}><input name="message" maxLength="2000" placeholder="Write a message…" required /><button className="icon-button" aria-label="Send message" disabled={busy}><Send size={17} /></button></form>
              </div>}
            </div> : <EmptyPanel>Your PG enquiries and conversations will show up here.</EmptyPanel>}
          </>}

          {tab === 'reviews' && <>
            <ProfileHeading eyebrow="YOUR WORDS MATTER" title="My Reviews" text="Reviews you have shared with other students." />
            {reviews.length ? <div className="profile-review-list">{reviews.map((review) => <article key={review._id} className="profile-review"><div className="profile-review-image">{imageFor(review.pgId) && <img src={imageFor(review.pgId)} alt="" />}</div><div><b>{review.pgId?.name || 'PG listing'}</b><span>{review.pgId?.area} · {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><p>{review.comment}</p><small>{new Date(review.createdAt).toLocaleDateString()}</small></div></article>)}</div> : <EmptyPanel>Reviews you post from a PG’s details will appear here.</EmptyPanel>}
          </>}

          {tab === 'notifications' && <>
            <div className="profile-heading-row"><ProfileHeading eyebrow="ACCOUNT UPDATES" title="Notifications" text={`${notificationCount} unread notification${notificationCount === 1 ? '' : 's'}.`} />{notifications.some((item) => !item.readAt) && <button className="button button-outline" onClick={markAllRead}>Mark all read</button>}</div>
            {notifications.length ? <div className="notification-list">{notifications.map((item) => <button key={item._id} className={`notification-item ${item.readAt ? '' : 'unread'}`} onClick={() => { markRead(item); if (item.pgId) onOpen(item.pgId); }}><span className="notification-icon"><Bell size={16} /></span><span><b>{item.message}</b><small>{item.pgId?.name} · {new Date(item.createdAt).toLocaleString()}</small></span>{!item.readAt && <i />}</button>)}</div> : <EmptyPanel>New enquiries, replies, and listing updates will appear here.</EmptyPanel>}
          </>}

          {tab === 'recent' && <>
            <ProfileHeading eyebrow="PICK UP WHERE YOU LEFT OFF" title="Recently Viewed" text="PGs you opened most recently." />
            {recentlyViewed.length ? <div className="profile-card-grid">{recentlyViewed.map((item) => <PGCard key={item._id} item={item} favorite={savedItems.some((saved) => saved._id === item._id)} onFavorite={onFavorite} onOpen={onOpen} />)}</div> : <EmptyPanel>PGs you view will be saved here for easy return.</EmptyPanel>}
          </>}

          {tab === 'settings' && <>
            <ProfileHeading eyebrow="YOUR ACCOUNT, YOUR WAY" title="Settings" text="Manage your search preferences, updates, and password." />
            <form className="profile-form settings-form" onSubmit={submitPreferences}>
              <h3>Search preferences</h3>
              <label>Preferred location<input name="location" defaultValue={profile.preferences?.location || 'GLA University, Mathura'} /></label>
              <div className="profile-form-row"><label>PG preference<select name="gender" defaultValue={profile.preferences?.gender || ''}><option value="">No preference</option><option value="Men">Boys</option><option value="Women">Girls</option><option value="Any">Any</option></select></label><label>Minimum rent<input name="minRent" type="number" min="0" defaultValue={profile.preferences?.minRent ?? ''} /></label></div>
              <label>Maximum rent<input name="maxRent" type="number" min="0" defaultValue={profile.preferences?.maxRent ?? ''} /></label>
              <fieldset className="settings-checks"><legend>Preferred amenities</legend>{['AC', 'Meals', 'Wi-Fi', 'Parking'].map((amenity) => <label key={amenity}><input type="checkbox" name="amenities" value={amenity} defaultChecked={profile.preferences?.amenities?.includes(amenity)} />{amenity}</label>)}</fieldset>
              <fieldset className="settings-checks notification-settings"><legend>Notifications</legend><label><input type="checkbox" name="messages" defaultChecked={profile.notificationSettings?.messages !== false} />Messages and enquiries</label><label><input type="checkbox" name="listingUpdates" defaultChecked={profile.notificationSettings?.listingUpdates !== false} />PG and listing updates</label></fieldset>
              <button className="button button-primary" disabled={busy}>Save settings</button>
            </form>
            <form className="profile-form password-form" onSubmit={changePassword}><h3><LockKeyhole size={16} /> Change password</h3><label>Current password<input type="password" name="currentPassword" autoComplete="current-password" required /></label><label>New password<input type="password" name="newPassword" minLength="8" autoComplete="new-password" required /></label><button className="button button-outline" disabled={busy}>Update password</button></form>
          </>}

          {tab === 'safety' && <>
            <ProfileHeading eyebrow="HELP KEEP ROOMROOT TRUSTED" title="Safety & Reports" text="Tell us if a listing seems unsafe, misleading, or suspicious." />
            <form className="profile-form report-form" onSubmit={submitReport}>
              <label>PG to report<select name="pgId" required defaultValue=""><option value="" disabled>Select a PG</option>{pgs.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.area}</option>)}</select></label>
              <label>Reason<select name="reason" required defaultValue=""><option value="" disabled>Select a reason</option><option value="unsafe">Unsafe conditions</option><option value="misleading">Misleading information</option><option value="fraud">Suspected fraud</option><option value="harassment">Harassment</option><option value="other">Other concern</option></select></label>
              <label>What happened?<textarea name="details" minLength="10" maxLength="2000" rows="4" placeholder="Share relevant details with our review team." required /></label>
              <button className="button button-primary" disabled={busy}><CircleAlert size={15} /> Submit report</button>
            </form>
            <div className="report-history"><h3>My reports</h3>{reports.length ? reports.map((report) => <article key={report._id}><div><b>{report.pgId?.name || 'PG listing'}</b><span>{report.reason} · {new Date(report.createdAt).toLocaleDateString()}</span></div><span className={`status-pill status-${report.status === 'new' ? 'pending' : report.status}`}>{report.status}</span></article>) : <EmptyPanel>No reports submitted.</EmptyPanel>}</div>
          </>}
        </section>
      </div>
    </main>
  );
}
