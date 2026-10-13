// ==========================================
// ANUNCIO-FOTOS.JS
// Até 5 fotos por anúncio: a principal (campo "Imagem do Produto") e
// mais 4 aqui. Funciona no formulário novo e na edição.
//  * No anúncio novo, as fotos extras são enviadas logo depois que o
//    anúncio é salvo.
//  * Na edição (lojista), as fotos já salvas aparecem com "Remover" e
//    dá para acrescentar até completar 4. Foto nova em anúncio aprovado
//    vai para a aprovação do admin junto com a edição.
// O banco confere o limite e a aprovação; aqui é só a parte da tela.
// ==========================================

(() => {
    "use strict";

    const MAX_EXTRAS = 4;
    const TAMANHO_MAXIMO = 5 * 1024 * 1024;
    const TIPOS = ["image/jpeg", "image/png", "image/webp"];

    let existentes = [];   // { id, imagem_url, pendente }
    let novas = [];        // { arquivo, url }

    const $ = id => document.getElementById(id);

    function avisar(mensagem, tipo = "aviso", titulo = "Fotos") {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, tipo, titulo, 4500);
        } else if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo, 4500);
        }
    }

    function vagas() {
        return Math.max(0, MAX_EXTRAS - existentes.length - novas.length);
    }

    function escapar(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;");
    }

    function renderizar() {
        const lista = $("listaFotosExtras");
        const ajuda = $("ajudaFotosExtras");
        const input = $("fotosExtras");
        if (!lista) return;

        const itens = [
            ...existentes.map(foto => `
                <figure class="foto-extra">
                    <img src="${escapar(foto.imagem_url)}" alt="Foto do anúncio">
                    ${foto.pendente ? '<figcaption>Aguardando aprovação</figcaption>' : ""}
                    <button type="button" data-remover-existente="${escapar(foto.id)}" aria-label="Remover foto">
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </figure>
            `),
            ...novas.map((foto, indice) => `
                <figure class="foto-extra nova">
                    <img src="${escapar(foto.url)}" alt="Nova foto do anúncio">
                    <figcaption>Nova</figcaption>
                    <button type="button" data-remover-nova="${indice}" aria-label="Tirar esta foto">
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </figure>
            `)
        ];

        lista.innerHTML = itens.join("");

        const restantes = vagas();
        if (ajuda) {
            ajuda.textContent = restantes > 0
                ? `Você pode colocar mais ${restantes} ${restantes === 1 ? "foto" : "fotos"} (até 5 no total, contando a principal).`
                : "Limite atingido: 5 fotos no total, contando a principal.";
        }
        if (input) input.disabled = restantes === 0;
    }

    function adicionarArquivos(lista) {
        const arquivos = [...(lista || [])];
        let ignoradas = 0;

        for (const arquivo of arquivos) {
            if (vagas() === 0) {
                ignoradas += 1;
                continue;
            }
            if (!TIPOS.includes(arquivo.type)) {
                avisar(`"${arquivo.name}" não é JPG, PNG ou WEBP.`);
                continue;
            }
            if (arquivo.size > TAMANHO_MAXIMO) {
                avisar(`"${arquivo.name}" passa de 5 MB.`);
                continue;
            }
            novas.push({ arquivo, url: URL.createObjectURL(arquivo) });
        }

        if (ignoradas > 0) {
            avisar(`O anúncio pode ter até 5 fotos. ${ignoradas} ${ignoradas === 1 ? "foto ficou" : "fotos ficaram"} de fora.`);
        }

        renderizar();
    }

    async function removerExistente(id) {
        if (!window.confirm("Remover esta foto do anúncio?")) return;
        try {
            const { error } = await window.db.from("produto_imagens").delete().eq("id", id);
            if (error) throw error;
            existentes = existentes.filter(foto => String(foto.id) !== String(id));
            renderizar();
            avisar("Foto removida.", "sucesso");
        } catch (erro) {
            console.error("Erro ao remover foto:", erro);
            avisar(erro?.message || "Não foi possível remover a foto.", "erro", "Erro");
        }
    }

    async function carregarExistentes() {
        const produtoId = new URLSearchParams(window.location.search).get("id");
        if (!produtoId || !window.db || !window.location.pathname.includes("editar-produto")) return;

        try {
            const { data, error } = await window.db
                .from("produto_imagens")
                .select("id,imagem_url,ordem,pendente")
                .eq("produto_id", produtoId)
                .order("ordem", { ascending: true });
            if (error) throw error;
            existentes = data || [];
            renderizar();
        } catch (erro) {
            console.warn("Não foi possível carregar as fotos do anúncio:", erro);
        }
    }

    async function enviarArquivo(lojaId, arquivo) {
        const extensao = (arquivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const caminho = `${lojaId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extensao || "jpg"}`;

        const { error } = await window.db.storage
            .from("produtos")
            .upload(caminho, arquivo, { cacheControl: "3600", upsert: false });
        if (error) throw error;

        const { data } = window.db.storage.from("produtos").getPublicUrl(caminho);
        if (!data?.publicUrl) throw new Error("Não foi possível obter o endereço da foto.");
        return data.publicUrl;
    }

    // Chamado pelos formulários depois de salvar o anúncio.
    async function enviar(produtoId, lojaId) {
        if (!produtoId || !lojaId || novas.length === 0) return { enviadas: 0, falhas: 0 };

        let ordem = existentes.reduce((maior, foto) => Math.max(maior, Number(foto.ordem) || 0), 0);
        let enviadas = 0;
        let falhas = 0;

        for (const foto of novas) {
            try {
                const url = await enviarArquivo(lojaId, foto.arquivo);
                ordem += 1;
                const { error } = await window.db
                    .from("produto_imagens")
                    .insert({ produto_id: produtoId, imagem_url: url, ordem });
                if (error) throw error;
                enviadas += 1;
            } catch (erro) {
                console.error("Erro ao enviar foto extra:", erro);
                falhas += 1;
            }
        }

        novas = [];
        if (falhas > 0) {
            avisar(`${falhas} ${falhas === 1 ? "foto não foi enviada" : "fotos não foram enviadas"}. Você pode tentar de novo depois.`, "aviso");
        }
        return { enviadas, falhas };
    }

    window.anuncioFotos = {
        enviar,
        temNovas: () => novas.length > 0
    };

    function iniciar() {
        $("fotosExtras")?.addEventListener("change", evento => {
            adicionarArquivos(evento.target.files);
            evento.target.value = "";
        });

        $("listaFotosExtras")?.addEventListener("click", evento => {
            const existente = evento.target.closest("[data-remover-existente]");
            if (existente) {
                removerExistente(existente.dataset.removerExistente);
                return;
            }
            const nova = evento.target.closest("[data-remover-nova]");
            if (nova) {
                const indice = Number(nova.dataset.removerNova);
                const [removida] = novas.splice(indice, 1);
                if (removida?.url) URL.revokeObjectURL(removida.url);
                renderizar();
            }
        });

        renderizar();
        carregarExistentes();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
