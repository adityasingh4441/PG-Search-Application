import { useState } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, X } from 'lucide-react';

export default function AuthDialog({ onClose, onSubmit }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { await onSubmit({ ...data, role }); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="dialog-mark"><KeyRound size={19} /></div>
        <p className="eyebrow">A better start, right here</p>
        <h2 id="auth-title">{mode === 'login' ? 'Welcome back.' : 'Make yourself at home.'}</h2>
        <p className="dialog-intro">{mode === 'login' ? 'Sign in to pick up where you left off.' : 'Create an account to find or list a stay.'}</p>
        <form onSubmit={submit} className="stack-form">
          {mode === 'register' && <label>Your name<input name="name" autoComplete="name" minLength="2" required /></label>}
          <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" required /></label>
          {mode === 'register' && <div className="role-control" aria-label="Account type">
            <button type="button" className={role === 'student' ? 'selected' : ''} onClick={() => setRole('student')}>I’m looking</button>
            <button type="button" className={role === 'owner' ? 'selected' : ''} onClick={() => setRole('owner')}>I’m an owner</button>
          </div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-wide" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button>
        </form>
        <p className="switch-auth">{mode === 'login' ? 'New to Roomroot?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></p>
        <button className="dialog-back" onClick={onClose}><ArrowLeft size={14} /> Back to exploring</button>
      </section>
    </div>
  );
}