import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Menu, Search, ShoppingBag, X } from 'lucide-react'
import { sampleProducts } from './data/products.js'
import AdminPanel from './AdminPanel.jsx'

const PAGE_SIZE = 6
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function loadSavedCart() {
  try {
    const saved = JSON.parse(localStorage.getItem('giacomoni-cart'))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function ProductDetails({ product, onBack, onAdd }) {
  const availableVariants = product.variants.filter((variant) => variant.stock > 0)
  const sizes = [...new Set(availableVariants.map((variant) => variant.size))]
  const [size, setSize] = useState(sizes[0] || '')
  const colors = [...new Set(availableVariants.filter((variant) => variant.size === size).map((variant) => variant.color))]
  const [color, setColor] = useState(colors[0] || '')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    const nextColors = [...new Set(availableVariants.filter((variant) => variant.size === size).map((variant) => variant.color))]
    setColor(nextColors[0] || '')
    setQuantity(1)
  }, [size, product._id])

  const selectedVariant = availableVariants.find(
    (variant) => variant.size === size && variant.color === color,
  )

  function addSelectedProduct() {
    if (!selectedVariant) return
    onAdd(product, selectedVariant, quantity)
  }

  return (
    <main className="product-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={18} /> Voltar ao catálogo
      </button>
      <section className="product-detail">
        <div className="detail-image">
          <img src={product.image} alt={product.name} />
          {product.featured && <span className="tag">Destaque</span>}
        </div>
        <div className="detail-content">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{currency.format(product.price)}</p>
          <p className="detail-description">{product.description}</p>
          {availableVariants.length ? (
            <>
              <fieldset className="option-group">
                <legend>Tamanho</legend>
                <div className="option-buttons">
                  {sizes.map((item) => (
                    <button type="button" key={item} className={size === item ? 'option-active' : ''} onClick={() => setSize(item)}>{item}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="option-group">
                <legend>Cor</legend>
                <div className="option-buttons">
                  {colors.map((item) => (
                    <button type="button" key={item} className={color === item ? 'option-active' : ''} onClick={() => { setColor(item); setQuantity(1) }}>{item}</button>
                  ))}
                </div>
              </fieldset>
              <div className="stock-row">
                <div>
                  <span>Quantidade</span>
                  <div className="detail-quantity">
                    <button onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                    <strong>{quantity}</strong>
                    <button onClick={() => setQuantity((value) => Math.min(selectedVariant?.stock || 1, value + 1))}>+</button>
                  </div>
                </div>
                <small>{selectedVariant?.stock || 0} unidade(s) disponível(is)</small>
              </div>
              <button className="primary-button detail-add" onClick={addSelectedProduct}>
                <ShoppingBag size={19} /> Adicionar ao carrinho
              </button>
            </>
          ) : <div className="out-of-stock">Produto temporariamente sem estoque.</div>}
          <div className="detail-note"><strong>Compra segura</strong><span>Confira tamanho, cor e quantidade antes de finalizar o pedido.</span></div>
        </div>
      </section>
    </main>
  )
}

function Checkout({ cart, total, onBack, onComplete }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', zipCode: '', street: '', number: '',
    complement: '', neighborhood: '', city: '', state: '',
  })
  const [errors, setErrors] = useState({})
  const [loadingZip, setLoadingZip] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  async function searchZipCode() {
    const zipCode = form.zipCode.replace(/\D/g, '')
    if (zipCode.length !== 8) return
    setLoadingZip(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`)
      const data = await response.json()
      if (data.erro) throw new Error('CEP não encontrado')
      setForm((current) => ({
        ...current,
        street: data.logradouro || current.street,
        neighborhood: data.bairro || current.neighborhood,
        city: data.localidade || current.city,
        state: data.uf || current.state,
      }))
      setErrors((current) => ({ ...current, zipCode: '' }))
    } catch {
      setErrors((current) => ({ ...current, zipCode: 'CEP não encontrado. Preencha o endereço manualmente.' }))
    } finally {
      setLoadingZip(false)
    }
  }

  function validate() {
    const required = ['name', 'phone', 'email', 'zipCode', 'street', 'number', 'neighborhood', 'city', 'state']
    const nextErrors = {}
    required.forEach((field) => { if (!form[field].trim()) nextErrors[field] = 'Campo obrigatório.' })
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Informe um e-mail válido.'
    if (form.zipCode.replace(/\D/g, '').length !== 8) nextErrors.zipCode = 'Informe um CEP com 8 números.'
    if (form.phone.replace(/\D/g, '').length < 10) nextErrors.phone = 'Informe um telefone válido.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function submitOrder(event) {
    event.preventDefault()
    if (!validate() || !cart.length) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: form.name, phone: form.phone, email: form.email },
          deliveryAddress: {
            zipCode: form.zipCode, street: form.street, number: form.number,
            complement: form.complement, neighborhood: form.neighborhood,
            city: form.city, state: form.state,
          },
          items: cart.map((item) => ({
            productId: item._id, size: item.size, color: item.color, quantity: item.quantity,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Não foi possível finalizar o pedido.')
      onComplete(data.order, form)
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="checkout-page">
      <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Voltar ao carrinho</button>
      <div className="checkout-heading"><p className="eyebrow">Finalização</p><h1>Confira seu pedido</h1></div>
      <form className="checkout-grid" onSubmit={submitOrder} noValidate>
        <div className="checkout-form">
          <section className="form-section">
            <div className="form-section-title"><span>1</span><div><h2>Dados do cliente</h2><p>Usaremos esses dados para confirmar seu pedido.</p></div></div>
            <div className="form-grid">
              <label className="full-field">Nome completo<input name="name" value={form.name} onChange={updateField} />{errors.name && <small>{errors.name}</small>}</label>
              <label>Telefone<input name="phone" value={form.phone} onChange={updateField} placeholder="(00) 00000-0000" />{errors.phone && <small>{errors.phone}</small>}</label>
              <label>E-mail<input name="email" type="email" value={form.email} onChange={updateField} />{errors.email && <small>{errors.email}</small>}</label>
            </div>
          </section>
          <section className="form-section">
            <div className="form-section-title"><span>2</span><div><h2>Endereço de entrega</h2><p>Digite o CEP para preencher parte do endereço.</p></div></div>
            <div className="form-grid">
              <label>CEP<input name="zipCode" value={form.zipCode} onChange={updateField} onBlur={searchZipCode} placeholder="00000-000" />{loadingZip && <em>Consultando...</em>}{errors.zipCode && <small>{errors.zipCode}</small>}</label>
              <label className="wide-field">Rua<input name="street" value={form.street} onChange={updateField} />{errors.street && <small>{errors.street}</small>}</label>
              <label>Número<input name="number" value={form.number} onChange={updateField} />{errors.number && <small>{errors.number}</small>}</label>
              <label>Complemento<input name="complement" value={form.complement} onChange={updateField} placeholder="Opcional" /></label>
              <label>Bairro<input name="neighborhood" value={form.neighborhood} onChange={updateField} />{errors.neighborhood && <small>{errors.neighborhood}</small>}</label>
              <label>Cidade<input name="city" value={form.city} onChange={updateField} />{errors.city && <small>{errors.city}</small>}</label>
              <label>Estado<input name="state" value={form.state} maxLength="2" onChange={updateField} />{errors.state && <small>{errors.state}</small>}</label>
            </div>
          </section>
        </div>

        <aside className="order-review">
          <h2>Resumo do pedido</h2>
          <div className="review-items">{cart.map((item) => <div className="review-item" key={item.cartId}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>{item.size} • {item.color} • {item.quantity} un.</span></div><b>{currency.format(item.price * item.quantity)}</b></div>)}</div>
          <div className="review-total"><span>Total</span><strong>{currency.format(total)}</strong></div>
          {submitError && <div className="form-error">{submitError}</div>}
          <button className="primary-button checkout-submit" disabled={submitting}>{submitting ? 'Finalizando...' : 'Confirmar pedido'}</button>
          <small className="privacy-note">Ao confirmar, seus dados serão usados somente para processar e entregar este pedido.</small>
        </aside>
      </form>
    </main>
  )
}

function OrderSuccess({ order, customer, onContinue }) {
  return <main className="success-page"><div className="success-card"><span className="success-icon">✓</span><p className="eyebrow">Pedido recebido</p><h1>Obrigada, {customer.name.split(' ')[0]}!</h1><p>Seu pedido <strong>#{String(order.id).slice(-6).toUpperCase()}</strong> foi registrado e está com status <strong>{order.status}</strong>.</p><div className="success-total"><span>Total do pedido</span><strong>{currency.format(order.total)}</strong></div><button className="primary-button" onClick={onContinue}>Continuar comprando</button></div></main>
}

function App() {
  const [products, setProducts] = useState(import.meta.env.DEV ? sampleProducts : [])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [page, setPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [cart, setCart] = useState(loadSavedCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/products?limit=100`)
      .then((response) => { if (!response.ok) throw new Error('API indisponível'); return response.json() })
      .then((data) => {
        const receivedProducts = Array.isArray(data) ? data : data.products
        if (Array.isArray(receivedProducts)) setProducts(receivedProducts)
      })
      .catch(() => {})
  }, [])

  useEffect(() => setPage(1), [query, category])
  useEffect(() => localStorage.setItem('giacomoni-cart', JSON.stringify(cart)), [cart])

  const categories = useMemo(() => ['Todos', ...new Set(products.map((product) => product.category))], [products])
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
    return products.filter((product) => {
      const matchesCategory = category === 'Todos' || product.category === category
      return matchesCategory && product.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
    })
  }, [products, query, category])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const visibleProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)

  function addToCart(product, variant, quantity = 1) {
    const cartId = `${product._id}-${variant.size}-${variant.color}`
    setCart((current) => {
      const existing = current.find((item) => item.cartId === cartId)
      if (existing) return current.map((item) => item.cartId === cartId ? { ...item, quantity: Math.min(item.stock, item.quantity + quantity) } : item)
      return [...current, { ...product, ...variant, cartId, quantity: Math.min(variant.stock, quantity) }]
    })
    setCartOpen(true)
  }

  function changeQuantity(cartId, amount) {
    setCart((current) => current.map((item) => item.cartId === cartId ? { ...item, quantity: Math.min(item.stock, item.quantity + amount) } : item).filter((item) => item.quantity > 0))
  }

  function goToPage(nextPage) {
    setPage(nextPage)
    document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' })
  }

  function completeOrder(order, customer) {
    setCompletedOrder({ order, customer })
    setCheckoutOpen(false)
    setCart([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (adminOpen) return <AdminPanel onClose={() => setAdminOpen(false)} />

  return (
    <div className="app-shell">
      <header className="header">
        <button className="brand brand-button" onClick={() => { setSelectedProduct(null); setCheckoutOpen(false); setCompletedOrder(null) }} aria-label="Página inicial Giacomoni"><span>GIACOMONI</span><small>pijamas & moda íntima</small></button>
        <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><Menu size={22} /></button>
        <nav className={menuOpen ? 'nav nav-open' : 'nav'}><button onClick={() => { setSelectedProduct(null); setCheckoutOpen(false); setCompletedOrder(null) }}>Início</button><button onClick={() => { setSelectedProduct(null); setCheckoutOpen(false); setCompletedOrder(null) }}>Produtos</button><a href="#sobre">Sobre</a><button onClick={() => setAdminOpen(true)}>Administração</button></nav>
        <button className="cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={20} /><span>Carrinho</span><b>{cartCount}</b></button>
      </header>

      {completedOrder ? (
        <OrderSuccess order={completedOrder.order} customer={completedOrder.customer} onContinue={() => setCompletedOrder(null)} />
      ) : checkoutOpen ? (
        <Checkout cart={cart} total={cartTotal} onBack={() => { setCheckoutOpen(false); setCartOpen(true) }} onComplete={completeOrder} />
      ) : selectedProduct ? (
        <ProductDetails product={selectedProduct} onBack={() => setSelectedProduct(null)} onAdd={addToCart} />
      ) : (
        <main>
          <section className="hero" id="inicio">
            <div className="hero-content"><p className="eyebrow">Conforto para todos os momentos</p><h1>Vista-se de carinho, durma com conforto.</h1><p>Peças escolhidas para transformar sua rotina em momentos mais leves e especiais.</p><a className="primary-button" href="#produtos">Conhecer coleção</a></div>
            <div className="hero-card" aria-label="Destaque da nova coleção"><span>Nova coleção</span><strong>Essência</strong><small>Delicadeza em cada detalhe</small></div>
          </section>
          <section className="benefits" aria-label="Benefícios da loja"><div><strong>Compra segura</strong><span>Seus dados protegidos</span></div><div><strong>Atendimento próximo</strong><span>Conte com a nossa equipe</span></div><div><strong>Seleção especial</strong><span>Qualidade e conforto</span></div></section>
          <section className="catalog" id="produtos">
            <div className="section-heading"><div><p className="eyebrow">Nosso catálogo</p><h2>Encontre a sua peça favorita</h2></div><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto" aria-label="Buscar produto" /></label></div>
            <div className="filters" aria-label="Categorias">{categories.map((item) => <button key={item} className={category === item ? 'filter-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
            <div className="catalog-status"><span>{filteredProducts.length} produto(s) encontrado(s)</span><span>Página {page} de {totalPages}</span></div>
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <article className="product-card" key={product._id}>
                  <button className="product-link" onClick={() => { setSelectedProduct(product); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label={`Ver detalhes de ${product.name}`}>
                    <div className="product-image-wrap"><img src={product.image} alt={product.name} />{product.featured && <span className="tag">Destaque</span>}</div>
                    <div className="product-info"><small>{product.category}</small><h3>{product.name}</h3><p>{product.description}</p><div className="product-footer"><strong>{currency.format(product.price)}</strong><span>Ver detalhes</span></div></div>
                  </button>
                </article>
              ))}
            </div>
            {!visibleProducts.length && <p className="empty-state">Nenhum produto encontrado com esses filtros.</p>}
            {totalPages > 1 && <nav className="pagination" aria-label="Paginação do catálogo"><button disabled={page === 1} onClick={() => goToPage(page - 1)}><ChevronLeft size={18} /> Anterior</button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <button key={number} className={page === number ? 'page-active' : ''} onClick={() => goToPage(number)}>{number}</button>)}<button disabled={page === totalPages} onClick={() => goToPage(page + 1)}>Próxima <ChevronRight size={18} /></button></nav>}
          </section>
          <section className="about" id="sobre"><p className="eyebrow">Sobre a Giacomoni</p><h2>Uma loja feita para acolher</h2><p>Nosso propósito é oferecer peças que unem beleza, qualidade e conforto, com atendimento próximo e cuidadoso.</p></section>
        </main>
      )}

      <footer><div className="brand brand-light"><span>GIACOMONI</span><small>pijamas & moda íntima</small></div><p>Projeto acadêmico de Análise e Desenvolvimento de Sistemas.</p></footer>
      {cartOpen && <button className="backdrop" aria-label="Fechar carrinho" onClick={() => setCartOpen(false)} />}
      <aside className={cartOpen ? 'cart-panel cart-panel-open' : 'cart-panel'} aria-hidden={!cartOpen}>
        <div className="cart-header"><div><small>Seu pedido</small><h2>Carrinho</h2></div><button className="icon-button" onClick={() => setCartOpen(false)}><X /></button></div>
        <div className="cart-items">{!cart.length && <p className="empty-state">Seu carrinho ainda está vazio.</p>}{cart.map((item) => <div className="cart-item" key={item.cartId}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>{item.size} • {item.color}</span><span>{currency.format(item.price)}</span></div><div className="quantity"><button onClick={() => changeQuantity(item.cartId, -1)}>−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.cartId, 1)}>+</button></div></div>)}</div>
        <div className="cart-summary"><div><span>Subtotal</span><strong>{currency.format(cartTotal)}</strong></div><button className="primary-button" disabled={!cart.length} onClick={() => { setCartOpen(false); setSelectedProduct(null); setCheckoutOpen(true); window.scrollTo({ top: 0 }) }}>Continuar para o checkout</button></div>
      </aside>
    </div>
  )
}

export default App
