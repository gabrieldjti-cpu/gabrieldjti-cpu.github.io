// ===============================
// 🛒 BANCO DE DADOS (PRODUTOS)
// ===============================
const produtosData = {
    index: [
        { nome: "Arroz 5kg", preco: 24, antigo: 30, desconto: "-20%", img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400" },
        { nome: "Óleo 900ml", preco: 7.20, antigo: 8.50, desconto: "-15%", img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400" },
        { nome: "Feijão 1kg", preco: 9.00, antigo: 10.00, desconto: "-10%", img: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400" },
        { nome: "Açúcar 1kg", preco: 4.40, antigo: 5.00, desconto: "-12%", img: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400" },
        { nome: "Leite 1L", preco: 5.99, antigo: 6.50, desconto: "-8%", img: "https://images.unsplash.com/photo-1563636619-e910ef49e9cf?w=400" },
        { nome: "Café 500g", preco: 9.80, antigo: 12.00, desconto: "-18%", img: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400" },
        { nome: "Macarrão 500g", preco: 3.50, antigo: 4.00, desconto: "-10%", img: "https://images.unsplash.com/photo-1551462147-37885abb3e4a?w=400" },
        { nome: "Refrigerante 2L", preco: 8.90, antigo: 10.00, desconto: "-11%", img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400" }
    ],
    carnes: [
        { nome: "Carne Bovina 1kg", preco: 32.90, antigo: 38.00, desconto: "-13%", img: "https://images.unsplash.com/photo-1607623814075-e512199b028b?w=400" },
        { nome: "Frango Inteiro", preco: 15.50, antigo: 18.00, desconto: "-14%", img: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400" }
    ],
    hortifruti: [
        { nome: "Banana 1kg", preco: 4.50, antigo: 5.50, desconto: "-18%", img: "https://images.unsplash.com/photo-1603833665858-e81b1c7e4460?w=400" },
        { nome: "Tomate 1kg", preco: 7.50, antigo: 9.00, desconto: "-17%", img: "https://images.unsplash.com/photo-1518977676601-b53f02bad67b?w=400" }
    ],
    limpeza: [
        { nome: "Detergente 500ml", preco: 2.50, antigo: 3.00, desconto: "-16%", img: "https://images.unsplash.com/photo-1584622781564-1d9876a13d00?w=400" }
    ]
};

// ===============================
// 🧱 CONFIGURAÇÃO SUPABASE
// ===============================
const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';
const supabaseKey = 'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ===============================
// 🧱 INTERFACE DE PRODUTOS
// ===============================
function mostrarProdutos(lista, idContainer = "lista-produtos") {
    const container = document.getElementById(idContainer);
    if (!container) return;

    container.innerHTML = lista.length === 0 
        ? "<p style='text-align:center; grid-column: 1/-1;'>Nenhum produto encontrado 😢</p>" 
        : "";

    lista.forEach(p => {
        let badgeHTML = "";
        if (idContainer === "lista-carnes") badgeHTML = `<span class="badge badge-premium">Premium</span>`;
        if (idContainer === "lista-hortifruti") badgeHTML = `<span class="badge badge-organico">Orgânico</span>`;

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <span class="desconto">${p.desconto}</span>
            ${badgeHTML}
            <img src="${p.img}" alt="${p.nome}">
            <h3>${p.nome}</h3>
            <p class="preco-antigo">R$ ${p.antigo.toFixed(2)}</p>
            <p class="preco">R$ ${p.preco.toFixed(2)}</p>
            <button onclick="adicionarCarrinho('${p.nome}', ${p.preco})">Adicionar</button>
        `;
        container.appendChild(card);
    });
}

function filtrarProdutos(categoria) {
    const termo = document.getElementById("busca").value.toLowerCase();
    const listaOriginal = produtosData[categoria] || produtosData.index;
    const filtrados = listaOriginal.filter(p => p.nome.toLowerCase().includes(termo));
    const idContainer = (categoria === 'index' || !categoria) ? 'lista-produtos' : `lista-${categoria}`;
    mostrarProdutos(filtrados, idContainer);
}

// ===============================
// 🛒 LÓGICA DO CARRINHO
// ===============================
function adicionarCarrinho(nome, preco) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    let item = carrinho.find(p => p.nome === nome);
    if (item) { item.quantidade++; } else { carrinho.push({ nome, preco, quantidade: 1 }); }
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    atualizarContador();
    mostrarAviso(`✅ ${nome} no carrinho!`);
}

function irCarrinho() {
    document.getElementById("carrinho-lateral").classList.add("ativo");
    document.getElementById("overlay").style.display = "block";
    carregarCarrinho();
}

function fecharCarrinho() {
    document.getElementById("carrinho-lateral").classList.remove("ativo");
    document.getElementById("overlay").style.display = "none";
}

function carregarCarrinho() {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    const container = document.getElementById("lista-carrinho");
    const totalEl = document.getElementById("total");
    if (!container || !totalEl) return;

    container.innerHTML = carrinho.length === 0 ? "<p style='text-align:center;'>Vazio 🛒</p>" : "";
    let somaTotal = 0;

    carrinho.forEach((p, i) => {
        const item = document.createElement("div");
        item.className = "item-carrinho";
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${p.nome}</div>
                    <div style="margin-top: 5px;">
                        <button onclick="mudarQtd(${i}, -1)">-</button>
                        <span style="margin: 0 10px;">${p.quantidade}</span>
                        <button onclick="mudarQtd(${i}, 1)">+</button>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #198754; font-weight: bold;">R$ ${(p.preco * p.quantidade).toFixed(2)}</div>
                    <button onclick="removerItem(${i})" style="color:red; background:none; border:none; cursor:pointer; font-size:12px;">Remover</button>
                </div>
            </div>`;
        container.appendChild(item);
        somaTotal += p.preco * p.quantidade;
    });
    totalEl.innerText = `Total: R$ ${somaTotal.toFixed(2)}`;
}

function mudarQtd(index, valor) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho"));
    carrinho[index].quantidade += valor;
    if (carrinho[index].quantidade <= 0) return removerItem(index);
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    carregarCarrinho();
    atualizarContador();
}

function removerItem(index) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho"));
    carrinho.splice(index, 1);
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    carregarCarrinho();
    atualizarContador();
}

function atualizarContador() {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    const totalItens = carrinho.reduce((soma, p) => soma + p.quantidade, 0);
    const contador = document.getElementById("contador");
    if (contador) contador.innerText = totalItens;
}

// ===============================
// 🔐 AUTENTICAÇÃO E PERFIL
// ===============================
async function verificarUsuario() {
    const { data: { user } } = await _supabase.auth.getUser();
    const btnUser = document.getElementById('user-name');
    if (user) {
        const nomeExibir = user.user_metadata.display_name || user.email.split('@')[0];
        btnUser.innerText = `Olá, ${nomeExibir} ⚙️`;
        btnUser.onclick = abrirPerfil; 
    } else {
        btnUser.innerText = "👤 Entrar";
        btnUser.onclick = abrirLogin;
    }
}

async function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password: senha });
    if (error) alert("Erro: " + error.message);
    else { fecharLogin(); verificarUsuario(); mostrarAviso("Bem-vindo! 👋"); }
}

async function fazerCadastro() {
    const nome = document.getElementById('cad-nome').value;
    const email = document.getElementById('cad-email').value;
    const senha = document.getElementById('cad-senha').value;
    const { error } = await _supabase.auth.signUp({ email, password: senha, options: { data: { display_name: nome } } });
    if (error) alert("Erro: " + error.message);
    else alert("Conta criada! Verifique seu e-mail.");
}

async function fazerLogout() {
    if (confirm("Deseja sair?")) {
        await _supabase.auth.signOut();
        window.location.reload();
    }
}

// ===============================
// 📍 GESTÃO DE ENDEREÇO (PERFIL)
// ===============================
function abrirPerfil() { document.getElementById('secao-perfil').style.display = 'flex'; carregarDadosPerfil(); }
function fecharPerfil() { document.getElementById('secao-perfil').style.display = 'none'; }

async function carregarDadosPerfil() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    const { data: perfil, error } = await _supabase
        .from('enderecos') // TABELA CORRETA
        .select('*')
        .eq('id', user.id)
        .single();

    if (perfil) {
        if(document.getElementById('perf-tel')) document.getElementById('perf-tel').value = perfil.telefone || '';
        if(document.getElementById('perf-rua')) document.getElementById('perf-rua').value = perfil.rua || '';
        if(document.getElementById('perf-num')) document.getElementById('perf-num').value = perfil.numero_casa || ''; // COLUNA CORRETA
        if(document.getElementById('perf-bairro')) document.getElementById('perf-bairro').value = perfil.bairro || '';
        if(document.getElementById('perf-cidade')) document.getElementById('perf-cidade').value = perfil.cidade || '';
    } 
    if (error && error.code !== 'PGRST116') console.error("Erro:", error.message);
}

async function salvarPerfil() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return alert("Acesse sua conta para salvar o endereço!");

    const dados = {
        id: user.id,
        telefone: document.getElementById('perf-tel').value,
        rua: document.getElementById('perf-rua').value,
        numero_casa: document.getElementById('perf-num').value, // COLUNA CORRETA
        bairro: document.getElementById('perf-bairro').value,
        cidade: document.getElementById('perf-cidade').value
    };

    const { error } = await _supabase.from('enderecos').upsert(dados);

    if (error) alert("Erro ao salvar: " + error.message);
    else { alert("📍 Endereço salvo com sucesso!"); fecharPerfil(); }
}

// ===============================
// 🛠 AUXILIARES E WHATSAPP
// ===============================
function abrirLogin() { document.getElementById('modal-login').style.display = 'flex'; }
function fecharLogin() { document.getElementById('modal-login').style.display = 'none'; }
function alternarAba(tipo) {
    document.getElementById('form-login').style.display = tipo === 'login' ? 'block' : 'none';
    document.getElementById('form-cadastro').style.display = tipo === 'cadastro' ? 'block' : 'none';
}

function mostrarAviso(msg) {
    const aviso = document.createElement("div");
    aviso.innerText = msg;
    aviso.style.cssText = "position:fixed; bottom:20px; right:20px; background:#198754; color:white; padding:15px; border-radius:10px; z-index:9999;";
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), 3000);
}

function finalizarPedido() {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    document.getElementById("modal-pagamento").style.display = "flex";
}

function fecharModal() { document.getElementById("modal-pagamento").style.display = "none"; }

async function escolherPagamento(tipo) {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    const { data: { user } } = await _supabase.auth.getUser();
    let enderecoMsg = "";

    if (user) {
        const { data: perfil } = await _supabase
            .from('enderecos') // TABELA CORRETA
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (perfil) {
            // USANDO NUMERO_CASA CONFORME O BANCO
            enderecoMsg = `%0A%0A📍 *Entrega:* ${perfil.rua}, ${perfil.numero_casa} - ${perfil.bairro}`;
        }
    }

    let msg = "🛒 *Novo Pedido*%0A%0A";
    let total = 0;
    carrinho.forEach(p => {
        msg += `• *${p.nome}* (${p.quantidade}x) - R$ ${(p.preco * p.quantidade).toFixed(2)}%0A`;
        total += p.preco * p.quantidade;
    });
    
    msg += `%0A💰 *Total: R$ ${total.toFixed(2)}*%0A💳 Pagamento: ${tipo}${enderecoMsg}`;
    window.open(`https://wa.me/5533988101944?text=${msg}`, "_blank");
}

// ===============================
// 📄 INICIALIZAÇÃO
// ===============================
window.onload = () => {
    atualizarContador();
    verificarUsuario();
    
    if (document.getElementById("lista-produtos")) mostrarProdutos(produtosData.index, "lista-produtos");
    if (document.getElementById("lista-carnes")) mostrarProdutos(produtosData.carnes, "lista-carnes");
    if (document.getElementById("lista-hortifruti")) mostrarProdutos(produtosData.hortifruti, "lista-hortifruti");
    if (document.getElementById("lista-limpeza")) mostrarProdutos(produtosData.limpeza, "lista-limpeza");
};