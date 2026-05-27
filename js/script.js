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
// 🗺️ Tabela de Taxas de Entrega por Bairro
const TAXAS_ENTREGA = {
    "centro": 5.00,
    "Itaú Ferraz": 8.00,
    "Amaralina": 6.00, // Exemplo de outro bairro se quiser adicionar
    "Nossa Senhora ": 5.00     // Taxa usada caso o bairro não seja encontrado ou não esteja cadastrado
};
// =================================================================
// 📦 CARREGAR PRODUTOS DO SUPABASE (VERSÃO COMPLETA)
// =================================================================
async function carregarProdutosSupabase() {
    const { data, error } = await _supabase
        .from('produtos')
        .select('*');

    if (error) {
        console.error("Erro ao carregar produtos:", error);
        return;
    } 
    console.log("Dados carregados do Supabase:", data);

    // Guarda a lista globalmente para que os botões de adicionar saibam qual item foi clicado
    listaProdutosGeral = data;

    // Dispara a renderização inicial baseada na URL/Página
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

function mostrarProdutosSupabase(lista, idContainer) {
    const container = document.getElementById(idContainer);
    if (!container) return;

    container.innerHTML = '';

    lista.forEach(produto => {
        let badgeHTML = '';

        // Crachás visuais dinâmicos conforme a categoria do produto
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

        // 🛒 LOGICA DO BOTÃO DINÂMICO DIRECT NO CARD
        const itemNoCarrinho = carrinho.find(item => item.id === produto.id);
        let botaoHTML = "";

        if (itemNoCarrinho) {
            // Se já estiver no carrinho, renderiza o seletor [-] Qtd [+]
            botaoHTML = `
                <div class="controle-qtd-card" id="btn-card-${produto.id}">
                    <button onclick="alterarQtdCard('${produto.id}', -1)">-</button>
                    <span>${itemNoCarrinho.quantidade}</span>
                    <button onclick="alterarQtdCard('${produto.id}', 1)">+</button>
                </div>
            `;
        } else {
            // Se não estiver, renderiza o botão clássico de compra
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
                ${botaoHTML}
            </div>
        `;
    });
}

// Inicialização automática ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    carregarProdutosSupabase();
    verificarUsuario();
    atualizarContador();
});

// =================================================================
// 🔍 FILTRAR PRODUTOS (BUSCA DINÂMICA)
// =================================================================
async function filtrarProdutos() {
    const termo = document.getElementById("busca").value.toLowerCase();
    
    const { data, error } = await _supabase
        .from('produtos')
        .select('*')
        .ilike('nome', `%${termo}%`);

    if (error) return;

    // Identifica qual container principal está ativo para injetar o resultado da busca
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

// Função chamada ao clicar no botão "🛒 Adicionar" padrão da vitrine
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

// Função que controla os botões de [+] e [-] direto no card
function alterarQtdCard(idProduto, mudanca) {
    const index = carrinho.findIndex(item => item.id === idProduto);
    if (index === -1) return;

    carrinho[index].quantidade += mudanca;

    if (carrinho[index].quantidade <= 0) {
        carrinho.splice(index, 1);
    }

    atualizarInterfaceGeral();
}

function atualizarContador() {
    const totalItens = carrinho.reduce((soma, item) => soma + item.quantidade, 0);
    
    // Atualiza o contador clássico do topo da página
    const contadorTopo = document.getElementById("contador");
    if (contadorTopo) contadorTopo.innerText = totalItens;

    // Atualiza o contador do balão verde flutuante
    const contadorFlutuante = document.getElementById("contador-flutuante");
    if (contadorFlutuante) contadorFlutuante.innerText = totalItens;
}

function atualizarInterfaceGeral() {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    atualizarContador();
    
    // Se o carrinho lateral estiver aberto, atualiza a lista interna dele
    if (document.getElementById("carrinho-lateral").classList.contains("ativo")) {
        carregarCarrinho();
    }
    
    // Atualiza os botões de comprar/quantidade na vitrine
    renderizarProdutos();
}

function irCarrinho() {
    document.getElementById("carrinho-lateral").classList.add("ativo");
    document.getElementById("overlay").style.display = "block";
    carregarCarrinho();
}

function fecharCarrinhoLateral() {
    document.getElementById("carrinho-lateral").classList.remove("ativo");
    document.getElementById("overlay").style.display = "none";
}

function fecharCarrinho() {
    fecharCarrinhoLateral();
}

function carregarCarrinho() {
    const container = document.getElementById("lista-carrinho");
    const totalEl = document.getElementById("total");

    if (!container || !totalEl) return;
    container.innerHTML = "";
    let subtotal = 0;

    if (carrinho.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 20px 0;">Carrinho vazio 🛒</p>`;
        totalEl.innerText = "Total: R$ 0,00";
        return;
    }

    carrinho.forEach((produto, index) => {
        subtotal += produto.preco * produto.quantidade;
        const item = document.createElement("div");
        item.className = "item-carrinho";
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; gap:15px; margin-bottom:15px; padding-bottom:15px; border-bottom:1px solid #eee;">
                <div>
                    <strong>${produto.nome}</strong>
                    <div style="margin-top:8px;">
                        <button onclick="mudarQtdLateral(${index}, -1)">-</button>
                        <span style="margin:0 10px;">${produto.quantidade}</span>
                        <button onclick="mudarQtdLateral(${index}, 1)">+</button>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="color:#198754; font-weight:bold;">R$ ${(produto.preco * produto.quantidade).toFixed(2)}</div>
                    <button onclick="removerItemLateral(${index})" style="border:none; background:none; color:red; cursor:pointer; margin-top:5px;">Remover</button>
                </div>
            </div>
        `;
        container.appendChild(item);
    });

    // 🚚 CÁLCULO DINÂMICO DA TAXA DE ENTREGA NO VISUAL DO CARRINHO
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));
    let taxaEntrega = 0;
    let bairroDetectado = "Não cadastrado";

    if (usuarioLogado && usuarioLogado.endereco) {
        // Extrai o bairro do endereço montado ("... Bairro: Nome do Bairro, Cidade")
        try {
            const parteBairro = usuarioLogado.endereco.split("Bairro: ")[1].split(",")[0].trim().toLowerCase();
            bairroDetectado = usuarioLogado.endereco.split("Bairro: ")[1].split(",")[0].trim();
            taxaEntrega = TAXAS_ENTREGA[parteBairro] !== undefined ? TAXAS_ENTREGA[parteBairro] : TAXAS_ENTREGA["padrao"];
        } catch (e) {
            taxaEntrega = TAXAS_ENTREGA["padrao"];
        }
    } else {
        taxaEntrega = TAXAS_ENTREGA["padrao"];
    }

    let totalGeral = subtotal + taxaEntrega;

    totalEl.innerHTML = `
        <div style="font-size: 14px; color: #555; display: flex; justify-content: space-between; margin-bottom: 4px; font-weight: normal;">
            <span>Subtotal:</span> <span>R$ ${subtotal.toFixed(2)}</span>
        </div>
        <div style="font-size: 14px; color: #555; display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: normal; border-bottom: 1px solid #ddd; padding-bottom: 6px;">
            <span>Entrega (${bairroDetectado}):</span> <span>R$ ${taxaEntrega.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; color: #198754; font-size: 18px;">
            <span>Total:</span> <span>R$ ${totalGeral.toFixed(2)}</span>
        </div>
    `;
}

// Sincroniza os botões internos do carrinho lateral com a lógica geral
function mudarQtdLateral(index, valor) {
    carrinho[index].quantidade += valor;

    if (carrinho[index].quantidade <= 0) {
        carrinho.splice(index, 1);
    }

    atualizarInterfaceGeral();
}

function removerItemLateral(index) {
    carrinho.splice(index, 1);
    atualizarInterfaceGeral();
}

// =================================================================
// 👤 SISTEMA DE AUTENTICAÇÃO (TABELA COMUM)
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
        
        if (usuarioLogado.email === adminEmail) {
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

async function fazerLogin() {
    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-senha").value.trim();

    if (!email || !senha) {
        mostrarAviso("⚠️ Por favor, digite seu e-mail e sua senha.", "aviso");
        return;
    }

    const { data, error } = await _supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('senha', senha);

    if (error) {
        mostrarAviso("❌ Erro ao conectar ao banco de dados.", "erro");
        return;
    }

    if (data && data.length > 0) {
        const conta = data[0];
        localStorage.setItem("usuario_logado", JSON.stringify(conta));
        
        fecharLogin();
        await verificarUsuario();
        mostrarAviso(`👋 Bem-vindo de volta, ${conta.nome}!`, "sucesso");
    } else {
        mostrarAviso("❌ E-mail ou senha incorretos.", "erro");
    }
}

async function fazerCadastro() {
    const nome = document.getElementById("cad-nome").value.trim();
    const email = document.getElementById("cad-email").value.trim();
    const senha = document.getElementById("cad-senha").value.trim();

    if (!nome || !email || !senha) {
        mostrarAviso("⚠️ Preencha todos os campos para criar a conta.", "aviso");
        return;
    }

    const { error } = await _supabase
        .from('usuarios')
        .insert([{
            nome: nome,
            email: email,
            senha: senha
        }]);

    if (error) {
        mostrarAviso("❌ Erro ao criar conta: " + error.message, "erro");
    } else {
        mostrarAviso("✅ Conta criada com sucesso! Faça login.", "sucesso");
        alternarAba('login');
    }
}

async function fazerLogout() {
    localStorage.removeItem("usuario_logado");
    window.location.reload();
}

// =================================================================
// 📍 PERFIL, DADOS DE ENTREGA E HISTÓRICO
// =================================================================
function abrirConta() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));

    if (usuarioLogado) {
        window.location.href = "perfil.html";
    } else {
        document.getElementById("modal-login").style.display = "flex";
    }
}

function fecharPerfil() {
    document.getElementById("secao-perfil").style.display = "none";
}

async function carregarDadosPerfil() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));
    if (!usuarioLogado) return;

    const { data: perfil, error } = await _supabase
        .from("usuarios")
        .select("*")
        .eq("email", usuarioLogado.email)
        .maybeSingle();

    if (perfil) {
        document.getElementById("perf-tel").value = perfil.telefone || "";
        
        if (perfil.endereco) {
            try {
                const partes = perfil.endereco.split(', ');
                document.getElementById("perf-rua").value = partes[0] || "";
                
                const numBairro = partes[1] ? partes[1].split(' - Bairro: ') : [];
                document.getElementById("perf-num").value = numBairro[0] ? numBairro[0].replace('Nº ', '') : "";
                
                const bairroCidade = numBairro[1] ? numBairro[1].split(', ') : [];
                document.getElementById("perf-bairro").value = bairroCidade[0] || "";
                document.getElementById("perf-cidade").value = bairroCidade[1] || "";
            } catch (e) {
                document.getElementById("perf-rua").value = perfil.endereco;
            }
        }
    }

    if (error && error.code !== "PGRST116") {
        console.error(error.message);
    }

    const containerHistorico = document.getElementById("historico-compras");
    if (!containerHistorico) return;

    containerHistorico.innerHTML = "<p style='font-size:12px; color:gray;'>Carregando histórico...</p>";

    const { data: pedidos, errorPedidos } = await _supabase
        .from("pedidos")
        .select("*")
        .eq("id_usuario", usuarioLogado.id)
        .order("created_at", { ascending: false });

    if (errorPedidos) {
        containerHistorico.innerHTML = "<p style='color:red; font-size:12px;'>Erro ao carregar histórico.</p>";
        return;
    }

    if (!pedidos || pedidos.length === 0) {
        containerHistorico.innerHTML = "<p style='font-size:13px; color:gray; text-align:center; padding: 10px 0;'>Você ainda não fez nenhum pedido 🛍️</p>";
        return;
    }

    containerHistorico.innerHTML = "";
    
    pedidos.forEach(pedido => {
        let corStatus = "#ffc107";
        if (pedido.status === "Entregue") corStatus = "#198754";
        if (pedido.status === "Saiu para entrega") corStatus = "#0d6efd";
        if (pedido.status === "Cancelado") corStatus = "#dc3545";

        // 🛒 Monta a lista detalhada dos itens salvos na coluna 'produtos' deste pedido
        let produtosHTML = "";
        if (Array.isArray(pedido.produtos)) {
            pedido.produtos.forEach(p => {
                produtosHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #eee; font-size: 13px;">
                        <span style="color: #333;">${p.quantidade}x ${p.nome}</span>
                        <span style="font-weight: bold; color: #666;">R$ ${(p.preco * p.quantidade).toFixed(2)}</span>
                    </div>
                `;
            });
        } else {
            produtosHTML = "<p style='font-size:12px; color:gray;'>Detalhes dos produtos indisponíveis.</p>";
        }

        // Formata a data de criação do pedido para o padrão brasileiro
        const dataPedido = new Date(pedido.created_at).toLocaleDateString('pt-BR');

        containerHistorico.innerHTML += `
            <div class="pedido-item" onclick="toggleDetalhesPedido('${pedido.id}')" style="border: 1px solid #eee; padding: 12px; border-radius: 8px; margin-bottom: 12px; background: #fdfdfd; cursor: pointer; transition: background 0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size: 11px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #555;">
                        📦 ID: ${pedido.id.substring(0, 8)}... <span style="color: #0d6efd; font-weight: normal;">(Clique para ver)</span>
                    </strong>
                    <span style="font-size: 11px; background: ${corStatus}; color: white; padding: 2px 8px; border-radius: 12px; font-weight: bold;">
                        ${pedido.status || 'Recebido'}
                    </span>
                </div>
                <p style="margin: 6px 0 2px 0; font-size: 15px; color: #198754; font-weight: bold;">Total: R$ ${Number(pedido.total).toFixed(2)}</p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; color: gray; font-size: 11px; margin-top: 4px;">
                    <span>Forma de Pág: ${pedido.pagamento}</span>
                    <span>📅 ${dataPedido}</span>
                </div>

                <div id="detalhes-${pedido.id}" style="display: none; margin-top: 12px; padding: 10px; border-top: 1px solid #ddd; background: #ffffff; border-radius: 6px;">
                    <strong style="font-size: 12px; display: block; margin-bottom: 8px; color: #198754;">🛒 Itens comprados:</strong>
                    ${produtosHTML}
                </div>
            </div>
        `;
    });
}

// ↕️ Copie e cole esta função auxiliar logo abaixo da carregarDadosPerfil()
function toggleDetalhesPedido(idPedido) {
    const painelDetalhes = document.getElementById(`detalhes-${idPedido}`);
    if (!painelDetalhes) return;

    if (painelDetalhes.style.display === "none") {
        painelDetalhes.style.display = "block";
    } else {
        painelDetalhes.style.display = "none";
    }
}

async function salvarPerfil() {
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));
        if (!usuarioLogado) {
            mostrarAviso("⚠️ Faça login para atualizar seu endereço.", "aviso");
            return;
        }

        const telefone = document.getElementById('perf-tel').value.trim();
        const rua = document.getElementById('perf-rua').value.trim();
        const numero = document.getElementById('perf-num').value.trim();
        const bairro = document.getElementById('perf-bairro').value.trim();
        const city = document.getElementById('perf-cidade').value.trim();

        if (!telefone || !rua || !numero || !bairro || !city) {
            mostrarAviso("⚠️ Preencha todos os campos do endereço.", "aviso");
            return;
        }

        const enderecoMontado = `${rua}, Nº ${numero} - Bairro: ${bairro}, ${city}`;

        const { error } = await _supabase
            .from('usuarios')
            .update({
                telefone: telefone,
                endereco: enderecoMontado
            })
            .eq('email', usuarioLogado.email);

        if (error) throw error;

        usuarioLogado.telefone = telefone;
        usuarioLogado.endereco = enderecoMontado;
        localStorage.setItem("usuario_logado", JSON.stringify(usuarioLogado));

        mostrarAviso("📍 Endereço de entrega salvo!", "sucesso");
        fecharPerfil();

    } catch (error) {
        mostrarAviso("❌ Erro ao salvar dados: " + error.message, "erro");
    }
}

// =================================================================
// 📦 FINALIZAR PEDIDO (SALVAR NO SUPABASE E WHATSAPP)
// =================================================================
function finalizarPedido() {
    if (carrinho.length === 0) {
        mostrarAviso("⚠️ Seu carrinho está vazio!", "aviso");
        return;
    }
    document.getElementById("modal-pagamento").style.display = "flex";
}

function fecharModal() {
    document.getElementById("modal-pagamento").style.display = "none";
}
async function escolherPagamento(tipo) {
    if (carrinho.length === 0) return;
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));

    if (!usuarioLogado) {
        mostrarAviso("⚠️ Entre na sua conta para finalizar a compra.", "aviso");
        return;
    }

    const { data: perfil } = await _supabase
        .from("usuarios")
        .select("*")
        .eq("email", usuarioLogado.email)
        .maybeSingle();

    if (!perfil || !perfil.endereco) {
        mostrarAviso("📍 Por favor, cadastre seu endereço antes de finalizar.", "aviso");
        fecharModal();
        document.getElementById("secao-perfil").style.display = "flex";
        carregarDadosPerfil();
        return;
    }

    // 1. Calcula o subtotal dos produtos
    let subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

    // 2. Detecta o bairro do perfil e define a taxa correspondente
    let taxaEntrega = TAXAS_ENTREGA["padrao"];
    let nomeBairro = "Padrão";
    try {
        const parteBairro = perfil.endereco.split("Bairro: ")[1].split(",")[0].trim().toLowerCase();
        nomeBairro = perfil.endereco.split("Bairro: ")[1].split(",")[0].trim();
        if (TAXAS_ENTREGA[parteBairro] !== undefined) {
            taxaEntrega = TAXAS_ENTREGA[parteBairro];
        }
    } catch (e) {
        taxaEntrega = TAXAS_ENTREGA["padrao"];
    }

    // 3. Soma o subtotal com a taxa de entrega para obter o valor real final
    let totalGeral = subtotal + taxaEntrega;

    // Salva o pedido no banco com o valor total final (já com a taxa inclusa)
    const { error } = await _supabase
        .from("pedidos")
        .insert([{
            cliente: perfil.nome,
            telefone: perfil.telefone,
            endereco: perfil.endereco,
            produtos: carrinho,
            total: totalGeral, // Envia o total modificado para o Banco de Dados
            pagamento: tipo,
            status: 'Recebido',
            id_usuario: perfil.id 
        }]);

    if (error) {
        mostrarAviso("❌ Erro ao enviar pedido: " + error.message, "erro");
        return;
    }

    // 4. Monta a mensagem detalhada para o WhatsApp incluindo os custos divididos
    let mensagem = "🛒 *Novo Pedido - Supermercado*%0A%0A";
    carrinho.forEach(p => {
        mensagem += `• ${p.nome} (${p.quantidade}x) - R$ ${(p.preco * p.quantidade).toFixed(2)}%0A`;
    });
    
    mensagem += `%0A----------------------------%0A`;
    mensagem += `📦 *Subtotal:* R$ ${subtotal.toFixed(2)}%0A`;
    mensagem += `🚚 *Taxa de Entrega (${nomeBairro}):* R$ ${taxaEntrega.toFixed(2)}%0A`;
    mensagem += `💰 *Total Geral:* R$ ${totalGeral.toFixed(2)}%0A`;
    mensagem += `----------------------------%0A%0A`;
    mensagem += `💳 *Pagamento:* ${tipo}%0A`;
    mensagem += `📍 *Entrega:* ${perfil.endereco}`;

    window.open(`https://wa.me/5533988101944?text=${mensagem}`, "_blank");

    carrinho = [];
    atualizarInterfaceGeral();
    fecharCarrinhoLateral();
    fecharModal();
    mostrarAviso("✅ Pedido enviado com sucesso!", "sucesso");
}
// =================================================================
// 💬 MODAIS & INTERFACES DE ACESSO
// =================================================================
function abrirLogin() { document.getElementById("modal-login").style.display = "flex"; }
function fecharLogin() { 
    document.getElementById("modal-login").style.display = "none"; 
}

function alternarAba(tipo) {
    const login = document.getElementById("form-login");
    const cadastro = document.getElementById("form-cadastro");
    const tabLogin = document.getElementById("tab-login");
    const tabCadastro = document.getElementById("tab-cadastro");

    tabLogin.classList.remove("ativa");
    tabCadastro.classList.remove("ativa");

    if (tipo === "login") {
        login.style.display = "block";
        cadastro.style.display = "none";
        tabLogin.classList.add("ativa");
    } else {
        login.style.display = "none";
        cadastro.style.display = "block";
        tabCadastro.classList.add("ativa");
    }
}

// =================================================================
// ↕️ CONTROLE DOS CARROSSÉIS
// =================================================================
function scrollCarrossel(idContainer, direcao) {
    const container = document.getElementById(idContainer);
    if (container) {
        const quantidadeScroll = 300; 
        container.scrollBy({
            left: direcao * quantidadeScroll,
            behavior: 'smooth'
        });
    }
}

// =================================================================
// 🔔 AVISOS CUSTOMIZADOS (VERDE, VERMELHO E AMARELO)
// =================================================================
function mostrarAviso(msg, tipo = 'sucesso') {
    const aviso = document.createElement("div");
    aviso.innerText = msg;

    let corFundo = "#198754"; 
    if (tipo === 'erro') corFundo = "#dc3545";   
    if (tipo === 'aviso') corFundo = "#ffc107";  

    let corTexto = tipo === 'aviso' ? '#212529' : 'white';

    aviso.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${corFundo};
        color: ${corTexto};
        padding: 14px 28px;
        border-radius: 10px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        font-family: Arial, sans-serif;
        font-weight: bold;
        font-size: 15px;
        z-index: 10000;
        transition: opacity 0.3s ease, transform 0.3s ease;
        transform: translateY(10px);
    `;

    document.body.appendChild(aviso);

    setTimeout(() => { aviso.style.transform = 'translateY(0)'; }, 50);

    setTimeout(() => { 
        aviso.style.opacity = '0'; 
        setTimeout(() => aviso.remove(), 300); 
    }, 3200);
}