const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const migration = ler("supabase/migrations/20261008003000_classificados_limite_vencimento.sql");

function corpo(nome) {
    const inicio = migration.indexOf(`function ${nome}`);
    assert.ok(inicio > -1, `${nome} deveria existir`);
    return migration.slice(inicio, migration.indexOf("$$;", inicio));
}

test("o público só enxerga anúncio dentro da validade", () => {
    const politicas = migration.match(/alter policy[\s\S]*?;/g) || [];
    assert.equal(politicas.length, 2);
    for (const politica of politicas) {
        assert.match(politica, /vence_em is null or vence_em > now\(\)/);
        assert.match(politica, /status_aprovacao = 'aprovado'/);
    }
    assert.doesNotMatch(migration, /drop table|drop column|truncate|delete from/i);
});

test("o limite vem da tabela de planos e é aplicado no banco", () => {
    const ciclo = corpo("private.ciclo_anuncios_gratuito");
    assert.match(ciclo, /p\.codigo = 'gratuito'/);
    assert.match(ciclo, /status_aprovacao <> 'rejeitado'/);
    assert.doesNotMatch(ciclo, /ativo = true/, "anúncio excluído deve continuar contando");

    const limite = corpo("private.aplicar_limite_plano_gratuito");
    assert.match(limite, /pg_advisory_xact_lock/);
    assert.match(limite, /v_ciclo\.usados >= v_ciclo\.limite/);
    assert.match(migration, /create trigger trg_aplicar_limite_plano_gratuito\s+before insert on public\.produtos/);
});

test("ninguém escolhe a data de criação nem o vencimento do próprio anúncio", () => {
    const limite = corpo("private.aplicar_limite_plano_gratuito");
    assert.match(limite, /new\.criado_em := now\(\)/);
    assert.match(limite, /new\.vence_em := null/);

    const vencimento = corpo("private.definir_vencimento_anuncio");
    assert.match(vencimento, /new\.vence_em := old\.vence_em/);
    assert.match(vencimento, /new\.criado_em := old\.criado_em/);
    assert.match(vencimento, /if v_tipo = 'pessoal' then/);
});

test("as funções internas não ficam expostas e a consulta do limite exige login", () => {
    for (const funcao of [
        "ciclo_anuncios_gratuito\\(uuid\\)",
        "aplicar_limite_plano_gratuito\\(\\)",
        "definir_vencimento_anuncio\\(\\)"
    ]) {
        assert.match(migration, new RegExp(`revoke all on function private\\.${funcao}\\s+from public, anon, authenticated`));
    }
    assert.match(migration, /revoke all on function public\.meu_limite_anuncios\(\) from public, anon/);
});

test("as telas mostram o limite e o vencimento", () => {
    const meus = ler("js/meus-anuncios.js");
    assert.match(meus, /rpc\("meu_limite_anuncios"\)/);
    assert.match(meus, /Vencido/);
    assert.match(meus, /Válido até/);
    assert.match(ler("meus-anuncios.html"), /id="textoLimiteAnuncios"/);
    assert.match(ler("novo-produto.html"), /js\/limite-anuncios\.js/);
    assert.match(ler("js/limite-anuncios.js"), /restantes === 0/);
    assert.match(ler("js/produto.js"), /vence_em/);
});
