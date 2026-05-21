// ===============================
// 🔗 CONFIGURAÇÃO SUPABASE
// ===============================
const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';
const supabaseKey = 'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';

// Variável padrão unificada para todo o sistema
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ===============================
// 📦 CARREGAR PRODUTOS DO SUPABASE
// ===============================
async function carregarProdutosSupabase() {
    const { data, error } = await _supabase
        .from('produtos')
        .select('*');

    if (error) {
        console.error("Erro ao carregar produtos:", error);
        return;
    }

    // Filtros por categorias direto do banco
    const index = data.filter(p => p.categoria === 'index');
    mostrarProdutosSupabase(index, 'lista-produtos');

    const horti = data.filter(p => p.categoria === 'hortifruti');
    mostrarProdutosSupabase(horti, 'carrossel-horti');

    const carnes = data.filter(p => p.categoria === 'carnes');
    mostrarProdutosSupabase(carnes, 'carrossel-carnes');
}

function mostrarProdutosSupabase(lista, idContainer) {
    const container = document.getElementById(idContainer);
    if (!container) return;

    container.innerHTML = '';

    lista.forEach(produto => {
        let badgeHTML = '';

        if (produto.categoria === 'carnes') {
            badgeHTML = `<span class="badge badge-premium">Premium</span>`;
        }
        if (produto.categoria === 'hortifruti') {
            badgeHTML = `<span class="badge badge-organico">Orgânico</span>`;
        }

        container.innerHTML += `
            <div class="card">
                <span class="desconto">-${produto.desconto}%</span>
                ${badgeHTML}
                <img src="${produto.img}" alt="${produto.nome}">
                <h3>${produto.nome}</h3>
                <p class="preco-antigo">R$ ${Number(produto.preco_antigo).toFixed(2)}</p>
                <p class="preco">R$ ${Number(produto.preco).toFixed(2)}</p>
                <button onclick="adicionarCarrinho('${produto.nome}', ${produto.preco})">
                    Adicionar
                </button>
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

// ===============================
// 🔍 FILTRAR PRODUTOS (BUSCA)
// ===============================
async function filtrarProdutos() {
    const termo = document.getElementById("busca").value.toLowerCase();
    
    const { data, error } = await _supabase
        .from('produtos')
        .select('*')
        .ilike('nome', `%${termo}%`);

    if (error) return;

    const containerGeral = document.getElementById("lista-produtos");
    if (containerGeral) {
        mostrarProdutosSupabase(data, "lista-produtos");
    }
}

// ===============================
// 🛒 GERENCIAMENTO DO CARRINHO
// ===============================
function adicionarCarrinho(nome, preco) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    const itemExistente = carrinho.find(item => item.nome === nome);

    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push({ nome, preco, grandmother: 1, quantidade: 1 });
    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    atualizarContador();
    mostrarAviso(`✅ ${nome} adicionado!`, 'sucesso');
}

function atualizarContador() {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    const totalItens = carrinho.reduce((soma, item) => soma + item.quantidade, 0);
    const contador = document.getElementById("contador");
    if (contador) contador.innerText = totalItens;
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
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    const container = document.getElementById("lista-carrinho");
    const totalEl = document.getElementById("total");

    if (!container || !totalEl) return;
    container.innerHTML = "";
    let total = 0;

    if (carrinho.length === 0) {
        container.innerHTML = `<p style="text-align:center;">Carrinho vazio 🛒</p>`;
        totalEl.innerText = "Total: R$ 0,00";
        return;
    }

    carrinho.forEach((produto, index) => {
        total += produto.preco * produto.quantidade;
        const item = document.createElement("div");
        item.className = "item-carrinho";
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; gap:15px; margin-bottom:15px; padding-bottom:15px; border-bottom:1px solid #eee;">
                <div>
                    <strong>${produto.nome}</strong>
                    <div style="margin-top:8px;">
                        <button onclick="mudarQtd(${index}, -1)">-</button>
                        <span style="margin:0 10px;">${produto.quantidade}</span>
                        <button onclick="mudarQtd(${index}, 1)">+</button>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="color:#198754; font-weight:bold;">R$ ${(produto.preco * produto.quantidade).toFixed(2)}</div>
                    <button onclick="removerItem(${index})" style="border:none; background:none; color:red; cursor:pointer; margin-top:5px;">Remover</button>
                </div>
            </div>
        `;
        container.appendChild(item);
    });

    totalEl.innerText = `Total: R$ ${total.toFixed(2)}`;
}

function mudarQtd(index, valor) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho"));
    carrinho[index].quantidade += valor;

    if (carrinho[index].quantidade <= 0) {
        removerItem(index);
        return;
    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    carregarCarrinho();
    atualizarContador();
}

function removerItem(index) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    carrinho.splice(index, 1);
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    carregarCarrinho();
    atualizarContador();
}

// ===============================
// 👤 SISTEMA DE AUTENTICAÇÃO (TABELA COMUM)
// ===============================
async function verificarUsuario() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));
    const btnUser = document.getElementById("user-name");
    const adminBtn = document.getElementById("btn-admin");

    if (usuarioLogado) {
        const nome = usuarioLogado.nome;

        if (btnUser) btnUser.innerText = nome;

        const perfilNome = document.getElementById("perfil-nome");
        const perfilEmail = document.getElementById("perfil-email");
        if (perfilNome) perfilNome.innerText = nome;
        if (perfilEmail) perfilEmail.innerText = usuarioLogado.email;

        // Seu e-mail oficial de administrador
        const adminEmail = 'gabrieldj.ti@gmail.com';
        
        if (usuarioLogado.email === adminEmail) {
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

// ===============================
// 📍 PERFIL, DADOS DE ENTREGA E HISTÓRICO
// ===============================
function abrirConta() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));
    if (usuarioLogado) {
        document.getElementById("secao-perfil").style.display = "flex";
        carregarDadosPerfil();
    } else {
        abrirLogin();
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
        .eq("cliente", usuarioLogado.nome)
        .order("id", { ascending: false });

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

        containerHistorico.innerHTML += `
            <div class="pedido-item" style="border: 1px solid #eee; padding: 10px; border-radius: 8px; margin-bottom: 10px; background: #fdfdfd;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>Pedido #${pedido.id}</strong>
                    <span style="font-size: 11px; background: ${corStatus}; color: white; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${pedido.status || 'Recebido'}</span>
                </div>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #198754; font-weight: bold;">Total: R$ ${Number(pedido.total).toFixed(2)}</p>
                <small style="color: gray; font-size: 11px;">Forma de Pág: ${pedido.pagamento}</small>
            </div>
        `;
    });
}

// CORREÇÃO AQUI: Mudança de .upsert() para .update() filtrando pelo email cadastrado
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

        // Usando .update() e vinculando ao email com .eq() para evitar conflitos de chaves primárias
        const { error } = await _supabase
            .from('usuarios')
            .update({
                telefone: telefone,
                endereco: enderecoMontado
            })
            .eq('email', usuarioLogado.email);

        if (error) throw error;

        mostrarAviso("📍 Endereço de entrega salvo!", "sucesso");
        fecharPerfil();

    } catch (error) {
        mostrarAviso("❌ Erro ao salvar dados: " + error.message, "erro");
    }
}

// ===============================
// 📦 FINALIZAR PEDIDO
// ===============================
function finalizarPedido() {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
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
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
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

    let total = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

    const { error } = await _supabase
        .from("pedidos")
        .insert([{
            cliente: perfil.nome,
            telefone: perfil.telefone,
            endereco: perfil.endereco,
            produtos: carrinho,
            total: total,
            pagamento: tipo,
            status: 'Recebido'
        }]);

    if (error) {
        mostrarAviso("❌ Erro ao enviar pedido: " + error.message, "erro");
        return;
    }

    let mensagem = "🛒 *Novo Pedido - Supermercado*%0A%0A";
    carrinho.forEach(p => {
        mensagem += `• ${p.nome} (${p.quantidade}x) - R$ ${(p.preco * p.quantidade).toFixed(2)}%0A`;
    });
    mensagem += `%0A💰 *Total:* R$ ${total.toFixed(2)}%0A💳 *Pagamento:* ${tipo}%0A📍 *Entrega:* ${perfil.endereco}`;

    window.open(`https://wa.me/5533988101944?text=${mensagem}`, "_blank");

    localStorage.removeItem("carrinho");
    atualizarContador();
    fecharCarrinhoLateral();
    fecharModal();
    mostrarAviso("✅ Pedido enviado com sucesso!", "sucesso");
}

// ===============================
// 💬 MODAIS
// ===============================
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

// ===============================================
// ↕️ CONTROLE DOS CARROSSÉIS (EXIGIDO PELO HTML)
// ===============================================
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

// ===============================================
// 🔔 AVISOS CUSTOMIZADOS (VERDE, VERMELHO E AMARELO)
// ===============================================
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