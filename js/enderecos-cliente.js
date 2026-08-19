// ==========================================
// ENDERECOS-CLIENTE.JS
// RF-04 — API compartilhada de endereços
// ==========================================

(function () {
    "use strict";

    function garantirDb() {
        if (!window.db) {
            throw new Error("Supabase não inicializado.");
        }
    }

    async function listar() {
        garantirDb();

        const { data, error } = await window.db.rpc(
            "listar_enderecos_cliente"
        );

        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    async function salvar(endereco) {
        garantirDb();

        const { data, error } = await window.db.rpc(
            "salvar_endereco_cliente",
            {
                p_endereco_id: endereco.id || null,
                p_apelido: endereco.apelido,
                p_cep: endereco.cep,
                p_logradouro: endereco.logradouro,
                p_numero: endereco.numero,
                p_complemento: endereco.complemento || null,
                p_bairro: endereco.bairro,
                p_cidade: endereco.cidade,
                p_estado: endereco.estado,
                p_referencia: endereco.referencia || null,
                p_padrao: Boolean(endereco.padrao)
            }
        );

        if (error) throw error;
        return data;
    }

    async function definirPadrao(id) {
        garantirDb();

        const { data, error } = await window.db.rpc(
            "definir_endereco_padrao_cliente",
            { p_endereco_id: id }
        );

        if (error) throw error;
        return data;
    }

    async function excluir(id) {
        garantirDb();

        const { data, error } = await window.db.rpc(
            "excluir_endereco_cliente",
            { p_endereco_id: id }
        );

        if (error) throw error;
        return data;
    }

    function formatarCep(cep) {
        const numeros = String(cep || "").replace(/\D/g, "");
        if (numeros.length !== 8) return String(cep || "");
        return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
    }

    function formatarLinha(endereco) {
        if (!endereco) return "";

        const partes = [
            [endereco.logradouro, endereco.numero]
                .filter(Boolean)
                .join(", "),
            endereco.complemento,
            endereco.bairro,
            [endereco.cidade, endereco.estado]
                .filter(Boolean)
                .join(" - "),
            endereco.cep ? `CEP ${formatarCep(endereco.cep)}` : null
        ].filter(Boolean);

        return partes.join(" • ");
    }

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function notificar(texto, tipo = "info", titulo = null, duracao = 4000) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(texto, tipo, titulo, duracao);
            return;
        }

        console.log(`[${tipo}] ${titulo || ""}`, texto);
    }

    window.EnderecosCliente = {
        listar,
        salvar,
        definirPadrao,
        excluir,
        formatarCep,
        formatarLinha,
        escaparHTML,
        notificar
    };
})();