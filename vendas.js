document.addEventListener("DOMContentLoaded",()=>{
 const B=window.Brownie, host=document.getElementById("saleLines"), form=document.getElementById("saleForm");
 function addLine(){
  const row=document.createElement("div");row.className="product-line";
  row.innerHTML=`<div class="field"><label>Produto</label><select class="line-product">${B.PRODUCTS.map(p=>`<option value="${p.code}" ${p.price==null?"disabled":""}>${p.code} · ${p.name}${p.price==null?" (configure o preço)":""}</option>`).join("")}</select></div><div class="field"><label>Quantidade</label><input class="line-qty" type="number" min="1" step="1" value="1"></div><div class="field"><label>Preço unitário</label><input class="line-price" disabled></div><div class="field"><label>Subtotal</label><input class="line-subtotal" disabled></div><button type="button" class="btn btn-danger btn-small remove-line" title="Remover">×</button>`;
  host.append(row);row.querySelectorAll("select,input").forEach(x=>x.addEventListener("input",calculate));row.querySelector(".remove-line").addEventListener("click",()=>{row.remove();calculate();});calculate();
 }
 function lines(){return [...host.querySelectorAll(".product-line")].map(r=>({code:r.querySelector(".line-product").value,qty:Number(r.querySelector(".line-qty").value)})).filter(x=>x.qty>0);}
 function calculate(){
  let sum=0;host.querySelectorAll(".product-line").forEach(r=>{const p=B.product(r.querySelector(".line-product").value),q=Math.max(0,Number(r.querySelector(".line-qty").value)||0),sub=p?.price==null?0:p.price*q;sum+=sub;r.querySelector(".line-price").value=p?.price==null?"Indisponível":B.money(p.price);r.querySelector(".line-subtotal").value=p?.price==null?"—":B.money(sub);});
  const paid=Math.round((Number(document.getElementById("initialPayment").value)||0)*100);
  document.getElementById("saleTotal").textContent=B.money(sum);document.getElementById("salePaid").textContent=B.money(paid);document.getElementById("saleRemaining").textContent=B.money(Math.max(0,sum-paid));
 }
 document.getElementById("addLine").addEventListener("click",addLine);
 document.getElementById("initialPayment").addEventListener("input",calculate);
 form.addEventListener("submit",e=>{e.preventDefault();try{const payment=Math.round(Number(document.getElementById("initialPayment").value)*100);const o=B.addOrder(document.getElementById("customer").value,lines(),payment);B.notify(`Pedido #${o.id} registrado com sucesso.`);form.reset();host.innerHTML="";addLine();}catch(err){B.notify(err.message,"error");}});
 form.addEventListener("reset",()=>setTimeout(()=>{host.innerHTML="";addLine();},0));
 addLine();
});
