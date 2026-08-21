// ==========================================
// PAINEL-LOJA-APROVACAO.JS
// Extensão modular — RF-13 / RF-23
// ==========================================

async function iniciarAprovacaoPainelLoja() {
    if (!window.db) return;

    try {
        const { data: sessaoData, error: sessaoError } =
            await window.db.auth.getSession();

        if (sessaoError || !sessaoData?.session?.user) return;

        const userId = sessaoData.session.user.id;

        const { data: lojaAprovacao, error } = await window.db
            .from("lojas")
            .select("id,nome,ativa,status_aprovacao,motivo_rejeicao")
            .eq("proprietario_id", userId)
            .maybeSingle();

        if (error || !lojaAprovacao) {
            if (error) console.warn("Aprovação da loja não pôde ser carregada:", error);
            return;
        }

        atualizarStatusVisualLoja(lojaAprovacao);
        inserirAvisoAprovacaoLoja(lojaAprovacao);
    } catch (erro) {
        console.warn("Falha ao carregar situação de aprovação:", erro);
    }
}


function atualizarStatusVisualLoja(lojaAprovacao) {
    const status = document.getElementById("status-loja");
    if (!status) return;

    const mapa = {
        pendente: "🟡 Aguardando aprovação",
        aprovada: lojaAprovacao.ativa ? "🟢 Aprovada e ativa" : "⚪ Aprovada e inativa",
        rejeitada: "🔴 Rejeitada",
        suspensa: "🟠 Suspensa"
    };

    status.textContent = mapa[lojaAprovacao.status_aprovacao] || "Status não informado";
}


function inserirAvisoAprovacaoLoja(lojaAprovacao) {
    const main = document.querySelector("main.container");
    if (!main || document.getElementById("avisoAprovacaoLoja")) return;

    const status = lojaAprovacao.status_aprovacao || "pendente";

    const configuracao = {
        pendente: {
            classe: "aprovacao-pendente",
            icone: "fa-clock",
            titulo: "Sua loja está aguardando aprovação",
            texto: "Você pode preparar seus produtos normalmente, mas a loja e o catálogo só aparecerão para os clientes depois da aprovação administrativa."
        },
        aprovada: {
            classe: "aprovacao-aprovada",
            icone: "fa-circle-check",
            titulo: lojaAprovacao.ativa ? "Loja aprovada e publicada" : "Loja aprovada",
            texto: lojaAprovacao.ativa
                ? "Sua loja está aprovada e disponível para os clientes."
                : "Sua loja está aprovada, porém está marcada como inativa no momento."
        },
        rejeitada: {
            classe: "aprovacao-rejeitada",
            icone: "fa-circle-xmark",
            titulo: "Solicitação de loja rejeitada",
            texto: lojaAprovacao.motivo_rejeicao
                ? `Motivo informado pela administração: ${lojaAprovacao.motivo_rejeicao}`
                : "Revise os dados da loja antes de uma nova análise."
        },
        suspensa: {
            classe: "aprovacao-suspensa",
            icone: "fa-ban",
            titulo: "Sua loja está suspensa",
            texto: lojaAprovacao.motivo_rejeicao
                ? `Motivo informado pela administração: ${lojaAprovacao.motivo_rejeicao}`
                : "A loja não está disponível para clientes enquanto a suspensão estiver ativa."
        }
    }[status];

    if (!configuracao) return;

    const aviso = document.createElement("section");
    aviso.id = "avisoAprovacaoLoja";
    aviso.className = `aviso-aprovacao-loja ${configuracao.classe}`;

    aviso.innerHTML = `
        <div class="aviso-aprovacao-icone">
            <i class="fa-solid ${configuracao.icone}"></i>
        </div>
        <div class="aviso-aprovacao-conteudo">
            <strong>${escaparAprovacaoHTML(configuracao.titulo)}</strong>
            <p>${escaparAprovacaoHTML(configuracao.texto)}</p>
        </div>
        ${(status === "rejeitada" || status === "suspensa") && lojaAprovacao.id
            ? `<a class="btn-aprovacao-loja" href="editar-loja.html?id=${encodeURIComponent(lojaAprovacao.id)}">
                    <i class="fa-solid fa-pen-to-square"></i>
                    Revisar dados
               </a>`
            : ""}
    `;

    main.prepend(aviso);
}


function escaparAprovacaoHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

window.iniciarAprovacaoPainelLoja = iniciarAprovacaoPainelLoja;
