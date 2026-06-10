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
// Ajustado para aceitar tanto '?id=' (gerado pelo admin.js) quanto '?loja='
function obterIdLojistaDaURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || urlParams.get('loja');
}

// Na sua função que busca os produtos do Supabase (ex: carregarProdutos):
async function carregarProdutos() {
    let query = _supabase.from('produtos').select('*');
    const idLojaAtual = obterIdLojistaDaURL();

    // 🔄 ATUALIZADO: Se houver um ID de loja na URL, filtra pela nova coluna 'id_lojista'
    if (idLojaAtual) {
        query = query.eq('id_lojista', idLojaAtual);
    }

    const { data: produtos, error } = await query;
    listaProdutosGeral = produtos || [];
    renderizarProdutos();
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
// 📦 CARREGAR PRODUTOS DO SUPABASE (VERSÃO COMPLETA ATUALIZADA)
// =================================================================
async function carregarProdutosSupabase() {
    const idLoja = obterIdLojistaDaURL();
    
    if (!idLoja) {
        console.warn("Nenhum lojista selecionado na URL.");
        return;
    }

    // 🔄 ATUALIZADO: Busca os produtos apontando para 'id_lojista'
    const { data: produtos, error } = await _supabase
        .from('produtos')
        .select('*')
        .eq('id_lojista', idLoja);

    if (error) {
        console.error("Erro ao carregar produtos:", error.message);
        return;
    }

    // Alimenta a lista global do ecossistema e distribui nas vitrines da página
    listaProdutosGeral = produtos || [];
    renderizarProdutos(); 
}

// Organiza a divisão das vitrines baseando-se na página atual
function renderizarProdutos() {
    if (listaProdutosGeral.length === 0) return;

    // Identifica o nome do arquivo na URL (forçando letras minúsculas)
    const urlAtual = window.location.pathname.toLowerCase();

    // 🥦 Página Hortifruti
    if (urlAtual.includes('hortifruti')) {
        const horti = listaProdutosGeral.filter(p => p.categoria.toLowerCase() === 'hortifruti');
        mostrarProdutosSupabase(horti, 'lista-hortifruti');
        return;
    }

    // 🥩 Página Carnes
    if (urlAtual.includes('carnes')) {
        const carnes = listaProdutosGeral.filter(p => p.categoria.toLowerCase() === 'carnes');
        mostrarProdutosSupabase(carnes, 'lista-carnes');
        return;
    }

    // 🧼 Página Limpeza
    if (urlAtual.includes('limpeza')) {
        const limpeza = listaProdutosGeral.filter(p => p.categoria.toLowerCase() === 'limpeza');
        mostrarProdutosSupabase(limpeza, 'lista-limpeza');
        return;
    }

    // 🍹 Página Bebidas
    if (urlAtual.includes('bebidas')) {
        const bebidas = listaProdutosGeral.filter(p => p.categoria.toLowerCase() === 'bebidas');
        mostrarProdutosSupabase(bebidas, 'lista-bebidas');
        return;
    }

    // ❤️ Página Meus Favoritos
    if (urlAtual.includes('favoritos')) {
        renderizarFavoritos();
        return;
    }

    // 🏠 Página Inicial (index.html)
    const index = listaProdutosGeral.filter(p => p.categoria.toLowerCase() === 'index' || p.categoria.toLowerCase() === 'mais vendidos');
    mostrarProdutosSupabase(index, 'lista-produtos');

    const hortiCarrossel = listaProdutosGeral.filter(p => p.categoria.toLowerCase() === 'hortifruti');
    mostrarProdutosSupabase(hortiCarrossel, 'carrossel-horti');

    const carnesCarrossel = listaProdutosGeral.filter(p => p.categoria.toLowerCase() === 'carnes');
    mostrarProdutosSupabase(carnesCarrossel, 'carrossel-carnes');

    const limpezaCarrossel = listaProdutosGeral.filter(p => p.categoria.toLowerCase() === 'limpeza');
    mostrarProdutosSupabase(limpezaCarrossel, 'carrossel-limpeza');

    const bebidasCarrossel = listaProdutosGeral.filter(p => p.categoria.toLowerCase() === 'bebidas');
    mostrarProdutosSupabase(bebidasCarrossel, 'carrossel-bebidas');
}

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

function toggleFavorito(idProduto, event) {
    if (event) event.stopPropagation();

    const index = favoritos.indexOf(idProduto);
    if (index === -1) {
        favoritos.push(idProduto); // 🛠️ Corrigido de 'favorites' para 'favoritos'
        mostrarAviso("❤️ Adicionado aos favoritos!", "sucesso");
    } else {
        favoritos.splice(index, 1);
        mostrarAviso("Removido dos favoritos", "sucesso");
    }

    salvarFavoritos();
    atualidorFavoritos(); // Atualiza contador
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
                <a href="index.html" class="btn-ir-loja">Ir às compras</a>
            </div>
        `;
        return;
    }

    mostrarProdutosSupabase(lista, "lista-favoritos");
}

function mostrarProdutosSupabase(lista, idContainer) {
    const container = document.getElementById(idContainer);
    if (!container) return;

    container.innerHTML = '';

    lista.forEach(produto => {
        let badgeHTML = '';

        if (produto.categoria.toLowerCase() === 'carnes') {
            badgeHTML = `<span class="badge badge-premium">Premium</span>`;
        }
        else if (produto.categoria.toLowerCase() === 'hortifruti') {
            badgeHTML = `<span class="badge badge-organico">Orgânico</span>`;
        }
        else if (produto.categoria.toLowerCase() === 'limpeza') {
            badgeHTML = `<span class="badge badge-limpeza" style="background: #0dcefd; color: white;">Higiene</span>`;
        }
        else if (produto.categoria.toLowerCase() === 'bebidas') {
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

// Inicialização automática ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    carregarProdutosSupabase();
    verificarUsuario();
    atualizarContador();
    atualizarContadorFavoritos();
});

// =================================================================
// 🔍 FILTRAR PRODUTOS (BUSCA DINÂMICA FILTRADA POR LOJA)
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

    // 🔄 ATUALIZADO: Busca por texto filtrando pelo 'id_lojista' correto
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
// 🛒 GERENCIAMENTO DO CARRINHO (VITRINE, CONTADORES E LATERAL)
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
        carregarCarrinho();
    }
    
    renderizarProdutos();
}

// [Mantive as funções complementares ocultas para focar nas mudanças estruturais...]

// =================================================================
// 👤 SISTEMA DE AUTENTICAÇÃO (MODELO AUTÔNOMO ATUALIZADO)
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
        
        // 🔄 ATUALIZADO: Verificação condizente com 'id_lojista'
        if (usuarioLogado.email === adminEmail || usuarioLogado.id_lojista) {
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

// [fazerLogin ocultado por brevidade...]

// 🔄 ATUALIZADO: Função de cadastro inteligente apontando para 'lojistas' e 'id_lojista'
async function fazerCadastro() {
    const nome = document.getElementById("cad-nome").value.trim();
    const email = document.getElementById("cad-email").value.trim();
    const senha = document.getElementById("cad-senha").value.trim();
    const querCadastrarEmpresa = document.getElementById("cad-e-empresa")?.checked;

    if (!nome || !email || !senha) {
        mostrarAviso("⚠️ Preencha todos os campos para criar a conta.", "aviso");
        return;
    }

    let idLojistaGerado = null;

    if (querCadastrarEmpresa) {
        const nomeLoja = document.getElementById("loja-nome").value.trim();
        const descLoja = document.getElementById("loja-descricao").value.trim();
        const segmentoLoja = document.getElementById("loja-segmento").value;

        if (!nomeLoja) {
            mostrarAviso("⚠️ Por favor, digite o nome da sua empresa/loja.", "aviso");
            return;
        }

        // 1. Cria o estabelecimento na tabela REPROJETADA 'lojistas'
        const { data: novaLoja, error: erroLoja } = await _supabase
            .from('lojistas')
            .insert([{ nome_loja: nomeLoja, descricao: descLoja, segmento: segmentoLoja }])
            .select();

        if (erroLoja) {
            mostrarAviso("❌ Erro ao registrar empresa: " + erroLoja.message, "erro");
            return;
        }

        if (novaLoja && novaLoja.length > 0) {
            idLojistaGerado = novaLoja[0].id; 
        }
    }

    // 2. Insere na tabela de usuários salvando o UUID em 'id_lojista'
    const { error: erroUsuario } = await _supabase
        .from('usuarios')
        .insert([{
            nome: nome,
            email: email,
            senha: senha,
            id_lojista: idLojistaGerado
        }]);

    if (erroUsuario) {
        mostrarAviso("❌ Erro ao criar conta: " + erroUsuario.message, "erro");
    } else {
        const mensagemSucesso = idLojistaGerado
            ? "✅ Empresa e Conta criadas com sucesso! Faça login para gerenciar."
            : "✅ Conta de cliente criada com sucesso! Faça login.";

        mostrarAviso(mensagemSucesso, "sucesso");
        alternarAba('login');
    }
}

// =================================================================
// 📦 FINALIZAR PEDIDO (COMPLETADO E CORRIGIDO)
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
        produtos: carrinho, // Envia o JSON estruturado das compras
        total: totalGeral,
        pagamento: tipo,
        status: "Recebido",
        id_lojista: idLojaAtual // 🔒 Envia amarrado à nova coluna mapeada do banco
    };

    const { error } = await _supabase
        .from("pedidos")
        .insert([dadosPedido]);

    if (error) {
        mostrarAviso("❌ Erro ao fechar compra: " + error.message, "erro");
        return;
    }

    mostrarAviso("🚀 Pedido registrado com sucesso!", "sucesso");
    limparCarrinho();
    fecharModal();
    fecharCarrinhoLateral();
}
// =================================================================
// 🧭 REDIRECIONAMENTO E NAVEGAÇÃO DE CONTA
// =================================================================
function abrirConta() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));
    const idLojaAtual = obterIdLojistaDaURL(); // Reaproveita sua função da linha 25

    if (usuarioLogado) {
        // Se houver um ID de loja na URL atual, leva ele junto para não quebrar a vitrine ao voltar
        if (idLojaAtual) {
            window.location.href = `perfil.html?id=${idLojaAtual}`;
        } else {
            window.location.href = "perfil.html";
        }
    } else {
        // Se não estiver logado, força a abertura do modal de login
        const modalLogin = document.getElementById("modal-login");
        if (modalLogin) {
            modalLogin.style.display = "flex";
        } else {
            mostrarAviso("⚠️ Por favor, faça login para acessar sua conta.", "aviso");
        }
    }
}