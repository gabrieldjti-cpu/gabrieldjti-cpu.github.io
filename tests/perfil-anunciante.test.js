const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const migration = ler("supabase/migrations/20261007233000_classificados_perfil_anunciante.sql");

test("a migration distingue loja de perfil pessoal sem apagar nada", () => {
    assert.match(migration, /add column tipo text not null default 'loja'/);
    assert.match(migration, /check \(tipo in \('loja', 'pessoal'\)\)/);
    assert.match(migration, /check \(tipo = 'pessoal' or categoria_id is not null\)/);
    assert.doesNotMatch(migration, /drop table|drop column|delete from|truncate/i);
});

test("o perfil pessoal só nasce pela função protegida e o tipo não muda depois", () => {
    assert.match(migration, /current_setting\('app\.perfil_anunciante', true\)/);
    assert.match(migration, /new\.tipo := 'loja';/);
    assert.match(migration, /O tipo do cadastro não pode ser alterado/);
    assert.match(migration, /pg_advisory_xact_lock/);
    assert.match(
        migration,
        /revoke all on function public\.criar_perfil_anunciante\(text, text, text, text\)\s+from public, anon/
    );
});

test("o plano gratuito não edita o anúncio nem recebe assinatura", () => {
    assert.match(migration, /create trigger trg_proteger_edicao_anuncio_gratuito\s+before update on public\.produtos/);
    for (const coluna of ["nome", "descricao", "preco", "preco_promocional", "categoria_id", "imagem_url"]) {
        assert.match(migration, new RegExp(`new\\.${coluna} is distinct from old\\.${coluna}`));
    }
    assert.doesNotMatch(migration, /new\.(estoque|ativo) is distinct from/);
    assert.match(migration, /create trigger trg_exigir_loja_para_assinatura/);
});

test("anunciar pede o contato uma vez e cria o perfil por RPC", () => {
    const html = ler("anunciar.html");
    const codigo = ler("js/anunciar.js");

    for (const id of ["blocoLoginAnunciar", "formPerfilAnunciante", "nomeAnunciante", "whatsappAnunciante", "cidadeAnunciante", "estadoAnunciante"]) {
        assert.match(html, new RegExp(`id="${id}"`));
    }
    assert.match(codigo, /rpc\("criar_perfil_anunciante"/);
    assert.doesNotMatch(codigo, /\.from\("lojas"\)\s*\.insert/);
});

test("meus anúncios só altera disponibilidade e exclusão", () => {
    const codigo = ler("js/meus-anuncios.js");

    assert.match(codigo, /estoque: disponivel \? 0 : 1/);
    assert.match(codigo, /\{ ativo: false \}/);
    assert.doesNotMatch(codigo, /\.delete\(\)/);
    assert.doesNotMatch(codigo, /editar-produto\.html/);
    assert.match(codigo, /function escapar/);
});

test("o cabeçalho oferece Anunciar e as telas de lojista desviam o perfil pessoal", () => {
    const header = ler("components/header.js");
    assert.match(header, /id="btnAnunciar"/);
    assert.match(header, /meus-anuncios\.html/);

    for (const pagina of ["painel-loja.html", "produtos.html", "editar-loja.html", "editar-produto.html", "cadastrar-loja.html"]) {
        assert.match(ler(pagina), /js\/perfil-pessoal\.js/, `${pagina} deveria desviar o perfil pessoal`);
    }
});

test("vitrines de lojas ignoram perfis pessoais", () => {
    assert.match(ler("js/index.js"), /"tipo",\s*"loja"/);
    assert.match(ler("js/pesquisa-global.js"), /\.eq\("tipo", "loja"\)/);
});
