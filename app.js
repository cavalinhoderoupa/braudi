
/* Camada de dados local. Valores monetários ficam em centavos. */

(() => {
  const KEY = "brownie_system_v1";

  const PRODUCTS = [
    {code:"B", name:"Brownie tradicional", price:700},
    {code:"BB", name:"Brownie brigadeiro", price:900},
    {code:"BN", name:"Brownie ninho", price:900},
    {code:"BC", name:"Brownie Casadinho", price:900}
  ];

  const clone = x => JSON.parse(JSON.stringify(x));

  function initial() {
    return {
      products: clone(PRODUCTS),
      stock: {B:0,BB:0,BN:0,BC:0},
      orders: [],
      nextOrder: 1
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return initial();

      const data = JSON.parse(raw);
      const fresh = initial();

      return {
        ...fresh,
        ...data,
        products: fresh.products.map(p => ({
          ...p,
          ...(data.products || []).find(x => x.code === p.code)
        })),
        stock: {...fresh.stock, ...data.stock}
      };
    } catch(e) {
      console.error("Falha ao ler dados locais", e);
      return initial();
    }
  }

  let state = load();

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  const money = c => new Intl.NumberFormat("pt-BR", {
    style:"currency",
    currency:"BRL"
  }).format((Number(c) || 0) / 100);

  const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[c]));

  const product = code => state.products.find(p => p.code === code);
  const order = id => state.orders.find(o => o.id === Number(id));
  const total = o => o.items.reduce((n,i) => n + i.qty * i.unitPrice, 0);
  const paid = o => (o.payments || []).reduce((n,p) => n + p.amount, 0);
  const remaining = o => Math.max(0, total(o) - paid(o));

  const status = o => o.cancelled
    ? "Cancelado"
    : remaining(o) === 0 ? "Pago" : "Pendente";

  const canDeleteCompletedOrder = o =>
    Boolean(o.cancelled) || remaining(o) === 0;

  function notify(message, type = "success") {
    const el = document.getElementById("toast");
    if (!el) return;

    el.textContent = message;
    el.className = "toast show";

    clearTimeout(notify.timer);

    notify.timer = setTimeout(() => {
      el.className = "toast";
    }, 2800);
  }

  function addOrder(name, items, initialPayment) {
    if (!name.trim()) throw Error("Informe o nome do comprador.");
    if (!items.length) throw Error("Adicione pelo menos um produto.");

    items.forEach(i => {
      const p = product(i.code);

      if (!p || p.price == null)
        throw Error("Configure o preço do produto antes de vendê-lo.");

      if (!Number.isInteger(i.qty) || i.qty < 1)
        throw Error("Quantidade inválida.");

      if ((state.stock[i.code] || 0) < i.qty)
        throw Error(`Estoque insuficiente para ${p.name}. Disponível: ${state.stock[i.code] || 0}.`);

      i.unitPrice = p.price;
    });

    const amount = items.reduce((n,i) => n + i.qty * i.unitPrice, 0);

    if (!Number.isInteger(initialPayment) || initialPayment < 0 || initialPayment > amount)
      throw Error("O pagamento inicial deve estar entre R$ 0,00 e o total do pedido.");

    const o = {
      id: state.nextOrder++,
      customer: name.trim(),
      items: clone(items),
      createdAt: new Date().toISOString(),
      payments: initialPayment
        ? [{amount:initialPayment,date:new Date().toISOString(),note:"Pagamento inicial"}]
        : [],
      cancelled: false
    };

    items.forEach(i => state.stock[i.code] -= i.qty);

    state.orders.unshift(o);
    save();

    return o;
  }

  function addPayment(id, amount) {
    const o = order(id);

    if (!o || o.cancelled)
      throw Error("Pedido não encontrado ou cancelado.");

    if (!Number.isInteger(amount) || amount <= 0 || amount > remaining(o))
      throw Error("Informe um pagamento válido, até o saldo restante.");

    o.payments.push({
      amount,
      date:new Date().toISOString(),
      note:"Pagamento registrado"
    });

    save();
    return o;
  }

  function cancelOrder(id) {
    const o = order(id);

    if (!o || o.cancelled)
      throw Error("Pedido não encontrado ou já cancelado.");

    o.items.forEach(i => {
      state.stock[i.code] = (state.stock[i.code] || 0) + i.qty;
    });

    o.cancelled = true;
    o.cancelledAt = new Date().toISOString();

    save();
    return o;
  }

  // Exclui individualmente somente pedidos cancelados ou totalmente pagos.
  function deleteOrder(id) {
    const o = order(id);

    if (!o)
      throw Error("Pedido não encontrado.");

    if (!canDeleteCompletedOrder(o))
      throw Error("Não é possível excluir um pedido com pagamento pendente.");

    // Não mexe no estoque durante a exclusão.
    state.orders = state.orders.filter(item => item.id !== Number(id));

    save();
    return o;
  }

  // Exclui todos os pedidos cancelados ou totalmente pagos.
  function deleteCompletedOrders() {
    const eligible = state.orders.filter(canDeleteCompletedOrder);

    if (eligible.length === 0)
      return 0;

    state.orders = state.orders.filter(o => !canDeleteCompletedOrder(o));

    save();

    return eligible.length;
  }

  function addItems(id, items) {
    const o = order(id);

    if (!o || o.cancelled)
      throw Error("Pedido não encontrado ou cancelado.");

    if (!items.length)
      throw Error("Adicione pelo menos um produto.");

    items.forEach(i => {
      const p = product(i.code);

      if (!p || p.price == null)
        throw Error("Produto sem preço configurado.");

      if (!Number.isInteger(i.qty) || i.qty < 1)
        throw Error("Quantidade inválida.");

      if ((state.stock[i.code] || 0) < i.qty)
        throw Error(`Estoque insuficiente para ${p.name}.`);
    });

    items.forEach(i => {
      state.stock[i.code] -= i.qty;
      o.items.push({...i,unitPrice:product(i.code).price});
    });

    save();
    return o;
  }

  function stockChange(code, qty, mode) {
    if (!product(code)) throw Error("Produto inválido.");

    if (!Number.isInteger(qty) || qty < 0)
      throw Error("Informe uma quantidade inteira não negativa.");

    const current = state.stock[code] || 0;

    if (mode === "add") {
      state.stock[code] = current + qty;
    } else if (mode === "remove") {
      if (qty > current)
        throw Error("A retirada não pode deixar o estoque negativo.");

      state.stock[code] = current - qty;
    } else {
      state.stock[code] = qty;
    }

    save();
  }

  function setPrice(code, reais) {
    const p = product(code);

    if (!p)
      throw Error("Produto não encontrado.");

    if (!Number.isFinite(reais) || reais <= 0)
      throw Error("Informe um preço maior que zero.");

    p.price = Math.round(reais * 100);

    save();
    return p;
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle:"short",
      timeStyle:"short"
    });
  }

  function renderNav() {
    const current = location.pathname.split("/").pop() || "index.html";

    const links = [
      ["index.html","⌂","Visão geral"],
      ["vendas.html","＋","Registrar venda"],
      ["pedidos.html","▤","Pedidos"],
      ["estoque.html","▦","Estoque"],
      ["dividas.html","◷","Dívidas"],
      ["pagamentos.html","＄","Pagamentos"],
      ["produtos.html","◇","Produtos e preços"]
    ];

    const el = document.getElementById("sidebar");
    if (!el) return;

    el.innerHTML = `<div class="brand"><div class="brand-mark">🍫</div><div><strong>Brownie</strong><small>Gestão de vendas</small></div></div><div class="nav-label">Menu principal</div>${links.map(([href,ic,label]) => `<a class="nav-link ${current === href ? "active" : ""}" href="${href}"><span class="nav-icon">${ic}</span>${label}</a>`).join("")}<div class="sidebar-foot">Sistema de controle de vendas<br>Armazenamento neste navegador</div>`;

    document.getElementById("menuToggle")?.addEventListener("click", () => el.classList.toggle("open"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderNav();

    document.getElementById("todayLabel")?.append(
      new Date().toLocaleDateString("pt-BR", {
        weekday:"long",
        day:"2-digit",
        month:"long"
      })
    );
  });

  window.Brownie = {
    get state() { return state; },
    PRODUCTS,
    load:() => state,
    save,
    money,
    escapeHtml,
    product,
    order,
    total,
    paid,
    remaining,
    status,
    notify,
    addOrder,
    addPayment,
    cancelOrder,
    deleteOrder,
    deleteCompletedOrders,
    addItems,
    stockChange,
    setPrice,
    fmtDate
  };
})();
