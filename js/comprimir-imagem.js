// ==========================================
// COMPRIMIR-IMAGEM.JS
// Diminui a foto no próprio celular/computador antes de enviar:
// o lado maior fica com até 1600 px e o arquivo vira JPEG (qualidade
// 0,82). Uma foto de celular de 3 a 5 MB costuma cair para 200 a 400 KB,
// e o anúncio abre bem mais rápido.
// Se algo der errado (navegador antigo, formato estranho), envia a foto
// original, sem travar o anúncio.
// ==========================================

(() => {
    "use strict";

    const LADO_MAXIMO = 1600;
    const QUALIDADE = 0.82;
    const PEQUENA_DEMAIS = 300 * 1024; // abaixo disso, só redimensiona se for enorme

    function carregarImagem(arquivo) {
        if (typeof createImageBitmap === "function") {
            return createImageBitmap(arquivo, { imageOrientation: "from-image" })
                .catch(() => createImageBitmap(arquivo));
        }

        return new Promise((resolver, rejeitar) => {
            const url = URL.createObjectURL(arquivo);
            const imagem = new Image();
            imagem.onload = () => {
                URL.revokeObjectURL(url);
                resolver(imagem);
            };
            imagem.onerror = erro => {
                URL.revokeObjectURL(url);
                rejeitar(erro);
            };
            imagem.src = url;
        });
    }

    async function comprimirImagem(arquivo) {
        try {
            if (!arquivo || !/^image\/(jpeg|png|webp)$/.test(arquivo.type)) return arquivo;

            const imagem = await carregarImagem(arquivo);
            const largura = imagem.width;
            const altura = imagem.height;
            if (!largura || !altura) return arquivo;

            const escala = Math.min(1, LADO_MAXIMO / Math.max(largura, altura));
            if (escala === 1 && arquivo.size <= PEQUENA_DEMAIS) {
                imagem.close?.();
                return arquivo;
            }

            const canvas = document.createElement("canvas");
            canvas.width = Math.round(largura * escala);
            canvas.height = Math.round(altura * escala);
            const contexto = canvas.getContext("2d");

            // PNG com fundo transparente vira fundo branco no JPEG.
            contexto.fillStyle = "#ffffff";
            contexto.fillRect(0, 0, canvas.width, canvas.height);
            contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
            imagem.close?.();

            const blob = await new Promise(resolver => canvas.toBlob(resolver, "image/jpeg", QUALIDADE));
            if (!blob || blob.size >= arquivo.size) return arquivo;

            const nome = String(arquivo.name || "foto").replace(/\.[^/.]+$/, "") + ".jpg";
            return new File([blob], nome, { type: "image/jpeg", lastModified: Date.now() });
        } catch (erro) {
            console.warn("Não foi possível diminuir a foto; enviando a original.", erro);
            return arquivo;
        }
    }

    window.comprimirImagem = comprimirImagem;
})();
