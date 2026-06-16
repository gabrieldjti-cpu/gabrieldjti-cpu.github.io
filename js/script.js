// =================================================================
// 🔗 CONFIGURAÇÃO SUPABASE
// =================================================================
const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';
const supabaseKey = 'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';

// Variável padrão unificada para todo o sistema
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variáveis globais do ecossistema da loja
let listaProdutosGeral = []; 
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

function obterUsuarioLogado() {
    try {
        const raw = localStorage.getItem("usuario_logado");
        return raw ? JSON.parse(raw) : null;
    } catch (erro) {
        console.warn("Sessão inválida no localStorage:", erro);
        localStorage.removeItem("usuario_logado");
        return null;
    }
}

function normalizarBairro(nome) {
    if (!nome) return "padrao";
    return nome.trim().toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function obterTaxaEntrega(endereco) {
    const taxaPadrao = TAXAS_ENTREGA.padrao;
    if (!endereco || endereco === "Retirada no balcão" || !endereco.includes("Bairro:")) {
        return { taxa: taxaPadrao, bairro: "Padrão" };
    }
    try {
        // Separação robusta baseada na string montada no perfil.js
        const parteBairro = endereco.split("Bairro: ")[1];
        const bairro = parteBairro ? parteBairro.split(",")[0].trim() : "Padrão";
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
    console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
}

function toggleFavorito(idProduto, event) {
    if (event) event.stopPropagation();

    const index = favoritos.indexOf(idProduto);
    if (index === -1) {
        favoritos.push(idProduto); 
        mostrarAviso("❤️ Adicionado aos favoritos!", "sucesso");
    } else {
        favorites = favoritos.filter(id => id !== idProduto); // Garante a remoção limpa
        const idx = favoritos.indexOf(idProduto);
        if(idx !== -1) favoritos.splice(idx, 1);
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
            <div class="favoritos-vazio" style="text-align: center; padding: 40px 20px;">
                <span class="favoritos-vazio-icone" style="font-size: 48px;">🤍</span>
                <h2>Sua lista está vazia</h2>
                <p>Toque no coração nos produtos para salvá-los aqui e comprar mais rápido.</p>
                <a href="index.html${window.location.search}" class="btn-ir-loja" style="display: inline-block; background: #198754; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin-top: 15px; font-weight: bold;">Ir às compras</a>
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
                <img src="${produto.imagem || produto.img}" alt="${produto.nome}">
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
                container.innerHTML = `<p class="favoritos-sem-resultado" style="padding: 20px; color: #666;">Nenhum favorito encontrado para "${termo}".</p>`;
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
        img: produto.imagem || produto.img,
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

function irCarrinho() {
    const carrinhoLateral = document.getElementById("carrinho-lateral");
    const overlay = document.getElementById("overlay");

    if (carrinhoLateral) carrinhoLateral.classList.add("ativo");
    if (overlay) overlay.style.display = "block";

    carregarCarrinho();
}

function fecharCarrinho() {
    const carrinhoLateral = document.getElementById("carrinho-lateral");
    const overlay = document.getElementById("overlay");

    if (carrinhoLateral) carrinhoLateral.classList.remove("ativo");
    if (overlay) overlay.style.display = "none";
}

function carregarCarrinho() {
    const container = document.getElementById("lista-carrinho");
    const totalEl = document.getElementById("total");

    if (!container || !totalEl) return;

    if (!carrinho || carrinho.length === 0) {
        container.innerHTML = '<p class="carrinho-vazio">Seu carrinho está vazio.</p>';
        totalEl.innerText = "Total: R$ 0,00";
        return;
    }

    let valorTotal = 0;
    container.innerHTML = carrinho.map(item => {
        const subtot = Number(item.preco || 0) * Number(item.quantidade || 1);
        valorTotal += subtot;
        return `
            <div class="item-carrinho">
                <img src="${item.img || '#'}" alt="${item.nome || ''}" class="item-carrinho-img" />
                <div class="item-info">
                    <div class="item-info-top">
                        <strong>${item.nome || 'Produto'}</strong>
                        <button type="button" class="item-remover" onclick="removerItemCarrinho('${item.id}')">✕</button>
                    </div>
                    <span class="item-quantidade">${item.quantidade} x R$ ${Number(item.preco || 0).toFixed(2)}</span>
                    <span class="item-subtotal">R$ ${subtot.toFixed(2)}</span>
                    <div class="item-controles">
                        <button type="button" class="controle-btn" onclick="alterarQtdCard('${item.id}', -1)">-</button>
                        <span class="controle-quantidade">${item.quantidade}</span>
                        <button type="button" class="controle-btn" onclick="alterarQtdCard('${item.id}', 1)">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    totalEl.innerText = `Total: R$ ${valorTotal.toFixed(2)}`;
}

function removerItemCarrinho(idProduto) {
    const index = carrinho.findIndex(item => item.id === idProduto);
    if (index === -1) return;

    carrinho.splice(index, 1);
    atualizarInterfaceGeral();
    carregarCarrinho();
}

function finalizarPedido() {
    if (!carrinho || carrinho.length === 0) {
        alert("Seu carrinho está vazio.");
        return;
    }

    const modalPagamento = document.getElementById("modal-pagamento");
    if (modalPagamento) {
        modalPagamento.style.display = "flex";
    }
}

async function escolherPagamento(tipo) {
    if (carrinho.length === 0) return;
    const usuarioLogado = obterUsuarioLogado();
    const idLojaAtual = obterIdLojistaDaURL();

    if (!idLojaAtual) {
        alert("❌ Erro: Link da loja inválido.");
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
        alert("❌ Erro ao fechar compra: " + error.message);
        return;
    }

    alert("🚀 Pedido registrado com sucesso!");
    carrinho = [];
    atualizarInterfaceGeral();
    fecharModal();
    fecharCarrinho();
}

// =================================================================
// 👤 SISTEMA DE AUTENTICAÇÃO E LOGIN INTELIGENTE
// =================================================================
async function verificarUsuario() {
    const usuarioLogado = obterUsuarioLogado();
    const btnUser = document.getElementById("user-name");
    const adminBtn = document.getElementById("btn-admin");

    if (usuarioLogado) {
        const nome = usuarioLogado.nome;
        if (btnUser) btnUser.innerText = nome;

        const perfilNome = document.getElementById("perfil-nome");
        const perfilEmail = document.getElementById("perfil-email");
        if (perfilNome) perfilNome.innerText = nome;
        if (perfilEmail) perfilEmail.innerText = usuarioLogado.email;

        // 🔍 Checagem inteligente de privilégios
        const adminEmail = 'gabrieldj.ti@gmail.com';
        const ehAdminGeral = usuarioLogado.email === adminEmail;
        
        const ehLojista = usuarioLogado.tipo === 'lojista' || 
                          usuarioLogado.id_lojista || 
                          usuarioLogado.id_estabelecimento;

        if (ehAdminGeral || ehLojista) {
            if (adminBtn) adminBtn.style.display = "flex"; 
        } else {
            if (adminBtn) adminBtn.style.display = "none";
        }
    } else {
        if (btnUser) btnUser.innerText = "Entrar";
        if (adminBtn) adminBtn.style.display = "none";
    }
}

async function fazerLogin() {
    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-senha").value.trim();

    if (!email || !senha) {
        alert("⚠️ Por favor, preencha todos os campos.");
        return;
    }

    try {
        const { data: usuario, error } = await _supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('senha', senha)
            .maybeSingle();

        if (error || !usuario) {
            alert("❌ E-mail ou senha incorretos.");
            return;
        }

        const adminEmail = 'gabrieldj.ti@gmail.com';
        if (usuario.email === adminEmail) {
            usuario.tipo = 'admin';
            localStorage.setItem("usuario_logado", JSON.stringify(usuario));
            alert("👑 Bem-vindo, Administrador Geral!");
            window.location.href = 'admin.html';
            return;
        }

        const { data: vinculo } = await _supabase
            .from('usuario_loja')
            .select('id_lojista, funcao')
            .eq('id_usuario', usuario.id)
            .maybeSingle();

        if (vinculo) {
            usuario.tipo = 'lojista';
            usuario.id_lojista = vinculo.id_lojista;
            usuario.id_estabelecimento = vinculo.id_lojista;
            usuario.funcao = vinculo.funcao;

            localStorage.setItem("usuario_logado", JSON.stringify(usuario));
            alert(`🏪 Bem-vindo ao painel da sua loja!`);
            fecharModal();
            window.location.href = 'admin.html'; 
            return;
        }

        usuario.tipo = 'cliente';
        localStorage.setItem("usuario_logado", JSON.stringify(usuario));
        alert(`👋 Bem-vindo de volta, ${usuario.nome}!`);
        fecharModal();
        window.location.reload(); 

    } catch (err) {
        console.error("Erro no processo de login:", err);
        alert("⚠️ Ocorreu um erro ao tentar fazer login.");
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

    // 1️⃣ PASSO: Cria o usuário na tabela 'usuarios' e retorna o registro criado (.select())
    const { data: novoUsuario, error: erroUsuario } = await _supabase
        .from('usuarios')
        .insert([{ nome, email, senha }])
        .select();

    if (erroUsuario) {
        alert("❌ Erro ao criar sua conta de usuário: " + erroUsuario.message);
        return;
    }

    // 2️⃣ PASSO: Se for empresa, vincula o id_usuario recém-criado na tabela lojistas
    if (querCadastrarEmpresa && novoUsuario && novoUsuario.length > 0) {
        const nomeLoja = document.getElementById("loja-nome")?.value.trim();
        const descLoja = document.getElementById("loja-descricao")?.value.trim();
        const segmentoLoja = document.getElementById("loja-segmento")?.value;

        if (!nomeLoja) {
            alert("⚠️ Você marcou a opção de empresa. Por favor, digite o Nome da Loja.");
            return;
        }

        const slugLoja = nomeLoja.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

        // 🌟 CORREÇÃO DE INTEGRIDADE: Injeta o id do usuário para que o Banco associe o lojista corretamente!
        const { error: erroLojista } = await _supabase
            .from('lojistas')
            .insert([{ 
                nome_loja: nomeLoja, 
                descricao: descLoja, 
                segmento: segmentoLoja, 
                slug: slugLoja,
                id_usuario_dono: novoUsuario[0].id // Garante o mapeamento do dono
            }]);

        if (erroLojista) {
            console.error("Erro lojistas:", erroLojista);
        }
    }

    alert(querCadastrarEmpresa ? "✅ Empresa e Conta criadas com sucesso! Faça login." : "✅ Conta de cliente criada! Faça login.");
    
    nomeEl.value = "";
    emailEl.value = "";
    senhaEl.value = "";
    if(document.getElementById("loja-nome")) document.getElementById("loja-nome").value = "";
    if(document.getElementById("loja-descricao")) document.getElementById("loja-descricao").value = "";
    
    alternarAba('login');
}

// =================================================================
// 🧭 CONTROLE DE INTERFACE E MODAIS
// =================================================================
function abrirConta() {
    const modal = document.getElementById("modal-login");
    if (modal) {
        modal.style.display = "flex";
        alternarAba('login'); 
    }
}

function fecharModal() {
    const modalLogin = document.getElementById("modal-login");
    const modalPagamento = document.getElementById("modal-pagamento");
    const overlay = document.getElementById("overlay");

    if (modalLogin) modalLogin.style.display = "none";
    if (modalPagamento) modalPagamento.style.display = "none";
    if (overlay) overlay.style.display = "none";
}

function fecharLogin() {
    fecharModal();
}

function alternarAba(aba) {
    const formLogin = document.getElementById("form-login");
    const formCadastro = document.getElementById("form-cadastro");
    const btnAbaEntrar = document.getElementById("aba-entrar") || document.getElementById("tab-login");
    const btnAbaCadastrar = document.getElementById("aba-cadastrar") || document.getElementById("tab-cadastro");

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

// =================================================================
// 🚀 INICIALIZAÇÃO AUTOMÁTICA
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
    carregarProdutosSupabase();
    verificarUsuario();
    atualizarContador();
    atualizarContadorFavoritos();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('abrirLogin') === 'true') {
        abrirConta();
    }
});