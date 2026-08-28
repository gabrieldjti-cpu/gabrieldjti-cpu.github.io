// ==========================================
// FRETE-LOJA.JS
// Taxa fixa de entrega por loja - RF-08
// ==========================================

(() => {
    "use strict";

    const LIMITE_LOJAS = 100;
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const cache = new Map();

    function normalizarTaxa(valor) {
        const taxa = Number(valor);

        if (!Number.isFinite(taxa) || taxa < 0) {
            return 0;
        }

        return Math.round(Math.min(taxa, 9999.99) * 100) / 100;
    }

    function normalizarIds(lojaIds) {
        return [...new Set(
            (Array.isArray(lojaIds) ? lojaIds : [])
                .map(id => String(id || "").trim())
                .filter(id => UUID.test(id))
        )].slice(0, LIMITE_LOJAS);
    }

    async function carregar(lojaIds, { forcar = false } = {}) {
        if (!window.db) {
            throw new Error("Supabase não inicializado.");
        }

        const ids = normalizarIds(lojaIds);
        const consultar = forcar
            ? ids
            : ids.filter(id => !cache.has(id));

        if (consultar.length) {
            const { data, error } = await window.db
                .from("lojas")
                .select("id,nome,taxa_entrega")
                .in("id", consultar)
                .eq("ativa", true)
                .eq("status_aprovacao", "aprovada");

            if (error) throw error;

            const recebidas = new Set();

            (Array.isArray(data) ? data : []).forEach(loja => {
                const id = String(loja.id);
                recebidas.add(id);
                cache.set(id, {
                    id,
                    nome: loja.nome || "Loja",
                    taxa: normalizarTaxa(loja.taxa_entrega)
                });
            });

            const indisponiveis = consultar.filter(id => !recebidas.has(id));

            if (indisponiveis.length) {
                indisponiveis.forEach(id => cache.delete(id));
                throw new Error("Uma ou mais lojas do carrinho estão indisponíveis.");
            }
        }

        const resultado = new Map();

        ids.forEach(id => {
            if (cache.has(id)) resultado.set(id, { ...cache.get(id) });
        });

        return resultado;
    }

    function obterTaxa(taxasPorLoja, lojaId) {
        const registro = taxasPorLoja instanceof Map
            ? taxasPorLoja.get(String(lojaId || ""))
            : null;

        return normalizarTaxa(registro?.taxa);
    }

    function limparCache() {
        cache.clear();
    }

    window.FreteLoja = Object.freeze({
        carregar,
        obterTaxa,
        normalizarTaxa,
        limparCache
    });
})();
