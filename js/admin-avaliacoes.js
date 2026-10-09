// ==========================================
// ADMIN-AVALIACOES.JS
// Avaliações de vendedores denunciadas: o admin oculta, mostra de novo
// ou mantém (descarta as denúncias). O banco confere se é admin.
// ==========================================

(() => {
    "use strict";

    let itens = [];

    const el = id => document.getElementById(id);

    function escapar(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function dataHora(valor) {
        const data = new Date(valor);
        return Number.isNaN(data.getTime())
            ? ""
            : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    }

    function estrelas(nota) {
        const n = Math.max(0, Math.min(5, Number(nota) || 0));
        return Array.from({ length: 5 }, (_, i) =>
            `<i class="fa-${i < n ? "solid" : "regular"} fa-star" aria-hidden="true"></i>`
        ).join("");
    }

    function avisar(mensagem, tipo, titulo) {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, tipo, titulo, 4500);
            return;
        }
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo, 4500);
            return;
        }
        window.alert(`${titulo}\n\n${mensagem}`);
    }

    function criarCard(item) {
        const motivos = String(item.motivos || "").split(" | ").filter(Boolean);

        return `
            <article class="fila-anuncio avaliacao-admin" data-id="${escapar(item.id)}">
                <div class="fila-anuncio-imagem avaliacao-admin-nota" aria-label="${Number(item.nota)} de 5 estrelas">
                    <strong>${Number(item.nota)}</strong>
                    <span>${estrelas(item.nota)}</span>
                </div>
                <div>
                    <div class="fila-anuncio-topo">
                        ${item.ativo
                            ? '<span class="fila-anuncio-tipo novo">Visível</span>'
                            : '<span class="fila-anuncio-tipo edicao">Oculta</span>'}
                        ${Number(item.denuncias) > 0
                            ? `<span class="fila-anuncio-tipo denunciada">${Number(item.denuncias)} ${Number(item.denuncias) === 1 ? "denúncia" : "denúncias"}</span>`
                            : ""}
                        <small>${escapar(dataHora(item.criado_em))}</small>
                    </div>
                    <h3>${escapar(item.loja_nome)}</h3>
                    <p class="fila-anuncio-preco">Por ${escapar(item.avaliador_nome)} · comprou ${escapar(item.produto_nome || "")}</p>
                    <p class="fila-anuncio-descricao">${item.comentario ? escapar(item.comentario) : "<em>Sem comentário.</em>"}</p>
                    ${item.resposta ? `<p class="fila-anuncio-descricao"><strong>Resposta do vendedor:</strong> ${escapar(item.resposta)}</p>` : ""}
                    ${motivos.length ? `
                        <ul class="avaliacao-admin-motivos">
                            ${motivos.map(m => `<li><i class="fa-regular fa-flag" aria-hidden="true"></i> ${escapar(m)}</li>`).join("")}
                        </ul>
                    ` : ""}
                    ${!item.ativo && item.motivo_moderacao ? `<p class="fila-anuncio-descricao"><strong>Motivo de ter ocultado:</strong> ${escapar(item.motivo_moderacao)}</p>` : ""}
                    <div class="fila-anuncio-botoes">
                        ${item.ativo ? `
                            <button type="button" class="btn-admin btn-perigo" data-acao="ocultar">
                                <i class="fa-solid fa-eye-slash"></i> Ocultar
                            </button>
                            ${Number(item.denuncias) > 0 ? `
                                <button type="button" class="btn-admin btn-claro" data-acao="manter">
                                    <i class="fa-solid fa-check"></i> Manter e descartar denúncias
                                </button>
                            ` : ""}
                        ` : `
                            <button type="button" class="btn-admin btn-claro" data-acao="mostrar">
                                <i class="fa-solid fa-eye"></i> Mostrar de novo
                            </button>
                        `}
                    </div>
                </div>
            </article>
        `;
    }

    function renderizar() {
        const lista = el("listaAvaliacoesAdmin");
        const resumo = el("resumoAvaliacoesAdmin");
        const filtro = el("filtroAvaliacoesAdmin")?.value || "denunciadas";

        if (resumo) {
            resumo.textContent = itens.length
                ? `${itens.length} ${itens.length === 1 ? "avaliação" : "avaliações"}.`
                : (filtro === "denunciadas" ? "Nenhuma avaliação denunciada." : "Nenhuma avaliação encontrada.");
        }

        if (lista) lista.innerHTML = itens.map(criarCard).join("");
    }

    async function carregar() {
        const filtro = el("filtroAvaliacoesAdmin")?.value || "denunciadas";
        try {
            const { data, error } = await window.db.rpc("listar_avaliacoes_vendedor_admin", {
                p_filtro: filtro
            });
            if (error) throw error;
            itens = data || [];
            renderizar();
        } catch (erro) {
            console.error("Erro ao carregar avaliações:", erro);
            const resumo = el("resumoAvaliacoesAdmin");
            if (resumo) resumo.textContent = "Não foi possível carregar as avaliações.";
        }
    }

    async function moderar(id, acao) {
        let motivo = null;

        if (acao === "ocultar") {
            motivo = window.prompt("Por que ocultar esta avaliação? (aparece só para a administração)");
            if (motivo === null) return;
            if (motivo.trim().length < 5) {
                avisar("Escreva o motivo com pelo menos 5 letras.", "aviso", "Falta o motivo");
                return;
            }
        }

        try {
            const { error } = await window.db.rpc("moderar_avaliacao_vendedor_admin", {
                p_avaliacao_id: id,
                p_acao: acao,
                p_motivo: motivo
            });
            if (error) throw error;
            avisar(
                acao === "ocultar"
                    ? "Avaliação ocultada. Ela não aparece mais no site."
                    : acao === "mostrar"
                        ? "A avaliação voltou a aparecer no site."
                        : "Avaliação mantida e denúncias descartadas.",
                "sucesso",
                "Avaliações"
            );
            await carregar();
        } catch (erro) {
            console.error("Erro ao moderar avaliação:", erro);
            avisar(erro?.message || "Não foi possível concluir.", "erro", "Erro");
        }
    }

    async function sair() {
        try {
            await window.db.auth.signOut();
        } finally {
            window.location.href = "login.html";
        }
    }

    async function iniciar() {
        if (!window.db) return;

        const { data: sessao } = await window.db.auth.getSession();
        if (!sessao?.session) {
            window.location.replace("login.html");
            return;
        }

        const { data: admin, error } = await window.db.rpc("sou_admin");
        if (error || admin !== true) {
            window.location.replace("index.html");
            return;
        }

        el("listaAvaliacoesAdmin")?.addEventListener("click", evento => {
            const botao = evento.target.closest("button[data-acao]");
            const card = evento.target.closest("[data-id]");
            if (botao && card) moderar(card.dataset.id, botao.dataset.acao);
        });
        el("filtroAvaliacoesAdmin")?.addEventListener("change", carregar);
        el("btnAtualizarAvaliacoesAdmin")?.addEventListener("click", carregar);
        el("btnSairAdmin")?.addEventListener("click", sair);

        await carregar();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
