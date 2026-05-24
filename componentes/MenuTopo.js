class MenuTopo extends HTMLElement {
    constructor() {
        super();
    }

    async connectedCallback() {
        try {
            // O JavaScript vai buscar o arquivo HTML que criamos no Passo 2
            const resposta = await fetch('componentes/MenuTopo.html');
            if (!resposta.ok) throw new Error(`Erro ao carregar: ${resposta.status}`);

            const html = await resposta.text();
            this.innerHTML = html;
        } catch (erro) {
            console.error("Falha ao carregar o componente MenuTopo:", erro);
            this.innerHTML = `<div style="color: red; padding: 10px;">⚠️ Erro ao carregar o topo do painel.</div>`;
        }
    }
}

// Cria a tag oficial <menu-topo></menu-topo>
customElements.define('menu-topo', MenuTopo);