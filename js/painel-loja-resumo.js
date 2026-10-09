// ==========================================
// PAINEL-LOJA-RESUMO.JS
// Resumo do painel do lojista: anúncios no ar, aguardando aprovação,
// indisponíveis, interessados, vendas e nota média. Mostra também os
// pontos que pedem ação (confirmações pedidas, anúncios recusados).
// ==========================================

(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    function texto(id, valor) {
        const elemento = $(id);
        if (elemento) elemento.textContent = valor;
    }

    function numero(valor) {
        return Number(valor || 0).toLocaleString("pt-BR");
    }

    function alerta(icone, mensagem, link, rotulo) {
        const item = document.createElement("li");
        item.innerHTML = `<i class="fa-solid ${icone}" aria-hidden="true"></i>`;
        const span = document.createElement("span");
        span.textContent = mensagem + " ";
        item.append(span);
        if (link) {
            const a = document.createElement("a");
            a.href = link;
            a.textContent = rotulo;
            item.append(a);
        }
        return item;
    }

    async function carregarResumoVendedor() {
        if (!window.db || !$("resumo-vendedor")) return;

        try {
            const { data, error } = await window.db.rpc("resumo_painel_vendedor");
            if (error) throw error;
            const r = data || {};

            texto("resumo-no-ar", numero(r.no_ar));
            texto("resumo-aguardando", numero(Number(r.aguardando || 0) + Number(r.edicoes_na_fila || 0)));
            texto("resumo-indisponiveis", numero(r.indisponiveis));
            texto("resumo-interessados", numero(r.interessados_sem_venda));
            texto("resumo-vendas", numero(r.vendas));

            const total = Number(r.total_avaliacoes || 0);
            texto("resumo-nota", total
                ? Number(r.avaliacao_media || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                : "—");
            texto("resumo-nota-legenda", total
                ? `Nota média (${total} ${total === 1 ? "avaliação" : "avaliações"})`
                : "Nota média");

            const lista = $("resumo-vendedor-alertas");
            if (!lista) return;
            lista.innerHTML = "";

            const pedidas = Number(r.confirmacoes_pedidas || 0);
            if (pedidas) {
                lista.append(alerta("fa-bell",
                    `${pedidas} ${pedidas === 1 ? "comprador pediu" : "compradores pediram"} a confirmação da venda.`,
                    "interessados.html", "Ver interessados"));
            }

            const recusados = Number(r.recusados || 0);
            if (recusados) {
                lista.append(alerta("fa-circle-xmark",
                    `${recusados} ${recusados === 1 ? "anúncio foi recusado" : "anúncios foram recusados"} pela administração. Corrija e envie de novo.`,
                    "produtos.html", "Ver anúncios"));
            }

            const edicoes = Number(r.edicoes_na_fila || 0);
            if (edicoes) {
                lista.append(alerta("fa-pen",
                    `${edicoes} ${edicoes === 1 ? "edição espera" : "edições esperam"} aprovação. Até lá, a versão anterior continua no ar.`));
            }

            lista.hidden = lista.children.length === 0;
        } catch (erro) {
            console.error("Erro ao carregar o resumo do painel:", erro);
        }
    }

    window.carregarResumoVendedor = carregarResumoVendedor;
})();
