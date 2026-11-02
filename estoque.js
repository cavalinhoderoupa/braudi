document.addEventListener("DOMContentLoaded",()=>{
 const B=window.Brownie,table=document.getElementById("stockTable"),select=document.getElementById("stockProduct");
 function render(){
  table.innerHTML=`<table><thead><tr><th>Produto</th><th>Código</th><th>Preço</th><th>Disponível</th></tr></thead><tbody>${B.PRODUCTS.map(p=>`<tr><td>${p.name}</td><td>${p.code}</td><td>${p.price==null?"Não definido":B.money(p.price)}</td><td class="stock-number">${B.state.stock[p.code]||0} un.</td></tr>`).join("")}</tbody></table>`;
 }
 select.innerHTML=B.PRODUCTS.map(p=>`<option value="${p.code}">${p.code} · ${p.name}</option>`).join("");
 document.getElementById("stockForm").onsubmit=e=>{e.preventDefault();try{B.stockChange(select.value,Number(document.getElementById("stockQty").value),document.getElementById("stockMode").value);B.notify("Estoque atualizado.");e.target.reset();render();}catch(err){B.notify(err.message,"error");}};
 render();
});
