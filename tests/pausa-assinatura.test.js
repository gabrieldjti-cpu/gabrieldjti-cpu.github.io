const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const migration = ler("supabase/migrations/20261008233000_classificados_pausa_assinatura.sql");

test("depois dos 15 dias a loja e os anúncios saem do ar", () => {
    assert.match(migration, /function public\.loja_no_ar/);
    assert.match(migration, /situacao <> 'expirada'/);
    assert.match(migration, /alter policy "Catálogo público e loja do proprietário"[\s\S]*public\.loja_no_ar\(id\)/);
    assert.match(migration, /alter policy "Catálogo público de produtos"[\s\S]*public\.loja_no_ar\(loja_id\)/);
    assert.match(migration, /alter policy "Produtos visíveis ao usuário autenticado"[\s\S]*public\.loja_no_ar\(loja_id\)/);
    // O dono continua vendo os próprios anúncios.
    assert.match(migration, /loja\.proprietario_id = \(select auth\.uid\(\)\)/);
});

test("loja sem assinatura ativa não publica nem edita, mas pode marcar indisponível", () => {
    assert.match(migration, /create trigger trg_bloquear_loja_sem_assinatura\s+before insert or update on public\.produtos/);
    // Precisa rodar antes do gatilho que manda a edição para a fila.
    assert.ok("trg_bloquear_loja_sem_assinatura" < "trg_controlar_aprovacao_anuncio");
    const inicio = migration.indexOf("function private.bloquear_loja_sem_assinatura");
    const corpo = migration.slice(inicio, migration.indexOf("$$;", inicio));
    assert.match(corpo, /v_tipo is distinct from 'loja'/);
    assert.doesNotMatch(corpo, /new\.estoque is distinct/);
    assert.doesNotMatch(corpo, /new\.ativo is distinct/);
});

test("avisos: 7 dias antes, loja pausada e fim dos 15 dias, sem repetir", () => {
    assert.match(migration, /interval '7 days'/);
    assert.match(migration, /'assinatura_7_dias:'/);
    assert.match(migration, /'assinatura_pausada:'/);
    assert.match(migration, /'assinatura_expirada:'/);
    assert.match(migration, /grant execute on function public\.verificar_avisos_assinatura\(\) to authenticated/);
    assert.match(ler("components/notificacoes.js"), /rpc\("verificar_avisos_assinatura"\)/);
});

test("página da loja avisa que está pausada e formulário avisa o lojista", () => {
    assert.match(ler("loja.html"), /js\/loja-pausada\.js/);
    assert.match(ler("js/loja-pausada.js"), /rpc\("loja_pausada"/);
    assert.match(ler("editar-produto.html"), /js\/limite-anuncios\.js/);
    assert.match(ler("js/limite-anuncios.js"), /rpc\("minha_assinatura"\)/);
});
