import { useState } from 'react';
import { X } from 'lucide-react';

const amenities = ['Wi-Fi', 'Meals', 'AC', 'Laundry', 'Parking', 'Housekeeping'];

export default function ListingDialog({ onClose, onSubmit }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form);
    data.rent = Number(data.rent);
    data.deposit = Number(data.deposit || 0);
    data.availability = Number(data.availability || 0);
    data.amenities = form.getAll('amenities');
    data.images = data.image ? [data.image] : [];
    delete data.image;
    data.roomTypes = [{ name: 'Private room', rent: data.rent, available: data.availability }];
    try { await onSubmit(data); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog listing-dialog" role="dialog" aria-modal="true" aria-labelledby="listing-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <p className="eyebrow">Owner studio · New stay</p>
        <h2 id="listing-title">Tell us about your place.</h2>
        <p className="dialog-intro">New listings are reviewed before they appear in search.</p>
        <form className="stack-form listing-form" onSubmit={submit}>
          <label>Property name<input name="name" placeholder="e.g. The Banyan House" minLength="3" required /></label>
          <div className="form-row"><label>Neighbourhood<input name="area" placeholder="Civil Lines" required /></label><label>Gender preference<select name="gender"><option>Any</option><option>Women</option><option>Men</option></select></label></div>
          <label>Street address<input name="address" placeholder="Street, landmark, city" required /></label>
          <label>A little about the place<textarea name="description" rows="3" minLength="10" placeholder="Rooms, atmosphere, nearby campus…" required /></label>
          <div className="form-row"><label>Monthly rent (₹)<input name="rent" type="number" min="0" required /></label><label>Deposit (₹)<input name="deposit" type="number" min="0" defaultValue="0" /></label><label>Open rooms<input name="availability" type="number" min="0" defaultValue="1" /></label></div>
          <fieldset className="amenity-picker"><legend>Amenities</legend><div>{amenities.map((amenity) => <label key={amenity}><input type="checkbox" name="amenities" value={amenity} />{amenity}</label>)}</div></fieldset>
          <label>Cover photo URL <span className="optional">optional</span><input name="image" type="url" placeholder="https://…" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-wide" disabled={busy}>{busy ? 'Sending for review…' : 'Submit for review'}</button>
        </form>
      </section>
    </div>
  );
}