// ==========================================
// 🔥 CONFIGURAÇÃO DO SUPABASE
// ==========================================
const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';
const supabaseKey = 'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
let enderecoUsuarioAtual = "";

// Mesmo formato usado no checkout (script.js)
function parseEndereco(endereco) {
    const vazio = { rua: "", numero: "", bairro: "", cidade: "" };
    if (!endereco || endereco === "Não informado") return vazio;

    try {
        const partes = endereco.split(", ");
        const rua = partes[0] || "";
        const numBairro = partes[1] ? partes[1].split(" - Bairro: ") : [];
        const numero = numBairro[0] ? numBairro[0].replace("Nº ", "").trim() : "";
        const bairroCidade = numBairro[1] ? numBairro[1].split(", ") : [];
        return {
            rua,
            numero,
            bairro: bairroCidade[0] || "",
            cidade: bairroCidade[1] || ""
        };
    } catch (e) {
        return { rua: endereco, numero: "", bairro: "", cidade: "" };
    }
}

function montarEndereco(rua, numero, bairro, cidade) {
    return `${rua}, Nº ${numero} - Bairro: ${bairro}, ${cidade}`;
}

function atualizarResumoEndereco(enderecoStr) {
    const container = document.getElementById("perf-endereco-resumo");
    const partes = parseEndereco(enderecoStr);

    if (!partes.rua && !partes.numero && !partes.bairro && !partes.cidade) {
        container.innerHTML = '<span class="vazio">Não informado</span>';
        return;
    }

    container.innerHTML = `
        <span><strong>Rua:</strong> ${partes.rua || "—"}</span>
        <span><strong>Nº:</strong> ${partes.numero || "—"}</span>
        <span><strong>Bairro:</strong> ${partes.bairro || "—"}</span>
        <span><strong>Cidade:</strong> ${partes.cidade || "—"}</span>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
    carregarDadosEHistorico();
});

async function carregarDadosEHistorico() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));

    if (!usuarioLogado) {
        alert("🔒 Você precisa estar logado para ver seu perfil.");
        window.location.href = "index.html";
        return;
    }

    const { data: userDB, error: userError } = await supabaseClient
        .from("usuarios")
        .select("*")
        .eq("id", usuarioLogado.id)
        .single();

    if (!userError && userDB) {
        document.getElementById("perf-nome").innerText = userDB.nome || "Cliente";
        document.getElementById("perf-email").innerText = userDB.email || "";
        document.getElementById("perf-telefone").innerText = userDB.telefone || "Não informado";
        enderecoUsuarioAtual = userDB.endereco || "";
        atualizarResumoEndereco(enderecoUsuarioAtual);
    } else {
        document.getElementById("perf-nome").innerText = usuarioLogado.nome || "Cliente";
        document.getElementById("perf-email").innerText = usuarioLogado.email || "";
    }

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

    containerPedidos.innerHTML = "";

    pedidos.forEach(pedido => {
        const dataFormatada = new Date(pedido.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

        let produtosHTML = "";
        if (pedido.produtos && Array.isArray(pedido.produtos)) {
            pedido.produtos.forEach(prod => {
                produtosHTML += `<li>${prod.nome} (${prod.quantidade}x) - R$ ${Number(prod.preco).toFixed(2)}</li>`;
            });
        }

        const telTela = document.getElementById("perf-telefone").innerText;
        const resumoEnd = document.getElementById("perf-endereco-resumo");
        const enderecoVazio = resumoEnd.querySelector(".vazio");

        if (telTela === "Não informado" && pedido.telefone) {
            document.getElementById("perf-telefone").innerText = pedido.telefone;
        }
        if (enderecoVazio && pedido.endereco) {
            enderecoUsuarioAtual = pedido.endereco;
            atualizarResumoEndereco(enderecoUsuarioAtual);
        }

        containerPedidos.innerHTML += `
            <div class="pedido-historico">
                <span class="status-badge status-${pedido.status?.replace(/ /g, "")}">${pedido.status || "Recebido"}</span>
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

function fazerLogout() {
    localStorage.removeItem("usuario_logado");
    alert("🚪 Conta desconectada com sucesso!");
    window.location.href = "index.html";
}

function abrirModalEditar() {
    const nomeAtual = document.getElementById("perf-nome").innerText;
    const telAtual = document.getElementById("perf-telefone").innerText;
    const partes = parseEndereco(enderecoUsuarioAtual);

    document.getElementById("edit-nome").value = nomeAtual === "Cliente" ? "" : nomeAtual;
    document.getElementById("edit-telefone").value = telAtual === "Não informado" ? "" : telAtual;
    document.getElementById("edit-rua").value = partes.rua;
    document.getElementById("edit-numero").value = partes.numero;
    document.getElementById("edit-bairro").value = partes.bairro;
    document.getElementById("edit-cidade").value = partes.cidade;

    document.getElementById("modal-editar-perfil").style.display = "flex";
}

function fecharModalEditar() {
    document.getElementById("modal-editar-perfil").style.display = "none";
}

async function salvarEdicaoPerfil() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario_logado"));

    const novoNome = document.getElementById("edit-nome").value.trim();
    const novoTel = document.getElementById("edit-telefone").value.trim();
    const rua = document.getElementById("edit-rua").value.trim();
    const numero = document.getElementById("edit-numero").value.trim();
    const bairro = document.getElementById("edit-bairro").value.trim();
    const cidade = document.getElementById("edit-cidade").value.trim();

    if (!novoNome) {
        alert("⚠️ Informe seu nome completo.");
        return;
    }

    const temAlgumEndereco = rua || numero || bairro || cidade;
    const temEnderecoCompleto = rua && numero && bairro && cidade;

    if (temAlgumEndereco && !temEnderecoCompleto) {
        alert("⚠️ Preencha todos os campos do endereço (rua, número, bairro e cidade).");
        return;
    }

    const novoEnd = temEnderecoCompleto ? montarEndereco(rua, numero, bairro, cidade) : "";

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

    usuarioLogado.nome = novoNome;
    if (novoEnd) usuarioLogado.endereco = novoEnd;
    localStorage.setItem("usuario_logado", JSON.stringify(usuarioLogado));

    enderecoUsuarioAtual = novoEnd;
    document.getElementById("perf-nome").innerText = novoNome;
    document.getElementById("perf-telefone").innerText = novoTel || "Não informado";
    atualizarResumoEndereco(novoEnd);

    alert("✅ Perfil atualizado com sucesso!");
    fecharModalEditar();
}
