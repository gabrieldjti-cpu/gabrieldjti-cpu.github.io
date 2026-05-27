// =================================================================
// 🔗 CONFIGURAÇÃO SUPABASE (OBRIGATÓRIO PARA ESTA PÁGINA)
// =================================================================
const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';
const supabaseKey = 'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';

// Cria o cliente do Supabase específico para o Painel ADM
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variável global para controlar se estamos editando um produto
let idProdutoEmEdicao = null;

// Executa assim que a página do Painel ADM termina de carregar
document.addEventListener("DOMContentLoaded", () => {
    carregarPedidosAdmin();
    carregarProdutosAdmin();
});

// =================================================================
// 🛒 1. GERENCIAMENTO DE PEDIDOS (MUDAR STATUS)
// =================================================================

async function carregarPedidosAdmin() {
    const container = document.getElementById("lista-pedidos");
    if (!container) return;

    container.innerHTML = "<p>Carregando pedidos...</p>";

    const { data: pedidos, error } = await _supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar pedidos:", error);
        container.innerHTML = "<p style='color:red;'>Erro ao carregar pedidos.</p>";
        return;
    }

    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = "<p>Nenhum pedido recebido até o momento. 🛍️</p>";
        return;
    }

    container.innerHTML = "";

    pedidos.forEach(pedido => {
        let corStatus = "#ffc107"; 
        if (pedido.status === "Saiu para entrega") corStatus = "#0d6efd";
        if (pedido.status === "Entregue") corStatus = "#198754";
        if (pedido.status === "Cancelado") corStatus = "#dc3545";

        let itensHTML = "";
        if (Array.isArray(pedido.produtos)) {
            pedido.produtos.forEach(p => {
                itensHTML += `<li>${p.quantidade}x - ${p.nome} (R$ ${Number(p.preco).toFixed(2)})</li>`;
            });
        }

        container.innerHTML += `
            <div class="card-pedido-admin" style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 15px; background: #fff; color: #333; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span><strong>Cliente:</strong> ${pedido.cliente}</span>
                    <span style="background: ${corStatus}; color: white; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 12px;">
                        ${pedido.status || 'Recebido'}
                    </span>
                </div>
                <p style="margin: 5px 0;"><strong>Telefone:</strong> ${pedido.telefone}</p>
                <p style="margin: 5px 0;"><strong>Endereço:</strong> ${pedido.endereco}</p>
                <p style="margin: 5px 0;"><strong>Forma de Pagamento:</strong> ${pedido.pagamento}</p>
                
                <div style="background: #f9f9f9; padding: 10px; border-radius: 6px; margin: 10px 0;">
                    <strong style="font-size: 13px;">🛒 Itens do Pedido:</strong>
                    <ul style="margin: 5px 0 0 15px; padding: 0; font-size: 13px; color: #555;">
                        ${itensHTML}
                    </ul>
                </div>
                
                <p style="font-size: 16px; color: #198754; font-weight: bold; margin-bottom: 12px;">
                    Total: R$ ${Number(pedido.total).toFixed(2)}
                </p>

                <div class="acoes-status" style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="atualizarStatusPedido('${pedido.id}', 'Saiu para entrega')" style="background: #0d6efd; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">
                        🚚 Saiu para Entrega
                    </button>
                    <button onclick="atualizarStatusPedido('${pedido.id}', 'Entregue')" style="background: #198754; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">
                        ✅ Entregue
                    </button>
                    <button onclick="atualizarStatusPedido('${pedido.id}', 'Cancelado')" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;
    });
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
// 📦 2. GERENCIAMENTO DE ESTOQUE (LISTAR, EDITAR E EXCLUIR)
// =================================================================

async function carregarProdutosAdmin() {
    const container = document.getElementById("lista-produtos");
    if (!container) return;

    container.innerHTML = "<p>Carregando estoque...</p>";

    const { data: produtos, error } = await _supabase
        .from("produtos")
        .select("*");

    if (error) {
        console.error("Erro ao carregar estoque:", error);
        container.innerHTML = "<p style='color:red;'>Erro ao carregar estoque.</p>";
        return;
    }

    if (!produtos || produtos.length === 0) {
        container.innerHTML = "<p>Nenhum produto cadastrado no banco. 🏪</p>";
        return;
    }

    container.innerHTML = "";

    produtos.forEach(produto => {
        // Criamos uma string segura com os dados do produto para passar na função de editar
        const produtoJSON = JSON.stringify(produto).replace(/'/g, "\\'");

        container.innerHTML += `
            <div class="item-produto-admin" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #eee; padding: 10px 0; gap: 10px; text-align: left;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${produto.img}" alt="${produto.nome}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                    <div>
                        <h4 style="margin: 0; font-size: 14px; color: #333;">${produto.nome}</h4>
                        <small style="color: gray; text-transform: uppercase;">Categoria: ${produto.categoria}</small>
                        <div style="font-weight: bold; color: #198754; font-size: 13px; margin-top: 2px;">
                            R$ ${Number(produto.preco).toFixed(2)}
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 5px;">
                    <button onclick='prepararEdicao(${produtoJSON})' style="background: #ffc107; color: #333; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">
                        ✏️ Editar
                    </button>
                    <button onclick="excluirProdutoAdmin('${produto.id}', '${produto.nome}')" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `;
    });
}

// Função que joga os dados do produto selecionado de volta para o formulário
function prepararEdicao(produto) {
    idProdutoEmEdicao = produto.id; // Guarda o ID do produto que está sendo editado

    // Preenche os campos do formulário na tela
    document.getElementById("nome").value = produto.nome || "";
    document.getElementById("preco").value = produto.preco || "";
    document.getElementById("preco_antigo").value = produto.preco_antigo || "";
    document.getElementById("desconto").value = produto.desconto || "";
    document.getElementById("imagem").value = produto.img || "";
    document.getElementById("categoria").value = produto.categoria || "";

    // Altera visualmente o botão principal do formulário para o usuário saber que está editando
    const btnSalvar = document.querySelector("button[onclick='salvarProduto()']");
    if (btnSalvar) {
        btnSalvar.innerText = "🔄 Atualizar Produto";
        btnSalvar.style.background = "#ffc107";
        btnSalvar.style.color = "#333";
    }

    // Rola a página suavemente até o formulário de cadastro lá em cima
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirProdutoAdmin(idProduto, nomeProduto) {
    const confirmar = confirm(`Tem certeza que deseja apagar o produto "${nomeProduto}" do sistema?`);
    if (!confirmar) return;

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

// =================================================================
// ➕ 3. FUNÇÃO INTELIGENTE PARA SALVAR OU ATUALIZAR PRODUTO
// =================================================================
async function salvarProduto() {
    const nome = document.getElementById("nome").value.trim();
    const preco = document.getElementById("preco").value;
    const preco_antigo = document.getElementById("preco_antigo").value;
    const desconto = document.getElementById("desconto").value.trim();
    const imagem = document.getElementById("imagem").value.trim();
    const categoria = document.getElementById("categoria").value;

    if (!nome || !preco || !imagem) {
        alert("⚠️ Por favor, preencha pelo menos o Nome, Preço e URL da imagem.");
        return;
    }

    const dadosProduto = {
        nome: nome,
        preco: Number(preco),
        preco_antigo: preco_antigo ? Number(preco_antigo) : 0,
        desconto: desconto ? Number(desconto) : 0,
        img: imagem,
        categoria: categoria
    };

    if (idProdutoEmEdicao) {
        // Se a variável global tiver um ID, significa que estamos EDITANDO um produto existente
        const { error } = await _supabase
            .from("produtos")
            .update(dadosProduto)
            .eq("id", idProdutoEmEdicao);

        if (error) {
            alert("❌ Erro ao atualizar produto: " + error.message);
            return;
        }
        alert("✅ Produto atualizado com sucesso!");
    } else {
        // Se não tiver ID, é um CADASTRO de um produto novo
        const { error } = await _supabase
            .from("produtos")
            .insert([dadosProduto]);

        if (error) {
            alert("❌ Erro ao salvar produto: " + error.message);
            return;
        }
        alert("✅ Produto adicionado com sucesso!");
    }

    // Reseta o estado do formulário para o padrão de cadastro de novo produto
    idProdutoEmEdicao = null;
    
    document.getElementById("nome").value = "";
    document.getElementById("preco").value = "";
    document.getElementById("preco_antigo").value = "";
    document.getElementById("desconto").value = "";
    document.getElementById("imagem").value = "";

    const btnSalvar = document.querySelector("button[onclick='salvarProduto()']");
    if (btnSalvar) {
        btnSalvar.innerText = "Salvar Produto";
        btnSalvar.style.background = ""; // Volta para a cor original do CSS
        btnSalvar.style.color = "";
    }
    
    // Recarrega a lista do estoque atualizada
    carregarProdutosAdmin();
}