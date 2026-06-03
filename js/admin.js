// =================================================================
// 🔗 CONFIGURAÇÃO SUPABASE
// =================================================================
const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';
const supabaseKey = 'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let idProdutoEmEdicao = null;
let todosProdutos = [];
let todosPedidos = [];

const CORES_STATUS = {
    Recebido: "#ffc107",
    "Saiu para entrega": "#0d6efd",
    Entregue: "#198754",
    Cancelado: "#dc3545",
    Preparando: "#17a2b8"
};

document.addEventListener("DOMContentLoaded", () => {
    carregarPedidosAdmin();
    carregarProdutosAdmin();
});

function escaparHtml(texto) {
    if (texto == null) return "";
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// =================================================================
// 🛒 PEDIDOS
// =================================================================

async function carregarPedidosAdmin() {
    const container = document.getElementById("lista-pedidos");
    if (!container) return;

    container.innerHTML = '<p class="admin-msg">Carregando pedidos...</p>';

    const { data: pedidos, error } = await _supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        container.innerHTML = '<p class="admin-msg admin-erro">Erro ao carregar pedidos.</p>';
        return;
    }

    todosPedidos = pedidos || [];
    atualizarResumoPedidos();
    filtrarPedidosAdmin();
}

function atualizarResumoPedidos() {
    const resumo = document.getElementById("resumo-pedidos");
    const contador = document.getElementById("contador-pedidos");
    if (!resumo) return;

    const total = todosPedidos.length;
    const recebidos = todosPedidos.filter(p => (p.status || "Recebido") === "Recebido").length;
    const emEntrega = todosPedidos.filter(p => p.status === "Saiu para entrega").length;
    const entregues = todosPedidos.filter(p => p.status === "Entregue").length;

    if (contador) contador.textContent = total;

    resumo.innerHTML = `
        <div class="chip-resumo"><span class="chip-num">${total}</span><span class="chip-label">Total</span></div>
        <div class="chip-resumo chip-amarelo"><span class="chip-num">${recebidos}</span><span class="chip-label">Recebidos</span></div>
        <div class="chip-resumo chip-azul"><span class="chip-num">${emEntrega}</span><span class="chip-label">Em entrega</span></div>
        <div class="chip-resumo chip-verde"><span class="chip-num">${entregues}</span><span class="chip-label">Entregues</span></div>
    `;
}

function filtrarPedidosAdmin() {
    const container = document.getElementById("lista-pedidos");
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
        container.innerHTML = '<p class="admin-msg">Nenhum pedido encontrado com esses filtros.</p>';
        return;
    }

    container.innerHTML = pedidos.map(pedido => {
        const status = pedido.status || "Recebido";
        const corStatus = CORES_STATUS[status] || "#6c757d";
        const dataPedido = new Date(pedido.created_at).toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
        const idCurto = (pedido.id || "").substring(0, 8).toUpperCase();
        const qtdItens = Array.isArray(pedido.produtos) ? pedido.produtos.length : 0;
        const resumoItens = Array.isArray(pedido.produtos)
            ? pedido.produtos.map(p => `${p.quantidade}x ${p.nome}`).join(" · ")
            : "Sem detalhes";

        let itensHTML = "";
        if (Array.isArray(pedido.produtos)) {
            itensHTML = pedido.produtos.map(p =>
                `<li><span>${escaparHtml(p.quantidade)}x ${escaparHtml(p.nome)}</span><strong>R$ ${(p.preco * p.quantidade).toFixed(2)}</strong></li>`
            ).join("");
        }

        const aberto = status === "Recebido" || status === "Saiu para entrega" ? " open" : "";

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
                            <span class="pedido-total-breve">R$ ${Number(pedido.total).toFixed(2)}</span>
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
                    <ul class="pedido-itens-lista">${itensHTML}</ul>
                    <div class="acoes-status">
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
    const { error } = await _supabase
        .from("pedidos")
        .update({ status: novoStatus })
        .eq("id", idPedido);

    if (error) {
        alert("Erro ao atualizar status: " + error.message);
        return;
    }

    carregarPedidosAdmin();
}

// =================================================================
// 📦 PRODUTOS
// =================================================================

async function carregarProdutosAdmin() {
    const container = document.getElementById("lista-produtos");
    if (!container) return;

    container.innerHTML = '<p class="admin-msg">Carregando estoque...</p>';

    const { data: produtos, error } = await _supabase
        .from("produtos")
        .select("*")
        .order("nome", { ascending: true });

    if (error) {
        container.innerHTML = '<p class="admin-msg admin-erro">Erro ao carregar estoque.</p>';
        return;
    }

    todosProdutos = produtos || [];
    document.getElementById("contador-produtos").textContent = todosProdutos.length;
    filtrarProdutosAdmin();
}

function filtrarProdutosAdmin() {
    const termo = (document.getElementById("busca-produto")?.value || "").trim().toLowerCase();
    const categoria = document.getElementById("filtro-categoria-produto")?.value || "";

    let filtrados = [...todosProdutos];

    if (categoria) {
        filtrados = filtrados.filter(p => p.categoria === categoria);
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
    const container = document.getElementById("lista-produtos");
    const contador = document.getElementById("contador-produtos");

    if (contador) {
        contador.textContent = produtos.length === todosProdutos.length
            ? todosProdutos.length
            : `${produtos.length}/${todosProdutos.length}`;
    }

    if (produtos.length === 0) {
        container.innerHTML = '<p class="admin-msg">Nenhum produto encontrado.</p>';
        return;
    }

    container.innerHTML = produtos.map(produto => {
        const produtoJSON = JSON.stringify(produto).replace(/'/g, "\\'");
        const nomeEsc = escaparHtml(produto.nome);

        return `
            <article class="produto-admin-card">
                <img src="${escaparHtml(produto.img)}" alt="${nomeEsc}" loading="lazy">
                <div class="produto-admin-info">
                    <h4>${nomeEsc}</h4>
                    <span class="tag-categoria">${escaparHtml(produto.categoria)}</span>
                    <p class="produto-admin-preco">R$ ${Number(produto.preco).toFixed(2)}</p>
                </div>
                <div class="produto-admin-acoes">
                    <button type="button" class="btn-mini btn-editar-mini" onclick='prepararEdicao(${produtoJSON})'>✏️ Editar</button>
                    <button type="button" class="btn-mini btn-excluir-mini" onclick="excluirProdutoAdmin('${produto.id}')">🗑️</button>
                </div>
            </article>
        `;
    }).join("");
}

function prepararEdicao(produto) {
    idProdutoEmEdicao = produto.id;

    document.getElementById("nome").value = produto.nome || "";
    document.getElementById("preco").value = produto.preco || "";
    document.getElementById("preco_antigo").value = produto.preco_antigo || "";
    document.getElementById("desconto").value = produto.desconto || "";
    document.getElementById("imagem").value = produto.img || "";
    document.getElementById("categoria").value = produto.categoria || "";

    const btnSalvar = document.querySelector("button[onclick='salvarProduto()']");
    if (btnSalvar) {
        btnSalvar.innerText = "🔄 Atualizar Produto";
        btnSalvar.classList.add("btn-editando");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function excluirProdutoAdmin(idProduto) {
    const produto = todosProdutos.find(p => p.id === idProduto);
    const nome = produto?.nome || "este produto";
    if (!confirm(`Tem certeza que deseja apagar "${nome}"?`)) return;

    const { error } = await _supabase
        .from("produtos")
        .delete()
        .eq("id", idProduto);

    if (error) {
        alert("Erro ao excluir produto: " + error.message);
        return;
    }

    carregarProdutosAdmin();
}

async function salvarProduto() {
    const nome = document.getElementById("nome").value.trim();
    const preco = document.getElementById("preco").value;
    const preco_antigo = document.getElementById("preco_antigo").value;
    const desconto = document.getElementById("desconto").value.trim();
    const imagem = document.getElementById("imagem").value.trim();
    const categoria = document.getElementById("categoria").value;

    if (!nome || !preco || !imagem) {
        alert("⚠️ Preencha pelo menos Nome, Preço e URL da imagem.");
        return;
    }

    const dadosProduto = {
        nome,
        preco: Number(preco),
        preco_antigo: preco_antigo ? Number(preco_antigo) : 0,
        desconto: desconto ? Number(desconto) : 0,
        img: imagem,
        categoria
    };

    if (idProdutoEmEdicao) {
        const { error } = await _supabase
            .from("produtos")
            .update(dadosProduto)
            .eq("id", idProdutoEmEdicao);

        if (error) {
            alert("❌ Erro ao atualizar: " + error.message);
            return;
        }
        alert("✅ Produto atualizado!");
    } else {
        const { error } = await _supabase
            .from("produtos")
            .insert([dadosProduto]);

        if (error) {
            alert("❌ Erro ao salvar: " + error.message);
            return;
        }
        alert("✅ Produto adicionado!");
    }

    idProdutoEmEdicao = null;
    document.getElementById("nome").value = "";
    document.getElementById("preco").value = "";
    document.getElementById("preco_antigo").value = "";
    document.getElementById("desconto").value = "";
    document.getElementById("imagem").value = "";

    const btnSalvar = document.querySelector("button[onclick='salvarProduto()']");
    if (btnSalvar) {
        btnSalvar.innerText = "Salvar Produto";
        btnSalvar.classList.remove("btn-editando");
    }

    carregarProdutosAdmin();
}
