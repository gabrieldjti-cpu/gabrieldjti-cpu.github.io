// ==========================================
// PERFIL-CONTA.JS
// RF-04 — foto de perfil e exclusão de conta
// ==========================================

(function () {
    "use strict";

    const BUCKET_AVATARES = "avatars";
    const LIMITE_FOTO = 5 * 1024 * 1024;
    const TIPOS_PERMITIDOS = new Set([
        "image/jpeg",
        "image/png",
        "image/webp"
    ]);

    let usuarioAtual = null;
    let fotoAtual = null;
    let iniciado = false;

    function garantirEstilos() {
        if (document.querySelector('link[href="css/perfil-conta.css"]')) return;

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "css/perfil-conta.css";
        document.head.appendChild(link);
    }

    window.iniciarPerfilConta = async function () {
        if (iniciado || !window.db) return;
        iniciado = true;

        garantirEstilos();

        const { data, error } = await window.db.auth.getSession();
        if (error || !data?.session?.user) return;

        usuarioAtual = data.session.user;

        inserirControlesFoto();
        inserirZonaPerigo();
        configurarEventos();
        await carregarEstadoPerfil();
    };

    function inserirControlesFoto() {
        if (document.getElementById("perfil-foto-acoes-rf04")) return;

        const avatar = document.querySelector(".perfil-card .avatar");
        if (!avatar) return;

        const controles = document.createElement("div");
        controles.id = "perfil-foto-acoes-rf04";
        controles.className = "perfil-foto-acoes";
        controles.innerHTML = `
            <input
                type="file"
                id="perfil-foto-input-rf04"
                accept="image/jpeg,image/png,image/webp"
                hidden
            >
            <div class="perfil-foto-botoes">
                <button type="button" class="perfil-foto-btn" id="perfil-foto-alterar-rf04">
                    <i class="fa-solid fa-camera"></i> Alterar foto
                </button>
                <button type="button" class="perfil-foto-btn remover" id="perfil-foto-remover-rf04" hidden>
                    <i class="fa-solid fa-trash"></i> Remover
                </button>
            </div>
            <span class="perfil-foto-ajuda">JPG, PNG ou WebP • máximo de 5 MB</span>
        `;

        avatar.insertAdjacentElement("afterend", controles);
    }

    function inserirZonaPerigo() {
        if (document.getElementById("perfil-conta-perigo-rf04")) return;

        const conteudo = document.querySelector(".conteudo");
        if (!conteudo) return;

        const card = document.createElement("div");
        card.className = "card perfil-conta-perigo";
        card.id = "perfil-conta-perigo-rf04";
        card.innerHTML = `
            <div class="titulo">
                <h2><i class="fa-solid fa-triangle-exclamation"></i> Conta</h2>
            </div>
            <div class="perfil-conta-perigo-conteudo">
                <div class="perfil-conta-perigo-texto">
                    <h3>Excluir minha conta</h3>
                    <p>
                        A conta será desativada por exclusão lógica. O histórico de pedidos é preservado,
                        endereços ativos são desativados e lojas pertencentes à conta deixam de ficar ativas.
                    </p>
                </div>
                <button type="button" class="perfil-conta-excluir" id="btn-excluir-conta-rf04">
                    <i class="fa-solid fa-user-slash"></i> Excluir minha conta
                </button>
            </div>
        `;

        conteudo.appendChild(card);
    }

    function configurarEventos() {
        document.getElementById("perfil-foto-alterar-rf04")
            ?.addEventListener("click", () => {
                document.getElementById("perfil-foto-input-rf04")?.click();
            });

        document.getElementById("perfil-foto-input-rf04")
            ?.addEventListener("change", enviarNovaFoto);

        document.getElementById("perfil-foto-remover-rf04")
            ?.addEventListener("click", removerFoto);

        document.getElementById("btn-excluir-conta-rf04")
            ?.addEventListener("click", excluirConta);
    }

    async function carregarEstadoPerfil() {
        try {
            const { data, error } = await window.db
                .from("profiles")
                .select("foto_url, ativo, excluido_em")
                .eq("id", usuarioAtual.id)
                .maybeSingle();

            if (error) throw error;
            if (!data) return;

            if (data.ativo === false || data.excluido_em) {
                return;
            }

            fotoAtual = data.foto_url || null;
            renderizarAvatar();
        } catch (erro) {
            console.error("Erro ao carregar foto do perfil:", erro);
            notificar(
                "Não foi possível carregar sua foto de perfil.",
                "erro",
                "Foto do perfil"
            );
        }
    }

    function renderizarAvatar() {
        const avatar = document.querySelector(".perfil-card .avatar");
        if (!avatar) return;

        const url = obterUrlPublica(fotoAtual);

        if (url) {
            avatar.innerHTML = `
                <img
                    class="perfil-avatar-img"
                    src="${escaparAtributo(url)}"
                    alt="Foto de perfil"
                    referrerpolicy="no-referrer"
                >
            `;
        } else {
            avatar.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
        }

        const remover = document.getElementById("perfil-foto-remover-rf04");
        if (remover) remover.hidden = !fotoAtual;
    }

    function obterUrlPublica(valor) {
        const foto = String(valor || "").trim();
        if (!foto) return "";

        if (/^https?:\/\//i.test(foto)) {
            return foto;
        }

        const { data } = window.db.storage
            .from(BUCKET_AVATARES)
            .getPublicUrl(foto);

        return data?.publicUrl || "";
    }

    async function enviarNovaFoto(event) {
        const input = event.currentTarget;
        const arquivo = input?.files?.[0];
        if (!arquivo || !usuarioAtual) return;

        if (!TIPOS_PERMITIDOS.has(arquivo.type)) {
            input.value = "";
            notificar(
                "Escolha uma imagem JPG, PNG ou WebP.",
                "aviso",
                "Formato não permitido"
            );
            return;
        }

        if (arquivo.size > LIMITE_FOTO) {
            input.value = "";
            notificar(
                "A foto deve ter no máximo 5 MB.",
                "aviso",
                "Arquivo muito grande"
            );
            return;
        }

        const botao = document.getElementById("perfil-foto-alterar-rf04");
        const antigoHTML = botao?.innerHTML;
        definirCarregandoFoto(true, "Enviando...");

        const extensao = extensaoPorMime(arquivo.type);
        const novoCaminho = `${usuarioAtual.id}/avatar-${Date.now()}.${extensao}`;
        const fotoAnterior = fotoAtual;

        try {
            const { error: uploadError } = await window.db.storage
                .from(BUCKET_AVATARES)
                .upload(novoCaminho, arquivo, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: arquivo.type
                });

            if (uploadError) throw uploadError;

            const { data: pathSalvo, error: rpcError } = await window.db.rpc(
                "atualizar_foto_perfil",
                { p_foto_path: novoCaminho }
            );

            if (rpcError) {
                await removerObjetoSilenciosamente(novoCaminho);
                throw rpcError;
            }

            fotoAtual = pathSalvo || novoCaminho;
            renderizarAvatar();

            if (fotoAnterior && fotoAnterior !== fotoAtual && ehCaminhoDoBucket(fotoAnterior)) {
                await removerObjetoSilenciosamente(fotoAnterior);
            }

            notificar(
                "Sua foto de perfil foi atualizada.",
                "sucesso",
                "Foto atualizada"
            );
        } catch (erro) {
            console.error("Erro ao atualizar foto:", erro);
            notificar(
                erro?.message || "Não foi possível atualizar sua foto.",
                "erro",
                "Erro ao enviar foto"
            );
        } finally {
            if (input) input.value = "";
            definirCarregandoFoto(false);
            if (botao && antigoHTML) botao.innerHTML = antigoHTML;
        }
    }

    async function removerFoto() {
        if (!fotoAtual || !usuarioAtual) return;

        const confirmou = await confirmar({
            titulo: "Remover foto?",
            mensagem: "Sua foto de perfil será removida.",
            textoConfirmar: "Remover foto",
            textoCancelar: "Cancelar",
            perigo: true
        });

        if (!confirmou) return;

        const fotoAnterior = fotoAtual;
        definirCarregandoFoto(true, "Removendo...");

        try {
            const { error } = await window.db.rpc(
                "atualizar_foto_perfil",
                { p_foto_path: null }
            );

            if (error) throw error;

            fotoAtual = null;
            renderizarAvatar();

            if (ehCaminhoDoBucket(fotoAnterior)) {
                await removerObjetoSilenciosamente(fotoAnterior);
            }

            notificar(
                "Foto de perfil removida.",
                "sucesso",
                "Foto removida"
            );
        } catch (erro) {
            console.error("Erro ao remover foto:", erro);
            notificar(
                erro?.message || "Não foi possível remover sua foto.",
                "erro",
                "Erro ao remover"
            );
        } finally {
            definirCarregandoFoto(false);
        }
    }

    async function excluirConta() {
        if (!usuarioAtual) return;

        const confirmou = await confirmar({
            titulo: "Excluir sua conta?",
            mensagem:
                "Esta ação desativa sua conta, seus endereços e suas lojas. O histórico de pedidos será preservado.",
            textoConfirmar: "Continuar",
            textoCancelar: "Cancelar",
            perigo: true
        });

        if (!confirmou) return;

        const texto = window.prompt(
            'Para confirmar a exclusão da conta, digite exatamente: EXCLUIR'
        );

        if (texto !== "EXCLUIR") {
            notificar(
                "A exclusão foi cancelada porque a confirmação não correspondeu.",
                "info",
                "Conta preservada"
            );
            return;
        }

        const botao = document.getElementById("btn-excluir-conta-rf04");
        const htmlOriginal = botao?.innerHTML;

        if (botao) {
            botao.disabled = true;
            botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Excluindo...';
        }

        try {
            const fotoAnterior = fotoAtual;

            if (fotoAnterior && ehCaminhoDoBucket(fotoAnterior)) {
                await removerObjetoSilenciosamente(fotoAnterior);
            }

            const { data, error } = await window.db.rpc("excluir_minha_conta");
            if (error) throw error;

            if (!data?.conta_excluida) {
                throw new Error("Não foi possível confirmar a exclusão da conta.");
            }

            sessionStorage.setItem("conta_excluida_rf04", "1");

            localStorage.removeItem("loja_id");
            localStorage.removeItem("nome_loja");
            localStorage.removeItem("carrinho");

            await window.db.auth.signOut();

            window.location.href = "login.html?conta=excluida";
        } catch (erro) {
            console.error("Erro ao excluir conta:", erro);
            notificar(
                erro?.message || "Não foi possível excluir sua conta.",
                "erro",
                "Erro ao excluir conta",
                6000
            );

            if (botao) {
                botao.disabled = false;
                botao.innerHTML = htmlOriginal || "Excluir minha conta";
            }
        }
    }

    function definirCarregandoFoto(carregando, texto = "Processando...") {
        const alterar = document.getElementById("perfil-foto-alterar-rf04");
        const remover = document.getElementById("perfil-foto-remover-rf04");

        if (alterar) {
            alterar.disabled = carregando;
            if (carregando) {
                alterar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${texto}`;
            } else {
                alterar.innerHTML = '<i class="fa-solid fa-camera"></i> Alterar foto';
            }
        }

        if (remover) remover.disabled = carregando;
    }

    function extensaoPorMime(mime) {
        if (mime === "image/png") return "png";
        if (mime === "image/webp") return "webp";
        return "jpg";
    }

    function ehCaminhoDoBucket(valor) {
        const caminho = String(valor || "").trim();
        return Boolean(
            caminho &&
            !/^https?:\/\//i.test(caminho) &&
            caminho.startsWith(`${usuarioAtual?.id}/`)
        );
    }

    async function removerObjetoSilenciosamente(caminho) {
        try {
            const { error } = await window.db.storage
                .from(BUCKET_AVATARES)
                .remove([caminho]);

            if (error) {
                console.warn("Não foi possível remover o arquivo antigo do avatar:", error);
            }
        } catch (erro) {
            console.warn("Falha ao limpar avatar antigo:", erro);
        }
    }

    async function confirmar(opcoes) {
        if (typeof window.confirmarAcao === "function") {
            return Boolean(await window.confirmarAcao(opcoes));
        }

        return window.confirm(opcoes?.mensagem || "Confirmar ação?");
    }

    function notificar(texto, tipo = "info", titulo = null, duracao = 4000) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(texto, tipo, titulo, duracao);
            return;
        }

        console.log(`[${tipo}] ${titulo || ""}`, texto);
    }

    function escaparAtributo(valor) {
        return String(valor || "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function iniciarAutomaticamente() {
        window.iniciarPerfilConta().catch((erro) => {
            console.error("Erro ao iniciar recursos de conta do perfil:", erro);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarAutomaticamente, { once: true });
    } else {
        iniciarAutomaticamente();
    }
})();
