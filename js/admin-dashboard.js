// ==========================================
// ADMIN-DASHBOARD.JS
// Comércio da Cidade
// RF-23 — Gestão de Lojas
// ==========================================

let lojasAdmin = [];
let categoriasLojasAdmin = [];
let acaoMotivoAdmin = null;
let lojaEmEdicaoAdmin = null;
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
    const formEdicao = document.getElementById("formEditarLojaAdmin");
    const motivoEdicao = document.getElementById("motivoEdicaoLojaAdmin");
    const estadoEdicao = document.getElementById("estadoLojaEdicaoAdmin");

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
    formEdicao?.addEventListener("submit", salvarEdicaoLojaAdmin);

    motivoEdicao?.addEventListener("input", () => {
        const contador = document.getElementById("contadorMotivoEdicao");
        if (contador) contador.textContent = String(motivoEdicao.value.length);
    });

    estadoEdicao?.addEventListener("input", () => {
        estadoEdicao.value = estadoEdicao.value.toUpperCase();
    });

    document.querySelectorAll("[data-fechar-modal]").forEach(elemento => {
        elemento.addEventListener("click", () => {
            fecharModalAdmin(elemento.dataset.fecharModal);
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            fecharModalAdmin("detalhes");
            fecharModalAdmin("motivo");
            fecharModalAdmin("edicao");
        }
    });
}


async function atualizarDashboardAdmin() {
    await Promise.all([
        carregarResumoAdmin(),
        carregarLojasAdmin(),
        carregarCategoriasLojasAdmin()
    ]);
}


async function carregarCategoriasLojasAdmin() {
    const select = document.getElementById("categoriaLojaEdicaoAdmin");

    try {
        const { data, error } = await window.db
            .from("categorias")
            .select("id,nome")
            .eq("ativa", true)
            .order("nome", { ascending: true });

        if (error) throw error;

        categoriasLojasAdmin = Array.isArray(data) ? data : [];

        if (select) {
            select.innerHTML = `
                <option value="">Selecione uma categoria</option>
                ${categoriasLojasAdmin.map(categoria => `
                    <option value="${escaparAtributoAdmin(categoria.id)}">
                        ${escaparHTMLAdmin(categoria.nome)}
                    </option>
                `).join("")}
            `;
        }
    } catch (erro) {
        console.error("Erro ao carregar categorias das lojas:", erro);
        categoriasLojasAdmin = [];

        if (select) {
            select.innerHTML = '<option value="">Categorias indisponíveis</option>';
        }
    }
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
                <button type="button" class="btn-admin btn-claro" onclick="abrirModalEdicaoLojaAdmin('${id}')">
                    <i class="fa-solid fa-pen-to-square"></i>
                    Editar
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


function abrirModalEdicaoLojaAdmin(lojaId) {
    const loja = lojasAdmin.find(item => item.id === lojaId);
    const modal = document.getElementById("modalEditarLoja");
    const form = document.getElementById("formEditarLojaAdmin");

    if (!loja || !modal || !form) return;

    if (categoriasLojasAdmin.length === 0) {
        avisarAdmin(
            "Não foi possível carregar as categorias disponíveis.",
            "erro",
            "Edição indisponível"
        );
        return;
    }

    lojaEmEdicaoAdmin = loja;
    form.reset();

    definirValorCampoAdmin("lojaIdEdicaoAdmin", loja.id);
    definirValorCampoAdmin("nomeLojaEdicaoAdmin", loja.nome);
    definirValorCampoAdmin("categoriaLojaEdicaoAdmin", loja.categoria_id);
    definirValorCampoAdmin("descricaoLojaEdicaoAdmin", loja.descricao);
    definirValorCampoAdmin("telefoneLojaEdicaoAdmin", loja.telefone);
    definirValorCampoAdmin("whatsappLojaEdicaoAdmin", loja.whatsapp);
    definirValorCampoAdmin("enderecoLojaEdicaoAdmin", loja.endereco);
    definirValorCampoAdmin("cidadeLojaEdicaoAdmin", loja.cidade);
    definirValorCampoAdmin("estadoLojaEdicaoAdmin", loja.estado);
    definirValorCampoAdmin(
        "aberturaLojaEdicaoAdmin",
        formatarHorarioCampoAdmin(loja.horario_abertura)
    );
    definirValorCampoAdmin(
        "fechamentoLojaEdicaoAdmin",
        formatarHorarioCampoAdmin(loja.horario_fechamento)
    );
    definirValorCampoAdmin(
        "taxaEntregaLojaEdicaoAdmin",
        Number(loja.taxa_entrega || 0).toFixed(2)
    );

    const contador = document.getElementById("contadorMotivoEdicao");
    if (contador) contador.textContent = "0";

    const titulo = document.getElementById("tituloEditarLoja");
    if (titulo) titulo.textContent = `Editar ${loja.nome || "loja"}`;

    modal.hidden = false;
    setTimeout(() => document.getElementById("nomeLojaEdicaoAdmin")?.focus(), 60);
}


function validarDadosEdicaoLojaAdmin(entrada) {
    const taxaTexto = String(entrada?.taxaEntrega ?? "").trim();
    const dados = {
        lojaId: String(entrada?.lojaId || "").trim(),
        nome: String(entrada?.nome || "").trim(),
        categoriaId: Number(entrada?.categoriaId),
        descricao: normalizarOpcionalAdmin(entrada?.descricao),
        telefone: normalizarOpcionalAdmin(entrada?.telefone),
        whatsapp: normalizarOpcionalAdmin(entrada?.whatsapp),
        endereco: normalizarOpcionalAdmin(entrada?.endereco),
        cidade: normalizarOpcionalAdmin(entrada?.cidade),
        estado: normalizarOpcionalAdmin(entrada?.estado)?.toUpperCase() || null,
        abertura: normalizarOpcionalAdmin(entrada?.abertura),
        fechamento: normalizarOpcionalAdmin(entrada?.fechamento),
        taxaEntrega: taxaTexto === "" ? Number.NaN : Number(taxaTexto),
        motivo: String(entrada?.motivo || "").trim()
    };

    if (!dados.lojaId) {
        return erroValidacaoEdicaoAdmin("Loja inválida.", "lojaIdEdicaoAdmin");
    }

    if (dados.nome.length < 3 || dados.nome.length > 100) {
        return erroValidacaoEdicaoAdmin(
            "O nome da loja deve possuir entre 3 e 100 caracteres.",
            "nomeLojaEdicaoAdmin"
        );
    }

    if (!Number.isInteger(dados.categoriaId) || dados.categoriaId <= 0) {
        return erroValidacaoEdicaoAdmin(
            "Selecione uma categoria para a loja.",
            "categoriaLojaEdicaoAdmin"
        );
    }

    if (dados.descricao && dados.descricao.length > 1000) {
        return erroValidacaoEdicaoAdmin(
            "A descrição deve ter no máximo 1.000 caracteres.",
            "descricaoLojaEdicaoAdmin"
        );
    }

    for (const [valor, campo, rotulo] of [
        [dados.telefone, "telefoneLojaEdicaoAdmin", "telefone"],
        [dados.whatsapp, "whatsappLojaEdicaoAdmin", "WhatsApp"]
    ]) {
        if (valor) {
            const totalDigitos = valor.replace(/[^0-9]/g, "").length;
            if (valor.length > 20 || totalDigitos < 10 || totalDigitos > 13) {
                return erroValidacaoEdicaoAdmin(
                    `Informe um ${rotulo} válido com DDD.`,
                    campo
                );
            }
        }
    }

    if (dados.endereco && dados.endereco.length > 240) {
        return erroValidacaoEdicaoAdmin(
            "O endereço deve ter no máximo 240 caracteres.",
            "enderecoLojaEdicaoAdmin"
        );
    }

    if (dados.cidade && (dados.cidade.length < 2 || dados.cidade.length > 100)) {
        return erroValidacaoEdicaoAdmin(
            "A cidade deve possuir entre 2 e 100 caracteres.",
            "cidadeLojaEdicaoAdmin"
        );
    }

    if (dados.estado && !/^[A-Z]{2}$/.test(dados.estado)) {
        return erroValidacaoEdicaoAdmin(
            "Informe o estado usando duas letras, como SP.",
            "estadoLojaEdicaoAdmin"
        );
    }

    if (Boolean(dados.abertura) !== Boolean(dados.fechamento)) {
        return erroValidacaoEdicaoAdmin(
            "Informe os horários de abertura e fechamento juntos.",
            dados.abertura ? "fechamentoLojaEdicaoAdmin" : "aberturaLojaEdicaoAdmin"
        );
    }

    for (const [valor, campo] of [
        [dados.abertura, "aberturaLojaEdicaoAdmin"],
        [dados.fechamento, "fechamentoLojaEdicaoAdmin"]
    ]) {
        if (valor && !/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(valor)) {
            return erroValidacaoEdicaoAdmin(
                "Informe um horário válido.",
                campo
            );
        }
    }

    if (!Number.isFinite(dados.taxaEntrega)
        || dados.taxaEntrega < 0
        || dados.taxaEntrega > 9999.99) {
        return erroValidacaoEdicaoAdmin(
            "Informe uma taxa de entrega entre R$ 0,00 e R$ 9.999,99.",
            "taxaEntregaLojaEdicaoAdmin"
        );
    }

    if (dados.motivo.length < 5 || dados.motivo.length > 500) {
        return erroValidacaoEdicaoAdmin(
            "Explique o motivo da alteração usando entre 5 e 500 caracteres.",
            "motivoEdicaoLojaAdmin"
        );
    }

    dados.taxaEntrega = Math.round(dados.taxaEntrega * 100) / 100;

    return { valido: true, dados };
}


async function salvarEdicaoLojaAdmin(event) {
    event.preventDefault();

    if (!lojaEmEdicaoAdmin) return;

    const validacao = validarDadosEdicaoLojaAdmin({
        lojaId: valorCampoAdmin("lojaIdEdicaoAdmin"),
        nome: valorCampoAdmin("nomeLojaEdicaoAdmin"),
        categoriaId: valorCampoAdmin("categoriaLojaEdicaoAdmin"),
        descricao: valorCampoAdmin("descricaoLojaEdicaoAdmin"),
        telefone: valorCampoAdmin("telefoneLojaEdicaoAdmin"),
        whatsapp: valorCampoAdmin("whatsappLojaEdicaoAdmin"),
        endereco: valorCampoAdmin("enderecoLojaEdicaoAdmin"),
        cidade: valorCampoAdmin("cidadeLojaEdicaoAdmin"),
        estado: valorCampoAdmin("estadoLojaEdicaoAdmin"),
        abertura: valorCampoAdmin("aberturaLojaEdicaoAdmin"),
        fechamento: valorCampoAdmin("fechamentoLojaEdicaoAdmin"),
        taxaEntrega: valorCampoAdmin("taxaEntregaLojaEdicaoAdmin"),
        motivo: valorCampoAdmin("motivoEdicaoLojaAdmin")
    });

    if (!validacao.valido) {
        avisarAdmin(validacao.erro, "aviso", "Revise os dados");
        document.getElementById(validacao.campo)?.focus();
        return;
    }

    const botao = document.getElementById("btnSalvarEdicaoLojaAdmin");
    const conteudoOriginal = botao?.innerHTML;

    if (botao) {
        botao.disabled = true;
        botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando';
    }

    const dados = validacao.dados;

    try {
        const { data, error } = await window.db.functions.invoke("admin-lojas", {
            body: {
                acao: "editar",
                loja_id: dados.lojaId,
                nome: dados.nome,
                categoria_id: dados.categoriaId,
                descricao: dados.descricao,
                telefone: dados.telefone,
                whatsapp: dados.whatsapp,
                endereco: dados.endereco,
                cidade: dados.cidade,
                estado: dados.estado,
                horario_abertura: dados.abertura,
                horario_fechamento: dados.fechamento,
                taxa_entrega: dados.taxaEntrega,
                motivo: dados.motivo
            }
        });

        if (error) {
            throw new Error(await extrairMensagemErroFuncaoAdmin(error));
        }

        const campos = Array.isArray(data?.resultado?.campos_alterados)
            ? data.resultado.campos_alterados.join(", ")
            : "dados comerciais";

        fecharModalAdmin("edicao");

        avisarAdmin(
            `Alterações salvas: ${campos}.`,
            "sucesso",
            "Loja atualizada"
        );

        await atualizarDashboardAdmin();
    } catch (erro) {
        console.error("Erro ao editar loja como administrador:", erro);
        avisarAdmin(
            erro?.message || "Não foi possível salvar as alterações da loja.",
            "erro",
            "Erro ao salvar"
        );
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.innerHTML = conteudoOriginal;
        }
    }
}


async function extrairMensagemErroFuncaoAdmin(erro) {
    try {
        if (erro?.context && typeof erro.context.json === "function") {
            const corpo = await erro.context.json();
            if (corpo?.erro) return corpo.erro;
        }
    } catch (falha) {
        console.warn("Não foi possível interpretar o erro da função:", falha);
    }

    return erro?.message || "Não foi possível concluir a alteração.";
}


function erroValidacaoEdicaoAdmin(erro, campo) {
    return { valido: false, erro, campo };
}


function normalizarOpcionalAdmin(valor) {
    const texto = String(valor ?? "").trim();
    return texto || null;
}


function valorCampoAdmin(id) {
    return document.getElementById(id)?.value ?? "";
}


function definirValorCampoAdmin(id, valor) {
    const campo = document.getElementById(id);
    if (campo) campo.value = valor ?? "";
}


function formatarHorarioCampoAdmin(valor) {
    if (!valor) return "";
    return String(valor).slice(0, 5);
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
            <h3><i class="fa-solid fa-clock-rotate-left"></i> Histórico administrativo</h3>
            ${historico.length
                ? historico.map(renderizarItemHistoricoAdmin).join("")
                : '<p>Nenhuma alteração administrativa registrada ainda.</p>'}
        </div>
    `;
}


function renderizarItemHistoricoAdmin(item) {
    const administrador = item.administrador_nome
        ? ` • ${escaparHTMLAdmin(item.administrador_nome)}`
        : "";

    if (item.tipo_evento === "edicao") {
        const campos = Array.isArray(item.campos_alterados)
            ? item.campos_alterados.join(", ")
            : "Dados comerciais";

        return `
            <div class="historico-item historico-edicao">
                <strong><i class="fa-solid fa-pen-to-square"></i> Dados editados</strong>
                <span>${formatarDataHoraAdmin(item.criado_em)}${administrador}</span>
                <span>Campos: ${escaparHTMLAdmin(campos)}</span>
                ${item.motivo ? `<span>Justificativa: ${escaparHTMLAdmin(item.motivo)}</span>` : ""}
            </div>
        `;
    }

    return `
        <div class="historico-item">
            <strong>${escaparHTMLAdmin(rotuloStatusAdmin(item.status_anterior))} → ${escaparHTMLAdmin(rotuloStatusAdmin(item.status_novo))}</strong>
            <span>${formatarDataHoraAdmin(item.criado_em)}${administrador}</span>
            ${item.motivo ? `<span>Motivo: ${escaparHTMLAdmin(item.motivo)}</span>` : ""}
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
    const modais = {
        detalhes: "modalDetalhesLoja",
        motivo: "modalMotivoLoja",
        edicao: "modalEditarLoja"
    };
    const id = modais[tipo];
    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;

    if (tipo === "motivo") {
        acaoMotivoAdmin = null;
    }

    if (tipo === "edicao") {
        lojaEmEdicaoAdmin = null;
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


window.AdminDashboardTestes = Object.freeze({
    validarDadosEdicaoLojaAdmin,
    formatarHorarioCampoAdmin,
    renderizarItemHistoricoAdmin
});
