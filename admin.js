// =========================
// 🔥 SUPABASE
// =========================

const supabaseUrl =
'https://ikrsxmjrdnhyecjchjju.supabase.co';

const supabaseKey =
'sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET';

const supabaseClient =
supabase.createClient(
    supabaseUrl,
    supabaseKey
);

// =========================
// ➕ SALVAR PRODUTO
// =========================

async function salvarProduto() {

    const produto = {

        nome:
            document.getElementById('nome').value,

        preco:
            Number(
                document.getElementById('preco').value
            ),

        preco_antigo:
            Number(
                document.getElementById('preco_antigo').value
            ),

        desconto:
            document.getElementById('desconto').value,

        img:
            document.getElementById('imagem').value,

        categoria:
            document.getElementById('categoria').value

    };

    const { error } =
        await supabaseClient
        .from('produtos')
        .insert([produto]);

    if (error) {

        alert(error.message);
        return;

    }

    alert('✅ Produto cadastrado com sucesso!');

    limparFormulario();

    carregarProdutos();
}

// =========================
// 📦 LISTAR PRODUTOS
// =========================

async function carregarProdutos() {

    const { data, error } =
        await supabaseClient
        .from('produtos')
        .select('*')
        .order('id', {
            ascending: false
        });

    if (error) {

        alert(error.message);
        return;

    }

    const container =
        document.getElementById(
            'lista-produtos'
        );

    container.innerHTML = '';

    data.forEach(produto => {

        container.innerHTML += `

            <div class="card">

                <img
                    src="${produto.img}"
                    alt="${produto.nome}"
                >

                <h3>
                    ${produto.nome}
                </h3>

                <div class="preco">
                    R$ ${Number(produto.preco).toFixed(2)}
                </div>

                <div class="preco-antigo">
                    R$ ${Number(produto.preco_antigo).toFixed(2)}
                </div>

                <div class="desconto">
                    ${produto.desconto}
                </div>

                <p>
                    Categoria:
                    ${produto.categoria}
                </p>

                <div class="acoes">

                    <button
                        class="btn-editar"
                        onclick="editarProduto('${produto.id}')"
                    >
                        Editar
                    </button>

                    <button
                        class="btn-excluir"
                        onclick="excluirProduto('${produto.id}')"
                    >
                        Excluir
                    </button>

                </div>

            </div>

        `;

    });

}

// =========================
// ❌ EXCLUIR PRODUTO
// =========================

async function excluirProduto(id) {

    const confirmar =
        confirm(
            'Deseja excluir esse produto?'
        );

    if (!confirmar) return;

    const { error } =
        await supabaseClient
        .from('produtos')
        .delete()
        .eq('id', id);

    if (error) {

        alert(error.message);
        return;

    }

    alert('🗑️ Produto excluído!');

    carregarProdutos();

}

// =========================
// ✏️ EDITAR PRODUTO
// =========================

async function editarProduto(id) {

    const novoNome =
        prompt('Novo nome do produto');

    if (!novoNome) return;

    const { error } =
        await supabaseClient
        .from('produtos')
        .update({
            nome: novoNome
        })
        .eq('id', id);

    if (error) {

        alert(error.message);
        return;

    }

    alert('✏️ Produto atualizado!');

    carregarProdutos();

}

// =========================
// 🧹 LIMPAR FORMULÁRIO
// =========================

function limparFormulario() {

    document.getElementById('nome').value = '';

    document.getElementById('preco').value = '';

    document.getElementById('preco_antigo').value = '';

    document.getElementById('desconto').value = '';

    document.getElementById('imagem').value = '';

    document.getElementById('categoria').value = '';

}

// =========================
// 🚀 INICIAR
// =========================

window.onload = () => {

    carregarProdutos();

};
// =========================
// 🛒 CARREGAR PEDIDOS
// =========================

async function carregarPedidos(){

    const { data, error } =
    await supabaseClient
    .from('pedidos')
    .select('*')
    .order('id', {
        ascending:false
    });

    if(error){

        console.log(error);

        return;
    }

    const container =
    document.getElementById(
        'lista-pedidos'
    );

    if(!container) return;

    container.innerHTML = '';

    data.forEach(pedido => {

        let produtosHTML = '';

        pedido.produtos.forEach(produto => {

            produtosHTML += `
                <li>
                    ${produto.nome}
                    (${produto.quantidade}x)
                </li>
            `;
        });

        container.innerHTML += `

            <div class="pedido-card">

                <h3>
                    Pedido #${pedido.id}
                </h3>

                <p>
                    👤 ${pedido.cliente}
                </p>

                <p>
                    📞 ${pedido.telefone}
                </p>

                <p>
                    📍 ${pedido.endereco}
                </p>

                <p>
                    💳 ${pedido.pagamento}
                </p>

                <p>
                    💰 R$ ${pedido.total}
                </p>

                <p>
                    📦 Status:
                    <strong>
                        ${pedido.status}
                    </strong>
                </p>

                <ul>
                    ${produtosHTML}
                </ul>

                <select
                    onchange="
                    atualizarStatus(
                        '${pedido.id}',
                        this.value
                    )"
                >

                    <option>
                        ${pedido.status}
                    </option>

                    <option>
                        Recebido
                    </option>

                    <option>
                        Preparando
                    </option>

                    <option>
                        Saiu para entrega
                    </option>

                    <option>
                        Entregue
                    </option>

                </select>

            </div>

        `;
    });
}

// =========================
// 🔄 STATUS
// =========================

async function atualizarStatus(
    id,
    status
){

    await supabaseClient
    .from('pedidos')
    .update({
        status: status
    })
    .eq('id', id);

    carregarPedidos();
}
// =========================
// 🔐 VERIFICAR ADMIN
// =========================

async function verificarAdmin(){

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if(!user){

        alert('Faça login como administrador');

        window.location.href = 'index.html';

        return;
    }

    // EMAIL DO ADMIN
    const adminEmail =
    'gabriel@gmail.com';

    if(user.email !== adminEmail){

        alert('Acesso negado!');

        window.location.href = 'index.html';

    }

}
// =========================
// 🚀 INICIAR
// =========================

window.onload = async () => {

    await verificarAdmin();

    carregarProdutos();

    carregarPedidos();
};