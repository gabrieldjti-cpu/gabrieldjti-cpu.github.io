// =========================
// 🔥 SUPABASE
// =========================

const supabaseUrl =
'https://ikrsxmjrdnhyecjchjju.supabase.co/rest/v1/';

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

async function salvarProduto(){

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

        imagem:
            document.getElementById('imagem').value,

        categoria:
            document.getElementById('categoria').value

    };

    const { error } =
        await supabaseClient
        .from('produtos')
        .insert([produto]);

    if(error){

        alert(error.message);
        return;

    }

    alert('Produto cadastrado!');

    limparFormulario();

    carregarProdutos();

}

// =========================
// 📦 LISTAR PRODUTOS
// =========================

async function carregarProdutos(){

    const { data, error } =
        await supabaseClient
        .from('produtos')
        .select('*')
        .order('created_at', {
            ascending:false
        });

    if(error){

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

                <img src="${produto.imagem}">

                <h3>
                    ${produto.nome}
                </h3>

                <div class="preco">
                    R$ ${produto.preco}
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
// ❌ EXCLUIR
// =========================

async function excluirProduto(id){

    const confirmar =
        confirm(
            'Deseja excluir esse produto?'
        );

    if(!confirmar) return;

    const { error } =
        await supabaseClient
        .from('produtos')
        .delete()
        .eq('id', id);

    if(error){

        alert(error.message);
        return;

    }

    carregarProdutos();

}

// =========================
// ✏️ EDITAR
// =========================

async function editarProduto(id){

    const novoNome =
        prompt('Novo nome');

    if(!novoNome) return;

    const { error } =
        await supabaseClient
        .from('produtos')
        .update({
            nome: novoNome
        })
        .eq('id', id);

    if(error){

        alert(error.message);
        return;

    }

    carregarProdutos();

}

// =========================
// 🧹 LIMPAR
// =========================

function limparFormulario(){

    document.getElementById('nome').value = '';
    document.getElementById('preco').value = '';
    document.getElementById('preco_antigo').value = '';
    document.getElementById('desconto').value = '';
    document.getElementById('imagem').value = '';

}

// =========================
// 🚀 INICIAR
// =========================

carregarProdutos();

window.onload = () => {
    verificarAdmin();
    carregarProdutos();
};