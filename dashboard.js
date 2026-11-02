document.addEventListener("DOMContentLoaded",()=>{
 const B=window.Brownie,active=B.state.orders.filter(o=>!o.cancelled),pending=active.filter(o=>B.remaining(o)>0);
 const sold=active.reduce((n,o)=>n+B.total(o),0),receivable=pending.reduce((n,o)=>n+B.remaining(o),0),units=Object.values(B.state.stock).reduce((a,b)=>a+b,0);
 const stats=[["Pedidos ativos",active.length,"Pedidos não cancelados","▤"],["Total vendido",B.money(sold),"Valor bruto dos pedidos ativos","＄"],["A receber",B.money(receivable),"Saldo em aberto","◷"],["Estoque disponível",`${units} un.`,"Unidades somadas de todos os produtos","▦"]];
 document.getElementById("stats").innerHTML=stats.map(s=>`<article class="card stat-card"><span class="stat-icon">${s[3]}</span><div class="stat-label">${s[0]}</div><div class="stat-value">${s[1]}</div><div class="stat-note">${s[2]}</div></article>`).join("");
 const recent=B.state.orders.slice(0,6);
 document.getElementById("recentOrders").innerHTML=recent.length?`<table><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Situação</th></tr></thead><tbody>${recent.map(o=>`<tr><td>#${o.id}</td><td>${B.escapeHtml(o.customer)}</td><td>${B.money(B.total(o))}</td><td><span class="badge ${o.cancelled?"badge-cancelled":B.remaining(o)===0?"badge-paid":"badge-pending"}">${B.status(o)}</span></td></tr>`).join("")}</tbody></table>`:'<div class="empty">Nenhuma venda registrada ainda.</div>';
 document.getElementById("stockSummary").innerHTML=B.PRODUCTS.map(p=>`<div class="summary-row"><span>${p.name}</span><strong>${B.state.stock[p.code]||0} un.</strong></div>`).join("");
});
