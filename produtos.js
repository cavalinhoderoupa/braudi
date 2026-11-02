
document.addEventListener("DOMContentLoaded", () => {
  const B = window.Brownie;
  const host = document.getElementById("productCards");

  function render() {
    host.innerHTML = B.state.products.map(p => `
      <article class="card product-card">
        <span class="product-code">${B.escapeHtml(p.code)}</span>

        <div class="product-name">
          ${B.escapeHtml(p.name)}
        </div>

        <div class="product-price">
          ${p.price == null ? "Preço não definido" : B.money(p.price)}
        </div>

        <form class="price-edit-form" data-code="${B.escapeHtml(p.code)}">
          <div class="field">
            <label for="price-${B.escapeHtml(p.code)}">Novo preço (R$)</label>

            <input
              id="price-${B.escapeHtml(p.code)}"
              type="number"
              name="price"
              min="0.01"
              step="0.01"
              value="${p.price == null ? "" : (p.price / 100).toFixed(2)}"
              placeholder="Ex.: 8,50"
              required
            >
          </div>

          <button class="btn btn-primary" type="submit">
            Salvar preço
          </button>
        </form>
      </article>
    `).join("");
  }

  host.addEventListener("submit", e => {
    const form = e.target.closest(".price-edit-form");

    if (!form) return;

    e.preventDefault();

    try {
      const code = form.dataset.code;
      const reais = Number(form.elements.price.value);

      B.setPrice(code, reais);

      B.notify("Preço atualizado com sucesso!");
      render();
    } catch (err) {
      B.notify(err.message, "error");
    }
  });

  // Remove o formulário antigo, exclusivo do BC.
  document.getElementById("priceForm")?.closest("section")?.remove();

  render();
});