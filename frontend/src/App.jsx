import { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, ArrowRight, Building2, CarFront, Check, ChevronDown, CircleHelp, Compass, Facebook, GraduationCap, Heart, Instagram, Linkedin, LogOut, MapPin, Menu, MessageCircle, Plus, Search, Share2, ShieldCheck, SlidersHorizontal, Snowflake, Sparkles, UserRound, Utensils, Wifi, X } from 'lucide-react';
import AuthDialog from './components/AuthDialog.jsx';
import ListingDialog from './components/ListingDialog.jsx';
import MapPreview from './components/MapPreview.jsx';
import PGCard from './components/PGCard.jsx';
import ProfileDashboard from './components/ProfileDashboard.jsx';
import { api, imageFor, money } from './lib/api.js';

const GLA_CENTER = { lat: 27.6084, lng: 77.5881 };
const initialFilters = { q: '', name: '', area: '', city: '', minRent: '', maxRent: '', gender: '', amenity: '', amenities: [], sort: 'newest' };
const cityCards = [
  { name: 'Delhi', subtitle: 'Fast-growing superb', image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=900&q=80' },
  { name: 'Noida', subtitle: 'Newest launch', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80' },
  { name: 'Greater Noida', subtitle: 'Growing IT corridor', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80' },
  { name: 'Gurugram', subtitle: 'Where life begins', image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80' },
  { name: 'Bangalore', subtitle: 'Whitefield & beyond', image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80' },
  { name: 'Mumbai', subtitle: 'Financial capital', image: 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&w=900&q=80' },
  { name: 'Pune', subtitle: 'Rising city hub', image: 'https://images.unsplash.com/photo-1544735716-392feef6f0b2?auto=format&fit=crop&w=900&q=80' },
  { name: 'Ghaziabad', subtitle: 'NCR’s next hotspot', image: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&q=80' },
  { name: 'Hyderabad', subtitle: 'Booming tech hub', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80' },
  { name: 'Chennai', subtitle: 'South India’s gateway', image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=80' },
  { name: 'Faridabad', subtitle: 'Affordable & well-connected', image: 'https://images.unsplash.com/photo-1520923642038-b4259acecbd7?auto=format&fit=crop&w=900&q=80' },
  { name: 'Mathura', subtitle: 'Home near GLA University', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80' },
  { name: 'Pan India', subtitle: 'Search across all India', image: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=900&q=80' }
];

function distanceFromGla(item) {
  const coordinates = item.location?.coordinates;
  if (!coordinates || coordinates.length !== 2) return '';
  const [longitude, latitude] = coordinates;
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(latitude - GLA_CENTER.lat);
  const longitudeDelta = radians(longitude - GLA_CENTER.lng);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(GLA_CENTER.lat)) * Math.cos(radians(latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return `${(6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))).toFixed(1)} km from GLA`;
}

async function locate(query, items) {
  if (!query || /gla|university/i.test(query)) return GLA_CENTER;
  const normalizedQuery = query.toLowerCase();
  const matches = items.filter((item) => {
    const area = item.area?.toLowerCase() || '';
    return [item.name, item.area, item.address].some((value) => value?.toLowerCase().includes(normalizedQuery))
      || (area && normalizedQuery.includes(area));
  });
  const coordinates = matches.map((item) => item.location?.coordinates).filter((value) => value?.length === 2);
  if (coordinates.length) {
    return {
      lng: coordinates.reduce((sum, value) => sum + value[0], 0) / coordinates.length,
      lat: coordinates.reduce((sum, value) => sum + value[1], 0) / coordinates.length
    };
  }
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Could not look up that location. Try a nearby town or neighborhood.');
  const [place] = await response.json();
  if (!place) throw new Error('Could not find that location. Try a nearby town or neighborhood.');
  return { lat: Number(place.lat), lng: Number(place.lon) };
}

function PGDetails({ item, favorite, user, onFavorite, onClose, onEnquire }) {
  const [reviews, setReviews] = useState([]);
  const [reviewError, setReviewError] = useState('');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquirySent, setEnquirySent] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const image = imageFor(item);

  useEffect(() => {
    api(`/pgs/${item._id}/reviews`).then(({ items: results }) => setReviews(results)).catch(() => setReviews([]));
  }, [item._id]);

  async function submitReview(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setReviewBusy(true);
    setReviewError('');
    const form = new FormData(formElement);
    try {
      const { item: review } = await api(`/pgs/${item._id}/reviews`, { method: 'POST', body: JSON.stringify({ rating: Number(form.get('rating')), comment: form.get('comment') }) });
      setReviews((current) => [review, ...current]);
      formElement.reset();
    } catch (error) { setReviewError(error.message); }
    finally { setReviewBusy(false); }
  }

  async function submitEnquiry(event) {
    event.preventDefault();
    try {
      await onEnquire(item._id, enquiryMessage);
      setEnquirySent(true);
      setEnquiryOpen(false);
      setEnquiryMessage('');
    } catch (error) { setReviewError(error.message); }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="detail-photo">{image ? <img src={image} alt={`${item.name} interior`} /> : <span className="image-placeholder detail-placeholder"><span>RR</span><small>{item.area}</small></span>}</div>
        <div className="detail-content">
          <div className="detail-topline"><span className="verified-mark inline"><span className="verified-dot" /> Verified stay</span><button className={`text-icon ${favorite ? 'is-favorite-text' : ''}`} onClick={() => onFavorite(item._id)}><Heart size={17} fill={favorite ? 'currentColor' : 'none'} /> {favorite ? 'Saved' : 'Save stay'}</button></div>
          <div className="detail-title-row"><div><p className="eyebrow">{item.gender === 'Any' ? 'All genders' : `${item.gender} only`} · {[item.area, item.city].filter(Boolean).join(', ')}</p><h2 id="detail-title">{item.name}</h2></div><p className="detail-rating">★ {item.rating?.toFixed(1) || 'New'} <small>({item.reviewCount || 0} reviews)</small></p></div>
          <p className="detail-address"><MapPin size={15} /> {item.address}</p>
          <p className="detail-description">{item.description}</p>
          <div className="detail-amenities">{(item.amenities || []).map((amenity) => <span key={amenity}>{amenity}</span>)}</div>
          <div className="detail-bottom"><div><b>{money(item.rent)}</b><small> / month <span>·</span> {money(item.deposit)} deposit</small></div><div className="detail-contact-actions">{item.ownerId?.phone && <a className="button button-outline" href={`tel:${item.ownerId.phone}`}>Call owner</a>}{user?.role === 'student' && <button className="button button-primary" onClick={() => setEnquiryOpen(!enquiryOpen)}>{enquirySent ? 'Enquiry sent' : 'Ask about this stay'} <ArrowRight size={15} /></button>}</div></div>
          {enquiryOpen && <form className="detail-interaction-form" onSubmit={submitEnquiry}><label htmlFor="enquiry-message">Message the owner</label><textarea id="enquiry-message" rows="3" minLength="10" maxLength="2000" required value={enquiryMessage} onChange={(event) => setEnquiryMessage(event.target.value)} placeholder="Ask about availability, move-in dates or anything else…" /><button className="button button-primary" type="submit">Send enquiry</button></form>}
          {enquirySent && <p className="success-note"><Check size={15} /> Your enquiry has been sent to the owner.</p>}
          <section className="reviews-section"><div className="reviews-heading"><h3>Notes from residents</h3><span>★ {item.rating?.toFixed(1) || 'New'} · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span></div>{reviews.length ? <div className="review-list">{reviews.slice(0, 4).map((review) => <article className="review-item" key={review._id}><div><b>{review.userId?.name || 'Resident'}</b><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div><p>{review.comment}</p></article>)}</div> : <p className="no-reviews">No reviews yet. Be the first to share your experience.</p>}{user?.role === 'student' && !reviews.some((review) => review.userId?._id === user.id) && <form className="review-form" onSubmit={submitReview}><label>Leave a review<select name="rating" defaultValue="5"><option value="5">5 stars · Loved it</option><option value="4">4 stars · Really good</option><option value="3">3 stars · It was fine</option><option value="2">2 stars · Could improve</option><option value="1">1 star · Not for me</option></select></label><textarea name="comment" rows="2" minLength="5" maxLength="1200" placeholder="What should another student know?" required /><button className="button button-outline" disabled={reviewBusy}>{reviewBusy ? 'Posting…' : 'Post review'}</button></form>}{reviewError && <p className="form-error" role="alert">{reviewError}</p>}</section>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ title, text, onAction, action }) {
  return <div className="empty-state"><div className="empty-icon"><Compass size={22} /></div><h3>{title}</h3><p>{text}</p>{action && <button className="button button-outline" onClick={onAction}>{action}<ArrowRight size={15} /></button>}</div>;
}

function InfoDialog({ type, onClose, onAction }) {
  const content = {
    contact: { title: 'Contact Roomroot', text: 'For questions about a stay, open its details and send the owner an enquiry. Owners can reply through their Roomroot inbox.', action: 'Find a PG' },
    terms: { title: 'Terms of use', text: 'Roomroot helps students discover accommodation and helps owners share listings. Owners are responsible for accurate listing details. Confirm rent, availability, and written terms directly before making a payment.' },
    privacy: { title: 'Privacy', text: 'Roomroot uses account details to provide sign-in, saved stays, reviews, and enquiries. Do not include sensitive personal or payment information in listing enquiries.' }
  }[type];
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog info-dialog" role="dialog" aria-modal="true" aria-labelledby="info-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <p className="eyebrow">ROOMROOT</p>
        <h2 id="info-title">{content.title}</h2>
        <p className="dialog-intro">{content.text}</p>
        {content.action && <button className="button button-primary" onClick={onAction}>{content.action}<ArrowRight size={15} /></button>}
      </section>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('discover');
  const [cityPage, setCityPage] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState([]);
  const [nearbyItems, setNearbyItems] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [center, setCenter] = useState(GLA_CENTER);
  const [locationQuery, setLocationQuery] = useState('GLA University, Mathura');
  const [nameQuery, setNameQuery] = useState('');
  const [saved, setSaved] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [user, setUser] = useState(null);
  const [dialog, setDialogState] = useState('');
  const [detail, setDetailState] = useState(null);
  const [pending, setPending] = useState([]);
  const [ownerItems, setOwnerItems] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [infoDialog, setInfoDialogState] = useState('');
  const historyIndex = useRef(0);

  useEffect(() => {
    const initialState = { roomroot: true, screen: 'discover', index: 0 };
    const currentState = window.history.state;
    if (currentState?.roomroot) {
      historyIndex.current = currentState.index || 0;
      setScreen(currentState.screen || 'discover');
      setCityPage(currentState.city || '');
      if (currentState.screen === 'city' && currentState.city) {
        setFilters({ ...initialFilters, city: currentState.city === 'Pan India' ? '' : currentState.city });
      }
      setDetailState(currentState.detail || null);
      setDialogState(currentState.dialog || '');
      setInfoDialogState(currentState.infoDialog || '');
    } else {
      window.history.replaceState(initialState, '', window.location.href);
    }

    function restoreScreen(event) {
      const nextState = event.state?.roomroot ? event.state : initialState;
      historyIndex.current = nextState.index || 0;
      setScreen(nextState.screen || 'discover');
      setCityPage(nextState.city || '');
      if (nextState.screen === 'city' && nextState.city) {
        setFilters({ ...initialFilters, city: nextState.city === 'Pan India' ? '' : nextState.city });
      }
      setDetailState(nextState.detail || null);
      setDialogState(nextState.dialog || '');
      setInfoDialogState(nextState.infoDialog || '');
      setMobileMenu(false);
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleBackspace(event) {
      if (event.key !== 'Backspace' || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (window.history.state?.roomroot && window.history.state.index > 0) {
        event.preventDefault();
        window.history.back();
      }
    }

    window.addEventListener('popstate', restoreScreen);
    window.addEventListener('keydown', handleBackspace);
    return () => {
      window.removeEventListener('popstate', restoreScreen);
      window.removeEventListener('keydown', handleBackspace);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('roomroot-token');
    if (token) api('/auth/me').then(({ user: activeUser }) => setUser(activeUser)).catch(() => localStorage.removeItem('roomroot-token'));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value) ? value.length > 0 : Boolean(value)) params.set(key, Array.isArray(value) ? value.join(',') : value);
    });
    setLoading(true);
    setError('');
    api(`/pgs?${params}`)
      .then(({ items: results }) => setItems(results))
      .catch((requestError) => { setItems([]); setError(requestError.message); })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    let active = true;
    setNearbyLoading(true);
    api(`/pgs/nearby?lng=${center.lng}&lat=${center.lat}&radius=25000`)
      .then(({ items: results }) => { if (active) setNearbyItems(results); })
      .catch(() => { if (active) setNearbyItems([]); })
      .finally(() => { if (active) setNearbyLoading(false); });
    return () => { active = false; };
  }, [center]);

  useEffect(() => {
    if (!user) { setSaved([]); setFavoriteItems([]); setNotificationCount(0); return; }
    api('/pgs/favorites').then(({ items: results }) => {
      setSaved(results.map((item) => item._id));
      setFavoriteItems(results);
    }).catch(() => { setSaved([]); setFavoriteItems([]); });
    api('/notifications').then(({ unread }) => setNotificationCount(unread)).catch(() => setNotificationCount(0));
  }, [user]);

  useEffect(() => {
    if (screen === 'owner' && user?.role === 'owner') {
      Promise.all([api('/pgs/mine'), api('/enquiries')]).then(([listings, inbox]) => { setOwnerItems(listings.items); setEnquiries(inbox.items); }).catch((requestError) => setError(requestError.message));
    }
    if (screen === 'admin' && user?.role === 'admin') api('/admin/pgs/pending').then(({ items: results }) => setPending(results)).catch((requestError) => setError(requestError.message));
  }, [screen, user]);

  function pushAppState(nextState) {
    const currentIndex = window.history.state?.roomroot ? window.history.state.index || 0 : historyIndex.current;
    const index = currentIndex + 1;
    historyIndex.current = index;
    window.history.pushState({ roomroot: true, screen, index, ...nextState }, '', window.location.href);
  }

  function goTo(nextScreen) {
    if (nextScreen !== screen) pushAppState({ screen: nextScreen });
    setScreen(nextScreen);
    setMobileMenu(false);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openCity(city) {
    pushAppState({ screen: 'city', city });
    setCityPage(city);
    setScreen('city');
    setFilters({ ...initialFilters, city: city === 'Pan India' ? '' : city });
    setLocationQuery(`${city}, India`);
    setNameQuery('');
    setError('');
    setMobileMenu(false);
    window.scrollTo({ top:  0, behavior: 'smooth' });
  }

  function openDialog(type) {
    pushAppState({ dialog: type, detail: null, infoDialog: '' });
    setDialogState(type);
  }

  function openInfoDialog(type) {
    pushAppState({ infoDialog: type, detail: null, dialog: '' });
    setInfoDialogState(type);
  }

  function closeOverlay() {
    const state = window.history.state;
    if (state?.roomroot && state.index > 0 && (state.detail || state.dialog || state.infoDialog)) {
      window.history.back();
      return;
    }
    setDetailState(null);
    setDialogState('');
    setInfoDialogState('');
  }

  function setDialog(type) {
    if (type) openDialog(type);
    else closeOverlay();
  }

  function setDetail(item) {
    if (item) openDetail(item);
    else closeOverlay();
  }

  function scrollToSection(id) {
    setMobileMenu(false);
    if (screen !== 'discover') goTo('discover');
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 0);
  }

  function goToSearch() {
    scrollToSection('search-pgs');
  }

  async function searchStays(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = String(data.get('location') || '').trim();
    const normalizedCity = query.replace(/,\s*India$/i, '').trim().toLowerCase();
    const selectedCity = cityCards.find((city) => city.name.toLowerCase() === normalizedCity)?.name || '';
    const pgName = String(data.get('pgName') || '').trim();
    const minRent = Number(data.get('minRent'));
    const maxRent = Number(data.get('maxRent'));
    if (minRent && maxRent && minRent > maxRent) {
      setSearchError('Maximum rent must be at least the minimum rent.');
      return;
    }
    setSearchError('');
    try {
      const nextCenter = await locate(query, nearbyItems);
      setCenter(nextCenter);
      setLocationQuery(query || 'GLA University, Mathura');
      setError('');
      setFilters((current) => ({
        ...current,
        q: /gla university/i.test(query) || selectedCity ? '' : query,
        name: pgName,
        area: '',
        city: selectedCity === 'Pan India' ? '' : selectedCity,
        minRent: String(data.get('minRent') || ''),
        maxRent: String(data.get('maxRent') || '')
      }));
      document.getElementById('featured-pgs')?.scrollIntoView({ behavior: 'smooth' });
    } catch (requestError) {
      setSearchError(requestError.message);
    }
  }

  function toggleQuickFilter(type, value) {
    setFilters((current) => {
      if (type === 'gender') return { ...current, gender: current.gender === value ? '' : value };
      const amenities = current.amenities || [];
      const nextAmenities = amenities.includes(value) ? amenities.filter((amenity) => amenity !== value) : [...amenities, value];
      return { ...current, amenity: '', amenities: nextAmenities };
    });
  }

  async function authenticate(form) {
    const mode = form.name ? 'register' : 'login';
    const result = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
    localStorage.setItem('roomroot-token', result.token);
    setUser(result.user);
    closeOverlay();
    setNotice(mode === 'register' ? 'You’re in. Welcome to Roomroot.' : 'Welcome back.');
  }

  async function toggleFavorite(id) {
    if (!user) { openDialog('auth'); return; }
    try {
      const { favorite } = await api(`/pgs/${id}/favorite`, { method: 'POST' });
      setSaved((current) => favorite ? [...new Set([...current, id])] : current.filter((savedId) => savedId !== id));
      const { items: favoriteResults } = await api('/pgs/favorites');
      setFavoriteItems(favoriteResults);
    } catch (requestError) { setError(requestError.message); }
  }

  function openDetail(item) {
    if (window.history.state?.detail?._id !== item._id) pushAppState({ detail: item, dialog: '', infoDialog: '' });
    setDetailState(item);
    if (user && item.status === 'approved') {
      api('/profile/recently-viewed', { method: 'POST', body: JSON.stringify({ pgId: item._id }) }).catch(() => {});
    }
  }

  async function createListing(data) {
    await api('/pgs', { method: 'POST', body: JSON.stringify(data) });
    closeOverlay();
    const { items: results } = await api('/pgs/mine');
    setOwnerItems(results);
    setNotice('Your listing is with our team for review.');
  }

  async function sendEnquiry(pgId, message) {
    await api('/enquiries', { method: 'POST', body: JSON.stringify({ pgId, message }) });
  }

  async function updateEnquiry(id, status) {
    try {
      await api(`/enquiries/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setEnquiries((current) => current.map((item) => item._id === id ? { ...item, status } : item));
    } catch (requestError) { setError(requestError.message); }
  }

  async function decideListing(id, decision) {
    try {
      await api(`/admin/pgs/${id}/${decision}`, { method: 'PATCH' });
      setPending((current) => current.filter((item) => item._id !== id));
      setNotice(decision === 'approve' ? 'Stay approved and ready to discover.' : 'Listing rejected.');
    } catch (requestError) { setError(requestError.message); }
  }

  async function signOut() {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem('roomroot-token');
    setUser(null);
    setSaved([]);
    setNotificationCount(0);
    setDetailState(null);
    setScreen('discover');
    const index = window.history.state?.roomroot ? window.history.state.index || 0 : historyIndex.current;
    window.history.replaceState({ roomroot: true, screen: 'discover', index }, '', window.location.href);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNotice('You’ve signed out securely.');
  }

  const visibleItems = screen === 'favorites' ? favoriteItems : items;

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); goTo('discover'); }}><span className="brand-symbol"><span /></span><span>PG Search<small>ROOMROOT STUDENT LIVING</small></span></a>
        <button className="mobile-menu-button icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? <X size={21} /> : <Menu size={21} />}</button>
        <nav className={`main-nav ${mobileMenu ? 'nav-open' : ''}`}>
          <button className={screen === 'discover' ? 'active' : ''} onClick={() => goTo('discover')}>Home</button>
          <button onClick={goToSearch}>Search PG</button>
          <button className={screen === 'favorites' ? 'active' : ''} onClick={() => user ? goTo('favorites') : openDialog('auth')}><Heart size={15} /> Favorites{saved.length > 0 && <span className="nav-count">{saved.length}</span>}</button>
          {user?.role === 'owner' && <button className={screen === 'owner' ? 'active' : ''} onClick={() => goTo('owner')}>My stays</button>}
          {user?.role === 'admin' && <button className={screen === 'admin' ? 'active' : ''} onClick={() => goTo('admin')}>Review queue</button>}
          {user && <button className={screen === 'profile' ? 'active' : ''} onClick={() => goTo('profile')}><UserRound size={15} /> My Profile{notificationCount > 0 && <span className="nav-count">{notificationCount}</span>}</button>}
        </nav>
        <div className="header-actions">
          {user?.role === 'owner' && <button className="button button-outline header-list-button" onClick={() => openDialog('listing')}><Plus size={15} /> List your place</button>}
          {user ? <div className="account-menu"><button className="account-profile-link" onClick={() => goTo('profile')}><span className="avatar">{user.name?.slice(0, 1).toUpperCase()}</span><span className="account-name">{user.name.split(' ')[0]}</span></button><button title="Sign out" aria-label="Sign out" className="icon-button logout-button" onClick={signOut}><LogOut size={16} /></button></div> : <button className="button button-dark" onClick={() => openDialog('auth')}>Login / Register <ArrowRight size={15} /></button>}
        </div>
      </header>

      {screen === 'discover' && <>
        <main>
          <section className="hero-section" id="home">
            <div className="hero-copy">
              <p className="eyebrow"><span className="eyebrow-line" /> ROOMROOT · MATHURA</p>
              <h1>Find Your Perfect PG <em>Near GLA University</em></h1>
              <p className="hero-description">Student-friendly stays with the right comforts, price, and distance from campus.</p>
              <div className="hero-meta"><span><ShieldCheck size={16} /> Reviewed places</span><span><Sparkles size={16} /> Made for student life</span></div>
            </div>
            <div className="hero-visual">
              <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85" alt="Warm, sunlit shared living room" />
              <div className="hero-image-caption"><span>ROOM TO BECOME</span><span>01 / 04</span></div>
              <div className="hero-note"><span className="note-star">✳</span><span>Good spaces.<br /><b>Better beginnings.</b></span></div>
            </div>
            <div className="hero-index">01 <span /> FIND YOUR PLACE</div>
          </section>

          <section className="search-section" id="search-pgs" aria-label="Search PGs">
            <form className="search-bar" onSubmit={searchStays}>
              <label className="search-field location-field"><MapPin size={19} /><span><small>LOCATION</small><input name="location" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="GLA University, Mathura" /></span></label>
              <label className="search-field name-field"><Search size={18} /><span><small>PG NAME</small><input name="pgName" value={nameQuery} onChange={(event) => setNameQuery(event.target.value)} placeholder="e.g. Mango Courtyard" /></span></label>
              <label className="search-field rent-field"><span><small>MIN RENT / MONTH</small><select name="minRent" value={filters.minRent} onChange={(event) => setFilters((current) => ({ ...current, minRent: event.target.value }))}><option value="">No minimum</option><option value="5000">₹5,000</option><option value="8000">₹8,000</option><option value="12000">₹12,000</option></select></span><ChevronDown size={14} /></label>
              <label className="search-field rent-field"><span><small>MAX RENT / MONTH</small><select name="maxRent" value={filters.maxRent} onChange={(event) => setFilters((current) => ({ ...current, maxRent: event.target.value }))}><option value="">No maximum</option><option value="8000">₹8,000</option><option value="12000">₹12,000</option><option value="18000">₹18,000</option><option value="25000">₹25,000</option></select></span><ChevronDown size={14} /></label>
              <button className="search-submit" aria-label="Search PGs"><Search size={18} /><span>Search PGs</span></button>
            </form>
            {searchError && <p className="search-error" role="alert">{searchError}</p>}
          </section>

          <section className="quick-filters" aria-label="Quick filters">
            <span className="quick-filter-heading">QUICK FILTERS</span>
            <div className="quick-chip-row">
              <button className={`quick-chip ${filters.gender === 'Men' ? 'selected' : ''}`} onClick={() => toggleQuickFilter('gender', 'Men')}>Boys</button>
              <button className={`quick-chip ${filters.gender === 'Women' ? 'selected' : ''}`} onClick={() => toggleQuickFilter('gender', 'Women')}>Girls</button>
              <button className={`quick-chip ${filters.amenities.includes('AC') ? 'selected' : ''}`} onClick={() => toggleQuickFilter('amenity', 'AC')}><Snowflake size={15} /> AC</button>
              <button className={`quick-chip ${filters.amenities.includes('Meals') ? 'selected' : ''}`} onClick={() => toggleQuickFilter('amenity', 'Meals')}><Utensils size={15} /> Food</button>
              <button className={`quick-chip ${filters.amenities.includes('Wi-Fi') ? 'selected' : ''}`} onClick={() => toggleQuickFilter('amenity', 'Wi-Fi')}><Wifi size={15} /> Wi-Fi</button>
              <button className={`quick-chip ${filters.amenities.includes('Parking') ? 'selected' : ''}`} onClick={() => toggleQuickFilter('amenity', 'Parking')}><CarFront size={15} /> Parking</button>
            </div>
          </section>

          <section className="results-section" id="featured-pgs">
            <div className="results-heading"><div><p className="eyebrow">HANDPICKED FOR STUDENT LIFE</p><h2>Featured PGs<span>.</span></h2></div><p>Real places to settle in, focus,<br className="desktop-break" /> and feel at home near campus.</p></div>
            <div className="filter-row">
              <div className="filter-label"><SlidersHorizontal size={15} /> REFINE YOUR SEARCH</div>
              <label className="filter-select"><span>Monthly budget</span><select value={filters.maxRent} onChange={(event) => setFilters((current) => ({ ...current, maxRent: event.target.value }))}><option value="">Any price</option><option value="8000">Under ₹8,000</option><option value="12000">Under ₹12,000</option><option value="18000">Under ₹18,000</option><option value="25000">Under ₹25,000</option></select><ChevronDown size={14} /></label>
              <label className="filter-select"><span>Who it’s for</span><select value={filters.gender} onChange={(event) => setFilters((current) => ({ ...current, gender: event.target.value }))}><option value="">Everyone</option><option value="Women">Women</option><option value="Men">Men</option><option value="Any">All genders</option></select><ChevronDown size={14} /></label>
              <label className="filter-select amenity-filter"><span>Must have</span><select value={filters.amenity} onChange={(event) => setFilters((current) => ({ ...current, amenity: event.target.value }))}><option value="">Any amenity</option><option>Wi-Fi</option><option>Meals</option><option>AC</option><option>Laundry</option><option>Parking</option></select><ChevronDown size={14} /></label>
              <label className="sort-select"><ArrowDownUp size={14} /><select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}><option value="newest">Recently added</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="rating">Top rated</option></select><ChevronDown size={14} /></label>
            </div>
            <div className="results-count"><span>{loading ? 'Finding your places…' : `${visibleItems.length} ${visibleItems.length === 1 ? 'stay' : 'stays'} to explore`}</span><span>Only admin-approved listings appear here</span></div>
            {error && <div className="connection-error"><CircleHelp size={19} /><div><b>We couldn’t load the stays.</b><p>{error}</p></div><button className="icon-button" onClick={() => setFilters({ ...filters })} aria-label="Retry"><ArrowRight size={17} /></button></div>}
            {loading ? <div className="loading-row"><span /><span /><span /></div> : visibleItems.length ? <div className="pg-grid">{visibleItems.map((item) => <PGCard key={item._id} item={item} favorite={saved.includes(item._id)} onFavorite={toggleFavorite} onOpen={openDetail} />)}</div> : !error && <EmptyState title="No PGs match those filters." text="Try another location, rent range, name, or amenity." onAction={() => { setFilters(initialFilters); setLocationQuery('GLA University, Mathura'); setNameQuery(''); }} action="Clear filters" />}
          </section>

          <section className="nearby-section" id="nearby-pgs">
            <div className="section-heading nearby-heading"><div><p className="eyebrow">CLOSE TO YOUR SEARCH</p><h2>Nearby PGs<span>.</span></h2><p>Showing stays around {locationQuery || 'GLA University, Mathura'}.</p></div><a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${center.lat}%2C${center.lng}`} target="_blank" rel="noreferrer"><MapPin size={15} /> Open in Google Maps</a></div>
            <div className="nearby-layout">
              <div className="nearby-list">
                {nearbyLoading ? <div className="nearby-loading">Finding nearby stays…</div> : nearbyItems.length ? nearbyItems.slice(0, 3).map((item) => <PGCard key={item._id} item={item} favorite={saved.includes(item._id)} distanceLabel={distanceFromGla(item)} onFavorite={toggleFavorite} onOpen={openDetail} />) : <EmptyState title="No nearby PGs yet." text="Try a different location to see stays around you." />}
              </div>
              <div className="nearby-map-panel"><div className="map-heading"><div><MapPin size={16} /><b>Map preview</b></div><span>{nearbyItems.length} locations</span></div><MapPreview items={nearbyItems} center={center} onSelect={setDetail} /></div>
            </div>
          </section>

          <section className="city-section">
            <div className="city-header">
              <p className="eyebrow">WHERE WE OPERATE</p>
              <h2>Cities We Call Home</h2>
              <p>Find your next residence in India&apos;s leading hubs.</p>
            </div>
            <div className="city-grid">
              {cityCards.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  className="city-card"
                  style={{ backgroundImage: `linear-gradient(180deg, rgba(17, 17, 17, 0.06), rgba(6, 5, 5, 0.45)), url(${city.image})` }}
                  onClick={() => openCity(city.name)}
                >
                  <span>{city.name}</span>
                  <small>{city.subtitle}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="top-picks-section" aria-label="Popular PGs">
            <div className="top-picks-header">
              <div>
                <p className="eyebrow">TOP PICKS</p>
                <h2>Popular PGs</h2>
              </div>
              <button type="button" className="button button-outline top-picks-button" onClick={goToSearch}>View All <ArrowRight size={16} /></button>
            </div>
            <div className="top-picks-grid">
              {(visibleItems.length ? visibleItems : [
                { _id: 'fallback-1', name: 'Sunrise Residency', area: 'Mathura', rent: 8500, rating: 4.8, amenity: 'Wi-Fi', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80' },
                { _id: 'fallback-2', name: 'Oakwood Nest', area: 'Noida', rent: 12000, rating: 4.7, amenity: 'Meals', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80' },
                { _id: 'fallback-3', name: 'Green Terrace', area: 'Greater Noida', rent: 9500, rating: 4.6, amenity: 'AC', image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80' },
                { _id: 'fallback-4', name: 'City Light Stay', area: 'Gurugram', rent: 13500, rating: 4.9, amenity: 'Parking', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=80' }
              ]).slice(0, 4).map((item) => { const thumb = imageFor(item) || item.image; return (
                <article key={item._id} className="top-pick-card" onClick={() => setDetail(item)}>
                  <div className="top-pick-image" style={{ backgroundImage: `url(${thumb})` }} />
                  <div className="top-pick-body">
                    <div className="top-pick-meta">
                      <span>{[item.area, item.city].filter(Boolean).join(', ') || 'Near campus'}</span>
                      <span>★ {item.rating?.toFixed(1) || '4.8'}</span>
                    </div>
                    <h3>{item.name}</h3>
                    <div className="top-pick-bottom">
                      <strong>{money(item.rent || 8500)}</strong>
                      <small>{item.amenity || 'Wi-Fi'}</small>
                    </div>
                  </div>
                </article>
              ); })}
            </div>
          </section>

          <section className="why-section" id="about-roomroot">
            <div className="why-intro"><p className="eyebrow">A BETTER WAY TO FIND HOME</p><h2>More than a room.<br /><em>A good start.</em></h2></div>
            <div className="why-grid">
              <article><span className="why-icon"><ShieldCheck size={20} /></span><h3>Verified PGs</h3><p>Every public listing is reviewed before it appears in search.</p></article>
              <article><span className="why-icon"><Search size={20} /></span><h3>Easy search</h3><p>Compare rent, location, amenities, and student preferences in one place.</p></article>
              <article><span className="why-icon"><MessageCircle size={20} /></span><h3>Secure communication</h3><p>Send enquiries to owners through your Roomroot account.</p></article>
              <article><span className="why-icon"><GraduationCap size={20} /></span><h3>Student friendly</h3><p>Find practical stays close to GLA University and campus life.</p></article>
            </div>
          </section>

          <section className="cta-section">
            <div><p className="eyebrow">YOUR NEXT CHAPTER IS CLOSER</p><h2>Find a PG Now</h2><p>Start with the place, budget, and comforts that matter to you.</p></div>
            <div className="cta-actions"><button className="button button-light" onClick={goToSearch}>Find a PG Now <ArrowRight size={16} /></button><button className="button button-cta-outline" onClick={() => user?.role === 'owner' ? openDialog('listing') : openDialog('auth')}><Plus size={16} /> List Your PG</button></div>
          </section>
        </main>
      </>}

      {screen === 'city' && <main className="workspace-page city-results-page">
        <button className="button button-outline city-back-button" onClick={() => { setFilters(initialFilters); setLocationQuery('GLA University, Mathura'); setNameQuery(''); window.history.back(); }}>
          <ArrowRight className="back-arrow" size={16} /> Back to home
        </button>
        <div className="workspace-heading">
          <p className="eyebrow">EXPLORE STUDENT STAYS</p>
          <h1>PGs in {cityPage}<span>.</span></h1>
          <p>{cityPage === 'Pan India' ? 'Discover verified stays across India.' : `Find verified places to stay in ${cityPage}.`}</p>
        </div>
        <div className="results-count"><span>{loading ? 'Finding places…' : `${visibleItems.length} ${visibleItems.length === 1 ? 'stay' : 'stays'} in ${cityPage}`}</span><span>Only admin-approved listings appear here</span></div>
        {error && <div className="connection-error"><CircleHelp size={19} /><div><b>We couldn’t load the stays.</b><p>{error}</p></div><button className="icon-button" onClick={() => setFilters((current) => ({ ...current }))} aria-label="Retry"><ArrowRight size={17} /></button></div>}
        {loading ? <div className="loading-row"><span /><span /><span /></div> : visibleItems.length ? <div className="pg-grid">{visibleItems.map((item) => <PGCard key={item._id} item={item} favorite={saved.includes(item._id)} onFavorite={toggleFavorite} onOpen={openDetail} />)}</div> : !error && <EmptyState title={`No PGs found in ${cityPage}.`} text="There are no approved listings for this city yet. Please check back soon or explore another city." onAction={() => goTo('discover')} action="Explore other cities" />}
      </main>}

      {screen === 'favorites' && <main className="workspace-page"><div className="workspace-heading"><p className="eyebrow">YOUR PERSONAL SHORTLIST</p><h1>Saved stays<span>.</span></h1><p>All the places you might call home, together in one spot.</p></div>{error && <div className="connection-error"><CircleHelp size={19} /><div><b>We couldn’t load your saved stays.</b><p>{error}</p></div></div>}{visibleItems.length ? <div className="pg-grid">{visibleItems.map((item) => <PGCard key={item._id} item={item} favorite onFavorite={toggleFavorite} onOpen={setDetail} />)}</div> : !error && <EmptyState title="Your shortlist starts here." text="Save a stay you like and it will be waiting for you here." onAction={() => goTo('discover')} action="Explore stays" />}</main>}

      {screen === 'profile' && user && <ProfileDashboard user={user} savedItems={favoriteItems} onFavorite={toggleFavorite} onOpen={openDetail} onProfileUpdate={setUser} onLogout={signOut} notificationCount={notificationCount} onNotificationCountChange={setNotificationCount} />}

      {screen === 'owner' && <main className="workspace-page"><div className="workspace-heading owner-heading"><div><p className="eyebrow">OWNER STUDIO</p><h1>Your places<span>.</span></h1><p>Keep your listings and availability up to date.</p></div><button className="button button-primary" onClick={() => setDialog('listing')}><Plus size={17} /> Add a place</button></div>{error && <div className="connection-error"><CircleHelp size={19} /><div><b>Couldn’t load your listings.</b><p>{error}</p></div></div>}<div className="owner-stats"><div><small>ALL LISTINGS</small><b>{ownerItems.length.toString().padStart(2, '0')}</b></div><div><small>LIVE ON ROOMROOT</small><b>{ownerItems.filter((item) => item.status === 'approved').length.toString().padStart(2, '0')}</b></div><div><small>IN REVIEW</small><b>{ownerItems.filter((item) => item.status === 'pending').length.toString().padStart(2, '0')}</b></div></div>{ownerItems.length ? <div className="owner-list">{ownerItems.map((item) => <article className="owner-row" key={item._id}><div className="owner-thumb">{imageFor(item) && <img src={imageFor(item)} alt="" />}</div><div className="owner-row-info"><b>{item.name}</b><span>{[item.area, item.city].filter(Boolean).join(', ')} · {money(item.rent)} / month</span></div><span className={`status-pill status-${item.status}`}>{item.status === 'approved' ? 'Live' : item.status === 'pending' ? 'In review' : 'Needs changes'}</span></article>)}</div> : !error && <EmptyState title="Your first place belongs here." text="Share a thoughtful space with students looking for their next home." onAction={() => setDialog('listing')} action="Add your first place" />}<section className="inbox-section"><div className="inbox-heading"><div><p className="eyebrow">STUDENT MESSAGES</p><h2>Enquiries<span>.</span></h2></div><span>{enquiries.filter((item) => item.status === 'new').length} new</span></div>{enquiries.length ? enquiries.map((enquiry) => <article className="enquiry-row" key={enquiry._id}><div className="enquiry-content"><b>{enquiry.studentId?.name || 'Student'} <small>about {enquiry.pgId?.name || 'your stay'}</small></b><p>{enquiry.message}</p><span>{new Date(enquiry.createdAt).toLocaleDateString()} · {enquiry.studentId?.email}</span></div><div className="enquiry-actions"><span className={`status-pill status-${enquiry.status === 'new' ? 'pending' : 'approved'}`}>{enquiry.status}</span>{enquiry.status === 'new' && <button className="button button-outline" onClick={() => updateEnquiry(enquiry._id, 'contacted')}>Mark contacted</button>}</div></article>) : <p className="inbox-empty">Student messages about your stays will appear here.</p>}</section></main>}

      {screen === 'admin' && <main className="workspace-page"><div className="workspace-heading"><p className="eyebrow">TRUST & SAFETY</p><h1>Review queue<span>.</span></h1><p>Make sure every stay is ready to welcome someone home.</p></div>{error && <div className="connection-error"><CircleHelp size={19} /><div><b>Couldn’t load the review queue.</b><p>{error}</p></div></div>}<div className="admin-queue-label"><span><Building2 size={17} /> {pending.length} waiting for review</span><span>Oldest first</span></div>{pending.length ? <div className="admin-list">{pending.map((item) => <article className="admin-row" key={item._id}><div className="owner-thumb">{imageFor(item) && <img src={imageFor(item)} alt="" />}</div><div className="admin-row-info"><b>{item.name}</b><span>{item.area} · {money(item.rent)} / month · {item.ownerId?.name || 'Owner'}</span></div><div className="admin-actions"><button className="button button-outline" onClick={() => setDetail(item)}>Preview</button><button className="button button-approve" onClick={() => decideListing(item._id, 'approve')}><Check size={15} /> Approve</button><button className="icon-button reject-button" title="Reject listing" aria-label="Reject listing" onClick={() => decideListing(item._id, 'reject')}><X size={17} /></button></div></article>)}</div> : !error && <EmptyState title="All clear for now." text="New owner listings will appear here when they’re ready for review." />}</main>}

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home" onClick={(event) => { event.preventDefault(); goTo('discover'); }}><span className="brand-symbol"><span /></span><span>PG Search<small>ROOMROOT STUDENT LIVING</small></span></a>
        <nav className="footer-links" aria-label="Footer navigation">
          <button onClick={() => scrollToSection('about-roomroot')}>About</button>
          <button onClick={() => openInfoDialog('contact')}>Contact</button>
          <button onClick={() => openInfoDialog('terms')}>Terms</button>
          <button onClick={() => openInfoDialog('privacy')}>Privacy</button>
        </nav>
        <div className="footer-socials" aria-label="Share Roomroot">
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook"><Facebook size={16} /></a>
          <a href="https://www.instagram.com/roomroot/" target="_blank" rel="noreferrer" aria-label="Roomroot on Instagram"><Instagram size={16} /></a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`} target="_blank" rel="noreferrer" aria-label="Share on LinkedIn"><Linkedin size={16} /></a>
          <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent('Find a PG near GLA University with Roomroot')}`} target="_blank" rel="noreferrer" aria-label="Share on X"><Share2 size={16} /></a>
        </div>
        <small className="footer-copyright">© {new Date().getFullYear()} ROOMROOT</small>
      </footer>
      {notice && <div className="toast" role="status"><Check size={16} /> {notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
      {dialog === 'auth' && <AuthDialog onClose={closeOverlay} onSubmit={authenticate} />}
      {dialog === 'listing' && <ListingDialog onClose={closeOverlay} onSubmit={createListing} />}
      {infoDialog && <InfoDialog type={infoDialog} onClose={closeOverlay} onAction={() => { closeOverlay(); goToSearch(); }} />}
      {detail && <PGDetails item={detail} favorite={saved.includes(detail._id)} user={user} onFavorite={toggleFavorite} onEnquire={sendEnquiry} onClose={closeOverlay} />}
    </div>
  );
}