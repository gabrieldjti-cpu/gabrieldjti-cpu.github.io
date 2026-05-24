// =========================
// 🔥 CONFIGURAÇÃO SUPABASE
// =========================
const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';
const supabaseKey = 'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// =========================
// 🔐 VERIFICAR ADMIN (CORRIGIDO)
// =========================
async function verificarAdmin() {
    // Busca o usuário logado no sistema de localStorage customizado
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));
    const adminEmail = 'gabrieldj.ti@gmail.com';

    // 1. Se não houver nenhum usuário logado
    if (!usuarioLogado) {
        mostrarAviso('🔒 Faça login como administrador primeiro.', 'aviso');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return false;
    }

    // 2. Se houver usuário, mas o e-mail não for o master admin
    if (!usuarioLogado.email || usuarioLogado.email.toLowerCase().trim() !== adminEmail) {
        mostrarAviso('❌ Acesso negado! Você não é um administrador.', 'erro');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return false;
    }

    // Acesso autorizado!
    console.log("👑 Painel Admin liberado para:", usuarioLogado.nome);
    return true;
}

// =========================
// ➕ SALVAR PRODUTO
// =========================
// VARIÁVEL GLOBAL (Coloque no topo do arquivo, logo após a configuração do Supabase)
let idProdutoEmEdicao = null; 

// ===================================
// ➕ SALVAR / 🔄 ATUALIZAR PRODUTO
// ===================================
async function salvarProduto() {
    const nome = document.getElementById('nome').value.trim();
    const preco = document.getElementById('preco').value;
    const preco_antigo = document.getElementById('preco_antigo').value;
    const desconto = document.getElementById('desconto').value.trim();
    const img = document.getElementById('imagem').value.trim();
    const categoria = document.getElementById('categoria').value;

    if (!nome || !preco || !img || !categoria || desconto === '') {
        mostrarAviso('⚠️ Preencha os campos obrigatórios.', 'aviso');
        return;
    }

    const dadosProduto = {
        nome: nome,
        preco: Number(preco),
        preco_antigo: preco_antigo ? Number(preco_antigo) : 0,
        desconto: desconto,
        img: img,
        categoria: categoria
    };

    // SE ESTIVER EM MODO DE EDIÇÃO
    if (idProdutoEmEdicao) {
        const { error } = await supabaseClient
            .from('produtos')
            .update(dadosProduto)
            .eq('id', idProdutoEmEdicao);

        if (error) {
            mostrarAviso("❌ Erro ao atualizar produto: " + error.message, "erro");
            return;
        }

        mostrarAviso('✏️ Produto atualizado com sucesso!', 'sucesso');
        
        // Reseta o botão para o modo de cadastro normal
        idProdutoEmEdicao = null;
        const btnSalvar = document.querySelector('.box .btn');
        if (btnSalvar) btnSalvar.innerText = "Salvar Produto";

    } else {
        // MODO DE CADASTRO NORMAL (INSERIR NOVO)
        const { error } = await supabaseClient
            .from('produtos')
            .insert([dadosProduto]);

        if (error) {
            mostrarAviso("❌ Erro ao salvar produto: " + error.message, "erro");
            return;
        }

        mostrarAviso('✅ Produto cadastrado com sucesso!', 'sucesso');
    }

    limparFormulario();
    carregarProdutos();
}

// =========================
// 📦 LISTAR PRODUTOS
// =========================
async function carregarProdutos() {
    const { data, error } = await supabaseClient
        .from('produtos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        mostrarAviso("❌ Erro ao carregar produtos: " + error.message, "erro");
        return;
    }

    const container = document.getElementById('lista-produtos');
    if (!container) return;
    
    container.innerHTML = '';

    data.forEach(produto => {
        container.innerHTML += `
            <div class="card">
                <img src="${produto.img}" alt="${produto.nome}">
                <h3>${produto.nome}</h3>
                <div class="preco">R$ ${Number(produto.preco).toFixed(2)}</div>
                <div class="preco-antigo">R$ ${Number(produto.preco_antigo).toFixed(2)}</div>
                <div class="desconto">-${produto.desconto}%</div>
                <p>Categoria: ${produto.categoria}</p>
                <div class="acoes">
                    <button class="btn-editar" onclick="editarProduto('${produto.id}')">Editar</button>
                    <button class="btn-excluir" onclick="excluirProduto('${produto.id}')">Excluir</button>
                </div>
            </div>
        `;
    });
}

// =========================
// ❌ EXCLUIR PRODUTO
// =========================
async function excluirProduto(id) {
    const confirmar = confirm('Deseja realmente excluir esse produto?');
    if (!confirmar) return;

    const { error } = await supabaseClient
        .from('produtos')
        .delete()
        .eq('id', id);

    if (error) {
        mostrarAviso("❌ Erro ao excluir: " + error.message, "erro");
        return;
    }

    mostrarAviso('🗑️ Produto excluído com sucesso!', 'sucesso');
    carregarProdutos();
}

// ===================================
// ✏️ PREPARAR EDIÇÃO DO PRODUTO (NOVA)
// ===================================
async function editarProduto(id) {
    // 1. Busca os dados completos desse produto direto no Supabase
    const { data: produto, error } = await supabaseClient
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single(); // Traz apenas um objeto em vez de uma lista

    if (error || !produto) {
        mostrarAviso("❌ Erro ao buscar dados do produto: " + error.message, "erro");
        return;
    }

    // 2. Preenche os inputs lá do topo da página com os dados do banco
    document.getElementById('nome').value = produto.nome;
    document.getElementById('preco').value = produto.preco;
    document.getElementById('preco_antigo').value = produto.preco_antigo;
    document.getElementById('desconto').value = produto.desconto;
    document.getElementById('imagem').value = produto.img;
    document.getElementById('categoria').value = produto.categoria;

    // 3. Salva o ID que estamos editando na nossa variável global
    idProdutoEmEdicao = id;

    // 4. Altera visualmente o botão principal para o usuário saber que está editando
    const btnSalvar = document.querySelector('.box .btn');
    if (btnSalvar) {
        btnSalvar.innerText = "🔄 Atualizar Produto";
        // Rola a página suavemente lá para o topo onde fica o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
// =========================
// 🛒 CARREGAR PEDIDOS
// =========================
async function carregarPedidos() {
    const { data, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao buscar pedidos:", error);
        return;
    }

    const container = document.getElementById('lista-pedidos');
    if (!container) return;

    container.innerHTML = '';

    data.forEach(pedido => {
        let produtosHTML = '';

        if (pedido.produtos && Array.isArray(pedido.produtos)) {
            pedido.produtos.forEach(produto => {
                produtosHTML += `
                    <li>
                        <strong>${produto.nome}</strong> (${produto.quantidade}x)
                    </li>
                `;
            });
        }

        container.innerHTML += `
            <div class="pedido-card">
                <h3 style="font-size: 13px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Pedido: ${pedido.id}</h3>
                <p>👤 <strong>Cliente:</strong> ${pedido.cliente}</p>
                <p>📞 <strong>Telefone:</strong> ${pedido.telefone || 'Não informado'}</p>
                <p>📍 <strong>Endereço:</strong> ${pedido.endereco}</p>
                <p>💳 <strong>Pagamento:</strong> ${pedido.pagamento}</p>
                <p>💰 <strong>Total:</strong> R$ ${Number(pedido.total).toFixed(2)}</p>
                <p>📦 <strong>Status Atual:</strong> <span class="status-tag">${pedido.status}</span></p>
                
                <div style="margin: 10px 0;">
                    <strong>Itens do Pedido:</strong>
                    <ul>${produtosHTML}</ul>
                </div>

                <select onchange="atualizarStatus('${pedido.id}', this.value)">
                    <option value="" disabled selected>Alterar Status para...</option>
                    <option value="Recebido">Recebido</option>
                    <option value="Preparando">Preparando</option>
                    <option value="Saiu para entrega">Saiu para entrega</option>
                    <option value="Entregue">Entregue</option>
                </select>
            </div>
        `;
    });
}

// =========================
// 🔄 ATUALIZAR STATUS DO PEDIDO
// =========================
async function atualizarStatus(id, novoStatus) {
    if (!novoStatus) return;

    const { error } = await supabaseClient
        .from('pedidos')
        .update({ status: novoStatus })
        .eq('id', id);

    if (error) {
        mostrarAviso("❌ Erro ao mudar status: " + error.message, "erro");
        return;
    }

    mostrarAviso(`🔄 Status atualizado com sucesso!`, 'sucesso');
    carregarPedidos();
}

// =========================
// 🧹 LIMPAR FORMULÁRIO
// =========================
function limparFormulario() {
    document.getElementById('nome').value = '';
    document.getElementById('preco').value = '';
    document.getElementById('preco_antigo').value = '';
    document.getElementById('desconto').value = '';
    document.getElementById('imagem').value = '';
    document.getElementById('categoria').value = '';
    
    // Se o usuário limpar o formulário, cancela o modo de edição
    idProdutoEmEdicao = null;
    const btnSalvar = document.querySelector('.box .btn');
    if (btnSalvar) btnSalvar.innerText = "Salvar Produto";
}

// ==========================================
// 🚀 INICIALIZAÇÃO ÚNICA E SEGURA (CORRIGIDA)
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // Adicionado async/await corretamente para segurar o carregamento da tela
    const dutoLiberado = await verificarAdmin();
    
    // Se NÃO for admin, interrompe a execução aqui imediatamente e impede o carregamento dos dados
    if (!dutoLiberado) {
        return;
    }
    
    // Só carrega os dados se passar na validação acima
    carregarProdutos();
    carregarPedidos();
});

// ===============================
// 🔔 AVISO (COR, DESIGN E TIPOS DINÂMICOS)
// ===============================
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