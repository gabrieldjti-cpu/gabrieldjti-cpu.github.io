function login(){

let email = document.getElementById("email").value
let senha = document.getElementById("senha").value

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

let produtos = JSON.parse(localStorage.getItem("produtos")) || []

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

localStorage.setItem("produtos", JSON.stringify(produtos))

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

localStorage.setItem("produtos", JSON.stringify(produtos))

listarProdutos()

}


// CLIENTES

let clientes = JSON.parse(localStorage.getItem("clientes")) || []

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

localStorage.setItem("clientes", JSON.stringify(clientes))

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

localStorage.setItem("clientes", JSON.stringify(clientes))

listarClientes()

}


// VENDAS

let vendas = JSON.parse(localStorage.getItem("vendas")) || []

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

localStorage.setItem("vendas", JSON.stringify(vendas))

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


// EXECUTAR APENAS QUANDO EXISTIR

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