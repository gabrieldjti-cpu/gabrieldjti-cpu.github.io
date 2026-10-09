const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const migration = ler("supabase/migrations/20261009010000_classificados_interesse_avaliacoes.sql");

function corpo(nome) {
    const inicio = migration.indexOf(`function public.${nome}(`);
    assert.ok(inicio >= 0, nome);
    return migration.slice(inicio, migration.indexOf("$$;", inicio));
}

test("as tabelas novas ficam fechadas: tudo passa por funções", () => {
    for (const tabela of ["interesses_anuncio", "vendas_anuncio", "avaliacoes_vendedor"]) {
        assert.match(migration, new RegExp(`alter table public\\.${tabela} enable row level security`));
        assert.match(migration, new RegExp(`revoke all on table public\\.${tabela} from public, anon, authenticated`));
    }
    assert.match(migration, /constraint interesses_anuncio_unico unique \(produto_id, interessado_id\)/);
    assert.match(migration, /venda_id uuid not null unique/);
});

test("só quem não é o dono demonstra interesse, e só em anúncio no ar", () => {
    const f = corpo("registrar_interesse_anuncio");
    assert.match(f, /private\.anuncio_publico\(p_produto_id\)/);
    assert.match(f, /Este anúncio é seu/);
    assert.match(f, /'interessados\.html'/);
});

test("pedir confirmação: uma vez a cada 24 horas e só antes da venda", () => {
    const f = corpo("pedir_confirmacao_venda");
    assert.match(f, /interval '24 hours'/);
    assert.match(f, /já confirmou esta venda/);
});

test("só o dono confirma a venda; só o comprador avalia, uma vez", () => {
    const confirmar = corpo("confirmar_venda_anuncio");
    assert.match(confirmar, /v_dados\.proprietario_id is distinct from v_uid/);
    assert.match(confirmar, /p_marcar_indisponivel/);
    const avaliar = corpo("avaliar_vendedor");
    assert.match(avaliar, /v_venda\.comprador_id is distinct from v_uid/);
    assert.match(avaliar, /Você já avaliou esta compra/);
    assert.match(avaliar, /p_nota < 1 or p_nota > 5/);
});

test("avaliações públicas mostram só o primeiro nome de quem avaliou", () => {
    const f = corpo("listar_avaliacoes_vendedor");
    assert.match(f, /split_part\(trim\(pr\.nome\), ' ', 1\)/);
    assert.match(migration, /grant execute on function public\.listar_avaliacoes_vendedor\(uuid, integer\) to anon, authenticated/);
});

test("páginas: anúncio, interessados e loja", () => {
    assert.match(ler("produto.html"), /js\/interesse-anuncio\.js/);
    const interesse = ler("js/interesse-anuncio.js");
    for (const rpc of ["meu_interesse_anuncio", "registrar_interesse_anuncio", "pedir_confirmacao_venda", "avaliar_vendedor"]) {
        assert.match(interesse, new RegExp(`"${rpc}"`));
    }
    assert.match(ler("interessados.html"), /js\/interessados\.js/);
    assert.match(ler("js/interessados.js"), /rpc\("confirmar_venda_anuncio"/);
    assert.match(ler("loja.html"), /js\/avaliacoes-vendedor\.js/);
    assert.match(ler("meus-anuncios.html"), /href="interessados\.html"/);
    assert.match(ler("painel-loja.html"), /href="interessados\.html"/);
});

test("o aviso antigo de estoque baixo fica desligado", () => {
    const inicio = migration.indexOf("function private.notificar_estoque_baixo");
    const f = migration.slice(inicio, migration.indexOf("$$;", inicio));
    assert.match(f, /begin\s+return new;\s+end;/);
});
