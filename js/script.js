// =================================================================
// 🔗 CONFIGURAÇÃO SUPABASE
// =================================================================
const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';
const supabaseKey = 'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';

// Variável padrão unificada para todo o sistema
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variáveis globais do ecossistema da loja
let listaProdutosGeral = []; // Armazena a cópia dos produtos do Supabase
let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];

// 🗺️ Tabela de Taxas de Entrega por Bairro (chaves em minúsculas, sem acento)
const TAXAS_ENTREGA = {
    "centro": 5.00,
    "itau ferraz": 8.00,
    "amaralina": 6.00,
    "nossa senhora": 5.00,
    "padrao": 5.00
};

// 🎯 CAPTURAR ID DO LOJISTA PARADO NA URL (?id=UUID ou ?loja=UUID)
function obterIdLojistaDaURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || urlParams.get('loja');
}

function normalizarBairro(nome) {
    return nome.trim().toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function obterTaxaEntrega(endereco) {
    const taxaPadrao = TAXAS_ENTREGA.padrao;
    if (!endereco) {
        return { taxa: taxaPadrao, bairro: "Padrão" };
    }
    try {
        const bairro = endereco.split("Bairro: ")[1].split(",")[0].trim();
        const chave = normalizarBairro(bairro);
        const taxa = TAXAS_ENTREGA[chave] !== undefined ? TAXAS_ENTREGA[chave] : taxaPadrao;
        return { taxa, bairro };
    } catch (e) {
        return { taxa: taxaPadrao, bairro: "Padrão" };
    }
}

// =================================================================
// 📦 CARREGAR PRODUTOS DO SUPABASE
// =================================================================
async function carregarProdutosSupabase() {
    const idLoja = obterIdLojistaDaURL();
    
    if (!idLoja) {
        console.warn("Nenhum lojista selecionado na URL.");
        return;
    }

    const { data: produtos, error } = await _supabase
        .from('produtos')
        .select('*')
        .eq('id_lojista', idLoja);

    if (error) {
        console.error("Erro ao carregar produtos:", error.message);
        return;
    }

    listaProdutosGeral = produtos || [];
    renderizarProdutos(); 
}

// Organiza a divisão das vitrines baseando-se na página atual
function renderizarProdutos() {
    if (listaProdutosGeral.length === 0) return;

    const urlAtual = window.location.pathname.toLowerCase();

    // 🥦 Página Hortifruti
    if (urlAtual.includes('hortifruti')) {
        const horti = listaProdutosGeral.filter(p => p.categoria && p.categoria.toLowerCase() === 'hortifruti');
        mostrarProdutosSupabase(horti, 'lista-hortifruti');
        return;
    }

    // 🥩 Página Carnes
    if (urlAtual.includes('carnes')) {
        const carnes = listaProdutosGeral.filter(p => p.categoria && p.categoria.toLowerCase() === 'carnes');
        mostrarProdutosSupabase(carnes, 'lista-carnes');
        return;
    }

    // 🧼 Página Limpeza
    if (urlAtual.includes('limpeza')) {
        const limpeza = listaProdutosGeral.filter(p => p.categoria && p.categoria.toLowerCase() === 'limpeza');
        mostrarProdutosSupabase(limpeza, 'lista-limpeza');
        return;
    }

    // 🍹 Página Bebidas
    if (urlAtual.includes('bebidas')) {
        const bebidas = listaProdutosGeral.filter(p => p.categoria && p.categoria.toLowerCase() === 'bebidas');
        mostrarProdutosSupabase(bebidas, 'lista-bebidas');
        return;
    }

    // ❤️ Página Meus Favoritos
    if (urlAtual.includes('favoritos')) {
        renderizarFavoritos();
        return;
    }

    // 🏠 Página Inicial (index.html / vitrine.html)
    const index = listaProdutosGeral.filter(p => p.categoria && (p.categoria.toLowerCase() === 'index' || p.categoria.toLowerCase() === 'mais vendidos'));
    mostrarProdutosSupabase(index, 'lista-produtos');

    const hortiCarrossel = listaProdutosGeral.filter(p => p.categoria && p.categoria.toLowerCase() === 'hortifruti');
    mostrarProdutosSupabase(hortiCarrossel, 'carrossel-horti');

    const carnesCarrossel = listaProdutosGeral.filter(p => p.categoria && p.categoria.toLowerCase() === 'carnes');
    mostrarProdutosSupabase(carnesCarrossel, 'carrossel-carnes');

    const limpezaCarrossel = listaProdutosGeral.filter(p => p.categoria && p.categoria.toLowerCase() === 'limpeza');
    mostrarProdutosSupabase(limpezaCarrossel, 'carrossel-limpeza');

    const bebidasCarrossel = listaProdutosGeral.filter(p => p.categoria && p.categoria.toLowerCase() === 'bebidas');
    mostrarProdutosSupabase(bebidasCarrossel, 'carrossel-bebidas');
}

// =================================================================
// ❤️ GERENCIAMENTO DE FAVORITOS
// =================================================================
function salvarFavoritos() {
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
}

function ehFavorito(idProduto) {
    return favoritos.includes(idProduto);
}

function atualizarContadorFavoritos() {
    const contador = document.getElementById("contador-favoritos");
    if (contador) contador.innerText = favoritos.length;
}

function botaoFavoritoHTML(idProduto) {
    const ativo = ehFavorito(idProduto);
    return `
        <button type="button" class="btn-favorito ${ativo ? "ativo" : ""}"
            onclick="toggleFavorito('${idProduto}', event)"
            aria-label="${ativo ? "Remover dos favoritos" : "Adicionar aos favoritos"}"
            title="${ativo ? "Remover dos favoritos" : "Salvar nos favoritos"}">
            ${ativo ? "♥" : "♡"}
        </button>
    `;
}

function mostrarAviso(mensagem, tipo = "sucesso") {
    if (typeof alert !== "undefined") {
        console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
    }
}

function toggleFavorito(idProduto, event) {
    if (event) event.stopPropagation();

    const index = favoritos.indexOf(idProduto);
    if (index === -1) {
        favoritos.push(idProduto); // 🌟 CORRIGIDO: Modificado de 'favorites.push' para 'favoritos.push'
        mostrarAviso("❤️ Adicionado aos favoritos!", "sucesso");
    } else {
        favoritos.splice(index, 1);
        mostrarAviso("Removido dos favoritos", "sucesso");
    }

    salvarFavoritos();
    atualizarContadorFavoritos();

    const urlAtual = window.location.pathname.toLowerCase();
    if (urlAtual.includes("favoritos")) {
        renderizarFavoritos();
    } else {
        renderizarProdutos();
    }
}

function renderizarFavoritos() {
    const container = document.getElementById("lista-favoritos");
    if (!container) return;

    const lista = listaProdutosGeral.filter(p => favoritos.includes(p.id));

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="favoritos-vazio">
                <span class="favoritos-vazio-icone">🤍</span>
                <h2>Sua lista está vazia</h2>
                <p>Toque no coração nos produtos para salvá-los aqui e comprar mais rápido.</p>
                <a href="index.html${window.location.search}" class="btn-ir-loja">Ir às compras</a>
            </div>
        `;
        return;
    }

    mostrarProdutosSupabase(lista, "lista-favoritos");
}

// =================================================================
// 🎨 RENDERIZADOR DOS CARDS DE PRODUTO
// =================================================================
function mostrarProdutosSupabase(lista, idContainer) {
    const container = document.getElementById(idContainer);
    if (!container) return;

    container.innerHTML = '';

    lista.forEach(produto => {
        let badgeHTML = '';
        const categoriaLimpa = produto.categoria ? produto.categoria.toLowerCase() : '';

        if (categoriaLimpa === 'carnes') {
            badgeHTML = `<span class="badge badge-premium">Premium</span>`;
        }
        else if (categoriaLimpa === 'hortifruti') {
            badgeHTML = `<span class="badge badge-organico">Orgânico</span>`;
        }
        else if (categoriaLimpa === 'limpeza') {
            badgeHTML = `<span class="badge badge-limpeza" style="background: #0dcefd; color: white;">Higiene</span>`;
        }
        else if (categoriaLimpa === 'bebidas') {
            badgeHTML = `<span class="badge badge-bebidas" style="background: #ffc107; color: black;">Gelada</span>`;
        }

        const itemNoCarrinho = carrinho.find(item => item.id === produto.id);
        let botaoHTML = "";

        if (itemNoCarrinho) {
            botaoHTML = `
                <div class="controle-qtd-card" id="btn-card-${produto.id}">
                    <button onclick="alterarQtdCard('${produto.id}', -1)">-</button>
                    <span>${itemNoCarrinho.quantidade}</span>
                    <button onclick="alterarQtdCard('${produto.id}', 1)">+</button>
                </div>
            `;
        } else {
            botaoHTML = `
                <button id="btn-card-${produto.id}" class="btn-adicionar" onclick="adicionarAoCarrinhoCard('${produto.id}')">
                    🛒 Adicionar
                </button>
            `;
        }

        container.innerHTML += `
            <div class="card">
                <span class="desconto">-${produto.desconto}%</span>
                ${badgeHTML}
                <img src="${produto.img}" alt="${produto.nome}">
                <h3>${produto.nome}</h3>
                <p class="preco-antigo">R$ ${Number(produto.preco_antigo).toFixed(2)}</p>
                <p class="preco">R$ ${Number(produto.preco).toFixed(2)}</p>
                <div class="card-acoes">
                    <div class="card-acoes-principal">${botaoHTML}</div>
                    ${botaoFavoritoHTML(produto.id)}
                </div>
            </div>
        `;
    });
}

// =================================================================
// 🔍 FILTRAR PRODUTOS (BUSCA DINÂMICA)
// =================================================================
async function filtrarProdutos(categoriaPagina = null) {
    const buscaEl = document.getElementById("busca");
    if (!buscaEl) return;

    const termo = buscaEl.value.toLowerCase();
    const urlAtual = window.location.pathname.toLowerCase();
    const idLoja = obterIdLojistaDaURL();

    if (urlAtual.includes("favoritos")) {
        const lista = listaProdutosGeral.filter(p =>
            favoritos.includes(p.id) && p.nome.toLowerCase().includes(termo)
        );
        if (lista.length === 0 && termo === "") {
            renderizarFavoritos();
        } else if (lista.length === 0) {
            const container = document.getElementById("lista-favoritos");
            if (container) {
                container.innerHTML = `<p class="favoritos-sem-resultado">Nenhum favorito encontrado para "${termo}".</p>`;
            }
        } else {
            mostrarProdutosSupabase(lista, "lista-favoritos");
        }
        return;
    }

    if (!idLoja) return;

    const { data, error } = await _supabase
        .from('produtos')
        .select('*')
        .eq('id_lojista', idLoja)
        .ilike('nome', `%${termo}%`);

    if (error) return;

    const containerAlvo = document.getElementById("lista-produtos") || 
                          document.getElementById("lista-hortifruti") || 
                          document.getElementById("lista-carnes") ||
                          document.getElementById("lista-limpeza") ||
                          document.getElementById("lista-bebidas");

    if (containerAlvo) {
        mostrarProdutosSupabase(data, containerAlvo.id);
    }
}

// =================================================================
// 🛒 GERENCIAMENTO DO CARRINHO
// =================================================================
async function adicionarAoCarrinhoCard(idProduto) {
    const produto = listaProdutosGeral.find(p => p.id === idProduto);
    if (!produto) return;

    carrinho.push({
        id: produto.id,
        nome: produto.nome,
        preco: Number(produto.preco),
        img: produto.img,
        quantidade: 1
    });

    mostrarAviso(`✅ ${produto.nome} adicionado!`, 'sucesso');
    atualizarInterfaceGeral();
}

function alterarQtdCard(idProduto, mudanca) {
    const index = !carrinho ? -1 : carrinho.findIndex(item => item.id === idProduto);
    if (index === -1) return;

    carrinho[index].quantidade += mudanca;

    if (carrinho[index].quantidade <= 0) {
        carrinho.splice(index, 1);
    }

    atualizarInterfaceGeral();
}

function atualizarContador() {
    const totalItens = carrinho.reduce((soma, item) => soma + item.quantidade, 0);
    
    const contadorTopo = document.getElementById("contador");
    if (contadorTopo) contadorTopo.innerText = totalItens;

    const contadorFlutuante = document.getElementById("contador-flutuante");
    if (contadorFlutuante) contadorFlutuante.innerText = totalItens;
}

function atualizarInterfaceGeral() {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    atualizarContador();
    
    const carrinhoLateral = document.getElementById("carrinho-lateral");
    if (carrinhoLateral && carrinhoLateral.classList.contains("ativo")) {
        if (typeof carregarCarrinho === "function") carregarCarrinho();
    }
    
    renderizarProdutos();
}

// =================================================================
// 👤 SISTEMA DE AUTENTICAÇÃO E CADASTRO
// =================================================================
async function verificarUsuario() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));
    const btnUser = document.getElementById("user-name");
    const adminBtn = document.getElementById("btn-admin");

    const urlAtual = window.location.pathname.toLowerCase();
    const ehPaginaAdmin = urlAtual.includes('adm') || urlAtual.includes('painel');

    if (usuarioLogado) {
        const nome = usuarioLogado.nome;
        if (btnUser) btnUser.innerText = nome;

        const perfilNome = document.getElementById("perfil-nome");
        const perfilEmail = document.getElementById("perfil-email");
        if (perfilNome) perfilNome.innerText = nome;
        if (perfilEmail) perfilEmail.innerText = usuarioLogado.email;

        const adminEmail = 'gabrieldj.ti@gmail.com';
        
        if (usuarioLogado.email === adminEmail || usuarioLogado.id_lojista || usuarioLogado.id_estabelecimento) {
            if (adminBtn) adminBtn.style.display = "flex";
        } else {
            if (adminBtn) adminBtn.style.display = "none";
            
            if (ehPaginaAdmin) {
                mostrarAviso("⚠️ Acesso restrito para administradores.", "aviso");
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        }
    } else {
        if (btnUser) btnUser.innerText = "Entrar";
        if (adminBtn) adminBtn.style.display = "none";

        if (ehPaginaAdmin) {
            window.location.href = 'index.html';
        }
    }
}

async function fazerCadastro() {
    const nomeEl = document.getElementById("cad-nome");
    const emailEl = document.getElementById("cad-email");
    const senhaEl = document.getElementById("cad-senha");
    
    if (!nomeEl || !emailEl || !senhaEl) {
        alert("❌ Erro interno: Campos de cadastro não foram encontrados no HTML.");
        return;
    }

    const nome = nomeEl.value.trim();
    const email = emailEl.value.trim();
    const senha = senhaEl.value.trim();
    const querCadastrarEmpresa = document.getElementById("cad-e-empresa")?.checked;

    if (!nome || !email || !senha) {
        alert("⚠️ Por favor, preencha todos os campos (Nome, E-mail e Senha).");
        return;
    }

    let idEstabelecimentoGerado = null;

    if (querCadastrarEmpresa) {
        const nomeLoja = document.getElementById("loja-nome")?.value.trim();
        const descLoja = document.getElementById("loja-descricao")?.value.trim();
        const segmentoLoja = document.getElementById("loja-segmento")?.value;

        if (!nomeLoja) {
            alert("⚠️ Você marcou a opção de empresa. Por favor, digite o Nome da Loja.");
            return;
        }

        const { data: novaLoja, error: erroLoja } = await _supabase
            .from('estabelecimentos')
            .insert([{ 
                nome: nomeLoja, 
                descricao: descLoja, 
                tipo: segmentoLoja 
            }])
            .select();

        if (erroLoja) {
            alert("❌ Erro ao registrar estabelecimento: " + erroLoja.message);
            console.error(erroLoja);
            return;
        }

        if (novaLoja && novaLoja.length > 0) {
            idEstabelecimentoGerado = novaLoja[0].id; 
        }
    }

    const { error: erroUsuario } = await _supabase
        .from('usuarios')
        .insert([{
            nome: nome,
            email: email,
            senha: senha,
            id_estabelecimento: idEstabelecimentoGerado
        }]);

    if (erroUsuario) {
        alert("❌ Erro ao criar sua conta de usuário: " + erroUsuario.message);
        console.error(erroUsuario);
    } else {
        const mensagemSucesso = idEstabelecimentoGerado
            ? "✅ Empresa e Conta criadas com sucesso! Faça login para começar."
            : "✅ Conta de cliente criada com sucesso! Faça login.";

        alert(mensagemSucesso);
        
        nomeEl.value = "";
        emailEl.value = "";
        senhaEl.value = "";
        if(document.getElementById("loja-nome")) document.getElementById("loja-nome").value = "";
        if(document.getElementById("loja-descricao")) document.getElementById("loja-descricao").value = "";
        
        alternarAba('login');
    }
}

// =================================================================
// 📦 FINALIZAR PEDIDO
// =================================================================
async function escolherPagamento(tipo) {
    if (carrinho.length === 0) return;
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));
    const idLojaAtual = obterIdLojistaDaURL();

    if (!idLojaAtual) {
        mostrarAviso("❌ Erro: Link da loja inválido.", "erro");
        return;
    }

    const subtotal = carrinho.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
    const enderecoUsuario = usuarioLogado ? usuarioLogado.endereco : "Retirada no balcão";
    const { taxa: taxaEntrega } = obterTaxaEntrega(enderecoUsuario);
    const totalGeral = subtotal + taxaEntrega;

    const dadosPedido = {
        id_usuario: usuarioLogado ? usuarioLogado.id : null,
        cliente: usuarioLogado ? usuarioLogado.nome : "Cliente Anonimo",
        telefone: usuarioLogado ? usuarioLogado.telefone : "Não informado",
        endereco: enderecoUsuario,
        produtos: carrinho, 
        total: totalGeral,
        pagamento: tipo,
        status: "Recebido",
        id_lojista: idLojaAtual 
    };

    const { error } = await _supabase
        .from("pedidos")
        .insert([dadosPedido]);

    if (error) {
        mostrarAviso("❌ Erro ao fechar compra: " + error.message, "erro");
        return;
    }

    mostrarAviso("🚀 Pedido registrado com sucesso!", "sucesso");
    if (typeof limparCarrinho === "function") limparCarrinho();
    fecharModal();
    if (typeof fecharCarrinhoLateral === "function") fecharCarrinhoLateral();
}

// =================================================================
// 🧭 REDIRECIONAMENTO E NAVEGAÇÃO DE CONTA
// =================================================================
function abrirConta() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));
    const idLojaAtual = obterIdLojistaDaURL();

    if (usuarioLogado) {
        if (idLojaAtual) {
            window.location.href = `perfil.html?id=${idLojaAtual}`;
        } else {
            window.location.href = "perfil.html";
        }
    } else {
        const modalLogin = document.getElementById("modal-login");
        if (modalLogin) {
            modalLogin.style.display = "flex";
        } else {
            mostrarAviso("⚠️ Por favor, faça login para acessar sua conta.", "aviso");
        }
    }
}

// =================================================================
// 🚀 INICIALIZAÇÃO AUTOMÁTICA
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
    carregarProdutosSupabase();
    verificarUsuario();
    atualizarContador();
    atualizarContadorFavoritos();
});

// =================================================================
// 🔀 CONTROLE DE ABAS DO MODAL (LOGIN VS CADASTRO)
// =================================================================
function alternarAba(aba) {
    const formLogin = document.getElementById("form-login");
    const formCadastro = document.getElementById("form-cadastro");
    const btnAbaEntrar = document.getElementById("aba-entrar");
    const btnAbaCadastrar = document.getElementById("aba-cadastrar");

    if (aba === 'cadastro') {
        if (formLogin) formLogin.style.display = "none";
        if (formCadastro) formCadastro.style.display = "block";
        if (btnAbaCadastrar) btnAbaCadastrar.classList.add("ativa");
        if (btnAbaEntrar) btnAbaEntrar.classList.remove("ativa");
    } else {
        if (formLogin) formLogin.style.display = "block";
        if (formCadastro) formCadastro.style.display = "none";
        if (btnAbaEntrar) btnAbaEntrar.classList.add("ativa");
        if (btnAbaCadastrar) btnAbaCadastrar.classList.remove("ativa");
    }
}

function fecharModal() {
    const modal = document.getElementById("modal-login");
    if (modal) modal.style.display = "none";
}

function toggleCamposEmpresa() {
    const checkbox = document.getElementById("cad-e-empresa");
    const camposLoja = document.getElementById("campos-empresa") || document.getElementById("campos-loja");
    
    if (checkbox && camposLoja) {
        camposLoja.style.display = checkbox.checked ? "block" : "none";
    }
}

function toggleCamposLoja() {
    toggleCamposEmpresa();
}