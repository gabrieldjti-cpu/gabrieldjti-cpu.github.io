// ===============================
// 🛒 BANCO DE DADOS (PRODUTOS)
// ===============================
// ===============================
// 📦 CARREGAR PRODUTOS DO SUPABASE
// ===============================

async function carregarProdutosSupabase() {

    const { data, error } =
    await _supabase
    .from('produtos')
    .select('*');

    if (error) {

        console.log(error);

        return;
    }

    // MAIS VENDIDOS
    const index =
    data.filter(p =>
        p.categoria === 'index'
    );

    mostrarProdutosSupabase(
        index,
        'lista-produtos'
    );

    // HORTIFRUTI
    const horti =
    data.filter(p =>
        p.categoria === 'hortifruti'
    );

    mostrarProdutosSupabase(
        horti,
        'carrossel-horti'
    );

    // CARNES
    const carnes =
    data.filter(p =>
        p.categoria === 'carnes'
    );

    mostrarProdutosSupabase(
        carnes,
        'carrossel-carnes'
    );
}
function mostrarProdutosSupabase(
    lista,
    idContainer
){

    const container =
    document.getElementById(idContainer);

    if(!container) return;

    container.innerHTML = '';

    lista.forEach(produto => {

        let badgeHTML = '';

        if(produto.categoria === 'carnes'){

            badgeHTML = `
                <span class="badge badge-premium">
                    Premium
                </span>
            `;
        }

        if(produto.categoria === 'hortifruti'){

            badgeHTML = `
                <span class="badge badge-organico">
                    Orgânico
                </span>
            `;
        }

        container.innerHTML += `

            <div class="card">

                <span class="desconto">
                    ${produto.desconto}
                </span>

                ${badgeHTML}

                <img
                    src="${produto.imagem}"
                    alt="${produto.nome}"
                >

                <h3>
                    ${produto.nome}
                </h3>

                <p class="preco-antigo">
                    R$ ${Number(produto.preco_antigo).toFixed(2)}
                </p>

                <p class="preco">
                    R$ ${Number(produto.preco).toFixed(2)}
                </p>

                <button
                    onclick="
                    adicionarCarrinho(
                        '${produto.nome}',
                        ${produto.preco}
                    )"
                >
                    Adicionar
                </button>

            </div>

        `;
    });
}

// ===============================
// 🔗 CONFIGURAÇÃO SUPABASE
// ===============================
const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';

const supabaseKey =
'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';

const _supabase =
supabase.createClient(supabaseUrl, supabaseKey);

// ===============================
// 🛍️ MOSTRAR PRODUTOS
// ===============================
function mostrarProdutos(lista, idContainer = "lista-produtos") {

    const container = document.getElementById(idContainer);

    if (!container) return;

    container.innerHTML = "";

    if (lista.length === 0) {

        container.innerHTML = `
            <p style="text-align:center; width:100%;">
                Nenhum produto encontrado 😢
            </p>
        `;

        return;
    }

    lista.forEach(produto => {

        let badgeHTML = "";

        if (idContainer.includes("carnes")) {
            badgeHTML = `
                <span class="badge badge-premium">
                    Premium
                </span>
            `;
        }

        if (idContainer.includes("horti")) {
            badgeHTML = `
                <span class="badge badge-organico">
                    Orgânico
                </span>
            `;
        }

        const card = document.createElement("div");

        card.className = "card";

        card.innerHTML = `
            <span class="desconto">
                ${produto.desconto}
            </span>

            ${badgeHTML}

            <img src="${produto.img}" alt="${produto.nome}">

            <h3>${produto.nome}</h3>

            <p class="preco-antigo">
                R$ ${produto.antigo.toFixed(2)}
            </p>

            <p class="preco">
                R$ ${produto.preco.toFixed(2)}
            </p>

            <button onclick="adicionarCarrinho('${produto.nome}', ${produto.preco})">
                Adicionar
            </button>
        `;

        container.appendChild(card);
    });
}

// ===============================
// 🔍 FILTRAR PRODUTOS
// ===============================
function filtrarProdutos(categoria = "index") {

    const termo =
    document.getElementById("busca")
    .value
    .toLowerCase();

    const lista =
    produtosData[categoria] || produtosData.index;

    const filtrados = lista.filter(produto =>
        produto.nome.toLowerCase().includes(termo)
    );

    mostrarProdutos(filtrados, "lista-produtos");
}

// ===============================
// 🛒 CARRINHO
// ===============================
function adicionarCarrinho(nome, preco) {

    let carrinho =
    JSON.parse(localStorage.getItem("carrinho")) || [];

    const itemExistente =
    carrinho.find(item => item.nome === nome);

    if (itemExistente) {

        itemExistente.quantidade++;

    } else {

        carrinho.push({
            nome,
            preco,
            quantidade: 1
        });
    }

    localStorage.setItem(
        "carrinho",
        JSON.stringify(carrinho)
    );

    atualizarContador();

    mostrarAviso(`✅ ${nome} adicionado ao carrinho!`);
}

function atualizarContador() {

    const carrinho =
    JSON.parse(localStorage.getItem("carrinho")) || [];

    const totalItens =
    carrinho.reduce((soma, item) =>
        soma + item.quantidade, 0
    );

    const contador =
    document.getElementById("contador");

    if (contador) {
        contador.innerText = totalItens;
    }
}

function irCarrinho() {

    document
    .getElementById("carrinho-lateral")
    .classList.add("ativo");

    document
    .getElementById("overlay")
    .style.display = "block";

    carregarCarrinho();
}

function fecharCarrinho() {

    document
    .getElementById("carrinho-lateral")
    .classList.remove("ativo");

    document
    .getElementById("overlay")
    .style.display = "none";
}

function carregarCarrinho() {

    const carrinho =
    JSON.parse(localStorage.getItem("carrinho")) || [];

    const container =
    document.getElementById("lista-carrinho");

    const totalEl =
    document.getElementById("total");

    if (!container || !totalEl) return;

    container.innerHTML = "";

    let total = 0;

    if (carrinho.length === 0) {

        container.innerHTML = `
            <p style="text-align:center;">
                Carrinho vazio 🛒
            </p>
        `;

        totalEl.innerText = "Total: R$ 0,00";

        return;
    }

    carrinho.forEach((produto, index) => {

        total += produto.preco * produto.quantidade;

        const item = document.createElement("div");

        item.className = "item-carrinho";

        item.innerHTML = `
            <div style="
                display:flex;
                justify-content:space-between;
                gap:15px;
                margin-bottom:15px;
                padding-bottom:15px;
                border-bottom:1px solid #eee;
            ">

                <div>

                    <strong>${produto.nome}</strong>

                    <div style="margin-top:8px;">

                        <button onclick="mudarQtd(${index}, -1)">
                            -
                        </button>

                        <span style="margin:0 10px;">
                            ${produto.quantidade}
                        </span>

                        <button onclick="mudarQtd(${index}, 1)">
                            +
                        </button>

                    </div>

                </div>

                <div style="text-align:right;">

                    <div style="
                        color:#198754;
                        font-weight:bold;
                    ">
                        R$ ${(produto.preco * produto.quantidade).toFixed(2)}
                    </div>

                    <button
                        onclick="removerItem(${index})"
                        style="
                            border:none;
                            background:none;
                            color:red;
                            cursor:pointer;
                            margin-top:5px;
                        "
                    >
                        Remover
                    </button>

                </div>

            </div>
        `;

        container.appendChild(item);
    });

    totalEl.innerText = `Total: R$ ${total.toFixed(2)}`;
}

function mudarQtd(index, valor) {

    let carrinho =
    JSON.parse(localStorage.getItem("carrinho"));

    carrinho[index].quantidade += valor;

    if (carrinho[index].quantidade <= 0) {

        removerItem(index);
        return;
    }

    localStorage.setItem(
        "carrinho",
        JSON.stringify(carrinho)
    );

    carregarCarrinho();
    atualizarContador();
}

function removerItem(index) {

    let carrinho =
    JSON.parse(localStorage.getItem("carrinho"));

    carrinho.splice(index, 1);

    localStorage.setItem(
        "carrinho",
        JSON.stringify(carrinho)
    );

    carregarCarrinho();
    atualizarContador();
}

// ===============================
// 👤 LOGIN / CADASTRO
// ===============================
// ===============================
// 👤 VERIFICAR USUÁRIO
// ===============================

async function verificarUsuario() {

    const {
        data: { session }
    } = await _supabase.auth.getSession();

    const btnUser =
    document.getElementById("user-name");

    // BOTÃO ADMIN
    const adminBtn =
    document.getElementById("btn-admin");

    if (session && session.user) {

        const user = session.user;

        const nome =
        user.user_metadata.display_name ||
        user.email.split("@")[0];

        // NOME DO USUÁRIO
        if(btnUser){
            btnUser.innerText = nome;
        }

        // PERFIL
        const perfilNome =
        document.getElementById("perfil-nome");

        const perfilEmail =
        document.getElementById("perfil-email");

        if (perfilNome) {
            perfilNome.innerText = nome;
        }

        if (perfilEmail) {
            perfilEmail.innerText = user.email;
        }

        // EMAIL ADMIN
        const adminEmail =
        'gabriel@gmail.com';

        // MOSTRAR BOTÃO ADM
        if (
            adminBtn &&
            user.email === adminEmail
        ) {

            adminBtn.style.display = "flex";
        }

    } else {

        if(btnUser){
            btnUser.innerText = "Entrar";
        }

        if(adminBtn){
            adminBtn.style.display = "none";
        }
    }
}

async function fazerLogin() {

    const email =
    document.getElementById("login-email").value;

    const senha =
    document.getElementById("login-senha").value;

    const { error } =
    await _supabase.auth.signInWithPassword({
        email,
        password: senha
    });

    if (error) {

        alert("Erro: " + error.message);

    } else {

        fecharLogin();

        await verificarUsuario();

        await verificarAdmin();

        mostrarAviso("👋 Bem-vindo!");
    }
}
// ===============================
// 👑 VERIFICAR ADMIN
// ===============================
async function verificarAdmin() {

    const {
        data: { user }
    } = await _supabase.auth.getUser();

    if (!user) return;

    // EMAIL DO ADMIN
    const adminEmail = "gabriel@gmail.com";

    // SE FOR ADMIN
    if (user.email === adminEmail) {

        // cria botão admin no topo
        const acoesTopo =
        document.querySelector(".acoes-topo");

        if (acoesTopo && !document.getElementById("btn-admin")) {

            const botao = document.createElement("div");

            botao.id = "btn-admin";

            botao.className = "usuario-box";

            botao.innerHTML = `
                <div class="avatar-user">
                    👑
                </div>

                <div class="usuario-info">
                    <span>Admin</span>
                    <small>Painel</small>
                </div>
            `;

            botao.onclick = () => {
                window.location.href = "admin.html";
            };

            acoesTopo.appendChild(botao);
        }
    }
}

async function fazerCadastro() {

    const nome =
    document.getElementById("cad-nome").value;

    const email =
    document.getElementById("cad-email").value;

    const senha =
    document.getElementById("cad-senha").value;

    const { error } =
    await _supabase.auth.signUp({

        email,
        password: senha,

        options: {
            data: {
                display_name: nome
            }
        }
    });

    if (error) {

        alert("Erro: " + error.message);

    } else {

        alert("Conta criada! Verifique seu e-mail.");
    }
}

async function fazerLogout() {

    const sair = confirm("Deseja sair da conta?");

    if (!sair) return;

    await _supabase.auth.signOut();

    window.location.reload();
}

// ===============================
// 📍 PERFIL E ENDEREÇO
// ===============================
function abrirPerfil() {

    document.getElementById(
        "secao-perfil"
    ).style.display = "flex";

    carregarDadosPerfil();
}

function fecharPerfil() {

    document.getElementById(
        "secao-perfil"
    ).style.display = "none";
}

async function carregarDadosPerfil() {

    const {
        data: { user }
    } = await _supabase.auth.getUser();

    if (!user) return;

    const {
        data: perfil,
        error
    } = await _supabase
    .from("enderecos")
    .select("*")
    .eq("id", user.id)
    .single();

    if (perfil) {

        document.getElementById("perf-tel").value =
        perfil.telefone || "";

        document.getElementById("perf-rua").value =
        perfil.rua || "";

        document.getElementById("perf-num").value =
        perfil.numero_casa || "";

        document.getElementById("perf-bairro").value =
        perfil.bairro || "";

        document.getElementById("perf-cidade").value =
        perfil.cidade || "";
    }

    if (error && error.code !== "PGRST116") {
        console.error(error.message);
    }
}

async function salvarPerfil() {

    const {
        data: { user }
    } = await _supabase.auth.getUser();

    if (!user) {
        alert("Faça login primeiro!");
        return;
    }

    const dados = {

        id: user.id,

        telefone:
        document.getElementById("perf-tel").value,

        rua:
        document.getElementById("perf-rua").value,

        numero_casa:
        document.getElementById("perf-num").value,

        bairro:
        document.getElementById("perf-bairro").value,

        cidade:
        document.getElementById("perf-cidade").value
    };

    const { error } =
    await _supabase
    .from("enderecos")
    .upsert(dados);

    if (error) {

        alert("Erro: " + error.message);

    } else {

        mostrarAviso("📍 Endereço salvo!");
        fecharPerfil();
    }
}

// ===============================
// 📦 FINALIZAR PEDIDO
// ===============================
function finalizarPedido() {

    const carrinho =
    JSON.parse(localStorage.getItem("carrinho")) || [];

    if (carrinho.length === 0) {

        alert("Carrinho vazio!");
        return;
    }

    document.getElementById(
        "modal-pagamento"
    ).style.display = "flex";
}

function fecharModal() {

    document.getElementById(
        "modal-pagamento"
    ).style.display = "none";
}

async function escolherPagamento(tipo) {

    const carrinho =
    JSON.parse(localStorage.getItem("carrinho")) || [];

    const {
        data: { user }
    } = await _supabase.auth.getUser();

    if (!user) {

        alert("Faça login.");

        return;
    }

    const { data: perfil } =
    await _supabase
    .from("enderecos")
    .select("*")
    .eq("id", user.id)
    .single();

    let total = 0;

    carrinho.forEach(item => {

        total +=
        item.preco * item.quantidade;
    });

    // SALVAR PEDIDO
    const { error } =
    await _supabase
    .from("pedidos")
    .insert([{

        user_id: user.id,

        cliente:
        user.user_metadata.display_name,

        telefone:
        perfil?.telefone || "",

        endereco:
        `${perfil?.rua || ""}
        ${perfil?.numero_casa || ""}
        - ${perfil?.bairro || ""}`,

        produtos: carrinho,

        total: total,

        pagamento: tipo

    }]);

    if (error) {

        alert(error.message);

        return;
    }

    // WHATSAPP
    let mensagem =
    "🛒 *Novo Pedido*%0A%0A";

    carrinho.forEach(produto => {

        mensagem += `
• ${produto.nome}
(${produto.quantidade}x)
- R$ ${(produto.preco * produto.quantidade).toFixed(2)}%0A
        `;
    });

    mensagem += `
%0A💰 Total:
R$ ${total.toFixed(2)}

%0A💳 Pagamento:
${tipo}
    `;

    window.open(
        `https://wa.me/5533988101944?text=${mensagem}`,
        "_blank"
    );

    localStorage.removeItem("carrinho");

    atualizarContador();

    fecharCarrinho();

    fecharModal();

    mostrarAviso("✅ Pedido enviado!");
}

// ===============================
// 💬 MODAIS
// ===============================
function abrirLogin() {

    document.getElementById(
        "modal-login"
    ).style.display = "flex";
}

function fecharLogin() {

    document.getElementById(
        "modal-login"
    ).style.display = "none";
}

function alternarAba(tipo) {

    const login =
    document.getElementById("form-login");

    const cadastro =
    document.getElementById("form-cadastro");

    const tabLogin =
    document.getElementById("tab-login");

    const tabCadastro =
    document.getElementById("tab-cadastro");

    // RESET
    tabLogin.classList.remove("ativa");
    tabCadastro.classList.remove("ativa");

    // LOGIN
    if (tipo === "login") {

        login.style.display = "block";
        cadastro.style.display = "none";

        tabLogin.classList.add("ativa");

    }

    // CADASTRO
    else {

        login.style.display = "none";
        cadastro.style.display = "block";

        tabCadastro.classList.add("ativa");
    }
}

// ===============================
// 🔔 AVISO
// ===============================
function mostrarAviso(msg) {

    const aviso =
    document.createElement("div");

    aviso.innerText = msg;

    aviso.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #198754;
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        z-index: 9999;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        font-weight: bold;
    `;

    document.body.appendChild(aviso);

    setTimeout(() => {
        aviso.remove();
    }, 3000);
}

// ===============================
// 🎠 CARROSSEL
// ===============================
function scrollCarrossel(id, direcao) {

    const container =
    document.getElementById(id);

    const distancia = 260;

    container.scrollBy({
        left: distancia * direcao,
        behavior: "smooth"
    });
}

// ===============================
// 🚀 INICIALIZAÇÃO
// ===============================

window.onload = async () => {

    atualizarContador();

    await verificarUsuario();

    carregarProdutosSupabase();
};
function abrirConta() {

    const nome =
    document.getElementById("user-name").innerText;

    // SE NÃO ESTIVER LOGADO
    if (nome === "Entrar") {

        abrirLogin();

    }

    // SE ESTIVER LOGADO
    else {

        abrirPerfil();
    }
}

