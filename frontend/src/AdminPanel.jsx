import { useEffect, useState } from 'react'
import { ArrowLeft, Boxes, Eye, LayoutDashboard, LogOut, PackagePlus, ShoppingCart, Trash2, X } from 'lucide-react'
import './admin.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const statusOptions = {
  pendente: ['pendente', 'enviado', 'cancelado'],
  enviado: ['enviado', 'concluído', 'cancelado'],
  concluído: ['concluído'],
  cancelado: ['cancelado'],
}
const emptyProduct = {
  name: '', category: '', description: '', price: '', image: '', featured: false,
  variants: [{ size: '', color: '', stock: 0 }],
}

export default function AdminPanel({ onClose }) {
  const [token, setToken] = useState(() => localStorage.getItem('giacomoni-admin-token') || '')
  const [admin, setAdmin] = useState(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderFilters, setOrderFilters] = useState({ search: '', status: '', date: '' })
  const [productForm, setProductForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    const data = response.status === 204 ? null : await response.json()
    if (response.status === 401) {
      logout()
      throw new Error('Sua sessão expirou. Entre novamente.')
    }
    if (!response.ok) throw new Error(data?.message || 'Não foi possível concluir a operação.')
    return data
  }

  useEffect(() => {
    if (!token) return
    api('/api/auth/me')
      .then((data) => setAdmin(data.admin))
      .catch((error) => setLoginError(error.message))
  }, [token])

  useEffect(() => {
    if (!admin) return
    loadDashboard()
    loadProducts()
    loadOrders()
  }, [admin])

  async function login(event) {
    event.preventDefault()
    setLoading(true)
    setLoginError('')
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Não foi possível entrar.')
      localStorage.setItem('giacomoni-admin-token', data.token)
      setToken(data.token)
      setAdmin(data.admin)
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('giacomoni-admin-token')
    setToken('')
    setAdmin(null)
  }

  async function loadDashboard() {
    try { setStats(await api('/api/admin/stats')) } catch (error) { setMessage(error.message) }
  }

  async function loadProducts() {
    try {
      const data = await api('/api/products?limit=100')
      setProducts(data.products || data)
    } catch (error) { setMessage(error.message) }
  }

  async function loadOrders(filters = orderFilters) {
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filters.search.trim()) params.set('search', filters.search.trim())
      if (filters.status) params.set('status', filters.status)
      if (filters.date) params.set('date', filters.date)
      const data = await api(`/api/orders?${params}`)
      setOrders(data.orders || [])
    } catch (error) { setMessage(error.message) }
  }

  function changeProduct(event) {
    const { name, value, type, checked } = event.target
    setProductForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function changeVariant(index, field, value) {
    setProductForm((current) => ({
      ...current,
      variants: current.variants.map((variant, currentIndex) =>
        currentIndex === index ? { ...variant, [field]: field === 'stock' ? Number(value) : value } : variant,
      ),
    }))
  }

  function editProduct(product) {
    setEditingId(product._id)
    setProductForm({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
      image: product.image,
      featured: product.featured,
      variants: product.variants.length ? product.variants : [{ size: '', color: '', stock: 0 }],
    })
    setTab('productForm')
  }

  async function saveProduct(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const payload = {
        ...productForm,
        price: Number(productForm.price),
        variants: productForm.variants.filter((variant) => variant.size && variant.color),
      }
      await api(editingId ? `/api/products/${editingId}` : '/api/products', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      setMessage(editingId ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.')
      setProductForm(emptyProduct)
      setEditingId(null)
      setTab('products')
      await Promise.all([loadProducts(), loadDashboard()])
    } catch (error) {
      setMessage(error.message)
    } finally { setLoading(false) }
  }

  async function deactivateProduct(product) {
    if (!window.confirm(`Desativar ${product.name}?`)) return
    try {
      await api(`/api/products/${product._id}`, { method: 'DELETE' })
      setMessage('Produto desativado.')
      await Promise.all([loadProducts(), loadDashboard()])
    } catch (error) { setMessage(error.message) }
  }

  async function changeOrderStatus(orderId, status) {
    try {
      await api(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setMessage('Status do pedido atualizado.')
      setSelectedOrder(null)
      await Promise.all([loadOrders(), loadDashboard(), loadProducts()])
    } catch (error) { setMessage(error.message) }
  }

  function applyOrderFilters(event) {
    event.preventDefault()
    loadOrders(orderFilters)
  }

  function clearOrderFilters() {
    const emptyFilters = { search: '', status: '', date: '' }
    setOrderFilters(emptyFilters)
    loadOrders(emptyFilters)
  }

  if (!admin) {
    return <main className="admin-login"><form onSubmit={login}><button type="button" className="admin-back" onClick={onClose}><ArrowLeft size={17} /> Voltar à loja</button><p className="eyebrow">Área restrita</p><h1>Painel administrativo</h1><p>Entre com as credenciais cadastradas no servidor.</p><label>E-mail<input type="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} required /></label><label>Senha<input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} required /></label>{loginError && <div className="admin-error">{loginError}</div>}<button className="primary-button" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button></form></main>
  }

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand">GIACOMONI<small>Administração</small></div>
      <nav>
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}><LayoutDashboard size={18} /> Visão geral</button>
        <button className={tab === 'products' || tab === 'productForm' ? 'active' : ''} onClick={() => setTab('products')}><Boxes size={18} /> Produtos</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><ShoppingCart size={18} /> Pedidos</button>
      </nav>
      <button className="admin-store" onClick={onClose}><ArrowLeft size={17} /> Voltar à loja</button>
      <button className="admin-logout" onClick={logout}><LogOut size={17} /> Sair</button>
    </aside>

    <section className="admin-content">
      <header><div><small>Bem-vindo(a)</small><h1>{admin.name}</h1></div>{message && <div className="admin-message">{message}</div>}</header>

      {tab === 'dashboard' && <><div className="admin-title"><div><p className="eyebrow">Resumo</p><h2>Visão geral da loja</h2></div></div><div className="stat-grid"><article><span>Produtos ativos</span><strong>{stats?.products ?? '—'}</strong></article><article><span>Pedidos pendentes</span><strong>{stats?.pendingOrders ?? '—'}</strong></article><article><span>Pedidos de hoje</span><strong>{stats?.todayOrders ?? '—'}</strong></article><article><span>Vendas de hoje</span><strong>{currency.format(stats?.todayRevenue || 0)}</strong></article><article><span>Estoque baixo</span><strong>{stats?.lowStockProducts ?? '—'}</strong></article></div></>}

      {tab === 'products' && <><div className="admin-title"><div><p className="eyebrow">Inventário</p><h2>Produtos e estoque</h2></div><button className="primary-button" onClick={() => { setEditingId(null); setProductForm(emptyProduct); setTab('productForm') }}><PackagePlus size={18} /> Novo produto</button></div><div className="admin-table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Ações</th></tr></thead><tbody>{products.map((product) => <tr key={product._id}><td><div className="product-cell"><img src={product.image} alt="" /><strong>{product.name}</strong></div></td><td>{product.category}</td><td>{currency.format(product.price)}</td><td>{product.variants.reduce((sum, variant) => sum + variant.stock, 0)}</td><td><button onClick={() => editProduct(product)}>Editar</button><button className="danger" onClick={() => deactivateProduct(product)}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div></>}

      {tab === 'productForm' && <><div className="admin-title"><div><p className="eyebrow">Inventário</p><h2>{editingId ? 'Editar produto' : 'Novo produto'}</h2></div><button className="secondary-button" onClick={() => setTab('products')}>Cancelar</button></div><form className="admin-product-form" onSubmit={saveProduct}><label>Nome<input name="name" value={productForm.name} onChange={changeProduct} required /></label><label>Categoria<input name="category" value={productForm.category} onChange={changeProduct} required /></label><label>Preço<input name="price" type="number" step="0.01" min="0" value={productForm.price} onChange={changeProduct} required /></label><label className="admin-full">URL da imagem<input name="image" type="url" value={productForm.image} onChange={changeProduct} required /></label><label className="admin-full">Descrição<textarea name="description" value={productForm.description} onChange={changeProduct} required /></label><label className="check-field"><input name="featured" type="checkbox" checked={productForm.featured} onChange={changeProduct} /> Produto em destaque</label><fieldset className="admin-full"><legend>Variações</legend>{productForm.variants.map((variant, index) => <div className="variant-row" key={index}><input placeholder="Tamanho" value={variant.size} onChange={(event) => changeVariant(index, 'size', event.target.value)} /><input placeholder="Cor" value={variant.color} onChange={(event) => changeVariant(index, 'color', event.target.value)} /><input type="number" min="0" placeholder="Estoque" value={variant.stock} onChange={(event) => changeVariant(index, 'stock', event.target.value)} /><button type="button" onClick={() => setProductForm((current) => ({ ...current, variants: current.variants.filter((_, currentIndex) => currentIndex !== index) }))}>Remover</button></div>)}<button type="button" className="secondary-button" onClick={() => setProductForm((current) => ({ ...current, variants: [...current.variants, { size: '', color: '', stock: 0 }] }))}>Adicionar variação</button></fieldset><button className="primary-button admin-save" disabled={loading}>{loading ? 'Salvando...' : 'Salvar produto'}</button></form></>}

      {tab === 'orders' && <>
        <div className="admin-title"><div><p className="eyebrow">Vendas</p><h2>Gestão de pedidos</h2></div></div>
        <form className="order-filters" onSubmit={applyOrderFilters}>
          <label>Buscar cliente<input value={orderFilters.search} onChange={(event) => setOrderFilters({ ...orderFilters, search: event.target.value })} placeholder="Nome, e-mail, telefone ou ID" /></label>
          <label>Status<select value={orderFilters.status} onChange={(event) => setOrderFilters({ ...orderFilters, status: event.target.value })}><option value="">Todos</option><option value="pendente">Pendente</option><option value="enviado">Enviado</option><option value="concluído">Concluído</option><option value="cancelado">Cancelado</option></select></label>
          <label>Data<input type="date" value={orderFilters.date} onChange={(event) => setOrderFilters({ ...orderFilters, date: event.target.value })} /></label>
          <button className="primary-button">Filtrar</button>
          <button type="button" className="secondary-button" onClick={clearOrderFilters}>Limpar</button>
        </form>
        <div className="admin-table-wrap">
          <table><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Itens</th><th>Total</th><th>Status</th><th>Detalhes</th></tr></thead>
            <tbody>{orders.map((order) => <tr key={order._id}>
              <td>#{order._id.slice(-6).toUpperCase()}</td>
              <td><strong>{order.customer.name}</strong><small>{order.customer.phone}</small><small>{order.customer.email}</small></td>
              <td>{new Date(order.createdAt).toLocaleString('pt-BR')}</td>
              <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
              <td>{currency.format(order.total)}</td>
              <td><select value={order.status} disabled={['concluído', 'cancelado'].includes(order.status)} onChange={(event) => changeOrderStatus(order._id, event.target.value)}>{(statusOptions[order.status] || [order.status]).map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></td>
              <td><button onClick={() => setSelectedOrder(order)}><Eye size={15} /> Ver</button></td>
            </tr>)}</tbody>
          </table>
          {!orders.length && <p className="admin-empty">Nenhum pedido encontrado com esses filtros.</p>}
        </div>
      </>}
    </section>

    {selectedOrder && <div className="order-modal-backdrop" onClick={() => setSelectedOrder(null)}>
      <article className="order-modal" onClick={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">Detalhes do pedido</p><h2>#{selectedOrder._id.slice(-6).toUpperCase()}</h2></div><button onClick={() => setSelectedOrder(null)} aria-label="Fechar"><X /></button></header>
        <div className="order-detail-grid">
          <section><h3>Cliente</h3><p><strong>{selectedOrder.customer.name}</strong></p><p>{selectedOrder.customer.email}</p><p>{selectedOrder.customer.phone}</p></section>
          <section><h3>Entrega</h3><p>{selectedOrder.deliveryAddress.street}, {selectedOrder.deliveryAddress.number}</p>{selectedOrder.deliveryAddress.complement && <p>{selectedOrder.deliveryAddress.complement}</p>}<p>{selectedOrder.deliveryAddress.neighborhood}</p><p>{selectedOrder.deliveryAddress.city}/{selectedOrder.deliveryAddress.state} — {selectedOrder.deliveryAddress.zipCode}</p></section>
        </div>
        <section className="order-products"><h3>Itens</h3>{selectedOrder.items.map((item, index) => <div className="order-product" key={`${item.product}-${index}`}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>{item.size} • {item.color}</span><span>{item.quantity} × {currency.format(item.unitPrice)}</span></div><b>{currency.format(item.subtotal)}</b></div>)}</section>
        <div className="order-modal-total"><span>Total</span><strong>{currency.format(selectedOrder.total)}</strong></div>
        <section className="status-history"><h3>Histórico</h3>{(selectedOrder.statusHistory || [{ status: selectedOrder.status, changedAt: selectedOrder.createdAt }]).map((entry, index) => <div key={index}><span className={`status-dot ${entry.status}`}></span><strong>{entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}</strong><small>{new Date(entry.changedAt).toLocaleString('pt-BR')}</small></div>)}</section>
      </article>
    </div>}
  </main>
}
