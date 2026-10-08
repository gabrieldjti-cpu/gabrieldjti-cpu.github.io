const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const migration = ler("supabase/migrations/20261008000000_classificados_aprovacao_anuncios.sql");

test("anúncios existentes ficam aprovados e os novos nascem pendentes", () => {
    assert.match(migration, /add column status_aprovacao text not null default 'aprovado'/);
    assert.match(migration, /alter column status_aprovacao set default 'pendente'/);
    assert.match(migration, /check \(status_aprovacao in \('pendente', 'aprovado', 'rejeitado'\)\)/);
    assert.doesNotMatch(migration, /drop table|drop column|truncate|delete from/i);
});

test("o público só enxerga anúncio aprovado", () => {
    const politicas = migration.match(/alter policy[\s\S]*?;/g) || [];
    assert.equal(politicas.length, 2);
    for (const politica of politicas) {
        assert.match(politica, /status_aprovacao = 'aprovado'/);
    }
});

test("o dono não se aprova e a edição do lojista não altera o que está no ar", () => {
    const inicio = migration.indexOf("function private.controlar_aprovacao_anuncio()");
    const corpo = migration.slice(inicio, migration.indexOf("$$;", inicio));

    assert.match(corpo, /new\.status_aprovacao := 'pendente'/);
    assert.match(corpo, /new\.status_aprovacao := old\.status_aprovacao/);
    assert.match(corpo, /insert into public\.edicoes_anuncio/);
    assert.match(corpo, /new\.preco := old\.preco/);
    assert.match(corpo, /if v_tipo = 'pessoal' then\s+return new;/);
    assert.doesNotMatch(corpo, /new\.estoque|new\.ativo/);
});

test("somente o administrador decide", () => {
    for (const funcao of ["listar_fila_anuncios_admin", "decidir_anuncio_admin", "decidir_edicao_anuncio_admin"]) {
        const inicio = migration.indexOf(`function public.${funcao}`);
        assert.ok(inicio > -1, `${funcao} deveria existir`);
        assert.match(migration.slice(inicio, migration.indexOf("$$;", inicio)), /_usuario_e_admin/);
        assert.match(migration, new RegExp(`revoke all on function public\\.${funcao}\\([^)]*\\)\\s+from public, anon`));
    }
    assert.match(migration, /revoke all on table public\.edicoes_anuncio from anon, authenticated/);
});

test("a tela da fila decide por RPC, exige motivo e escapa o conteúdo", () => {
    const html = ler("admin-anuncios.html");
    const codigo = ler("js/admin-anuncios.js");

    assert.match(html, /id="listaFilaAnuncios"/);
    assert.match(html, /js\/admin-anuncios\.js/);
    assert.match(codigo, /rpc\("sou_admin"\)/);
    assert.match(codigo, /rpc\("listar_fila_anuncios_admin"\)/);
    assert.match(codigo, /decidir_edicao_anuncio_admin/);
    assert.match(codigo, /decidir_anuncio_admin/);
    assert.match(codigo, /motivo\.length < 5/);
    assert.match(codigo, /function escapar/);
    assert.doesNotMatch(codigo, /\.from\("produtos"\)/);
});

test("todas as páginas do admin levam à fila", () => {
    for (const pagina of fs.readdirSync(raiz).filter(a => /^admin-.*\.html$/.test(a))) {
        assert.match(ler(pagina), /href="admin-anuncios\.html"/, `${pagina} sem link para a fila`);
    }
});

test("o anunciante vê a situação de aprovação", () => {
    assert.match(ler("js/meus-anuncios.js"), /Aguardando aprovação/);
    assert.match(ler("js/meus-anuncios.js"), /motivo_rejeicao/);
    assert.match(ler("js/produtos.js"), /criarSeloAprovacaoProduto/);
    assert.match(ler("js/novo-produto.js"), /enviado para aprovação/);
    assert.match(ler("js/editar-produto.js"), /depois da aprovação/);
});
