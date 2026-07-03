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
    
        // Se não houver lojista na URL, carregamos o catálogo geral (para a home)
        let query = _supabase.from('produtos').select('*');
        if (idLoja) {
            query = query.eq('id_lojista', idLoja);
        }

        const { data: produtos, error } = await query.order('nome', { ascending: true });

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
    const senha = document.getElementById("login-senha").value;

    if (!email || !senha) {
        alert("⚠️ Por favor, digite seu e-mail e senha.");
        return;
    }

    console.log("Tentando login para:", email);

    // 1. Busca usuário básico
    const { data: usuarios, error: erroUser } = await _supabase
        .from("usuarios")
        .select("*")
        .eq("email", email)
        .eq("senha", senha);

    if (erroUser) {
        alert("❌ Erro ao buscar usuário: " + erroUser.message);
        return;
    }

    if (!usuarios || usuarios.length === 0) {
        alert("❌ Credenciais incorretas ou usuário inexistente.");
        return;
    }

    const usuario = usuarios[0]; // Pega o primeiro encontrado de forma segura

    // 2. Busca estabelecimento associado
    const { data: estabs, error: erroEstab } = await _supabase
        .from("estabelecimentos")
        .select("*")
        .eq("id_usuario", usuario.id);

    if (erroEstab) {
        console.error("Erro ao checar estabelecimentos no login:", erroEstab.message);
    }

    const estabelecimento = (estabs && estabs.length > 0) ? estabs[0] : null;

    // Constrói os dados da sessão com prioridade para o vínculo do banco
    const sessionData = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: estabelecimento ? "lojista" : (usuario.tipo || "cliente"),
        id_lojista: estabelecimento ? estabelecimento.id : null,
        id_estabelecimento: estabelecimento ? estabelecimento.id : null,
        nome_loja: estabelecimento ? estabelecimento.nome : null,
        id_loja_ativa: estabelecimento ? estabelecimento.id : null
    };

    localStorage.setItem("usuario_logado", JSON.stringify(sessionData));
    alert(`👋 Bem-vindo de volta, ${usuario.nome}!`);
    fecharModal();
    verificarUsuario();
}

async function fazerCadastro() {
    const nome = document.getElementById("cad-nome").value.trim();
    const email = document.getElementById("cad-email").value.trim();
    const senha = document.getElementById("cad-senha").value;
    const ehEmpresa = document.getElementById("cad-e-empresa").checked;

    if (!nome || !email || !senha) {
        alert("⚠️ Preencha todos os campos obrigatórios.");
        return;
    }

    try {
        // Monta os dados iniciais do usuário
        let dadosParaInserir = { nome, email, senha };
        
        // Tenta enviar o tipo (envelopado para não quebrar se a coluna sumir)
        try {
            dadosParaInserir.tipo = ehEmpresa ? "lojista" : "cliente";
        } catch(e) {}

        // 1. Insere o usuário na tabela
        const { data: resultadoUser, error: erroUser } = await _supabase
            .from("usuarios")
            .insert([dadosParaInserir])
            .select();

        // Se der erro de schema cache por causa da coluna 'tipo', tentamos salvar SEM ela
        if (erroUser && erroUser.message.includes("tipo")) {
            console.warn("Coluna 'tipo' não encontrada. Tentando salvar sem ela...");
            delete dadosParaInserir.tipo;
            
            const retry = await _supabase.from("usuarios").insert([dadosParaInserir]).select();
            if (retry.error) {
                alert("❌ Erro ao criar usuário: " + retry.error.message);
                return;
            }
            var usuarioFinal = retry.data[0];
        } else if (erroUser) {
            alert("❌ Erro do Supabase ao criar usuário: " + erroUser.message);
            return;
        } else {
            var usuarioFinal = resultadoUser[0];
        }

        console.log("Usuário resolvido com sucesso. ID:", usuarioFinal.id);

        let idEstabelecimento = null;
        let nomeLoja = null;

        // 2. Se for empresa, realiza a gravação na tabela estabelecimentos
        if (ehEmpresa) {
            nomeLoja = document.getElementById("loja-nome").value.trim() || `Loja de ${nome}`;
            const descricaoLoja = document.getElementById("loja-descricao").value.trim();
            const segmentoLoja = document.getElementById("loja-segmento").value;

            const { data: resultadoEstab, error: erroEstab } = await _supabase
                .from("estabelecimentos")
                .insert([{
                    id_usuario: usuarioFinal.id,
                    nome: nomeLoja,
                    descricao: descricaoLoja,
                    segmento: segmentoLoja
                }])
                .select();

            if (erroEstab) {
                // Se não conseguimos criar a loja, não devemos prosseguir como lojista
                alert("❌ Erro ao salvar a loja (estabelecimento). Cadastro interrompido:\n" + erroEstab.message);
                console.error(erroEstab);
                return; // interrompe fluxo de cadastro para evitar sessão inválida
            } else if (resultadoEstab && resultadoEstab.length > 0) {
                idEstabelecimento = resultadoEstab[0].id;
            }
        }

        // 3. Monta a sessão local com as propriedades necessárias
        const dadosSessao = {
            id: usuarioFinal.id,
            nome: usuarioFinal.nome,
            email: usuarioFinal.email,
            tipo: ehEmpresa ? "lojista" : "cliente",
            id_lojista: idEstabelecimento,
            id_estabelecimento: idEstabelecimento,
            nome_loja: nomeLoja,
            id_loja_ativa: idEstabelecimento // conveniência para uso no admin
        };

        localStorage.setItem("usuario_logado", JSON.stringify(dadosSessao));
        alert("🚀 Conta criada com sucesso!");
        fecharModal();
        verificarUsuario();

    } catch (err) {
        alert("❌ Erro inesperado: " + err.message);
    }
}

// =================================================================
// 🧭 CONTROLE DE INTERFACE E MODAIS
// =================================================================
function abrirConta() {
    const usuarioLogado = obterUsuarioLogado();
    // Se já está logado, leva para a página de perfil
    if (usuarioLogado) {
        window.location.href = 'perfil.html';
        return;
    }

    const modal = document.getElementById("modal-login");
    if (modal) {
        modal.style.display = "flex";
        alternarAba('login'); 
    }
}

function fazerLogout() {
    localStorage.removeItem('usuario_logado');
    // atualiza UI imediatamente
    verificarUsuario();
    window.location.href = 'index.html';
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