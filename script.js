let empresaLogada = localStorage.getItem("empresaLogada")

// LOGIN

function login(){

let email = document.getElementById("email").value
let senha = document.getElementById("senha").value

// LOGIN ADMIN
if(email === "admin" && senha === "admin123"){
window.location = "admin.html"
return
}

let empresas = JSON.parse(localStorage.getItem("empresas")) || []

let empresa = empresas.find(e => e.email === email && e.senha === senha)

if(empresa){

localStorage.setItem("empresaLogada", empresa.email)

window.location = "dashboard.html"

}else{

alert("Email ou senha inválidos")

}

}


// PRODUTOS

let produtos = JSON.parse(localStorage.getItem("produtos_" + empresaLogada)) || []

function adicionarProduto(){

let nome = document.getElementById("produto").value
let quantidade = document.getElementById("quantidade").value
let preco = document.getElementById("preco").value

let produto = {
nome,
quantidade,
preco
}

produtos.push(produto)

localStorage.setItem("produtos_" + empresaLogada, JSON.stringify(produtos))

listarProdutos()

}

function listarProdutos(){

let lista = document.getElementById("listaProdutos")

if(!lista) return

lista.innerHTML = ""

produtos.forEach((produto, index) => {

lista.innerHTML += `

<tr>

<td>${produto.nome}</td>
<td>${produto.quantidade}</td>
<td>R$ ${produto.preco}</td>

<td>

<button onclick="excluirProduto(${index})">
Excluir
</button>

</td>

</tr>

`

})

}

function excluirProduto(index){

produtos.splice(index, 1)

localStorage.setItem("produtos_" + empresaLogada, JSON.stringify(produtos))

listarProdutos()

}


// CLIENTES

let clientes = JSON.parse(localStorage.getItem("clientes_" + empresaLogada)) || []

function adicionarCliente(){

let nome = document.getElementById("nomeCliente").value
let telefone = document.getElementById("telefoneCliente").value
let email = document.getElementById("emailCliente").value

let cliente = {
nome,
telefone,
email
}

clientes.push(cliente)

localStorage.setItem("clientes_" + empresaLogada, JSON.stringify(clientes))

listarClientes()

}

function listarClientes(){

let lista = document.getElementById("listaClientes")

if(!lista) return

lista.innerHTML = ""

clientes.forEach((cliente, index) => {

lista.innerHTML += `

<tr>

<td>${cliente.nome}</td>
<td>${cliente.telefone}</td>
<td>${cliente.email}</td>

<td>

<button onclick="excluirCliente(${index})">
Excluir
</button>

</td>

</tr>

`

})

}

function excluirCliente(index){

clientes.splice(index, 1)

localStorage.setItem("clientes_" + empresaLogada, JSON.stringify(clientes))

listarClientes()

}


// VENDAS

let vendas = JSON.parse(localStorage.getItem("vendas_" + empresaLogada)) || []

function carregarDadosVenda(){

let selectCliente = document.getElementById("clienteVenda")
let selectProduto = document.getElementById("produtoVenda")

if(!selectCliente || !selectProduto) return

selectCliente.innerHTML = "<option>Cliente</option>"
selectProduto.innerHTML = "<option>Produto</option>"

clientes.forEach((cliente, index)=>{

selectCliente.innerHTML += `
<option value="${index}">
${cliente.nome}
</option>
`

})

produtos.forEach((produto, index)=>{

selectProduto.innerHTML += `
<option value="${index}">
${produto.nome}
</option>
`

})

}

function registrarVenda(){

let clienteIndex = document.getElementById("clienteVenda").value
let produtoIndex = document.getElementById("produtoVenda").value
let quantidade = document.getElementById("quantidadeVenda").value

let cliente = clientes[clienteIndex]
let produto = produtos[produtoIndex]

let total = quantidade * produto.preco

let venda = {
cliente: cliente.nome,
produto: produto.nome,
quantidade,
total
}

vendas.push(venda)

localStorage.setItem("vendas_" + empresaLogada, JSON.stringify(vendas))

listarVendas()

}

function listarVendas(){

let lista = document.getElementById("listaVendas")

if(!lista) return

lista.innerHTML = ""

vendas.forEach((venda)=>{

lista.innerHTML += `

<tr>

<td>${venda.cliente}</td>
<td>${venda.produto}</td>
<td>${venda.quantidade}</td>
<td>R$ ${venda.total}</td>

</tr>

`

})

}


// CADASTRO EMPRESA

function cadastrar(){

let nome = document.getElementById("nomeEmpresa").value
let email = document.getElementById("emailCadastro").value
let senha = document.getElementById("senhaCadastro").value

let empresas = JSON.parse(localStorage.getItem("empresas")) || []

let novaEmpresa = {
nome,
email,
senha
}

empresas.push(novaEmpresa)

localStorage.setItem("empresas", JSON.stringify(empresas))

alert("Conta criada com sucesso!")

window.location = "index.html"

}


// DASHBOARD

function carregarEmpresa(){

let email = localStorage.getItem("empresaLogada")

let empresas = JSON.parse(localStorage.getItem("empresas")) || []

let empresa = empresas.find(e => e.email === email)

let nome = document.getElementById("nomeEmpresa")

if(nome && empresa){
nome.innerText = "Bem-vindo, " + empresa.nome
}

}

carregarEmpresa()


function atualizarDashboard(){

let produtos = JSON.parse(localStorage.getItem("produtos_" + empresaLogada)) || []
let clientes = JSON.parse(localStorage.getItem("clientes_" + empresaLogada)) || []
let vendas = JSON.parse(localStorage.getItem("vendas_" + empresaLogada)) || []

let totalProdutos = document.getElementById("totalProdutos")
let totalClientes = document.getElementById("totalClientes")
let totalVendas = document.getElementById("totalVendas")

if(totalProdutos) totalProdutos.innerText = produtos.length
if(totalClientes) totalClientes.innerText = clientes.length
if(totalVendas) totalVendas.innerText = vendas.length

}

atualizarDashboard()


// ADMIN

function listarEmpresas(){

let empresas = JSON.parse(localStorage.getItem("empresas")) || []

let lista = document.getElementById("listaEmpresas")

if(!lista) return

lista.innerHTML = ""

empresas.forEach(empresa => {

lista.innerHTML += `

<tr>

<td>${empresa.nome}</td>
<td>${empresa.email}</td>

</tr>

`

})

}

listarEmpresas()


// SAIR

function sair(){

localStorage.removeItem("empresaLogada")

window.location = "index.html"

}


// EXECUÇÕES AUTOMÁTICAS

if(document.getElementById("listaProdutos")){
listarProdutos()
}

if(document.getElementById("listaClientes")){
listarClientes()
}

if(document.getElementById("clienteVenda")){
carregarDadosVenda()
}

if(document.getElementById("listaVendas")){
listarVendas()
}
function listarEmpresas(){

let empresas = JSON.parse(localStorage.getItem("empresas")) || []

let lista = document.getElementById("listaEmpresas")
let total = document.getElementById("totalEmpresas")

if(!lista) return

lista.innerHTML = ""

empresas.forEach((empresa, index) => {

lista.innerHTML += `

<tr>

<td>${empresa.nome}</td>
<td>${empresa.email}</td>

<td>

<button onclick="excluirEmpresa(${index})">
Excluir
</button>

</td>

</tr>

`

})

if(total){
total.innerText = empresas.length
}

}

function excluirEmpresa(index){

let empresas = JSON.parse(localStorage.getItem("empresas")) || []

empresas.splice(index, 1)

localStorage.setItem("empresas", JSON.stringify(empresas))

listarEmpresas()

}

listarEmpresas()