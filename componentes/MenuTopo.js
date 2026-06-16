class MenuTopo extends HTMLElement {
    constructor() {
        super();
    }

    async connectedCallback() {
        try {
            // Busca o arquivo HTML do componente
            const resposta = await fetch('componentes/MenuTopo.html');
            if (!resposta.ok) throw new Error(`Erro ao carregar: ${resposta.status}`);

            const html = await resposta.text();
            this.innerHTML = html;

            // 🚀 O PULO DO GATO: Agora que o HTML foi inserido, roda a validação do Admin
            this.verificarPermissaoAdmin();

        } catch (erro) {
            console.error("Falha ao carregar o componente MenuTopo:", erro);
            this.innerHTML = `<div style="color: red; padding: 10px;">⚠️ Erro ao carregar o topo do painel.</div>`;
        }
    }

    // Função interna da classe para gerenciar a exibição do botão
    verificarPermissaoAdmin() {
        try {
            const raw = localStorage.getItem("usuario_logado");
            const usuarioLogado = raw ? JSON.parse(raw) : null;
            
            // Procuramos o botão especificamente dentro deste componente para evitar conflitos
            const adminBtn = this.querySelector("#btn-admin");

            if (usuarioLogado && adminBtn) {
                const adminEmail = 'gabrieldj.ti@gmail.com';
                const ehAdminGeral = usuarioLogado.email === adminEmail;
                
                // Checa as flags de lojista na sessão atual
                const ehLojista = usuarioLogado.tipo === 'lojista' || 
                                  usuarioLogado.id_lojista || 
                                  usuarioLogado.id_estabelecimento;

                if (ehAdminGeral || ehLojista) {
                    // Remove o display: none do HTML e força o botão a aparecer
                    adminBtn.style.setProperty("display", "inline-block", "important");
                    console.log(`📌 [MenuTopo] Botão Admin exibido para: ${usuarioLogado.nome}`);
                }
            }
        } catch (erro) {
            console.warn("Erro ao processar permissões no MenuTopo:", erro);
        }
    }
}

// Cria a tag oficial <menu-topo></menu-topo>
customElements.define('menu-topo', MenuTopo);