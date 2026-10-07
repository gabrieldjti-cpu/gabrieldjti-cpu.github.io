// ==========================================
// PLANOS.JS
// Página pública que compara os planos de anúncio.
// Os números vêm da tabela "planos"; se a leitura falhar,
// a página continua mostrando os valores padrão do HTML.
// ==========================================

(() => {
    "use strict";

    function plural(valor, singular, pluralTexto) {
        return `${valor} ${valor === 1 ? singular : pluralTexto}`;
    }

    function formatarMoeda(valor) {
        return Number(valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function definirTexto(seletor, texto) {
        const elemento = document.querySelector(seletor);
        if (elemento) elemento.textContent = texto;
    }

    function aplicarPlanoGratuito(plano) {
        const base = '[data-plano="gratuito"] ';

        if (Number(plano.limite_anuncios_ciclo) > 0) {
            definirTexto(
                `${base}[data-plano-campo="limite"]`,
                plural(Number(plano.limite_anuncios_ciclo), "anúncio", "anúncios")
            );
        }

        if (Number(plano.dias_ciclo) > 0) {
            definirTexto(
                `${base}[data-plano-campo="ciclo"]`,
                plural(Number(plano.dias_ciclo), "dia", "dias")
            );
        }

        if (Number(plano.dias_validade_anuncio) > 0) {
            definirTexto(
                `${base}[data-plano-campo="validade"]`,
                plural(Number(plano.dias_validade_anuncio), "dia", "dias")
            );
        }
    }

    function aplicarPlanoLojista(plano) {
        // Sem preço cadastrado, mantém o texto padrão do HTML.
        if (plano.preco_mensal === null || plano.preco_mensal === undefined) return;

        definirTexto("#precoPlanoLojista", formatarMoeda(plano.preco_mensal));
        definirTexto("#detalhePrecoPlanoLojista", "por mês");
    }

    async function carregarPlanos() {
        if (!window.db) return;

        try {
            const { data, error } = await window.db
                .from("planos")
                .select("codigo,preco_mensal,limite_anuncios_ciclo,dias_ciclo,dias_validade_anuncio")
                .eq("ativo", true);

            if (error) throw error;

            (data || []).forEach(plano => {
                if (plano.codigo === "gratuito") aplicarPlanoGratuito(plano);
                if (plano.codigo === "lojista") aplicarPlanoLojista(plano);
            });
        } catch (erro) {
            console.warn("Não foi possível carregar os planos:", erro);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", carregarPlanos, { once: true });
    } else {
        carregarPlanos();
    }
})();
