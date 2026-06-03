const supabaseUrl = 'https://ikrsxmjrdnhyecjchjju.supabase.co';
const supabaseKey = 'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const ETAPAS_ENTREGA = [
    { status: 'Recebido', icone: '📋', titulo: 'Pedido recebido', descricao: 'Recebemos seu pedido e estamos organizando.' },
    { status: 'Preparando', icone: '📦', titulo: 'Em preparação', descricao: 'Separando os produtos no estoque.' },
    { status: 'Saiu para entrega', icone: '🚚', titulo: 'Saiu para entrega', descricao: 'O entregador está a caminho do seu endereço.' },
    { status: 'Entregue', icone: '✅', titulo: 'Entregue', descricao: 'Pedido entregue com sucesso!' }
];

const ORDEM_STATUS = {
    'Recebido': 0,
    'Preparando': 1,
    'Saiu para entrega': 2,
    'Entregue': 3,
    'Cancelado': -1
};

function corDoStatus(status) {
    if (status === 'Entregue') return '#198754';
    if (status === 'Saiu para entrega') return '#0d6efd';
    if (status === 'Preparando') return '#17a2b8';
    if (status === 'Cancelado') return '#dc3545';
    return '#ffc107';
}

function indiceStatus(status) {
    const s = status || 'Recebido';
    return ORDEM_STATUS[s] !== undefined ? ORDEM_STATUS[s] : 0;
}

function montarTimeline(statusAtual) {
    if (statusAtual === 'Cancelado') {
        return `
            <ul class="timeline-entrega">
                <li class="cancelada atual">
                    <span class="etapa-icone">❌</span>
                    <h4>Pedido cancelado</h4>
                    <p>Este pedido foi cancelado. Entre em contato se precisar de ajuda.</p>
                </li>
            </ul>
        `;
    }

    const indiceAtual = indiceStatus(statusAtual);

    return `
        <ul class="timeline-entrega">
            ${ETAPAS_ENTREGA.map((etapa, i) => {
                let classe = '';
                if (i < indiceAtual) classe = 'concluida';
                else if (i === indiceAtual) classe = 'atual';
                return `
                    <li class="${classe}">
                        <span class="etapa-icone">${etapa.icone}</span>
                        <h4>${etapa.titulo}</h4>
                        <p>${etapa.descricao}</p>
                    </li>
                `;
            }).join('')}
        </ul>
    `;
}

function montarItensPedido(produtos) {
    if (!produtos || !Array.isArray(produtos) || produtos.length === 0) {
        return '';
    }
    const lista = produtos.map(p =>
        `<li>${p.quantidade}x ${p.nome} — R$ ${(p.preco * p.quantidade).toFixed(2)}</li>`
    ).join('');

    return `
        <details class="pedido-rastreio-itens">
            <summary>Ver itens do pedido (${produtos.length})</summary>
            <ul style="margin-top: 10px; padding-left: 18px;">${lista}</ul>
        </details>
    `;
}

function renderizarPedido(pedido, ehAtivo) {
    const status = pedido.status || 'Recebido';
    const dataPedido = new Date(pedido.created_at).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const idCurto = pedido.id.substring(0, 8).toUpperCase();

    return `
        <article class="pedido-rastreio${ehAtivo ? ' ativo' : ''}">
            <div class="pedido-rastreio-cabecalho">
                <div class="pedido-rastreio-id">
                    Pedido
                    <strong>#${idCurto}</strong>
                    <span style="font-size: 12px;">📅 ${dataPedido}</span>
                </div>
                <div style="text-align: right;">
                    <span class="status-rastreio-badge" style="background: ${corDoStatus(status)};">
                        ${status}
                    </span>
                    <div class="pedido-rastreio-total" style="margin-top: 8px;">
                        R$ ${Number(pedido.total).toFixed(2)}
                    </div>
                </div>
            </div>
            ${montarTimeline(status)}
            ${montarItensPedido(pedido.produtos)}
        </article>
    `;
}

function mostrarLoginNecessario(container) {
    container.innerHTML = `
        <div class="rastreamento-aviso">
            <h2>🔒 Faça login para rastrear</h2>
            <p>Entre na sua conta para ver o andamento das suas encomendas em tempo real.</p>
            <a href="index.html" class="btn-rastreamento-login">Ir para o Início e Entrar</a>
        </div>
    `;
}

function mostrarSemPedidos(container) {
    container.innerHTML = `
        <div class="rastreamento-aviso rastreamento-vazio">
            <h2>📭 Nenhum pedido ainda</h2>
            <p>Quando você finalizar uma compra, ela aparecerá aqui para acompanhamento.</p>
            <a href="index.html">Fazer compras agora →</a>
        </div>
    `;
}

async function carregarRastreamento() {
    const container = document.getElementById('rastreamento-conteudo');
    const usuarioLogado = JSON.parse(localStorage.getItem('usuario_logado'));

    if (!usuarioLogado) {
        mostrarLoginNecessario(container);
        return;
    }

    const { data: pedidos, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .eq('id_usuario', usuarioLogado.id)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `
            <div class="rastreamento-aviso">
                <h2>❌ Erro ao carregar</h2>
                <p>Não foi possível buscar seus pedidos. Tente novamente em instantes.</p>
            </div>
        `;
        return;
    }

    if (!pedidos || pedidos.length === 0) {
        mostrarSemPedidos(container);
        return;
    }

    const pedidoEmAndamento = pedidos.find(p => {
        const s = p.status || 'Recebido';
        return s !== 'Entregue' && s !== 'Cancelado';
    });
    const idAtivo = pedidoEmAndamento ? pedidoEmAndamento.id : pedidos[0].id;

    container.innerHTML = pedidos.map(pedido =>
        renderizarPedido(pedido, pedido.id === idAtivo)
    ).join('');
}

document.addEventListener('DOMContentLoaded', carregarRastreamento);
