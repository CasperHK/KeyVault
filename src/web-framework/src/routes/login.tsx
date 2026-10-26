import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Laptop, Loader2, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Brand } from '@/components/keyvault-ui'
import { login, verifyTOTP } from '@/lib/auth'
import { errorMessage } from '@/lib/inventory'
import '@/keyvault.css'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState('')
  const [code, setCode] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = pending ? await verifyTOTP(pending, code) : await login(email, password)
      if ('totp' in result) { setPending(result.totp.pending_token); return }
      if (!['ADMIN', 'EDITOR'].includes(result.user.role)) {
        setError('This workspace is for inventory administrators and editors. Contact your administrator for access.')
        return
      }
      await navigate({ to: '/dashboard', search: { view: 'overview' } })
    } catch (err) {
      setError(errorMessage(err))
    } finally { setBusy(false) }
  }
  return <div className="kv kv-login">
    <aside className="kv-login-story"><Link to="/"><Brand /></Link><div><span className="kv-eyebrow"><Sparkles size={15} /> YOUR IT. IN GOOD HANDS.</span><h1>A place for<br />everything.<br /><span className="kv-serif">Room to do more.</span></h1><p>A clearer view of your inventory.<br />A better day for your whole team.</p><div className="kv-login-visual"><span className="kv-login-device"><Laptop size={68} strokeWidth={1.1} /></span><span className="kv-login-check"><Check size={22} /></span><div><strong>All the right connections.</strong><span>Devices + people + services</span></div></div></div><span className="kv-login-foot"><ShieldCheck size={16} /> Your infrastructure. Your data. Your peace of mind.</span></aside>
    <main className="kv-login-form-wrap"><Link to="/" className="kv-back-link"><ArrowLeft size={16} /> Back to home</Link><div className="kv-login-form"><span className="kv-icon-tile violet"><LockKeyhole size={25} /></span><span className="kv-overline">YOUR WORKSPACE AWAITS</span><h2>{pending ? 'One last check.' : 'Good to have you back.'}</h2><p>{pending ? 'Enter the code from your authenticator app.' : 'Sign in and pick up right where you left off.'}</p><form onSubmit={submit}>{pending ? <label>Authentication code<input required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} placeholder="000000" /></label> : <><label>Work email<input required type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={event => setEmail(event.target.value)} /></label><label><span>Password <Link to="/admin/forgot-password">Forgot password?</Link></span><span className="kv-password"><input required type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label></>}{error && <div className="kv-error" role="alert">{error}</div>}<button className="kv-button primary large" disabled={busy}>{busy ? <Loader2 className="kv-spin" size={18} /> : <> {pending ? 'Verify & sign in' : 'Sign in to workspace'}<ArrowRight size={18} /></>}</button></form><div className="kv-login-help">Need a workspace account?<br /><strong>Ask your IT administrator to invite you.</strong></div>{import.meta.env.DEV && <div className="kv-demo-note"><span>LOCAL DEVELOPMENT</span><p>Explore with the seeded administrator.</p><button type="button" onClick={() => { setEmail('admin@example.com'); setPassword('admin123') }}>Use demo credentials <ArrowRight size={14} /></button></div>}</div><span className="kv-login-security"><LockKeyhole size={13} /> A secure little home for your company IT.</span></main>
  </div>
}
