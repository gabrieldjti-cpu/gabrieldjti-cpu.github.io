// ==========================================
// ADMIN-DASHBOARD.JS
// Comércio da Cidade
// RF-23 — Gestão de Lojas
// ==========================================

let lojasAdmin = [];
let acaoMotivoAdmin = null;
let timerBuscaAdmin = null;

const STATUS_ADMIN = {
    pendente: {
        rotulo: "Pendente",
        classe: "status-pendente",
        icone: "fa-clock"
    },
    aprovada: {
        rotulo: "Aprovada",
        classe: "status-aprovada",
        icone: "fa-circle-check"
    },
    rejeitada: {
        rotulo: "Rejeitada",
        classe: "status-rejeitada",
        icone: "fa-circle-xmark"
    },
    suspensa: {
        rotulo: "Suspensa",
        classe: "status-suspensa",
        icone: "fa-ban"
    }
};


document.addEventListener("DOMContentLoaded", iniciarDashboardAdmin);


async function iniciarDashboardAdmin() {
    if (!window.db) {
        mostrarEstadoAdmin(
            "fa-triangle-exclamation",
            "Não foi possível conectar",
            "Atualize a página e tente novamente."
        );
        avisarAdmin("Não foi possível conectar ao sistema.", "erro", "Erro de conexão");
        return;
    }

    const { data: sessaoData, error: sessaoError } =
        await window.db.auth.getSession();

    if (sessaoError || !sessaoData?.session) {
        window.location.href = "login.html";
        return;
    }

    const { data: admin, error: adminError } =
        await window.db.rpc("sou_admin");

    if (adminError) {
        console.error("Erro ao verificar administrador:", adminError);
        avisarAdmin(
            "Não foi possível validar sua permissão administrativa.",
            "erro",
            "Erro de permissão"
        );
        return;
    }

    if (admin !== true) {
        mostrarEstadoAdmin(
            "fa-lock",
            "Acesso restrito",
            "Esta área é exclusiva para administradores da plataforma."
        );

        avisarAdmin(
            "Esta área é exclusiva para administradores.",
            "aviso",
            "Acesso restrito"
        );

        setTimeout(() => {
            window.location.href = "perfil.html";
        }, 1600);

        return;
    }

    configurarEventosAdmin();
    await atualizarDashboardAdmin();
}


function configurarEventosAdmin() {
    const busca = document.getElementById("buscaLojasAdmin");
    const status = document.getElementById("filtroStatusAdmin");
    const atualizar = document.getElementById("btnAtualizarAdmin");
    const sair = document.getElementById("btnSairAdmin");
    const motivo = document.getElementById("motivoStatusLoja");
    const confirmarMotivo = document.getElementById("btnConfirmarMotivo");

    busca?.addEventListener("input", () => {
        clearTimeout(timerBuscaAdmin);
        timerBuscaAdmin = setTimeout(carregarLojasAdmin, 320);
    });

    status?.addEventListener("change", carregarLojasAdmin);

    atualizar?.addEventListener("click", async () => {
        atualizar.disabled = true;
        const original = atualizar.innerHTML;
        atualizar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando';

        await atualizarDashboardAdmin();

        atualizar.disabled = false;
        atualizar.innerHTML = original;
    });

    sair?.addEventListener("click", sairDoAdmin);

    motivo?.addEventListener("input", () => {
        const contador = document.getElementById("contadorMotivo");
        if (contador) contador.textContent = String(motivo.value.length);
    });

    confirmarMotivo?.addEventListener("click", confirmarMotivoStatusAdmin);

    document.querySelectorAll("[data-fechar-modal]").forEach(elemento => {
        elemento.addEventListener("click", () => {
            fecharModalAdmin(elemento.dataset.fecharModal);
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            fecharModalAdmin("detalhes");
            fecharModalAdmin("motivo");
        }
    });
}


async function atualizarDashboardAdmin() {
    await Promise.all([
        carregarResumoAdmin(),
        carregarLojasAdmin()
    ]);
}


async function carregarResumoAdmin() {
    try {
        const { data, error } = await window.db.rpc("resumo_admin");
        if (error) throw error;

        definirTextoAdmin("metricaUsuarios", data?.usuarios_ativos ?? 0);
        definirTextoAdmin("metricaLojas", data?.lojas_total ?? 0);
        definirTextoAdmin("metricaPendentes", data?.lojas_pendentes ?? 0);
        definirTextoAdmin("metricaPedidos", data?.pedidos_total ?? 0);
    } catch (erro) {
        console.error("Erro ao carregar resumo administrativo:", erro);
        ["metricaUsuarios", "metricaLojas", "metricaPendentes", "metricaPedidos"]
            .forEach(id => definirTextoAdmin(id, "—"));
    }
}


async function carregarLojasAdmin() {
    const lista = document.getElementById("listaLojasAdmin");
    const status = document.getElementById("filtroStatusAdmin")?.value || null;
    const busca = document.getElementById("buscaLojasAdmin")?.value?.trim() || null;

    if (lista) {
        lista.innerHTML = `
            <div class="estado-admin">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <h3>Carregando lojas...</h3>
            </div>
        `;
    }

    try {
        const { data, error } = await window.db.rpc("listar_lojas_admin", {
            p_status: status,
            p_busca: busca
        });

        if (error) throw error;

        lojasAdmin = Array.isArray(data) ? data : [];
        renderizarLojasAdmin();
    } catch (erro) {
        console.error("Erro ao listar lojas:", erro);

        mostrarEstadoAdmin(
            "fa-triangle-exclamation",
            "Não foi possível carregar as lojas",
            "Tente atualizar o painel."
        );

        avisarAdmin(
            "Não foi possível carregar as lojas.",
            "erro",
            "Erro ao carregar"
        );
    }
}


function renderizarLojasAdmin() {
    const lista = document.getElementById("listaLojasAdmin");
    const textoResultado = document.getElementById("textoResultadoAdmin");

    if (textoResultado) {
        textoResultado.textContent = lojasAdmin.length === 1
            ? "1 loja encontrada"
            : `${lojasAdmin.length} lojas encontradas`;
    }

    if (!lista) return;

    if (lojasAdmin.length === 0) {
        lista.innerHTML = `
            <div class="estado-admin">
                <i class="fa-solid fa-store-slash"></i>
                <h3>Nenhuma loja encontrada</h3>
                <p>Altere os filtros ou aguarde novos cadastros.</p>
            </div>
        `;
        return;
    }

    lista.innerHTML = lojasAdmin.map(criarCardLojaAdmin).join("");
    configurarErrosLogoAdmin();
}


function criarCardLojaAdmin(loja) {
    const status = STATUS_ADMIN[loja.status_aprovacao] || STATUS_ADMIN.pendente;
    const id = escaparAtributoAdmin(loja.id || "");
    const nome = escaparHTMLAdmin(loja.nome || "Loja");
    const proprietario = escaparHTMLAdmin(loja.proprietario_nome || "Não informado");
    const categoria = escaparHTMLAdmin(loja.categoria || "Sem categoria");
    const cidade = escaparHTMLAdmin(loja.cidade || "Não informada");
    const totalProdutos = Number(loja.total_produtos || 0);
    const totalPedidos = Number(loja.total_pedidos || 0);

    const logo = loja.logo_url
        ? `
            <img
                src="${escaparAtributoAdmin(loja.logo_url)}"
                alt="Logo da ${nome}"
                class="loja-logo-admin"
                loading="lazy"
            >
            <div class="loja-logo-placeholder-admin" hidden>
                <i class="fa-solid fa-store"></i>
            </div>
        `
        : `
            <div class="loja-logo-placeholder-admin">
                <i class="fa-solid fa-store"></i>
            </div>
        `;

    const motivo = loja.motivo_rejeicao
        ? `<p class="loja-motivo-atual"><strong>Motivo:</strong> ${escaparHTMLAdmin(loja.motivo_rejeicao)}</p>`
        : "";

    return `
        <article class="loja-admin-card" data-loja-id="${id}">
            <div class="loja-admin-topo">
                <div class="loja-identidade">
                    ${logo}
                    <div>
                        <h3>${nome}</h3>
                        <p>${categoria} • ${cidade}</p>
                    </div>
                </div>

                <span class="status-admin ${status.classe}">
                    <i class="fa-solid ${status.icone}"></i>
                    ${status.rotulo}
                </span>
            </div>

            <div class="loja-admin-dados">
                <div class="loja-admin-dado">
                    <small>Proprietário</small>
                    <strong>${proprietario}</strong>
                </div>
                <div class="loja-admin-dado">
                    <small>Produtos</small>
                    <strong>${totalProdutos}</strong>
                </div>
                <div class="loja-admin-dado">
                    <small>Pedidos</small>
                    <strong>${totalPedidos}</strong>
                </div>
                <div class="loja-admin-dado">
                    <small>Cadastrada em</small>
                    <strong>${formatarDataAdmin(loja.criado_em)}</strong>
                </div>
            </div>

            ${motivo}

            <div class="loja-admin-acoes">
                <button type="button" class="btn-admin btn-claro" onclick="verDetalhesLojaAdmin('${id}')">
                    <i class="fa-solid fa-eye"></i>
                    Detalhes
                </button>
                ${acoesStatusLojaAdmin(loja)}
            </div>
        </article>
    `;
}


function acoesStatusLojaAdmin(loja) {
    const id = escaparAtributoAdmin(loja.id || "");

    if (loja.status_aprovacao === "pendente") {
        return `
            <button type="button" class="btn-admin btn-primario" onclick="mudarStatusLojaAdmin('${id}', 'aprovada')">
                <i class="fa-solid fa-check"></i> Aprovar
            </button>
            <button type="button" class="btn-admin btn-perigo" onclick="abrirModalMotivoStatus('${id}', 'rejeitada')">
                <i class="fa-solid fa-xmark"></i> Rejeitar
            </button>
        `;
    }

    if (loja.status_aprovacao === "aprovada") {
        return `
            <button type="button" class="btn-admin btn-aviso" onclick="abrirModalMotivoStatus('${id}', 'suspensa')">
                <i class="fa-solid fa-ban"></i> Suspender
            </button>
        `;
    }

    return `
        <button type="button" class="btn-admin btn-primario" onclick="mudarStatusLojaAdmin('${id}', 'aprovada')">
            <i class="fa-solid fa-check"></i> Aprovar
        </button>
        <button type="button" class="btn-admin btn-claro" onclick="mudarStatusLojaAdmin('${id}', 'pendente')">
            <i class="fa-solid fa-clock-rotate-left"></i> Reabrir análise
        </button>
    `;
}


async function mudarStatusLojaAdmin(lojaId, novoStatus, motivo = null) {
    const loja = lojasAdmin.find(item => item.id === lojaId);
    if (!loja) return;

    const config = STATUS_ADMIN[novoStatus] || { rotulo: novoStatus };

    if (novoStatus === "aprovada" || novoStatus === "pendente") {
        const confirmou = await confirmarAdmin({
            titulo: novoStatus === "aprovada" ? "Aprovar esta loja?" : "Reabrir análise?",
            mensagem: novoStatus === "aprovada"
                ? `A loja “${loja.nome}” ficará disponível para os clientes.`
                : `A loja “${loja.nome}” voltará ao status pendente.`,
            textoConfirmar: novoStatus === "aprovada" ? "Aprovar" : "Confirmar"
        });

        if (!confirmou) return;
    }

    try {
        const { error } = await window.db.rpc("alterar_status_loja_admin", {
            p_loja_id: lojaId,
            p_status: novoStatus,
            p_motivo: motivo
        });

        if (error) throw error;

        fecharModalAdmin("motivo");

        avisarAdmin(
            `Loja atualizada para ${String(config.rotulo).toLowerCase()}.`,
            "sucesso",
            "Status atualizado"
        );

        await atualizarDashboardAdmin();
    } catch (erro) {
        console.error("Erro ao alterar status da loja:", erro);
        avisarAdmin(
            erro?.message || "Não foi possível alterar o status da loja.",
            "erro",
            "Erro ao atualizar"
        );
    }
}


function abrirModalMotivoStatus(lojaId, novoStatus) {
    const loja = lojasAdmin.find(item => item.id === lojaId);
    if (!loja) return;

    acaoMotivoAdmin = { lojaId, novoStatus };

    const modal = document.getElementById("modalMotivoLoja");
    const titulo = document.getElementById("tituloModalMotivo");
    const texto = document.getElementById("textoModalMotivo");
    const campo = document.getElementById("motivoStatusLoja");
    const contador = document.getElementById("contadorMotivo");
    const botao = document.getElementById("btnConfirmarMotivo");

    const suspender = novoStatus === "suspensa";

    if (titulo) titulo.textContent = suspender ? "Suspender loja" : "Rejeitar loja";
    if (texto) {
        texto.textContent = suspender
            ? `Informe por que a loja “${loja.nome}” será suspensa.`
            : `Informe por que a solicitação da loja “${loja.nome}” será rejeitada.`;
    }

    if (campo) campo.value = "";
    if (contador) contador.textContent = "0";
    if (botao) {
        botao.innerHTML = suspender
            ? '<i class="fa-solid fa-ban"></i> Suspender'
            : '<i class="fa-solid fa-xmark"></i> Rejeitar';
    }

    if (modal) modal.hidden = false;
    setTimeout(() => campo?.focus(), 60);
}


async function confirmarMotivoStatusAdmin() {
    if (!acaoMotivoAdmin) return;

    const campo = document.getElementById("motivoStatusLoja");
    const motivo = campo?.value?.trim() || "";

    if (!motivo) {
        avisarAdmin("Informe o motivo antes de continuar.", "aviso", "Motivo obrigatório");
        campo?.focus();
        return;
    }

    const { lojaId, novoStatus } = acaoMotivoAdmin;
    await mudarStatusLojaAdmin(lojaId, novoStatus, motivo);
}


async function verDetalhesLojaAdmin(lojaId) {
    const loja = lojasAdmin.find(item => item.id === lojaId);
    const modal = document.getElementById("modalDetalhesLoja");
    const conteudo = document.getElementById("conteudoDetalhesLoja");

    if (!loja || !modal || !conteudo) return;

    modal.hidden = false;
    conteudo.innerHTML = `
        <div class="estado-admin">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <h3>Carregando detalhes...</h3>
        </div>
    `;

    let historico = [];

    try {
        const { data, error } = await window.db.rpc("listar_historico_loja_admin", {
            p_loja_id: lojaId
        });

        if (error) throw error;
        historico = Array.isArray(data) ? data : [];
    } catch (erro) {
        console.warn("Não foi possível carregar o histórico da loja:", erro);
    }

    const status = STATUS_ADMIN[loja.status_aprovacao] || STATUS_ADMIN.pendente;
    const logo = loja.logo_url
        ? `<img src="${escaparAtributoAdmin(loja.logo_url)}" class="loja-logo-admin" alt="Logo da ${escaparHTMLAdmin(loja.nome || "Loja")}">`
        : `<div class="loja-logo-placeholder-admin"><i class="fa-solid fa-store"></i></div>`;

    conteudo.innerHTML = `
        <div class="detalhe-cabecalho">
            ${logo}
            <div>
                <h2 id="tituloDetalhesLoja">${escaparHTMLAdmin(loja.nome || "Loja")}</h2>
                <p>${escaparHTMLAdmin(loja.categoria || "Sem categoria")}</p>
            </div>
        </div>

        <div class="detalhes-grid">
            ${detalheAdmin("Status", status.rotulo)}
            ${detalheAdmin("Proprietário", loja.proprietario_nome || "Não informado")}
            ${detalheAdmin("Telefone", loja.telefone || loja.whatsapp || "Não informado")}
            ${detalheAdmin("Cidade", loja.cidade || "Não informada")}
            ${detalheAdmin("Endereço", loja.endereco || "Não informado")}
            ${detalheAdmin("Cadastro", formatarDataAdmin(loja.criado_em))}
            ${detalheAdmin("Produtos", String(loja.total_produtos || 0))}
            ${detalheAdmin("Pedidos", String(loja.total_pedidos || 0))}
        </div>

        ${loja.descricao ? `<p>${escaparHTMLAdmin(loja.descricao)}</p>` : ""}
        ${loja.motivo_rejeicao ? `<p class="loja-motivo-atual"><strong>Motivo atual:</strong> ${escaparHTMLAdmin(loja.motivo_rejeicao)}</p>` : ""}

        <div class="historico-admin">
            <h3><i class="fa-solid fa-clock-rotate-left"></i> Histórico de análise</h3>
            ${historico.length
                ? historico.map(item => `
                    <div class="historico-item">
                        <strong>${escaparHTMLAdmin(rotuloStatusAdmin(item.status_anterior))} → ${escaparHTMLAdmin(rotuloStatusAdmin(item.status_novo))}</strong>
                        <span>${formatarDataHoraAdmin(item.criado_em)}${item.administrador_nome ? ` • ${escaparHTMLAdmin(item.administrador_nome)}` : ""}</span>
                        ${item.motivo ? `<span>Motivo: ${escaparHTMLAdmin(item.motivo)}</span>` : ""}
                    </div>
                `).join("")
                : '<p>Nenhuma alteração administrativa registrada ainda.</p>'}
        </div>
    `;
}


function detalheAdmin(titulo, valor) {
    return `
        <div class="detalhe-bloco">
            <small>${escaparHTMLAdmin(titulo)}</small>
            <strong>${escaparHTMLAdmin(valor)}</strong>
        </div>
    `;
}


function fecharModalAdmin(tipo) {
    const id = tipo === "detalhes" ? "modalDetalhesLoja" : "modalMotivoLoja";
    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;

    if (tipo === "motivo") {
        acaoMotivoAdmin = null;
    }
}


async function sairDoAdmin() {
    try {
        await window.db.auth.signOut();
    } finally {
        localStorage.removeItem("loja_id");
        localStorage.removeItem("nome_loja");
        window.location.href = "login.html";
    }
}


async function confirmarAdmin({ titulo, mensagem, textoConfirmar }) {
    if (typeof window.confirmarAcao === "function") {
        return window.confirmarAcao({
            titulo,
            mensagem,
            textoConfirmar,
            textoCancelar: "Cancelar",
            tipo: "aviso"
        });
    }

    return window.confirm(`${titulo}\n\n${mensagem}`);
}


function configurarErrosLogoAdmin() {
    document.querySelectorAll(".loja-identidade img.loja-logo-admin").forEach(img => {
        img.addEventListener("error", () => {
            img.hidden = true;
            const placeholder = img.nextElementSibling;
            if (placeholder) placeholder.hidden = false;
        }, { once: true });
    });
}


function mostrarEstadoAdmin(icone, titulo, texto) {
    const lista = document.getElementById("listaLojasAdmin");
    if (!lista) return;

    lista.innerHTML = `
        <div class="estado-admin">
            <i class="fa-solid ${escaparAtributoAdmin(icone)}"></i>
            <h3>${escaparHTMLAdmin(titulo)}</h3>
            <p>${escaparHTMLAdmin(texto)}</p>
        </div>
    `;
}


function definirTextoAdmin(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = String(valor);
}


function rotuloStatusAdmin(status) {
    if (!status) return "Início";
    return STATUS_ADMIN[status]?.rotulo || status;
}


function formatarDataAdmin(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "—";
    return data.toLocaleDateString("pt-BR");
}


function formatarDataHoraAdmin(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "—";
    return data.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}


function avisarAdmin(mensagem, tipo = "info", titulo = "Aviso") {
    if (typeof window.notificar === "function") {
        window.notificar(mensagem, tipo, titulo, 5000);
        return;
    }

    if (typeof window.mostrarAlerta === "function") {
        window.mostrarAlerta(mensagem, tipo, titulo, 5000);
        return;
    }

    console.log(`${titulo}: ${mensagem}`);
}


function escaparHTMLAdmin(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escaparAtributoAdmin(valor) {
    return escaparHTMLAdmin(valor);
}
