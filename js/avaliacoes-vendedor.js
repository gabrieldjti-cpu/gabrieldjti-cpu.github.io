// ==========================================
// AVALIACOES-VENDEDOR.JS
// Na página da loja (ou do perfil de quem anuncia), mostra as
// avaliações deixadas por compradores com venda confirmada.
// ==========================================

(() => {
    "use strict";

    function escapar(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function estrelas(nota) {
        const n = Math.round(Math.max(0, Math.min(5, Number(nota) || 0)));
        return Array.from({ length: 5 }, (_, i) =>
            `<i class="fa-${i < n ? "solid" : "regular"} fa-star" aria-hidden="true"></i>`
        ).join("");
    }

    function data(valor) {
        const d = new Date(valor);
        return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
    }

    function media(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });
    }

    async function carregar() {
        const lojaId = new URLSearchParams(window.location.search).get("id");
        if (!lojaId || !window.db || !/^[0-9a-f-]{36}$/i.test(lojaId)) return;

        const main = document.querySelector("main");
        if (!main || document.getElementById("avaliacoesVendedor")) return;

        try {
            const [{ data: loja }, resumoResp, listaResp] = await Promise.all([
                window.db.from("lojas").select("id,tipo").eq("id", lojaId).maybeSingle(),
                window.db.rpc("resumo_avaliacoes_vendedor", { p_loja_id: lojaId }),
                window.db.rpc("listar_avaliacoes_vendedor", { p_loja_id: lojaId, p_limite: 20 })
            ]);

            if (resumoResp.error) throw resumoResp.error;
            if (listaResp.error) throw listaResp.error;
            if (!loja) return;

            const resumo = (Array.isArray(resumoResp.data) ? resumoResp.data[0] : resumoResp.data) || {};
            const lista = listaResp.data || [];
            const total = Number(resumo.total || 0);
            const titulo = loja.tipo === "pessoal" ? "Avaliações do vendedor" : "Avaliações da loja";

            const secao = document.createElement("section");
            secao.id = "avaliacoesVendedor";
            secao.className = "avaliacoes-vendedor";
            secao.setAttribute("aria-labelledby", "tituloAvaliacoesVendedor");
            secao.innerHTML = `
                <div class="avaliacoes-vendedor-topo">
                    <div>
                        <h2 id="tituloAvaliacoesVendedor">${titulo}</h2>
                        <p>Só quem teve a venda confirmada pelo vendedor pode avaliar.</p>
                    </div>
                    <div class="avaliacoes-vendedor-media" aria-label="${total ? `Média ${media(resumo.media)} de 5, ${total} avaliações` : "Sem avaliações"}">
                        <strong>${total ? media(resumo.media) : "—"}</strong>
                        <span class="avaliacoes-vendedor-estrelas">${estrelas(resumo.media)}</span>
                        <small>${total} ${total === 1 ? "avaliação" : "avaliações"}</small>
                    </div>
                </div>
                ${lista.length ? `
                    <ul class="avaliacoes-vendedor-lista">
                        ${lista.map(item => `
                            <li>
                                <div class="avaliacoes-vendedor-item-topo">
                                    <span class="avaliacoes-vendedor-estrelas" aria-label="${Number(item.nota)} de 5 estrelas">${estrelas(item.nota)}</span>
                                    <time datetime="${escapar(item.criado_em)}">${escapar(data(item.criado_em))}</time>
                                </div>
                                <p>${item.comentario ? escapar(item.comentario) : "<em>Sem comentário.</em>"}</p>
                                <small>${escapar(item.avaliador_nome || "Comprador")}${item.produto_nome ? ` · comprou ${escapar(item.produto_nome)}` : ""}</small>
                                ${item.resposta_loja ? `<div class="avaliacoes-vendedor-resposta"><strong>Resposta do vendedor</strong><p>${escapar(item.resposta_loja)}</p></div>` : ""}
                                <button type="button" class="avaliacoes-vendedor-denunciar" data-denunciar-avaliacao-vendedor="${escapar(item.id)}">
                                    <i class="fa-regular fa-flag" aria-hidden="true"></i> Denunciar
                                </button>
                            </li>
                        `).join("")}
                    </ul>
                ` : `<p class="avaliacoes-vendedor-vazio">Ainda não há avaliações.</p>`}
            `;

            main.append(secao);
        } catch (erro) {
            console.warn("Não foi possível carregar as avaliações do vendedor:", erro);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", carregar, { once: true });
    } else {
        carregar();
    }
})();
