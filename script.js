// ===============================
// 🛍️ PRODUTOS (INDEX)
// ===============================
const produtos = [
    { nome: "Arroz 5kg", preco: 24, antigo: 30, desconto: "-20%" },
    { nome: "Óleo 900ml", preco: 7.20, antigo: 8.50, desconto: "-15%" },
    { nome: "Feijão 1kg", preco: 9.00, antigo: 10.00, desconto: "-10%" },
    { nome: "Açúcar 1kg", preco: 4.40, antigo: 5.00, desconto: "-12%" },
    { nome: "Leite 1L", preco: 5.99, antigo: 6.50, desconto: "-8%" },
    { nome: "Café 500g", preco: 9.80, antigo: 12.00, desconto: "-18%" },
    { nome: "Macarrão 500g", preco: 3.50, antigo: 4.00, desconto: "-10%" },
    { nome: "Refrigerante 2L", preco: 8.90, antigo: 10.00, desconto: "-11%" }
];

// ===============================
// 🧱 MOSTRAR PRODUTOS
// ===============================
    function mostrarProdutos(lista) {
        let container = document.getElementById("lista-produtos");
        if (!container) return;
    
        container.innerHTML = "";
    
        if (lista.length === 0) {
            container.innerHTML = "<p style='text-align:center;'>Nenhum produto encontrado 😢</p>";
            return;
        }
    
        lista.forEach(produto => {
            let card = document.createElement("div");
            card.classList.add("card");
    
            card.innerHTML = `
                <span class="desconto">${produto.desconto}</span>
                <img src="https://via.placeholder.com/180">
                <h3>${produto.nome}</h3>
                <p class="preco-antigo">R$ ${produto.antigo}</p>
                <p class="preco">R$ ${produto.preco}</p>
                <button onclick="adicionarCarrinho('${produto.nome}', ${produto.preco})">
                    Adicionar
                </button>
            `;
    
            container.appendChild(card);
        });
    }
    
    // ===============================
    // 🔍 BUSCA (INDEX)
    // ===============================
    function filtrarProdutos() {
        let termo = document.getElementById("busca").value.toLowerCase();
    
        let filtrados = produtos.filter(p =>
            p.nome.toLowerCase().includes(termo)
        );
    
        mostrarProdutos(filtrados);
    }
    
    // ===============================
    // 🛒 CARRINHO
    // ===============================
    function adicionarCarrinho(nome, preco) {
        let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    
        let produto = carrinho.find(p => p.nome === nome);
    
        if (produto) {
            produto.quantidade++;
        } else {
            carrinho.push({ nome, preco, quantidade: 1 });
        }
    
        localStorage.setItem("carrinho", JSON.stringify(carrinho));
    
        atualizarContador();
        alert("Produto adicionado!");
    }
    
    // ===============================
    // 🔢 CONTADOR
    // ===============================
    function atualizarContador() {
        let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    
        let total = carrinho.reduce((soma, p) => soma + p.quantidade, 0);
    
        let contador = document.getElementById("contador");
        if (contador) contador.innerText = total;
    }
    
    // ===============================
    // 📦 CARREGAR CARRINHO
    // ===============================
    function carregarCarrinho() {
        let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
        let container = document.getElementById("lista-carrinho");
        let totalEl = document.getElementById("total");
    
        if (!container || !totalEl) return;
    
        let total = 0;
        container.innerHTML = "";
    
        if (carrinho.length === 0) {
            container.innerHTML = "<p style='text-align:center;'>Seu carrinho está vazio 🛒</p>";
            totalEl.innerText = "";
            return;
        }
    
        carrinho.forEach((produto, index) => {
            let item = document.createElement("div");
            item.classList.add("item-carrinho");
    
            item.innerHTML = `
                <div>
                    <div class="item-info">${produto.nome}</div>
    
                    <div class="controle-qtd">
                        <button onclick="diminuirQtd(${index})">-</button>
                        <span>${produto.quantidade}</span>
                        <button onclick="aumentarQtd(${index})">+</button>
                    </div>
    
                    <div>R$ ${(produto.preco * produto.quantidade).toFixed(2)}</div>
                </div>
    
                <button class="btn-remover" onclick="removerItem(${index})">❌</button>
            `;
    
            container.appendChild(item);
            total += produto.preco * produto.quantidade;
        });
    
        totalEl.innerText = "Total: R$ " + total.toFixed(2);
    }
    
    // ===============================
    // ➕➖ CONTROLE
    // ===============================
    function aumentarQtd(i) {
        let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
        carrinho[i].quantidade++;
        localStorage.setItem("carrinho", JSON.stringify(carrinho));
        carregarCarrinho();
        atualizarContador();
    }
    
    function diminuirQtd(i) {
        let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    
        if (carrinho[i].quantidade > 1) {
            carrinho[i].quantidade--;
        } else {
            carrinho.splice(i, 1);
        }
    
        localStorage.setItem("carrinho", JSON.stringify(carrinho));
        carregarCarrinho();
        atualizarContador();
    }
    
    // ===============================
    // ❌ REMOVER / LIMPAR
    // ===============================
    function removerItem(i) {
        let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
        carrinho.splice(i, 1);
        localStorage.setItem("carrinho", JSON.stringify(carrinho));
        carregarCarrinho();
        atualizarContador();
    }
    
    function limparCarrinho() {
        localStorage.removeItem("carrinho");
        carregarCarrinho();
        atualizarContador();
    }
    
    // ===============================
    // 🔀 NAVEGAÇÃO
    // ===============================
    function voltar() {
        window.location.href = "index.html";
    }
    
    function irCarrinho() {
        window.location.href = "carrinho.html";
    }
    
    // ===============================
    // 💳 FINALIZAR (ABRE MODAL)
    // ===============================
    function finalizarPedido() {
        let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    
        if (carrinho.length === 0) {
            alert("Seu carrinho está vazio!");
            return;
        }
    
        document.getElementById("modal-pagamento").style.display = "flex";
    }
    
    // ===============================
    // 📲 ESCOLHER PAGAMENTO
    // ===============================
    function escolherPagamento(tipo) {
        let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    
        let mensagem = "🛒 *Pedido do Supermercado*%0A%0A";
        let total = 0;
    
        carrinho.forEach(p => {
            mensagem += `- ${p.nome} (${p.quantidade}x) - R$ ${(p.preco * p.quantidade).toFixed(2)}%0A`;
            total += p.preco * p.quantidade;
        });
    
        mensagem += `%0A💰 Total: R$ ${total.toFixed(2)}`;
        mensagem += `%0A💳 Pagamento: ${tipo}`;
    
        let telefone = "5533988101744"; // TROQUE AQUI

    window.open(`https://wa.me/${telefone}?text=${mensagem}`, "_blank");

    fecharModal();
}

// ===============================
// ❌ FECHAR MODAL
// ===============================
function fecharModal() {
    document.getElementById("modal-pagamento").style.display = "none";
}
const carnes = [
    { nome: "Carne Bovina 1kg", preco: 32.90, antigo: 38.00, desconto: "-13%" },
    { nome: "Frango Inteiro", preco: 15.50, antigo: 18.00, desconto: "-14%" },
    { nome: "Costela 1kg", preco: 29.90, antigo: 35.00, desconto: "-15%" },
    { nome: "Linguiça 1kg", preco: 18.90, antigo: 22.00, desconto: "-14%" },
    { nome: "Carne Moída 1kg", preco: 26.90, antigo: 30.00, desconto: "-10%" }
];

function carregarCarnes() {
    mostrarLista(carnes, "lista-carnes");
}

function filtrarCarnes() {
    filtrarLista(carnes, "lista-carnes");
}
const hortifruti = [
    { nome: "Banana 1kg", preco: 4.50, antigo: 5.50, desconto: "-18%" },
    { nome: "Maçã 1kg", preco: 6.90, antigo: 8.00, desconto: "-13%" },
    { nome: "Tomate 1kg", preco: 7.50, antigo: 9.00, desconto: "-17%" },
    { nome: "Batata 1kg", preco: 5.20, antigo: 6.00, desconto: "-13%" },
    { nome: "Alface Unidade", preco: 2.50, antigo: 3.00, desconto: "-16%" },
    { nome: "Cenoura 1kg", preco: 4.80, antigo: 5.50, desconto: "-12%" }
];

function carregarHortifruti() {
    mostrarLista(hortifruti, "lista-hortifruti");
}

function filtrarHortifruti() {
    filtrarLista(hortifruti, "lista-hortifruti");
}
const limpeza = [
    { nome: "Detergente 500ml", preco: 2.50, antigo: 3.00, desconto: "-16%" },
    { nome: "Sabão em Pó 1kg", preco: 9.90, antigo: 12.00, desconto: "-18%" },
    { nome: "Água Sanitária 1L", preco: 3.80, antigo: 4.50, desconto: "-15%" },
    { nome: "Desinfetante 2L", preco: 6.90, antigo: 8.00, desconto: "-13%" },
    { nome: "Esponja de Louça", preco: 1.50, antigo: 2.00, desconto: "-25%" },
    { nome: "Amaciante 2L", preco: 11.90, antigo: 14.00, desconto: "-15%" }
];

function carregarLimpeza() {
    mostrarLista(limpeza, "lista-limpeza");
}

function filtrarLimpeza() {
    filtrarLista(limpeza, "lista-limpeza");
}
function mostrarLista(lista, id) {
    let container = document.getElementById(id);
    if (!container) return;

    container.innerHTML = "";

    if (lista.length === 0) {
        container.innerHTML = "<p style='text-align:center;'>Nenhum produto encontrado 😢</p>";
        return;
    }

    lista.forEach(produto => {
        let card = document.createElement("div");
        card.classList.add("card");

        card.innerHTML = `
            <span class="desconto">${produto.desconto}</span>
            <img src="https://via.placeholder.com/180">
            <h3>${produto.nome}</h3>
            <p class="preco-antigo">R$ ${produto.antigo}</p>
            <p class="preco">R$ ${produto.preco}</p>
            <button onclick="adicionarCarrinho('${produto.nome}', ${produto.preco})">
                Adicionar
            </button>
        `;

        container.appendChild(card);
    });
}

function filtrarLista(lista, id) {
    let termo = document.getElementById("busca").value.toLowerCase();

    let filtrados = lista.filter(p =>
        p.nome.toLowerCase().includes(termo)
    );

    mostrarLista(filtrados, id);
}
