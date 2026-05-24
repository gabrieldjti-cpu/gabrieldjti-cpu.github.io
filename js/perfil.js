// ==========================================
// 🔥 CONFIGURAÇÃO DO SUPABASE
// ==========================================
const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';
const supabaseKey = 'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Executa assim que a página carrega
document.addEventListener("DOMContentLoaded", () => {
    carregarDadosEHistorico();
});

async function carregarDadosEHistorico() {
    // 1. Pega o usuário logado no localStorage do navegador
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));

    if (!usuarioLogado) {
        alert("🔒 Você precisa estar logado para ver seu perfil.");
        window.location.href = "index.html";
        return;
    }

    // 2. BUSCA DADOS ATUALIZADOS DO USUÁRIO DIRECTO DA TABELA 'USUARIOS'
    const { data: userDB, error: userError } = await supabaseClient
        .from("usuarios")
        .select("*")
        .eq("id", usuarioLogado.id)
        .single();

    if (!userError && userDB) {
        // Alimenta a tela com as informações oficiais do cadastro
        document.getElementById("perf-nome").innerText = userDB.nome || "Cliente";
        document.getElementById("perf-email").innerText = userDB.email || "";
        document.getElementById("perf-telefone").innerText = userDB.telefone || "Não informado";
        document.getElementById("perf-endereco-detalhado").innerText = userDB.endereco || "Não informado";
    } else {
        // Caso ocorra erro ou falha na tabela de usuários, usa o localStorage como contingência inicial
        document.getElementById("perf-nome").innerText = usuarioLogado.nome || "Cliente";
        document.getElementById("perf-email").innerText = usuarioLogado.email || "";
    }

    // 3. BUSCAR HISTÓRICO DE PEDIDOS NO SUPABASE
    // Filtramos os pedidos onde o 'id_usuario' pertence a quem está logado
    const { data: pedidos, error } = await supabaseClient
        .from("pedidos")
        .select("*")
        .eq("id_usuario", usuarioLogado.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao buscar histórico:", error);
        document.getElementById("historico-compras").innerHTML = "<p>❌ Erro ao carregar histórico de pedidos.</p>";
        return;
    }

    const containerPedidos = document.getElementById("historico-compras");
    if (pedidos.length === 0) {
        containerPedidos.innerHTML = "<p style='color: #6c757d;'>Você ainda não fez nenhuma compra no nosso mercado. 🛒</p>";
        return;
    }

    // Limpa o texto de "Carregando..."
    containerPedidos.innerHTML = "";

    // 4. RENDERIZAR OS PEDIDOS NA TELA
    pedidos.forEach(pedido => {
        // Formata a data de criação para o padrão brasileiro
        const dataFormatada = new Date(pedido.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Monta a listagem dos produtos comprados nesse loop
        let produtosHTML = "";
        if (pedido.produtos && Array.isArray(pedido.produtos)) {
            pedido.produtos.forEach(prod => {
                produtosHTML += `<li>${prod.nome} (${prod.quantidade}x) - R$ ${Number(prod.preco).toFixed(2)}</li>`;
            });
        }

        // Caso o usuário não tenha telefone/endereço no cadastro, tenta puxar do histórico como alternativa
        const telTela = document.getElementById("perf-telefone").innerText;
        const endTela = document.getElementById("perf-endereco-detalhado").innerText;

        if (telTela === "Não informado" && pedido.telefone) {
            document.getElementById("perf-telefone").innerText = pedido.telefone;
        }
        if (endTela === "Não informado" && pedido.endereco) {
            document.getElementById("perf-endereco-detalhado").innerText = pedido.endereco;
        }

        // Injeta o bloco visual de cada pedido no histórico
        containerPedidos.innerHTML += `
            <div class="pedido-historico">
                <span class="status-badge status-${pedido.status?.replace(/ /g, '')}">${pedido.status || 'Recebido'}</span>
                <strong style="color: #198754;">Pedido Realizado em: ${dataFormatada}</strong>
                <p style="font-size: 12px; color: #6c757d; margin: 5px 0;">Código: ${pedido.id}</p>
                
                <div style="margin: 10px 0; padding-left: 15px; border-left: 2px solid #e0e0e0;">
                    <ul style="margin: 0; padding-left: 15px; font-size: 14px;">
                        ${produtosHTML}
                    </ul>
                </div>
                
                <p style="margin: 5px 0 0 0; font-weight: bold; text-align: right;">Total: R$ ${Number(pedido.total).toFixed(2)}</p>
            </div>
        `;
    });
}

// Função de Logout
function fazerLogout() {
    localStorage.removeItem("usuario_logado");
    alert("🚪 Conta desconectada com sucesso!");
    window.location.href = "index.html";
}
// Funções de Controle do Modal
function abrirModalEditar() {
    const nomeAtual = document.getElementById("perf-nome").innerText;
    const telAtual = document.getElementById("perf-telefone").innerText;
    const endAtual = document.getElementById("perf-endereco-detalhado").innerText;

    document.getElementById("edit-nome").value = nomeAtual;
    document.getElementById("edit-telefone").value = telAtual === "Não informado" ? "" : telAtual;
    document.getElementById("edit-endereco").value = endAtual === "Não informado" ? "" : endAtual;

    document.getElementById("modal-editar-perfil").style.display = "flex";
}

function fecharModalEditar() {
    document.getElementById("modal-editar-perfil").style.display = "none";
}

// FUNÇÃO PARA SALVAR NO BANCO DE DADOS
async function salvarEdicaoPerfil() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));
    
    const novoNome = document.getElementById("edit-nome").value.trim();
    const novoTel = document.getElementById("edit-telefone").value.trim();
    const novoEnd = document.getElementById("edit-endereco").value.trim();

    if (!novoNome) {
        alert("⚠️ O nome é obrigatório.");
        return;
    }

    // 1. Atualiza no Supabase (Tabela usuarios)
    const { error } = await supabaseClient
        .from("usuarios")
        .update({ 
            nome: novoNome,
            telefone: novoTel,
            endereco: novoEnd 
        })
        .eq("id", usuarioLogado.id);

    if (error) {
        alert("❌ Erro ao salvar dados: " + error.message);
        return;
    }

    // 2. Atualiza o LocalStorage para refletir a mudança no site todo imediatamente
    usuarioLogado.nome = novoNome;
    // Opcional: se salvar telefone e endereço no localStorage também
    localStorage.setItem("usuario_logado", JSON.stringify(usuarioLogado));

    // 3. Atualiza a tela sem precisar dar F5
    document.getElementById("perf-nome").innerText = novoNome;
    document.getElementById("perf-telefone").innerText = novoTel || "Não informado";
    document.getElementById("perf-endereco-detalhado").innerText = novoEnd || "Não informado";

    alert("✅ Perfil atualizado com sucesso!");
    fecharModalEditar();
}