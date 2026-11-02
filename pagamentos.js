document.addEventListener("DOMContentLoaded",()=>{
 const B=window.Brownie,select=document.getElementById("paymentOrder"),amount=document.getElementById("paymentAmount");
 function options(){
  const current=select.value;const pending=B.state.orders.filter(o=>!o.cancelled&&B.remaining(o)>0);
  select.innerHTML=pending.length?pending.map(o=>`<option value="${o.id}">#${o.id} · ${B.escapeHtml(o.customer)} · saldo ${B.money(B.remaining(o))}</option>`).join(""):'<option value="">Nenhum pedido pendente</option>';
  if(pending.some(o=>String(o.id)===current))select.value=current;
  update();
 }
 function update(){
  const o=B.order(Number(select.value));
  document.getElementById("paymentTotal").value=o?B.money(B.total(o)):"—";
  document.getElementById("paymentPaid").value=o?B.money(B.paid(o)):"—";
  document.getElementById("paymentRemaining").value=o?B.money(B.remaining(o)):"—";
  const v=Math.round((Number(amount.value)||0)*100);
  document.getElementById("paymentAfter").value=o?B.money(Math.max(0,B.remaining(o)-v)):"—";
  amount.max=o?(B.remaining(o)/100).toFixed(2):"";
 }
 function renderTable(){
  const rows=B.state.orders.filter(o=>!o.cancelled&&B.remaining(o)>0);
  document.getElementById("pendingPayments").innerHTML=rows.length?`<table><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Restante</th></tr></thead><tbody>${rows.map(o=>`<tr><td>#${o.id}</td><td>${B.escapeHtml(o.customer)}</td><td>${B.money(B.total(o))}</td><td>${B.money(B.paid(o))}</td><td><strong>${B.money(B.remaining(o))}</strong></td></tr>`).join("")}</tbody></table>`:'<div class="empty">Não há pagamentos pendentes.</div>';
 }
 select.addEventListener("change",update);amount.addEventListener("input",update);
 document.getElementById("paymentForm").onsubmit=e=>{e.preventDefault();try{B.addPayment(Number(select.value),Math.round(Number(amount.value)*100));B.notify("Pagamento registrado.");amount.value="";options();renderTable();}catch(err){B.notify(err.message,"error");}};
 options();renderTable();
});
