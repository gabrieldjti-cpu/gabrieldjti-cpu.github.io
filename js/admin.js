// =================================================================
// 🔗 CONFIGURAÇÃO SUPABASE UNIFICADA
// =================================================================
const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';
const supabaseKey = 'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variáveis de estado globais
let idProdutoEmEdicao = null;
let todosProdutos = [];
let todosPedidos = [];
let lojistaAtual = null; 
let ehAdminMaster = false; 

const CORES_STATUS = {
    Recebido: "#ffc107",
    Preparando: "#17a2b8",
    "Saiu para entrega": "#0d6efd",
    Saiu: "#0d6efd",
    Entregue: "#198754",
    Cancelado: "#dc3545"
};

// Recupera a sessão com tratamento de erros
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

// =================================================================
// 🚀 INICIALIZAÇÃO E SEGURANÇA
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
    lojistaAtual = obterUsuarioLogado();

    // 1️⃣ VERIFICAÇÃO MASTER: Dá acesso total ao e-mail do admin geral
    if (lojistaAtual && lojistaAtual.email === "gabrieldj.ti@gmail.com") {
        ehAdminMaster = true;
        console.log("👑 Modo Administrador Master Ativo - Acesso total concedido.");
    } 
    // 2️⃣ VALIDAÇÃO DE ACESSO: exige que exista um id de estabelecimento/lojista (ou seja master)
    if (!lojistaAtual) {
        alert("⚠️ Acesso restrito. Faça login como lojista para acessar o painel.");
        window.location.href = "index.html?abrirLogin=true"; 
        return;
    }

    // Define se é master com base no e-mail
    if (!ehAdminMaster && (!lojistaAtual.id_lojista && !lojistaAtual.id_estabelecimento && !lojistaAtual.id_loja_ativa)) {
        alert("⚠️ Acesso restrito. Faça login como lojista para acessar o painel.");
        window.location.href = "index.html?abrirLogin=true"; 
        return;
    }

    // Normaliza o ID da loja ativa de forma uniforme baseado na sua modelagem (prioriza id_loja_ativa se já presente)
    if (!ehAdminMaster && lojistaAtual) {
        lojistaAtual.id_loja_ativa = lojistaAtual.id_loja_ativa || lojistaAtual.id_estabelecimento || lojistaAtual.id_lojista;
    }

    // Define textualmente o título do painel baseado em quem logou
    const tituloPainel = document.getElementById("nome-loja-titulo");
    if (tituloPainel && lojistaAtual) {
        tituloPainel.innerText = ehAdminMaster ? "Painel Master Geral" : (lojistaAtual.nome_loja || lojistaAtual.nome || "Minha Loja");
    }

    console.log("🏪 Painel carregado para:", ehAdminMaster ? "Todas as Lojas (Master)" : (lojistaAtual ? lojistaAtual.id_loja_ativa : "Nenhuma"));

    // Carrega a carga de dados inicial da tela
    carregarPedidosAdmin();
    carregarProdutosAdmin();
    gerarLinkDivulgacao();
});

// Controle dinâmico das abas laterais do painel
function mudarAbaAdmin(idAba, botaoClicado) {
    document.querySelectorAll('.aba-painel').forEach(aba => aba.classList.remove('ativa'));
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('ativo'));
    
    const abaAlvo = document.getElementById(idAba);
    if (abaAlvo) abaAlvo.classList.add('ativa');
    if (botaoClicado) botaoClicado.classList.add('ativo');

    if (idAba === 'aba-pedidos') carregarPedidosAdmin();
    if (idAba === 'aba-produtos') carregarProdutosAdmin();
}

function deslogarLojista() {
    localStorage.removeItem("usuario_logado");
    window.location.href = 'index.html';
}

// Link de divulgação rápido do estabelecimento
function gerarLinkDivulgacao() {
    const inputLink = document.getElementById("link-loja-input");
    if (inputLink) {
        if (ehAdminMaster) {
            inputLink.value = "Visão Master - Sem link específico";
            inputLink.disabled = true;
            return;
        }
        const urlBase = window.location.origin; 
        inputLink.value = `${urlBase}/index.html?loja=${lojistaAtual.id_loja_ativa}`;
    }
}

function copiarLinkLoja() {
    if (ehAdminMaster) return;
    const inputLink = document.getElementById("link-loja-input");
    if (inputLink) {
        inputLink.select();
        inputLink.setSelectionRange(0, 99999); 
        navigator.clipboard.writeText(inputLink.value);
        alert("🚀 Link copiado! Agora você pode colar nas suas redes sociais.");
    }
}

function atualizarDashboard() {
    const contadorProdutosDash = document.getElementById("contador-produtos-dashboard");
    const contadorPedidosDash = document.getElementById("contador-pedidos-dashboard");
    const faturamentoDash = document.getElementById("faturamento-total");
    
    const totalProdutos = todosProdutos.length;
    const totalPedidos = todosPedidos.length;
    const faturamentoTotal = todosPedidos.reduce((soma, pedido) => {
        const total = Number(pedido.total || 0);
        return soma + (Number.isNaN(total) ? 0 : total);
    }, 0);

    if (contadorProdutosDash) contadorProdutosDash.textContent = totalProdutos;
    if (contadorPedidosDash) contadorPedidosDash.textContent = totalPedidos;
    if (faturamentoDash) faturamentoDash.textContent = `R$ ${faturamentoTotal.toFixed(2)}`;
}

function escaparHtml(texto) {
    if (texto == null) return "";
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =================================================================
// 🛒 GERENCIAMENTO DE PEDIDOS
// =================================================================
async function carregarPedidosAdmin() {
    const container = document.getElementById("lista-pedidos") || document.getElementById("tabela-pedidos-corpo");
    if (!container) return;

    if (container.tagName === "TBODY") {
        container.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carregando pedidos...</td></tr>';
    } else {
        container.innerHTML = '<p class="admin-msg">Carregando pedidos...</p>';
    }

    let query = _supabase.from("pedidos").select("*");
    
    if (!ehAdminMaster) {
        query = query.eq("id_lojista", lojistaAtual.id_loja_ativa);
    }

    const { data: pedidos, error } = await query.order("created_at", { ascending: false });

    if (error) {
        if (container.tagName === "TBODY") {
            container.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Erro ao carregar pedidos.</td></tr>';
        } else {
            container.innerHTML = '<p class="admin-msg admin-erro">Erro ao carregar pedidos.</p>';
        }
        return;
    }

    todosPedidos = pedidos || [];
    atualizarResumoPedidos();
    filtrarPedidosAdmin();
}

function atualizarResumoPedidos() {
    const resumo = document.getElementById("resumo-pedidos");
    const contador = document.getElementById("contador-pedidos");
    if (!resumo) {
        atualizarDashboard();
        return;
    }

    const total = todosPedidos.length;
    const recebidos = todosPedidos.filter(p => (p.status || "Recebido") === "Recebido").length;
    const emEntrega = todosPedidos.filter(p => p.status === "Saiu para entrega" || p.status === "Saiu").length;
    const entregues = todosPedidos.filter(p => p.status === "Entregue").length;

    if (contador) contador.textContent = total;
    atualizarDashboard();

    resumo.innerHTML = `
        <div class="chip-resumo"><span class="chip-num">${total}</span><span class="chip-label">Total</span></div>
        <div class="chip-resumo chip-amarelo"><span class="chip-num">${recebidos}</span><span class="chip-label">Recebidos</span></div>
        <div class="chip-resumo chip-azul"><span class="chip-num">${emEntrega}</span><span class="chip-label">Em entrega</span></div>
        <div class="chip-resumo chip-verde"><span class="chip-num">${entregues}</span><span class="chip-label">Entregues</span></div>
    `;
}

function filtrarPedidosAdmin() {
    const container = document.getElementById("lista-pedidos") || document.getElementById("tabela-pedidos-corpo");
    if (!container) return;

    const termo = (document.getElementById("busca-pedido")?.value || "").trim().toLowerCase();
    const statusFiltro = document.getElementById("filtro-status-pedido")?.value || "";

    let filtrados = [...todosPedidos];

    if (statusFiltro) {
        filtrados = filtrados.filter(p => (p.status || "Recebido") === statusFiltro);
    }

    if (termo) {
        filtrados = filtrados.filter(p => {
            const idCurto = (p.id || "").toLowerCase();
            const cliente = (p.cliente || "").toLowerCase();
            const tel = (p.telefone || "").toLowerCase();
            return idCurto.includes(termo) || cliente.includes(termo) || tel.includes(termo);
        });
    }

    renderizarPedidos(filtrados, container);
}

function renderizarPedidos(pedidos, container) {
    if (!container) return;

    if (pedidos.length === 0) {
        if (container.tagName === "TBODY") {
            container.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #999;">Nenhum pedido localizado com estes filtros.</td></tr>`;
        } else {
            container.innerHTML = '<p class="admin-msg">Nenhum pedido encontrado com esses filtros.</p>';
        }
        return;
    }

    // Suporta renderização em formato Tabela Tradicional (Se o elemento HTML for um TBODY)
    if (container.tagName === "TBODY") {
        container.innerHTML = pedidos.map(pedido => {
            const resumoProdutos = Array.isArray(pedido.produtos) 
                ? pedido.produtos.map(p => `${p.quantidade}x ${p.nome}`).join("<br>")
                : "Lista indisponível";

            return `
                <tr>
                    <td><strong>${escaparHtml(pedido.cliente || "Anônimo")}</strong><br><small>${escaparHtml(pedido.telefone || "")}</small></td>
                    <td>${resumoProdutos}</td>
                    <td><small>${escaparHtml(pedido.endereco || "Balcão")}</small></td>
                    <td><strong>R$ ${Number(pedido.total).toFixed(2)}</strong></td>
                    <td><span style="text-transform: capitalize">${escaparHtml(pedido.pagamento || "Não informado")}</span></td>
                    <td>
                        <select class="select-status status-${pedido.status}" onchange="atualizarStatusPedido('${pedido.id}', this.value)" style="padding: 5px; border-radius: 4px;">
                            <option value="Recebido" ${pedido.status === 'Recebido' ? 'selected' : ''}>🟡 Recebido</option>
                            <option value="Preparando" ${pedido.status === 'Preparando' ? 'selected' : ''}>🔵 Preparando</option>
                            <option value="Saiu para entrega" ${pedido.status === 'Saiu para entrega' || pedido.status === 'Saiu' ? 'selected' : ''}>🚚 Saiu p/ Entrega</option>
                            <option value="Entregue" ${pedido.status === 'Entregue' ? 'selected' : ''}>🟢 Entregue</option>
                            <option value="Cancelado" ${pedido.status === 'Cancelado' ? 'selected' : ''}>❌ Cancelado</option>
                        </select>
                    </td>
                </tr>
            `;
        }).join("");
        return;
    }

    // Suporta renderização em formato de Cards Expansíveis (Se for uma DIV genérica)
    container.innerHTML = pedidos.map(pedido => {
        const status = pedido.status || "Recebido";
        const corStatus = CORES_STATUS[status] || "#6c757d";
        const dataPedido = new Date(pedido.created_at).toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
        const idCurto = (pedido.id || "").substring(0, 8).toUpperCase();
        const qtdItens = Array.isArray(pedido.produtos) ? pedido.produtos.length : 0;
        const resumoItens = Array.isArray(pedido.produtos)
            ? pedido.produtos.map(p => `${p.quantidade}x ${p.nome}`).join(" · ")
            : "Sem detalhes";

        let itemsHTML = "";
        if (Array.isArray(pedido.produtos)) {
            itemsHTML = pedido.produtos.map(p =>
                `<li><span>${escaparHtml(p.quantidade)}x ${escaparHtml(p.nome)}</span><strong>R$ ${(p.preco * p.quantidade).toFixed(2)}</strong></li>`
            ).join("");
        }

        const aberto = status === "Recebido" || status === "Preparando" ? " open" : "";

        return `
            <details class="pedido-acordeao"${aberto}>
                <summary class="pedido-acordeao-cabecalho">
                    <div class="pedido-linha-principal">
                        <div class="pedido-info-breve">
                            <span class="pedido-id">#${idCurto}</span>
                            <strong class="pedido-cliente">${escaparHtml(pedido.cliente)}</strong>
                            <span class="pedido-meta">${dataPedido} · ${qtdItens} item(ns)</span>
                        </div>
                        <div class="pedido-linha-direita">
                            <span class="status-pill" style="background:${corStatus}">${escaparHtml(status)}</span>
                            <strong class="pedido-total-breve">R$ ${Number(pedido.total).toFixed(2)}</strong>
                        </div>
                    </div>
                    <p class="pedido-resumo-itens">${escaparHtml(resumoItens)}</p>
                </summary>
                <div class="pedido-acordeao-corpo">
                    <div class="pedido-detalhes-grid">
                        <div><span class="label-detalhe">Telefone</span><p>${escaparHtml(pedido.telefone)}</p></div>
                        <div><span class="label-detalhe">Pagamento</span><p>${escaparHtml(pedido.pagamento)}</p></div>
                        <div class="pedido-endereco-full"><span class="label-detalhe">Endereço</span><p>${escaparHtml(pedido.endereco)}</p></div>
                    </div>
                    <ul class="pedido-itens-lista">${itemsHTML}</ul>
                    <div class="acoes-status">
                        <button type="button" class="btn-status btn-preparar" onclick="atualizarStatusPedido('${pedido.id}', 'Preparando')">🔵 Preparando</button>
                        <button type="button" class="btn-status btn-entrega" onclick="atualizarStatusPedido('${pedido.id}', 'Saiu para entrega')">🚚 Saiu para entrega</button>
                        <button type="button" class="btn-status btn-ok" onclick="atualizarStatusPedido('${pedido.id}', 'Entregue')">✅ Entregue</button>
                        <button type="button" class="btn-status btn-cancelar" onclick="atualizarStatusPedido('${pedido.id}', 'Cancelado')">❌ Cancelar</button>
                    </div>
                </div>
            </details>
        `;
    }).join("");
}

async function atualizarStatusPedido(idPedido, novoStatus) {
    let query = _supabase.from("pedidos").update({ status: novoStatus }).eq("id", idPedido);

    if (!ehAdminMaster) {
        query = query.eq("id_lojista", lojistaAtual.id_loja_ativa);
    }

    const { error } = await query;

    if (error) {
        alert("❌ Erro ao atualizar status: " + error.message);
        return;
    }

    carregarPedidosAdmin();
}

// =================================================================
// 📦 GERENCIAMENTO DE PRODUTOS
// =================================================================
async function carregarProdutosAdmin() {
    const container = document.getElementById("lista-produtos") || document.getElementById("tabela-produtos-corpo");
    if (!container) return;

    if (container.tagName === "TBODY") {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando estoque...</td></tr>';
    } else {
        container.innerHTML = '<p class="admin-msg">Carregando estoque...</p>';
    }

    let query = _supabase.from("produtos").select("*");

    // 🎯 FILTRO POR LOJA: Se não for o Admin Geral, filtra estritamente pelos produtos desta loja
    if (!ehAdminMaster && lojistaAtual && lojistaAtual.id_loja_ativa) {
        query = query.eq("id_lojista", lojistaAtual.id_loja_ativa);
    } else if (!ehAdminMaster) {
        // Proteção caso o ID por algum motivo não esteja carregado no localStorage
        console.warn("⚠️ ID da loja ativa não encontrado para filtrar os produtos.");
        if (container.tagName === "TBODY") {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center; color:orange;">Faça login novamente para carregar seus produtos.</td></tr>';
        } else {
            container.innerHTML = '<p class="admin-msg">Faça login novamente para carregar seus produtos.</p>';
        }
        return;
    }

    const { data: produtos, error } = await query.order("nome", { ascending: true });

    if (error) {
        if (container.tagName === "TBODY") {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar catálogo.</td></tr>';
        } else {
            container.innerHTML = '<p class="admin-msg admin-erro">Erro ao carregar estoque.</p>';
        }
        return;
    }

    todosProdutos = produtos || [];
    const contadorProdutos = document.getElementById("contador-produtos");
    if (contadorProdutos) contadorProdutos.textContent = todosProdutos.length;
    atualizarDashboard();
    filtrarProdutosAdmin();
}

function filtrarProdutosAdmin() {
    const termo = (document.getElementById("busca-produto")?.value || "").trim().toLowerCase();
    const category = document.getElementById("filtro-categoria-produto")?.value || "";

    let filtrados = [...todosProdutos];

    if (category) {
        filtrados = filtrados.filter(p => p.categoria === category);
    }

    if (termo) {
        filtrados = filtrados.filter(p => {
            const nome = (p.nome || "").toLowerCase();
            const cat = (p.categoria || "").toLowerCase();
            return nome.includes(termo) || cat.includes(termo);
        });
    }

    renderizarProdutos(filtrados);
}

function renderizarProdutos(produtos) {
    const container = document.getElementById("lista-produtos") || document.getElementById("tabela-produtos-corpo");
    if (!container) return;
    
    const contador = document.getElementById("contador-produtos");
    if (contador) {
        contador.textContent = produtos.length === todosProdutos.length
            ? todosProdutos.length
            : `${produtos.length}/${todosProdutos.length}`;
    }

    if (produtos.length === 0) {
        if (container.tagName === "TBODY") {
            container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#999;">Nenhum item localizado na vitrine.</td></tr>`;
        } else {
            container.innerHTML = '<p class="admin-msg">Nenhum produto encontrado.</p>';
        }
        return;
    }

    // Suporta tabela clássica estruturada
    if (container.tagName === "TBODY") {
        container.innerHTML = produtos.map(prod => {
            const urlImagem = prod.img || prod.imagem || '';
            return `
                <tr>
                    <td><img src="${escaparHtml(urlImagem)}" width="40" height="40" style="object-fit:cover; border-radius:4px;"></td>
                    <td><strong>${escaparHtml(prod.nome)}</strong></td>
                    <td>R$ ${Number(prod.preco).toFixed(2)}</td>
                    <td style="text-transform: capitalize;">${escaparHtml(prod.categoria)}</td>
                    <td>
                        <button type="button" onclick="prepararEdicaoDireta('${prod.id}')" style="background:none; border:none; color:#0d6efd; cursor:pointer; font-weight:bold; margin-right:10px;">✏️ Editar</button>
                        <button type="button" onclick="excluirProdutoAdmin('${prod.id}')" style="background:none; border:none; color:#dc3545; cursor:pointer; font-weight:bold;">🗑️ Excluir</button>
                    </td>
                </tr>
            `;
        }).join("");
        return;
    }

    // Suporta cards visuais para interfaces responsivas
    container.innerHTML = produtos.map(produto => {
        const nomeEsc = escaparHtml(produto.nome);
        const urlImagem = produto.imagem || produto.img || '';
        const produtoAtributo = btoa(unescape(encodeURIComponent(JSON.stringify(produto))));

        return `
            <article class="produto-admin-card">
                <img src="${escaparHtml(urlImagem)}" alt="${nomeEsc}" loading="lazy" style="width:70px; height:70px; object-fit:cover; border-radius:6px;">
                <div class="produto-admin-info">
                    <h4>${nomeEsc}</h4>
                    <span class="tag-categoria">${escaparHtml(produto.categoria)}</span>
                    <p class="produto-admin-preco">R$ ${Number(produto.preco).toFixed(2)}</p>
                </div>
                <div class="produto-admin-acoes">
                    <button type="button" class="btn-mini btn-editar-mini" onclick="prepararEdicaoDecodificada('${produtoAtributo}')">✏️ Editar</button>
                    <button type="button" class="btn-mini btn-excluir-mini" onclick="excluirProdutoAdmin('${produto.id}')">🗑️</button>
                </div>
            </article>
        `;
    }).join("");
}

function prepararEdicaoDecodificada(base64String) {
    try {
        const objJson = decodeURIComponent(escape(atob(base64String)));
        const produto = JSON.parse(objJson);
        prepararEdicao(produto);
    } catch(e) {
        console.error("Erro ao decodificar produto para edição", e);
    }
}

function prepararEdicaoDireta(idProduto) {
    const produto = todosProdutos.find(p => p.id === idProduto);
    if (produto) prepararEdicao(produto);
}

function prepararEdicao(produto) {
    idProdutoEmEdicao = produto.id;

    // Preenche os inputs se eles existirem no formulário (suporta ambos formatos de IDs do HTML)
    const inputs = {
        nome: ["nome", "prod-nome"],
        preco: ["preco", "prod-preco"],
        preco_antigo: ["preco_antigo", "prod-preco-antigo"],
        desconto: ["desconto", "prod-desconto"],
        imagem: ["imagem", "prod-img"],
        categoria: ["categoria", "prod-categoria"]
    };

    for (const chave in inputs) {
        inputs[chave].forEach(idHTML => {
            const el = document.getElementById(idHTML);
            if (el) {
                if (chave === "imagem") el.value = produto.imagem || produto.img || "";
                else el.value = produto[chave] || "";
            }
        });
    }

    const tituloForm = document.getElementById("titulo-form-produto");
    if(tituloForm) tituloForm.innerHTML = "🔄 Editar Produto";

    const btnSalvar = document.getElementById("btn-salvar") || document.querySelector("button[onclick='salvarProduto()']");
    if (btnSalvar) {
        btnSalvar.innerText = "🔄 Atualizar Produto";
        btnSalvar.style.background = "#0d6efd";
    }

    const btnCancelar = document.getElementById("btn-cancelar-edicao");
    if(btnCancelar) btnCancelar.style.display = "inline-block";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelarEdicao() {
    idProdutoEmEdicao = null;
    
    const idsParaLimpar = ["nome", "prod-nome", "preco", "prod-preco", "preco_antigo", "prod-preco-antigo", "desconto", "prod-desconto", "imagem", "prod-img"];
    idsParaLimpar.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const cat1 = document.getElementById("categoria"); if(cat1) cat1.value = "index";
    const cat2 = document.getElementById("prod-categoria"); if(cat2) cat2.value = "";

    const tituloForm = document.getElementById("titulo-form-produto");
    if(tituloForm) tituloForm.innerHTML = "➕ Adicionar Produto";

    const btnSalvar = document.getElementById("btn-salvar") || document.querySelector("button[onclick='salvarProduto()']");
    if (btnSalvar) {
        btnSalvar.innerText = "Salvar Produto";
        btnSalvar.style.background = ""; 
    }

    const btnCancelar = document.getElementById("btn-cancelar-edicao");
    if(btnCancelar) btnCancelar.style.display = "none";
}

async function excluirProdutoAdmin(idProduto) {
    const produto = todosProdutos.find(p => p.id === idProduto);
    const nome = produto?.nome || "este produto";
    if (!confirm(`Tem certeza que deseja apagar "${nome}" da sua vitrine?`)) return;

    let query = _supabase.from("produtos").delete().eq("id", idProduto);

    if (!ehAdminMaster) {
        query = query.eq("id_lojista", lojistaAtual.id_loja_ativa);
    }

    const { error } = await query;

    if (error) {
        alert("❌ Erro ao excluir produto: " + error.message);
        return;
    }

    carregarProdutosAdmin();
}

async function salvarProduto() {
    // Captura os valores aceitando os dois padrões de ID de formulário do seu HTML
    const nome = (document.getElementById("nome")?.value || document.getElementById("prod-nome")?.value || "").trim();
    const preco = document.getElementById("preco")?.value || document.getElementById("prod-preco")?.value;
    const preco_antigo = document.getElementById("preco_antigo")?.value || document.getElementById("prod-preco-antigo")?.value;
    const desconto = (document.getElementById("desconto")?.value || document.getElementById("prod-desconto")?.value || "").trim();
    const imagem = (document.getElementById("imagem")?.value || document.getElementById("prod-img")?.value || "").trim();
    const categoria = document.getElementById("categoria")?.value || document.getElementById("prod-categoria")?.value;

    if (!nome || !preco || !imagem) {
        alert("⚠️ Preencha pelo menos Nome, Preço e URL da imagem.");
        return;
    }

    // Define qual ID de lojista será associado ao produto
    const sess = obterUsuarioLogado();
    let lojistaIdFinal = null;
    if (!ehAdminMaster) {
        lojistaIdFinal = sess?.id_loja_ativa || sess?.id_estabelecimento || sess?.id_lojista || null;
        if (!lojistaIdFinal) {
            alert('❌ Não foi possível identificar a loja associada. Faça login novamente.');
            return;
        }
    } else if (ehAdminMaster && !idProdutoEmEdicao) {
        const { data: ests } = await _supabase.from("estabelecimentos").select("id").limit(1);
        if (ests && ests.length > 0) {
            lojistaIdFinal = ests[0].id;
        }
    }

    // Objeto limpo apenas com as colunas que existem no seu banco (evitando erro de cache do 'imagem')
    const dadosProduto = {
        nome,
        preco: Number(preco),
        preco_antigo: preco_antigo ? Number(preco_antigo) : 0,
        desconto: desconto ? Number(desconto) : 0,
        img: imagem, // Usa a coluna correta do seu banco de dados
        categoria
    };

    // Vincula o ID da loja se for um produto novo
    if (!idProdutoEmEdicao) {
        dadosProduto.id_lojista = lojistaIdFinal;
    }

    if (idProdutoEmEdicao) {
        let query = _supabase.from("produtos").update(dadosProduto).eq("id", idProdutoEmEdicao);

        if (!ehAdminMaster && lojistaAtual) {
            query = query.eq("id_lojista", lojistaAtual.id_loja_ativa);
        }

        const { error } = await query;

        if (error) {
            alert("❌ Erro ao atualizar: " + error.message);
            return;
        }
        alert("✅ Produto atualizado com sucesso!");
    } else {
        const { error } = await _supabase.from("produtos").insert([dadosProduto]);

        if (error) {
            alert("❌ Erro ao salvar: " + error.message);
            return;
        }
        alert("✅ Produto adicionado à sua loja!");
    }

    cancelarEdicao();
    carregarProdutosAdmin();
}

// Vincula o evento de submit se houver um formulário HTML estruturado na página
document.addEventListener("DOMContentLoaded", () => {
    const formNovoProd = document.getElementById("form-novo-produto");
    if (formNovoProd) {
        formNovoProd.addEventListener("submit", (e) => {
            e.preventDefault();
            salvarProduto();
        });
    }
});