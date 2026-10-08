// ==========================================
// PAINEL-LOJA-FISCAL.JS
// CPF ou CNPJ da loja. Substitui o envio de fotos de documentos:
// a loja só digita o número, que fica numa tabela privada.
// ==========================================

(() => {
    "use strict";

    const el = id => document.getElementById(id);

    function mascarar(tipo, numero) {
        const n = String(numero || "");
        if (tipo === "cnpj" && n.length === 14) {
            return `${n.slice(0, 2)}.***.***/****-${n.slice(12)}`;
        }
        if (n.length === 11) {
            return `***.***.${n.slice(6, 9)}-${n.slice(9)}`;
        }
        return "";
    }

    function avisar(mensagem, tipo, titulo) {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, tipo, titulo, 4500);
        }
    }

    function mostrar(dados) {
        const selo = el("selo-fiscal-loja");
        const texto = el("texto-fiscal-loja");

        if (dados) {
            if (selo) selo.textContent = `${dados.tipo_pessoa.toUpperCase()} informado`;
            if (texto) texto.textContent = `${dados.tipo_pessoa.toUpperCase()} ${mascarar(dados.tipo_pessoa, dados.numero)}. Só a loja e a administração veem este número.`;
            if (el("tipo-fiscal-loja")) el("tipo-fiscal-loja").value = dados.tipo_pessoa;
        } else {
            if (selo) selo.textContent = "Não informado";
            if (texto) texto.textContent = "Informe o CPF ou CNPJ responsável pela loja. Não é preciso enviar foto de documento.";
        }
    }

    async function carregar(lojaId) {
        const { data, error } = await window.db
            .from("dados_fiscais_loja")
            .select("tipo_pessoa,numero")
            .eq("loja_id", lojaId)
            .maybeSingle();

        if (error) throw error;
        mostrar(data || null);
    }

    async function salvar(event, lojaId) {
        event.preventDefault();

        const botao = el("btn-salvar-fiscal-loja");
        const tipo = el("tipo-fiscal-loja")?.value || "cpf";
        const numero = String(el("numero-fiscal-loja")?.value || "").replace(/\D/g, "");
        const tamanho = tipo === "cnpj" ? 14 : 11;

        if (numero.length !== tamanho) {
            avisar(`O ${tipo.toUpperCase()} precisa ter ${tamanho} números.`, "aviso", "Número incompleto");
            el("numero-fiscal-loja")?.focus();
            return;
        }

        botao.disabled = true;

        try {
            const { error } = await window.db.rpc("salvar_dados_fiscais_loja", {
                p_tipo_pessoa: tipo,
                p_numero: numero
            });
            if (error) throw error;

            el("numero-fiscal-loja").value = "";
            avisar("Número salvo.", "sucesso", "CPF ou CNPJ");
            await carregar(lojaId);
        } catch (erro) {
            console.error("Erro ao salvar CPF ou CNPJ:", erro);
            avisar(erro?.message || "Não foi possível salvar o número.", "erro", "Erro");
        } finally {
            botao.disabled = false;
        }
    }

    async function iniciar() {
        const form = el("form-fiscal-loja");
        if (!form || !window.db) return;

        try {
            const { data: sessao } = await window.db.auth.getSession();
            const usuario = sessao?.session?.user;
            if (!usuario) return;

            const { data: loja } = await window.db
                .from("lojas")
                .select("id,tipo")
                .eq("proprietario_id", usuario.id)
                .maybeSingle();

            if (!loja || loja.tipo !== "loja") return;

            form.addEventListener("submit", event => salvar(event, loja.id));
            await carregar(loja.id);
        } catch (erro) {
            console.error("Erro ao carregar CPF ou CNPJ:", erro);
            const selo = el("selo-fiscal-loja");
            if (selo) selo.textContent = "Erro ao carregar";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
