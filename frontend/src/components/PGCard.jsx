import { ArrowUpRight, Heart, MapPin, Star, Wifi } from 'lucide-react';
import { imageFor, money } from '../lib/api.js';

export default function PGCard({ item, favorite, distanceLabel, onFavorite, onOpen }) {
  const image = imageFor(item);
  return (
    <article className="pg-card">
      <button className="pg-image" onClick={() => onOpen(item)} aria-label={`View ${item.name}`}>
        {image ? <img src={image} alt={`${item.name} accommodation`} loading="lazy" /> : <span className="image-placeholder"><span>RR</span><small>{item.area}</small></span>}
        <span className="verified-mark"><span className="verified-dot" /> {item.status === 'approved' ? 'Verified stay' : 'In review'}</span>
      </button>
      <button className={`favorite-button ${favorite ? 'is-favorite' : ''}`} onClick={() => onFavorite(item._id)} aria-label={favorite ? 'Remove from saved stays' : 'Save this stay'} title={favorite ? 'Remove saved stay' : 'Save stay'}>
        <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
      </button>
      <button className="pg-copy" onClick={() => onOpen(item)}>
        <span className="pg-card-heading"><strong>{item.name}</strong><span className="rating"><Star size={14} fill="currentColor" /> {item.rating?.toFixed(1) || 'New'}</span></span>
        <span className="pg-location"><MapPin size={14} /> {[item.area, item.city].filter(Boolean).join(', ')}</span>
        {distanceLabel && <span className="pg-distance"><MapPin size={12} /> {distanceLabel}</span>}
        <span className="amenity-line">{(item.amenities || []).slice(0, 3).map((amenity) => <span key={amenity}>{amenity === 'Wi-Fi' && <Wifi size={13} />}{amenity}</span>)}</span>
        <span className="pg-card-foot"><span><b>{money(item.rent)}</b> <small>/ month</small></span><span className="card-details">View details <ArrowUpRight size={15} /></span></span>
      </button>
    </article>
  );
}