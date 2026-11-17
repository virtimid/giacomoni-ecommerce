import { useEffect, useState } from 'react'
import { ArrowLeft, LogOut } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const emptyAddress = { zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' }

async function request(path, options = {}, token = '') {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Não foi possível concluir a operação.')
  return data
}

export default function CustomerAccount({ customer, token, resetData, onBack, onSession, onLogout }) {
  const [mode, setMode] = useState(resetData ? 'reset' : customer ? 'profile' : 'login')
  const [form, setForm] = useState({ name: customer?.name || '', email: customer?.email || resetData?.email || '', phone: customer?.phone || '', password: '', confirmPassword: '', currentPassword: '', newPassword: '', address: { ...emptyAddress, ...customer?.address } })
  const [orders, setOrders] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (mode === 'orders' && token) request('/api/customers/orders', {}, token).then((data) => setOrders(data.orders)).catch((err) => setError(err.message))
  }, [mode, token])

  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const addressField = (name, value) => setForm((current) => ({ ...current, address: { ...current.address, [name]: value } }))

  async function submit(event) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      if ((mode === 'register' || mode === 'reset') && form.password !== form.confirmPassword) throw new Error('As senhas não são iguais.')
      if (mode === 'login' || mode === 'register') {
        const data = await request(`/api/customers/${mode}`, { method: 'POST', body: JSON.stringify(form) })
        onSession(data); setMode('profile')
      } else if (mode === 'forgot') {
        const data = await request('/api/customers/forgot-password', { method: 'POST', body: JSON.stringify({ email: form.email }) })
        setMessage(data.message)
      } else if (mode === 'reset') {
        const data = await request('/api/customers/reset-password', { method: 'POST', body: JSON.stringify({ email: form.email, token: resetData.token, password: form.password }) })
        setMessage(data.message); setMode('login'); window.history.replaceState({}, '', window.location.pathname)
      } else if (mode === 'profile') {
        const data = await request('/api/customers/me', { method: 'PUT', body: JSON.stringify({ name: form.name, phone: form.phone, address: form.address }) }, token)
        onSession({ token, customer: data.customer }); setMessage(data.message)
      } else if (mode === 'password') {
        const data = await request('/api/customers/password', { method: 'PATCH', body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }) }, token)
        setMessage(data.message); field('currentPassword', ''); field('newPassword', '')
      }
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  if (customer && mode === 'orders') return <main className="account-page"><button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Voltar à loja</button><div className="account-layout"><AccountMenu mode={mode} setMode={setMode} customer={customer} onLogout={onLogout} /><section className="account-card account-orders"><h1>Meus pedidos</h1>{!orders.length && <p>Você ainda não possui pedidos associados a esta conta.</p>}{orders.map((order) => <article key={order._id} className="order-card"><div><strong>Pedido #{order._id.slice(-6).toUpperCase()}</strong><span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span></div><b className={`order-status status-${order.status}`}>{order.status}</b><strong>{money.format(order.total)}</strong><div className="order-products">{order.items.map((item) => <span key={`${item.product}-${item.size}-${item.color}`}>{item.quantity}x {item.name} ({item.size}, {item.color})</span>)}</div></article>)}</section></div></main>

  return <main className="account-page"><button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Voltar à loja</button><div className="account-layout">{customer && <AccountMenu mode={mode} setMode={setMode} customer={customer} onLogout={onLogout} />}<section className="account-card"><p className="eyebrow">Área do cliente</p><h1>{({ login: 'Entrar', register: 'Criar minha conta', forgot: 'Recuperar senha', reset: 'Criar nova senha', profile: 'Meus dados', password: 'Alterar senha' })[mode]}</h1>{!customer && <p>Com uma conta, seus dados ficam preenchidos e você acompanha seus pedidos. O cadastro não é obrigatório para comprar.</p>}<form className="account-form" onSubmit={submit}>
    {(mode === 'register' || mode === 'profile') && <label>Nome completo<input value={form.name} onChange={(e) => field('name', e.target.value)} required /></label>}
    {['login', 'register', 'forgot', 'reset'].includes(mode) && <label>E-mail<input type="email" value={form.email} onChange={(e) => field('email', e.target.value)} required readOnly={mode === 'reset'} /></label>}
    {(mode === 'register' || mode === 'profile') && <label>Telefone<input value={form.phone} onChange={(e) => field('phone', e.target.value)} required /></label>}
    {['login', 'register', 'reset'].includes(mode) && <label>Senha<input type="password" value={form.password} onChange={(e) => field('password', e.target.value)} minLength="8" required /></label>}
    {['register', 'reset'].includes(mode) && <label>Confirmar senha<input type="password" value={form.confirmPassword} onChange={(e) => field('confirmPassword', e.target.value)} minLength="8" required /></label>}
    {mode === 'password' && <><label>Senha atual<input type="password" value={form.currentPassword} onChange={(e) => field('currentPassword', e.target.value)} required /></label><label>Nova senha<input type="password" value={form.newPassword} onChange={(e) => field('newPassword', e.target.value)} minLength="8" required /></label></>}
    {mode === 'profile' && <><h2>Endereço salvo</h2><div className="account-address">{Object.entries({ zipCode: 'CEP', street: 'Rua', number: 'Número', complement: 'Complemento', neighborhood: 'Bairro', city: 'Cidade', state: 'Estado' }).map(([key, label]) => <label key={key}>{label}<input value={form.address[key] || ''} maxLength={key === 'state' ? 2 : undefined} onChange={(e) => addressField(key, e.target.value)} /></label>)}</div></>}
    {error && <div className="form-error">{error}</div>}{message && <div className="form-success">{message}</div>}<button className="primary-button" disabled={busy}>{busy ? 'Aguarde...' : ({ login: 'Entrar', register: 'Cadastrar', forgot: 'Enviar instruções', reset: 'Salvar nova senha', profile: 'Salvar dados', password: 'Alterar senha' })[mode]}</button>
  </form>{mode === 'login' && <div className="account-links"><button onClick={() => setMode('register')}>Ainda não tenho conta</button><button onClick={() => setMode('forgot')}>Esqueci minha senha</button></div>}{['register', 'forgot'].includes(mode) && <button className="text-button" onClick={() => setMode('login')}>Voltar para o login</button>}</section></div></main>
}

function AccountMenu({ customer, mode, setMode, onLogout }) {
  return <aside className="account-menu"><strong>Olá, {customer.name.split(' ')[0]}</strong><span>{customer.email}</span><button className={mode === 'profile' ? 'active' : ''} onClick={() => setMode('profile')}>Meus dados</button><button className={mode === 'orders' ? 'active' : ''} onClick={() => setMode('orders')}>Meus pedidos</button><button className={mode === 'password' ? 'active' : ''} onClick={() => setMode('password')}>Alterar senha</button><button onClick={onLogout}><LogOut size={16} /> Sair</button></aside>
}
