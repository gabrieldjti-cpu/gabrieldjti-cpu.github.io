// ==========================================
// ANUNCIAR.JS
// Porta de entrada para publicar um anúncio.
//   * sem login           -> convida a entrar;
//   * já tem loja/perfil  -> segue direto para o formulário do anúncio;
//   * usuário comum novo  -> pede o contato uma vez e cria o perfil
//                            de anunciante (plano gratuito).
// ==========================================

(() => {
    "use strict";

    const DESTINO_ANUNCIO = "novo-produto.html";

    const el = id => document.getElementById(id);

    function mostrar(id) {
        ["blocoLoginAnunciar", "blocoPerfilAnunciar"].forEach(bloco => {
            const elemento = el(bloco);
            if (elemento) elemento.hidden = bloco !== id;
        });
    }

    function definirTexto(texto) {
        const elemento = el("textoAnunciar");
        if (elemento) elemento.textContent = texto;
    }

    function mostrarErro(mensagem) {
        const erro = el("erroPerfilAnunciante");
        if (!erro) return;
        erro.textContent = mensagem || "";
        erro.hidden = !mensagem;
    }

    function validar(dados) {
        if (dados.nome.length < 2) return "Informe o nome que vai aparecer no anúncio.";

        const digitos = dados.whatsapp.replace(/\D/g, "");
        if (digitos.length < 10 || digitos.length > 13) return "Informe um WhatsApp com DDD.";

        if (!dados.cidade) return "Informe a cidade.";
        if (!/^[A-Za-z]{2}$/.test(dados.estado)) return "Informe a sigla do estado com 2 letras, como MG.";

        return "";
    }

    async function criarPerfil(event) {
        event.preventDefault();
        mostrarErro("");

        const dados = {
            nome: el("nomeAnunciante").value.trim(),
            whatsapp: el("whatsappAnunciante").value.trim(),
            cidade: el("cidadeAnunciante").value.trim(),
            estado: el("estadoAnunciante").value.trim()
        };

        const problema = validar(dados);
        if (problema) {
            mostrarErro(problema);
            return;
        }

        const botao = el("btnCriarPerfilAnunciante");
        botao.disabled = true;

        try {
            const { error } = await window.db.rpc("criar_perfil_anunciante", {
                p_nome: dados.nome,
                p_whatsapp: dados.whatsapp,
                p_cidade: dados.cidade,
                p_estado: dados.estado
            });

            if (error) throw error;

            window.location.href = DESTINO_ANUNCIO;
        } catch (erro) {
            console.error("Erro ao criar o perfil de anunciante:", erro);
            mostrarErro(erro?.message || "Não foi possível salvar seus dados. Tente novamente.");
            botao.disabled = false;
        }
    }

    async function preencherComPerfil(usuario) {
        try {
            const { data } = await window.db
                .from("profiles")
                .select("nome,telefone,cidade")
                .eq("id", usuario.id)
                .maybeSingle();

            if (!data) return;

            if (data.nome && !el("nomeAnunciante").value) el("nomeAnunciante").value = data.nome;
            if (data.telefone && !el("whatsappAnunciante").value) el("whatsappAnunciante").value = data.telefone;
            if (data.cidade && !el("cidadeAnunciante").value) el("cidadeAnunciante").value = data.cidade;
        } catch (erro) {
            // Preencher é só uma conveniência; o formulário segue vazio.
            console.warn("Não foi possível sugerir os dados do perfil:", erro);
        }
    }

    async function iniciar() {
        if (!window.db) {
            definirTexto("Não foi possível conectar. Atualize a página para tentar de novo.");
            return;
        }

        el("formPerfilAnunciante")?.addEventListener("submit", criarPerfil);

        try {
            const { data: sessao } = await window.db.auth.getSession();
            const usuario = sessao?.session?.user;

            if (!usuario) {
                definirTexto("Qualquer pessoa pode anunciar gratuitamente.");
                mostrar("blocoLoginAnunciar");
                return;
            }

            const { data: cadastro, error } = await window.db
                .from("lojas")
                .select("id,tipo")
                .eq("proprietario_id", usuario.id)
                .maybeSingle();

            if (error) throw error;

            if (cadastro) {
                definirTexto("Abrindo o formulário do anúncio...");
                window.location.replace(DESTINO_ANUNCIO);
                return;
            }

            definirTexto("Falta só um passo antes do seu primeiro anúncio.");
            mostrar("blocoPerfilAnunciar");
            preencherComPerfil(usuario);
        } catch (erro) {
            console.error("Erro ao preparar a página de anúncio:", erro);
            definirTexto("Não foi possível verificar sua conta. Atualize a página para tentar de novo.");
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
