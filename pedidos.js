
document.addEventListener("DOMContentLoaded", () => {
  const B = window.Brownie;

  const table = document.getElementById("ordersTable");
  const search = document.getElementById("searchOrders");
  const filter = document.getElementById("filterStatus");
  const modal = document.getElementById("orderModal");
  const modalTitle = document.getElementById("modalTitle");
  const orderDetails = document.getElementById("orderDetails");

  let currentOrderId = null;

  if (!B || !table) {
    console.error("Sistema Brownie não foi carregado.");
    return;
  }

  function canDelete(o) {
    return Boolean(o.cancelled) || B.remaining(o) === 0;
  }

  function eligibleOrders() {
    return B.state.orders.filter(canDelete);
  }

  function createBulkButton() {
    if (document.getElementById("deleteCompletedOrders")) return;

    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) return;

    const button = document.createElement("button");

    button.id = "deleteCompletedOrders";
    button.type = "button";
    button.className = "btn btn-danger";
    button.textContent = "Excluir concluídos";

    toolbar.appendChild(button);

    button.addEventListener("click", () => {
      const eligible = eligibleOrders();

      if (!eligible.length) {
        B.notify("Não existem pedidos concluídos para excluir.", "error");
        return;
      }

      const cancelled = eligible.filter(o => o.cancelled).length;
      const paid = eligible.filter(o => !o.cancelled).length;

      const confirmed = confirm(
        `Deseja excluir ${eligible.length} pedido(s)?\n\n` +
        `Cancelados: ${cancelled}\n` +
        `Pagos: ${paid}\n\n` +
        `Pedidos pendentes serão mantidos.\n` +
        `Esta ação não poderá ser desfeita.`
      );

      if (!confirmed) return;

      try {
        const deleted = B.deleteCompletedOrders();
        closeModal();
        B.notify(`${deleted} pedido(s) excluído(s) com sucesso!`);
        render();
      } catch (error) {
        B.notify(error.message, "error");
      }
    });

    updateBulkButton();
  }

  function updateBulkButton() {
    const button = document.getElementById("deleteCompletedOrders");
    if (!button) return;

    const count = eligibleOrders().length;

    button.textContent = `Excluir concluídos (${count})`;
    button.disabled = count === 0;
  }

  function render() {
    const term = (search?.value || "").toLowerCase().trim();
    const selectedStatus = filter?.value || "all";

    const orders = B.state.orders.filter(o => {
      const matchesSearch =
        String(o.id).includes(term) ||
        String(o.customer).toLowerCase().includes(term);

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "pending" && !o.cancelled && B.remaining(o) > 0) ||
        (selectedStatus === "paid" && !o.cancelled && B.remaining(o) === 0) ||
        (selectedStatus === "cancelled" && o.cancelled);

      return matchesSearch && matchesStatus;
    });

    if (!orders.length) {
      table.innerHTML = `
        <div class="empty-state">
          Nenhum pedido encontrado.
        </div>
      `;

      updateBulkButton();
      return;
    }

    table.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Nº</th>
            <th>Cliente</th>
            <th>Data</th>
            <th>Total</th>
            <th>Restante</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td>#${o.id}</td>
              <td>${B.escapeHtml(o.customer)}</td>
              <td>${B.fmtDate(o.createdAt)}</td>
              <td>${B.money(B.total(o))}</td>
              <td>${B.money(B.remaining(o))}</td>
              <td>
                <span class="status ${o.cancelled ? "status-cancelled" : B.remaining(o) === 0 ? "status-paid" : "status-pending"}">
                  ${B.status(o)}
                </span>
              </td>
              <td>
                <button class="btn btn-secondary btn-sm"
                  data-action="details" data-id="${o.id}">
                  Detalhes
                </button>

                <button class="btn btn-danger btn-sm"
                  data-action="delete" data-id="${o.id}"
                  ${canDelete(o) ? "" : "disabled"}>
                  Excluir
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    updateBulkButton();
  }

  function closeModal() {
    modal?.classList.remove("open");
    currentOrderId = null;
  }

  function openModal() {
    modal?.classList.add("open");
  }

  function openDetails(id) {
    const o = B.order(id);
    if (!o || !modal || !orderDetails) return;

    currentOrderId = o.id;
    modalTitle.textContent = `Detalhes do pedido #${o.id}`;

    const items = o.items.map(i => `
      <tr>
        <td>${B.escapeHtml(B.product(i.code)?.name || i.code)}</td>
        <td>${i.qty}</td>
        <td>${B.money(i.unitPrice)}</td>
        <td>${B.money(i.qty * i.unitPrice)}</td>
      </tr>
    `).join("");

    const payments = (o.payments || []).map(p => `
      <tr>
        <td>${B.fmtDate(p.date)}</td>
        <td>${B.money(p.amount)}</td>
        <td>${B.escapeHtml(p.note || "Pagamento")}</td>
      </tr>
    `).join("");

    orderDetails.innerHTML = `
      <div class="modal-body">
        <p><strong>Cliente:</strong> ${B.escapeHtml(o.customer)}</p>
        <p><strong>Data:</strong> ${B.fmtDate(o.createdAt)}</p>
        <p><strong>Status:</strong> ${B.status(o)}</p>

        <h3>Produtos</h3>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Preço unitário</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>${items}</tbody>
          </table>
        </div>

        <h3>Pagamentos</h3>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Valor</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              ${payments || '<tr><td colspan="3">Nenhum pagamento registrado.</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="order-summary">
          <p><strong>Total:</strong> ${B.money(B.total(o))}</p>
          <p><strong>Pago:</strong> ${B.money(B.paid(o))}</p>
          <p><strong>Restante:</strong> ${B.money(B.remaining(o))}</p>
        </div>

        ${!o.cancelled ? `
          <h3>Adicionar produtos</h3>

          <form id="addItemsForm">
            <div class="field">
              <label>Produto</label>
              <select name="code" required>
                ${B.state.products.map(p => `
                  <option value="${B.escapeHtml(p.code)}">
                    ${B.escapeHtml(p.name)} — ${B.money(p.price)}
                  </option>
                `).join("")}
              </select>
            </div>

            <div class="field">
              <label>Quantidade</label>
              <input type="number" name="qty" min="1" step="1" value="1" required>
            </div>

            <button class="btn btn-primary" type="submit">
              Adicionar produto
            </button>
          </form>
        ` : ""}

        <div class="modal-actions">
          ${!o.cancelled ? `
            <button class="btn btn-secondary"
              data-action="cancel" data-id="${o.id}">
              Cancelar pedido
            </button>
          ` : ""}

          ${canDelete(o) ? `
            <button class="btn btn-danger"
              data-action="delete" data-id="${o.id}">
              Excluir pedido
            </button>
          ` : `
            <p>Este pedido possui pagamento pendente e não pode ser excluído.</p>
          `}
        </div>
      </div>
    `;

    openModal();
  }

  function deleteOne(id) {
    const o = B.order(id);
    if (!o) return;

    if (!canDelete(o)) {
      B.notify("Pedidos pendentes não podem ser excluídos.", "error");
      return;
    }

    if (!confirm(`Deseja excluir permanentemente o pedido #${id}?`)) return;

    try {
      B.deleteOrder(id);
      closeModal();
      B.notify("Pedido excluído com sucesso!");
      render();
    } catch (error) {
      B.notify(error.message, "error");
    }
  }

  table.addEventListener("click", e => {
    const button = e.target.closest("[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);

    if (button.dataset.action === "details") {
      openDetails(id);
    }

    if (button.dataset.action === "delete") {
      deleteOne(id);
    }
  });

  orderDetails.addEventListener("click", e => {
    const button = e.target.closest("[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);

    if (button.dataset.action === "delete") {
      deleteOne(id);
    }

    if (button.dataset.action === "cancel") {
      const o = B.order(id);
      if (!o || o.cancelled) return;

      if (!confirm("Cancelar este pedido? Os produtos retornarão ao estoque.")) return;

      try {
        B.cancelOrder(id);
        B.notify("Pedido cancelado e estoque atualizado!");
        openDetails(id);
        render();
      } catch (error) {
        B.notify(error.message, "error");
      }
    }
  });

  orderDetails.addEventListener("submit", e => {
    if (e.target.id !== "addItemsForm") return;

    e.preventDefault();

    const code = e.target.elements.code.value;
    const qty = Number(e.target.elements.qty.value);

    try {
      B.addItems(currentOrderId, [{code, qty}]);
      B.notify("Produto adicionado ao pedido!");
      openDetails(currentOrderId);
      render();
    } catch (error) {
      B.notify(error.message, "error");
    }
  });

  modal.addEventListener("click", e => {
    if (e.target === modal || e.target.closest("[data-close]")) {
      closeModal();
    }
  });

  search?.addEventListener("input", render);
  filter?.addEventListener("change", render);

  createBulkButton();
  render();
});
