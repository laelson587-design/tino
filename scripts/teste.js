/* Testa o modelo de dados do Tino: quem é quem depois de mexer nos números.
 *
 * Não testa tela. Testa a parte onde o defeito é silencioso — se o app
 * confunde duas pessoas, a mensagem sai para quem pediu para parar e ninguém
 * vê nada errado acontecendo. Dois defeitos assim já saíram daqui.
 *
 * Roda com `node scripts/teste.js`, sem instalar nada: carrega o nuvem.js e o
 * app.js num contexto de mentira, com um localStorage de brinquedo no lugar do
 * navegador, e chama as funções direto.
 */
const fs = require("fs");
const vm = require("vm");
const path = require("path").join(__dirname, "..") + "/";

const guardado = {};
const ctx = {
  console,
  localStorage: {
    getItem: (k) => (k in guardado ? guardado[k] : null),
    setItem: (k, v) => { guardado[k] = String(v); },
    removeItem: (k) => { delete guardado[k]; },
  },
  navigator: { userAgent: "node", contacts: undefined },
  window: {},
  document: { querySelector: () => null, addEventListener: () => {} },
  setTimeout: () => 0,
  clearTimeout: () => {},
  fetch: () => Promise.reject(new Error("sem rede")),
  matchMedia: () => ({ matches: false, addEventListener: () => {} }),
};
ctx.globalThis = ctx;
vm.createContext(ctx);

const nuvem = fs.readFileSync(path + "nuvem.js", "utf8");
let app = fs.readFileSync(path + "app.js", "utf8");
// A última linha liga o app na tela; aqui só interessa o miolo.
app = app.replace(/comecar\(\)\.catch\([\s\S]*$/, "");
app += "\nglobalThis.__est = () => estado; globalThis.__por = (e) => { estado = e; };\n";

vm.runInContext(nuvem, ctx);
vm.runInContext(app, ctx);

const {
  chaveDe, achar, criar, adicionarNumero, removerNumero, tornarPrincipal,
  numerosDe, numeroParaFalar, chaveDoNumero, juntarContatos, mesclarContato,
  mesclarNumeros, bonito, limparDaAgenda, __est, __por,
  carenciaDe, isoDia, somarMeses, lerDinheiro, contratosDe, parcelasPagas,
  parcelasRestantes, contratoEmAberto, liberaContratoEm, contratoLiberado,
  terminaContratoEm, saldoParaRefinanciar, tetoDe, margemDe, salvarContrato,
  removerContrato, primeiraPorPagas, situacaoDosContratos, anotarRenda,
  anotarOutrosBancos, outrosBancosDe, comprometidoDe,
  instantes, fatorVP, iofEstimado, diasAtePrimeira, parcelaMaximaNoRefi,
  simularRefinanciamento, centavos, diaDoBeneficioDe, anotarDiaDoBeneficio,
  contratoForaDoDia, simularContrato,
} = ctx;

let falhas = 0;
function ok(nome, cond, extra) {
  if (cond) { console.log("  ok   " + nome); return; }
  falhas++;
  console.log("  FALHA " + nome + (extra ? "  → " + JSON.stringify(extra) : ""));
}
function limpar() {
  __est().contatos = {};
}

// ------------------------------------------------------------------ 1
console.log("\n1. dois números na mesma ficha");
limpar();
const jose = criar("11987654321", "Sr. José");
ok("nasce com um número", numerosDe(jose).length === 1);

let r = adicionarNumero(jose, "1133334444");
ok("guardou o fixo", r.desfecho === "guardado", r);
ok("agora são dois", numerosDe(jose).length === 2, numerosDe(jose));

ok("acha pelo principal", achar("11987654321") === jose);
ok("acha pelo fixo", achar("11 3333-4444") === jose);
ok("acha pelo celular sem o nono", achar("1187654321") === jose);
ok("não acha um estranho", achar("21999998888") === null);

const k = Object.keys(__est().contatos)[0];
ok("a chave do fixo aponta para a ficha", chaveDoNumero("1133334444") === k,
  { achou: chaveDoNumero("1133334444"), esperado: k });

ok("repetido não entra duas vezes",
  adicionarNumero(jose, "11 3333-4444").desfecho === "repetido");
ok("número quebrado é recusado",
  adicionarNumero(jose, "119").desfecho === "invalido");

// ------------------------------------------------------------------ 2
console.log("\n2. para qual número a conversa abre");
ok("digitou o fixo, fala no fixo",
  numeroParaFalar(jose, "11 3333-4444") === "1133334444");
ok("digitou o celular, fala no celular",
  numeroParaFalar(jose, "11987654321") === "11987654321");
ok("digitou sem o nono, fala na forma guardada",
  numeroParaFalar(jose, "1187654321") === "11987654321");

// ------------------------------------------------------------------ 3
console.log("\n3. trocar o principal sem mudar a chave");
const antes = Object.keys(__est().contatos)[0];
ok("trocou", tornarPrincipal(jose, "1133334444") === true);
ok("o principal é o fixo", jose.numero === "1133334444");
ok("o celular continua na ficha", numerosDe(jose).includes("11987654321"));
ok("a chave NÃO mudou", Object.keys(__est().contatos)[0] === antes);
ok("continua achando pelos dois",
  achar("11987654321") === jose && achar("1133334444") === jose);

ok("o principal não pode ser removido", removerNumero(jose, "1133334444") === false);
ok("o outro pode", removerNumero(jose, "11987654321") === true);
ok("sobrou um", numerosDe(jose).length === 1, numerosDe(jose));
ok("quem saiu não acha mais", achar("11987654321") === null);

// ------------------------------------------------------------------ 4
console.log("\n4. número que já é de outra pessoa");
limpar();
const a = criar("11911112222", "Maria");
const b = criar("11933334444", "Maria (fixo?)");
r = adicionarNumero(a, "11933334444");
ok("recusa e diz de quem é", r.desfecho === "de-outro", r);
ok("aponta a ficha certa", __est().contatos[r.chave] === b);
ok("não guardou em dobro", numerosDe(a).length === 1);

// ------------------------------------------------------------------ 5
console.log("\n5. juntar as duas fichas");
a.eventos.push({ em: "2026-01-01T10:00:00.000Z", tipo: "ENVIADO", texto: "oi" });
b.eventos.push({ em: "2026-02-01T10:00:00.000Z", tipo: "RESPONDEU" });
const kA = chaveDe("11911112222"), kB = chaveDe("11933334444");
const juntos = juntarContatos(kA, kB);
ok("sobrou uma ficha só", Object.keys(__est().contatos).length === 1);
ok("ficou na chave de quem estava aberto", !!__est().contatos[kA]);
ok("os dois números estão nela", numerosDe(juntos).length === 2, numerosDe(juntos));
ok("o principal é o de quem juntou", juntos.numero === "11911112222");
ok("nenhum evento se perdeu",
  juntos.eventos.filter((e) => e.tipo === "ENVIADO").length === 1 &&
  juntos.eventos.filter((e) => e.tipo === "RESPONDEU").length === 1);
ok("a situação foi refeita pelos eventos", juntos.status === "ABERTO");
ok("acha pelos dois números depois de juntar",
  achar("11911112222") === juntos && achar("11933334444") === juntos);

// ------------------------------------------------------------------ 6
console.log("\n6. sincronia entre dois aparelhos");
const celular = {
  numero: "11911112222", outros: ["1133334444"],
  numerosEm: "2026-03-01T10:00:00.000Z",
  nome: "Maria", criadoEm: "2026-01-01T00:00:00.000Z",
  status: "ABERTO", voltarEm: null, cpf: null, cpfEm: null,
  beneficio: null, beneficioEm: null, eventos: [],
};
const tablet = {
  numero: "11911112222", outros: ["11955556666"],
  numerosEm: "2026-02-01T10:00:00.000Z",
  nome: "Maria", criadoEm: "2026-01-01T00:00:00.000Z",
  status: "ABERTO", voltarEm: null, cpf: null, cpfEm: null,
  beneficio: null, beneficioEm: null, eventos: [],
};
let m = mesclarContato(celular, tablet);
ok("junta os três números", numerosDe(m).length === 3, numerosDe(m));
ok("nenhum número se perdeu",
  ["11911112222", "1133334444", "11955556666"].every(
    (n) => numerosDe(m).some((x) => chaveDe(x) === chaveDe(n))), numerosDe(m));

m = mesclarContato(tablet, celular);
ok("dá no mesmo na ordem trocada", numerosDe(m).length === 3, numerosDe(m));

// quem trocou o principal por último ganha
const trocou = { ...celular, numero: "1133334444", outros: ["11911112222"],
  numerosEm: "2026-05-01T10:00:00.000Z" };
m = mesclarContato(tablet, trocou);
ok("o principal é o de quem mexeu por último", m.numero === "1133334444", m.numero);

// ------------------------------------------------------------------ 7
console.log("\n7. contato guardado antes desta versão");
const velho = {
  numero: "21988887777", nome: "Antigo",
  criadoEm: "2025-01-01T00:00:00.000Z", status: "ABERTO",
  voltarEm: null, cpf: null, cpfEm: null,
  beneficio: null, beneficioEm: null, eventos: [],
};   // sem `outros`, sem `numerosEm`
limpar();
__est().contatos[chaveDe(velho.numero)] = velho;
ok("lê sem quebrar", numerosDe(velho).length === 1);
ok("continua sendo achado", achar("21988887777") === velho);
ok("aceita um segundo número", adicionarNumero(velho, "2133332222").desfecho === "guardado");
ok("agora tem dois", numerosDe(velho).length === 2);
const mVelho = mesclarContato(velho, { ...velho, outros: undefined, numerosEm: undefined });
ok("mescla com um lado sem o campo", numerosDe(mVelho).length === 2, numerosDe(mVelho));

// ------------------------------------------------------------------ 8
console.log("\n8. a agenda do celular não perde telefone");
const daAgenda = limparDaAgenda({
  name: ["Dona Ana"],
  tel: ["+55 11 98888-7777", "(11) 3333-2222", "abc"],
});
ok("pegou o nome", daAgenda.nome === "Dona Ana");
ok("o primeiro é o principal", daAgenda.numero === "11988887777", daAgenda.numero);
ok("o segundo veio junto", daAgenda.outros.length === 1, daAgenda.outros);
ok("o lixo não entrou", daAgenda.outros[0] === "1133332222");

limpar();
const ana = criar(daAgenda.numero, daAgenda.nome, daAgenda.outros);
ok("cadastrou com os dois", numerosDe(ana).length === 2, numerosDe(ana));
ok("acha pelo fixo dela", achar("1133332222") === ana);

// ------------------------------------------------------------------ 9
console.log("\n9. o número com que a ficha nasceu, depois de removido");
limpar();
const pedro = criar("11955551111", "Pedro");
adicionarNumero(pedro, "11966662222");
tornarPrincipal(pedro, "11966662222");
removerNumero(pedro, "11955551111");
ok("o removido não acha mais", achar("11955551111") === null);
ok("o que ficou continua achando", achar("11966662222") === pedro);
ok("a chave velha continua sendo a casa dele",
  __est().contatos[chaveDe("11955551111")] === pedro);

// e agora alguém cadastra aquele número, que é de outra pessoa
const novo = criar("11955551111", "Outra pessoa");
ok("Pedro não foi escrito por cima", __est().contatos[chaveDe("11955551111")] === pedro);
ok("os dois existem", Object.keys(__est().contatos).length === 2);
ok("cada número acha o seu dono",
  achar("11955551111") === novo && achar("11966662222") === pedro);
ok("Pedro manteve o nome", pedro.nome === "Pedro");

// ------------------------------------------------------------------ 10
console.log("\n10. não oferecer juntar com quem não tem o número");
limpar();
const ze = criar("11955551111", "Zé");
adicionarNumero(ze, "11966662222");
tornarPrincipal(ze, "11966662222");
removerNumero(ze, "11955551111");   // a chave dele continua sendo a do removido
const clara = criar("11977773333", "Clara");
r = adicionarNumero(clara, "11955551111");
ok("aceita, porque o número não é de ninguém", r.desfecho === "guardado", r);
ok("não juntou Clara com o Zé", ze.nome === "Zé" && numerosDe(ze).length === 1);
ok("o número é da Clara agora", achar("11955551111") === clara);

// e o caso legítimo continua funcionando
r = adicionarNumero(ze, "11977773333");
ok("esse sim é de outra pessoa", r.desfecho === "de-outro", r);
ok("aponta a Clara", __est().contatos[r.chave] === clara);


// ------------------------------------------------------------------ 11
console.log("\n11. a carência é um terço do prazo");
{
  const escada = { 6:2, 7:3, 8:3, 9:3, 10:4, 11:4, 12:4, 13:5, 14:5, 15:5, 16:6, 17:6, 18:6 };
  let todos = true;
  for (const [prazo, esperado] of Object.entries(escada)) {
    if (carenciaDe(Number(prazo)) !== esperado) {
      todos = false;
      ok("prazo " + prazo + " espera " + esperado, false, { deu: carenciaDe(Number(prazo)) });
    }
  }
  ok("os treze prazos da Crefisa batem com a escada", todos);
  ok("prazo novo cai certo sozinho (24x → 8)", carenciaDe(24) === 8);
}

// ------------------------------------------------------------------ 12
console.log("\n12. quando o contrato libera");
{
  // 15x com a primeira em 5/jan/2026: carência 5, então a 5ª parcela cai em
  // 5/mai/2026 — quatro meses depois da primeira, não cinco.
  const k = { id: "a", tipo: "REFIN", prazo: 15, parcela: 200, primeiraEm: "2026-01-05" };
  ok("libera na data da 5ª parcela", isoDia(liberaContratoEm(k)) === "2026-05-05",
     { deu: isoDia(liberaContratoEm(k)) });
  ok("na véspera ainda está preso", !contratoLiberado(k, "2026-05-04"));
  ok("no dia já está liberado", contratoLiberado(k, "2026-05-05"));
  ok("no dia da 1ª parcela conta 1 paga", parcelasPagas(k, "2026-01-05") === 1);
  ok("um dia antes da 1ª, nenhuma paga", parcelasPagas(k, "2026-01-04") === 0);
  ok("na data de liberação são 5 pagas", parcelasPagas(k, "2026-05-05") === 5);
  ok("o contrato acaba na 15ª", isoDia(terminaContratoEm(k)) === "2027-03-05");
  ok("passado o fim, não passa do prazo", parcelasPagas(k, "2030-01-01") === 15);
  ok("depois do fim não está mais em aberto", !contratoEmAberto(k, "2027-03-06"));
  ok("no dia da última ainda está em aberto? não", !contratoEmAberto(k, "2027-03-05"));
}

// ------------------------------------------------------------------ 13
console.log("\n13. vencimento no dia 31");
{
  // Fevereiro não tem 31. Sem o cuidado, o Date transborda para março e o
  // vencimento anda um mês — num 18x isso vira meio ano de erro.
  const k = { id: "b", prazo: 18, parcela: 100, primeiraEm: "2026-01-31" };
  ok("fevereiro desce para o dia 28", isoDia(somarMeses("2026-01-31", 1)) === "2026-02-28",
     { deu: isoDia(somarMeses("2026-01-31", 1)) });
  ok("março volta ao 31", isoDia(somarMeses("2026-01-31", 2)) === "2026-03-31");
  ok("não pulou de mês em nenhum passo", isoDia(somarMeses("2026-01-31", 12)) === "2027-01-31");
  ok("a 6ª parcela do 18x cai em junho", isoDia(liberaContratoEm(k)) === "2026-06-30",
     { deu: isoDia(liberaContratoEm(k)) });
}

// ------------------------------------------------------------------ 14
console.log("\n14. o saldo do refinanciamento é o que falta, cheio");
{
  const k = { id: "c", prazo: 15, parcela: 200, primeiraEm: "2026-01-05" };
  ok("na liberação faltam 10 parcelas", parcelasRestantes(k, "2026-05-05") === 10);
  ok("na liberação leva 2000 para o refi", saldoParaRefinanciar(k, "2026-05-05") === 2000);
  ok("mais tarde leva menos", saldoParaRefinanciar(k, "2026-10-05") === 1000);
  ok("contrato pago não leva nada", saldoParaRefinanciar(k, "2027-04-05") === 0);
}

// ------------------------------------------------------------------ 15
console.log("\n15. margem por onde o benefício cai");
{
  limpar();
  const c = criar("11988887777", "Dona Rosa");
  ok("sem renda, não há margem para calcular", margemDe(c) === null);

  anotarRenda(c, "2000,00", "OUTRO");
  ok("outro banco dá 35%", tetoDe(c) === 700);
  anotarRenda(c, "2000,00", "CREFISA");
  ok("na Crefisa dá 60%", tetoDe(c) === 1200);
  ok("sem contrato, a margem é o teto inteiro", margemDe(c) === 1200);

  salvarContrato(c, { tipo: "NOVO", prazo: 12, parcela: "300", primeiraEm: "2026-08-05" });
  ok("o contrato prende a parcela", margemDe(c, "2026-09-05") === 900);

  salvarContrato(c, { tipo: "NOVO", prazo: 6, parcela: "150", primeiraEm: "2026-08-05" });
  ok("dois contratos somam", margemDe(c, "2026-09-05") === 750);
  ok("contrato encerrado devolve a margem", margemDe(c, "2027-02-05") === 900,
     { deu: margemDe(c, "2027-02-05") });

  ok("lê vírgula como centavos", lerDinheiro("1.234,56") === 1234.56);
  ok("lê ponto como centavos quando não há vírgula", lerDinheiro("1234.56") === 1234.56);
  ok("lê inteiro", lerDinheiro("1234") === 1234);
  ok("vazio é nada", lerDinheiro("") === null);
}

// ------------------------------------------------------------------ 16
console.log("\n16. quem a fila segura e quem ela chama");
{
  limpar();
  // Margem no talo e refinanciamento travado: não há o que oferecer.
  const preso = criar("11911112222", "Travado");
  anotarRenda(preso, "1000", "OUTRO");                       // teto 350
  salvarContrato(preso, { tipo: "NOVO", prazo: 15, parcela: "350", primeiraEm: "2026-08-05" });
  const s1 = situacaoDosContratos(preso, "2026-09-05");
  ok("com a margem cheia e o contrato preso, trava", s1.estado === "TRAVADO", s1);

  // Mesma trava, mas sobrou margem: contrato novo não tem prazo, então há
  // conversa. Esta é a regra que decide quem some da fila.
  const folga = criar("11933334444", "Com folga");
  anotarRenda(folga, "3000", "CREFISA");                     // teto 1800
  salvarContrato(folga, { tipo: "NOVO", prazo: 15, parcela: "350", primeiraEm: "2026-08-05" });
  const s2 = situacaoDosContratos(folga, "2026-09-05");
  ok("com margem sobrando, não trava", s2.estado === "SO_MARGEM", s2);

  // Passado o tempo, o refinanciamento libera.
  const s3 = situacaoDosContratos(preso, "2026-12-05");
  ok("na 5ª parcela, libera", s3.estado === "LIBERADO", s3);
  ok("o motivo diz quantas foram pagas", /5 de 15 pagas/.test(s3.motivo), s3.motivo);

  // Um travado e um liberado na mesma pessoa: o liberado manda.
  const dois = criar("11955556666", "Dois contratos");
  anotarRenda(dois, "1000", "OUTRO");
  salvarContrato(dois, { tipo: "NOVO", prazo: 18, parcela: "175", primeiraEm: "2026-08-05" });
  salvarContrato(dois, { tipo: "NOVO", prazo: 6, parcela: "175", primeiraEm: "2026-06-05" });
  const s4 = situacaoDosContratos(dois, "2026-09-05");
  ok("basta um liberado para a pessoa entrar", s4.estado === "LIBERADO", s4);
  ok("e ele aponta o de 6x", s4.contrato.prazo === 6, s4.contrato);

  ok("sem contrato nenhum, os contratos não opinam",
     situacaoDosContratos(criar("11977778888", "Sem nada")) === null);
}

// ------------------------------------------------------------------ 17
console.log("\n17. cadastrar contrato que já está rolando");
{
  // Hoje 20/set/2026, desconto no dia 5, 6 parcelas pagas: a 6ª caiu em
  // 5/set, então a 1ª foi em 5/abr.
  ok("6 pagas, dia 5, hoje 20/set → 5/abr",
     primeiraPorPagas(6, 5, "2026-09-20") === "2026-04-05",
     { deu: primeiraPorPagas(6, 5, "2026-09-20") });

  // Mesmo caso, mas hoje é dia 3: a do mês ainda não caiu, então a 6ª foi em
  // agosto e a 1ª em março. Errar isto é ligar um mês antes da hora.
  ok("antes do dia do desconto, conta um mês a menos",
     primeiraPorPagas(6, 5, "2026-09-03") === "2026-03-05",
     { deu: primeiraPorPagas(6, 5, "2026-09-03") });

  ok("uma parcela paga é o próprio mês",
     primeiraPorPagas(1, 5, "2026-09-20") === "2026-09-05");

  // A volta fecha: cadastrado assim, o app conta as mesmas 6.
  const k = { prazo: 15, parcela: 100, primeiraEm: primeiraPorPagas(6, 5, "2026-09-20") };
  ok("e o app volta a contar 6 pagas", parcelasPagas(k, "2026-09-20") === 6);
}

// ------------------------------------------------------------------ 18
console.log("\n18. contratos entre dois aparelhos");
{
  limpar();
  const c = criar("11999990000", "Sincronia");
  salvarContrato(c, { tipo: "NOVO", prazo: 12, parcela: "300", primeiraEm: "2026-01-05" });

  // Cada aparelho cadastrou um contrato diferente da mesma pessoa.
  const a = JSON.parse(JSON.stringify(c));
  const b = JSON.parse(JSON.stringify(c));
  b.contratos.push({ id: "outro", tipo: "REFIN", prazo: 6, parcela: 150,
                     primeiraEm: "2026-03-05", taxa: null,
                     ajustadoEm: "2026-03-05T10:00:00.000Z", removidoEm: null });

  const juntos = mesclarContato(a, b);
  ok("a lista é união, não disputa", contratosDe(juntos).length === 2, juntos.contratos);
  ok("dá no mesmo na ordem trocada",
     contratosDe(mesclarContato(b, a)).length === 2);

  // Removido de um lado não pode voltar do outro, senão a margem passa a
  // contar parcela que já não existe.
  const removeu = JSON.parse(JSON.stringify(juntos));
  removerContrato(removeu, "outro");
  const depois = mesclarContato(removeu, juntos);
  ok("removido não ressuscita", contratosDe(depois).length === 1, depois.contratos);

  // Correção mais recente vence a versão velha do mesmo contrato.
  const corrigiu = JSON.parse(JSON.stringify(juntos));
  const alvo = corrigiu.contratos.find((x) => x.id === "outro");
  alvo.parcela = 999;
  alvo.ajustadoEm = new Date().toISOString();
  const final = mesclarContato(juntos, corrigiu);
  ok("a correção mais nova vence",
     contratosDe(final).find((x) => x.id === "outro").parcela === 999);

  // Um lado que nunca ouviu falar em contrato não pode apagar o do outro.
  const antigo = JSON.parse(JSON.stringify(c));
  delete antigo.contratos;
  delete antigo.renda;
  ok("lado sem o campo não apaga nada",
     contratosDe(mesclarContato(antigo, juntos)).length === 2);
}

// ------------------------------------------------------------------ 19
console.log("\n19. a renda tem carimbo próprio");
{
  limpar();
  const c = criar("11900001111", "Renda");
  anotarRenda(c, "2000", "CREFISA");
  const comRenda = JSON.parse(JSON.stringify(c));

  const semRenda = JSON.parse(JSON.stringify(c));
  semRenda.renda = null;
  semRenda.rendaEm = null;

  ok("quem tem renda não é apagado por quem não tem",
     mesclarContato(semRenda, comRenda).renda.valor === 2000);
  ok("dá no mesmo na ordem trocada",
     mesclarContato(comRenda, semRenda).renda.valor === 2000);

  // Reajuste anual: o valor mais novo vence.
  const reajustado = JSON.parse(JSON.stringify(comRenda));
  reajustado.renda = { valor: 2200, onde: "CREFISA" };
  reajustado.rendaEm = new Date(Date.now() + 1000).toISOString();
  ok("o reajuste mais recente vence",
     mesclarContato(comRenda, reajustado).renda.valor === 2200);
}

// ------------------------------------------------------------------ 20
console.log("\n20. o que o contrato recusa e o que ele só avisa");
{
  limpar();
  const c = criar("11900002222", "Conferência");
  ok("sem prazo, recusa",
     salvarContrato(c, { parcela: "100", primeiraEm: "2026-01-05" }).desfecho === "invalido");
  ok("sem parcela, recusa",
     salvarContrato(c, { prazo: 12, primeiraEm: "2026-01-05" }).desfecho === "invalido");
  ok("sem data, recusa",
     salvarContrato(c, { prazo: 12, parcela: "100" }).desfecho === "invalido");
  ok("nada disso foi guardado", contratosDe(c).length === 0);

  // Prazo fora da faixa AVISA e guarda: barrar a digitação faz desistir de
  // anotar, e contrato não anotado é margem errada para sempre.
  const r = salvarContrato(c, { prazo: 24, parcela: "100", primeiraEm: "2026-01-05" });
  ok("prazo fora da faixa é guardado", r.desfecho === "gravado");
  ok("mas com aviso", !!r.aviso, r.aviso);
  ok("e o aviso tem prioridade sobre a confirmação", /Confira/.test(r.aviso));
}


// ------------------------------------------------------------------ 21
console.log("\n21. margem já tomada em outros bancos");
{
  limpar();
  const c = criar("11900003333", "Com dívida fora");
  anotarRenda(c, "1616,67", "CREFISA");            // teto 970,00
  ok("o teto sai da renda", Math.round(tetoDe(c) * 100) / 100 === 970, tetoDe(c));
  ok("sem nada fora, a margem é o teto", Math.round(margemDe(c) * 100) / 100 === 970);

  // O caso que ele descreveu: 970 de margem, 450 já tomados fora.
  anotarOutrosBancos(c, "450");
  ok("desconta o que está fora", Math.round(margemDe(c) * 100) / 100 === 520,
     margemDe(c));

  // E soma com o que está cadastrado aqui.
  salvarContrato(c, { tipo: "NOVO", prazo: 12, parcela: "200", primeiraEm: "2026-08-05" });
  ok("soma com os contratos daqui",
     Math.round(margemDe(c, "2026-09-05") * 100) / 100 === 320,
     margemDe(c, "2026-09-05"));

  // Encher a margem por fora trava a pessoa, igual a encher por dentro.
  anotarOutrosBancos(c, "770");
  const s = situacaoDosContratos(c, "2026-09-05");
  ok("margem no talo por fora também trava", s.estado === "TRAVADO", s);

  anotarOutrosBancos(c, "");
  ok("apagar devolve a margem", Math.round(margemDe(c, "2026-09-05") * 100) / 100 === 770);
  ok("e some do registro", outrosBancosDe(c) === 0);

  // O campo NÃO pode ser confundido com os telefones, que moram em c.outros.
  adicionarNumero(c, "1133334444");
  anotarOutrosBancos(c, "300");
  ok("o telefone extra continua lá", numerosDe(c).length === 2, numerosDe(c));
}

// ------------------------------------------------------------------ 22
console.log("\n22. o comprometido fora entre dois aparelhos");
{
  limpar();
  const c = criar("11900004444", "Sincronia fora");
  anotarRenda(c, "2000", "CREFISA");
  anotarOutrosBancos(c, "450");
  const informado = JSON.parse(JSON.stringify(c));

  const semNada = JSON.parse(JSON.stringify(c));
  semNada.outrosBancos = 0;
  semNada.outrosBancosEm = null;

  ok("quem não sabe não apaga quem sabe",
     mesclarContato(semNada, informado).outrosBancos === 450);
  ok("dá no mesmo na ordem trocada",
     mesclarContato(informado, semNada).outrosBancos === 450);

  // Informação mais recente vence — inclusive quando ela é ZERO, que é o
  // caso de quem foi conferir e viu que o cliente quitou lá fora.
  const zerado = JSON.parse(JSON.stringify(informado));
  zerado.outrosBancos = 0;
  zerado.outrosBancosEm = new Date(Date.now() + 1000).toISOString();
  ok("zerar depois vence o valor antigo",
     mesclarContato(informado, zerado).outrosBancos === 0);
}


// ------------------------------------------------------------------ 23
console.log("\n23. a matemática bate com os contratos reais da calculadora");
{
  // Os dois demonstrativos de CET contra os quais a calculadora foi
  // conferida. Se estas contas saírem do lugar, a cópia do motor divergiu
  // do original — e aí o consultor recebe dois números para a mesma
  // pergunta, em dois apps do mesmo autor.
  const i = 0.18;

  // Contrato A: 15x de R$ 633,49, carência 40 dias, IOF 1,714%.
  const tA = instantes(15, 40);
  const financiadoA = 633.49 * fatorVP(tA, i);
  const recebidoA = financiadoA * (1 - 0.01714);
  ok("contrato A: recebido bate com os R$ 3.000 solicitados",
     Math.abs(recebidoA - 3000) < 1, centavos(recebidoA));

  // Contrato B: 9x de R$ 260,00, carência 25 dias, IOF 1,32%, TCC 130.
  const tB = instantes(9, 25);
  const financiadoB = 260 * fatorVP(tB, i);
  const recebidoB = financiadoB * (1 - 0.0132) - 130;
  ok("contrato B: recebido bate com os R$ 1.004,90 solicitados",
     Math.abs(recebidoB - 1004.90) < 1, centavos(recebidoB));

  // E o IOF estimado tem de cair perto do que os contratos mostram.
  ok("IOF estimado do A fica perto de 1,714%",
     Math.abs(iofEstimado(15, 40) * 100 - 1.714) < 0.15,
     centavos(iofEstimado(15, 40) * 100 * 100) / 100);
  ok("IOF estimado do B fica perto de 1,32%",
     Math.abs(iofEstimado(9, 25) * 100 - 1.32) < 0.15,
     centavos(iofEstimado(9, 25) * 100 * 100) / 100);

  // A carência não é enfeite: ignorá-la erra a parcela em vários por cento.
  const semCarencia = 633.49 * fatorVP(instantes(15, 30), i);
  ok("40 dias de carência mudam o financiado de verdade",
     Math.abs(semCarencia - financiadoA) > 20, centavos(semCarencia - financiadoA));
}

// ------------------------------------------------------------------ 24
console.log("\n24. o troco do refinanciamento");
{
  limpar();
  const c = criar("11955557777", "Refi");
  anotarRenda(c, "3000", "CREFISA");                 // teto 1800
  salvarContrato(c, { tipo: "NOVO", prazo: 15, parcela: "600",
                      primeiraEm: "2026-01-05", taxa: "18" });
  const k = contratosDe(c)[0];

  const ate = "2026-06-05";                           // 6 pagas, 9 faltando
  ok("a parcela do próprio contrato volta para a margem",
     parcelaMaximaNoRefi(c, k, ate) === 1800, parcelaMaximaNoRefi(c, k, ate));

  const s = simularRefinanciamento(c, k, { ate, prazo: 18 });
  ok("simulou sem erro", !s.erro, s.erro);
  ok("o saldo antigo entra cheio", s.saldo === 9 * 600, s.saldo);
  ok("o financiado é maior que o recebido", s.financiado > s.recebido);
  ok("o troco é recebido menos saldo",
     s.troco === centavos(s.recebido - s.saldo), s);

  // A regra que decide se o consultor confia: errar sempre para menos.
  const semTcc = simularRefinanciamento(c, k, { ate, prazo: 18, tcc: false });
  ok("sem TCC o troco é MAIOR", semTcc.troco > s.troco, [semTcc.troco, s.troco]);
  ok("e a diferença é exatamente a tarifa",
     centavos(semTcc.troco - s.troco) === 130, centavos(semTcc.troco - s.troco));

  // Refinanciar cedo rende pouco; esperar rende mais. É o que o app precisa
  // saber dizer para não mandar ligar na data mínima.
  const cedo = simularRefinanciamento(c, k, { ate: "2026-05-05", prazo: 18 });
  const tarde = simularRefinanciamento(c, k, { ate: "2026-10-05", prazo: 18 });
  ok("mais tarde sobra mais troco", tarde.troco > cedo.troco,
     [cedo.troco, tarde.troco]);

  // Sem taxa não inventa número.
  salvarContrato(c, { id: k.id, tipo: k.tipo, prazo: k.prazo, parcela: k.parcela,
                      primeiraEm: k.primeiraEm, taxa: "" });
  const semTaxa = simularRefinanciamento(c, contratosDe(c)[0], { ate });
  ok("sem taxa, recusa em vez de chutar", /taxa/i.test(semTaxa.erro), semTaxa.erro);

  // Sem renda não há margem, e sem margem não há parcela.
  const semRenda = criar("11955558888", "Sem renda");
  salvarContrato(semRenda, { tipo: "NOVO", prazo: 12, parcela: "300",
                             primeiraEm: "2026-01-05", taxa: "18" });
  const r = simularRefinanciamento(semRenda, contratosDe(semRenda)[0], { ate });
  ok("sem renda, recusa", /benefício|margem/i.test(r.erro), r.erro);
}

// ------------------------------------------------------------------ 25
console.log("\n25. a carência do contrato novo sai do dia do benefício");
{
  const k = { prazo: 15, parcela: 600, primeiraEm: "2026-01-20", taxa: 18 };
  // Hoje dia 5, benefício cai dia 20: faltam 15 dias.
  ok("conta até o próximo dia do benefício",
     diasAtePrimeira(k, "2026-09-05") === 15, diasAtePrimeira(k, "2026-09-05"));
  // Passou do dia 20: pula para o mês seguinte.
  ok("passado o dia, vai para o mês que vem",
     diasAtePrimeira(k, "2026-09-21") === 29, diasAtePrimeira(k, "2026-09-21"));
  ok("no próprio dia, também vai para o mês seguinte",
     diasAtePrimeira(k, "2026-09-20") > 25, diasAtePrimeira(k, "2026-09-20"));

  // Dia 31 em mês de 30 não pode transbordar.
  const k31 = { prazo: 12, parcela: 100, primeiraEm: "2026-01-31", taxa: 18 };
  ok("dia 31 não transborda de mês",
     diasAtePrimeira(k31, "2026-11-15") <= 31, diasAtePrimeira(k31, "2026-11-15"));
}


// ------------------------------------------------------------------ 26
console.log("\n26. o dia do benefício é da pessoa, não do contrato");
{
  limpar();
  const c = criar("11900005555", "Dia");
  ok("sem contrato e sem informar, não há dia", diaDoBeneficioDe(c) === null);

  // Deduz dos contratos que já existem: quem já cadastrou não digita nada.
  salvarContrato(c, { tipo: "NOVO", prazo: 12, parcela: "100",
                      primeiraEm: "2026-03-25", taxa: "18" });
  salvarContrato(c, { tipo: "NOVO", prazo: 15, parcela: "100",
                      primeiraEm: "2026-05-25", taxa: "18" });
  ok("deduz o dia dos contratos", diaDoBeneficioDe(c) === 25, diaDoBeneficioDe(c));

  // Com um contrato divergente, vence o dia mais repetido.
  salvarContrato(c, { tipo: "NOVO", prazo: 6, parcela: "100",
                      primeiraEm: "2026-06-05", taxa: "18" });
  ok("o dia mais repetido ganha do avulso", diaDoBeneficioDe(c) === 25,
     diaDoBeneficioDe(c));

  // Informado à mão manda em tudo.
  ok("aceita o dia informado", anotarDiaDoBeneficio(c, "10") === "gravado");
  ok("e ele vence a dedução", diaDoBeneficioDe(c) === 10);
  ok("recusa dia fora de 1 a 31", anotarDiaDoBeneficio(c, "32") === "invalido");
  ok("recusar não estraga o que já estava", diaDoBeneficioDe(c) === 10);
  ok("apagar volta para a dedução",
     anotarDiaDoBeneficio(c, "") === "apagado" && diaDoBeneficioDe(c) === 25,
     diaDoBeneficioDe(c));
}

// ------------------------------------------------------------------ 27
console.log("\n27. o aviso de contrato fora do dia");
{
  limpar();
  const c = criar("11900006666", "Conferência");
  salvarContrato(c, { tipo: "NOVO", prazo: 12, parcela: "100",
                      primeiraEm: "2026-03-25", taxa: "18" });
  salvarContrato(c, { tipo: "NOVO", prazo: 12, parcela: "100",
                      primeiraEm: "2026-03-05", taxa: "18" });
  const [certo, torto] = contratosDe(c);

  // Sem o dia INFORMADO, não acusa nada: deduzir e depois acusar contra a
  // própria dedução acusaria o contrato que gerou a dedução.
  ok("sem o dia informado, não acusa", !contratoForaDoDia(c, torto));

  anotarDiaDoBeneficio(c, "25");
  ok("o que cai no dia não é acusado", !contratoForaDoDia(c, certo));
  ok("o que cai fora é acusado", contratoForaDoDia(c, torto));
}

// ------------------------------------------------------------------ 28
console.log("\n28. a carência da simulação segue o dia da pessoa");
{
  limpar();
  const c = criar("11900007777", "Carência");
  anotarRenda(c, "3000", "CREFISA");
  // Contrato com data ERRADA (dia 5), pessoa recebe dia 25.
  salvarContrato(c, { tipo: "NOVO", prazo: 15, parcela: "300",
                      primeiraEm: "2026-01-05", taxa: "18" });
  anotarDiaDoBeneficio(c, "25");
  const k = contratosDe(c)[0];

  // Em 06/09 o próximo dia 25 são 19 dias; o dia 5 daria 29.
  const s = simularRefinanciamento(c, k, { ate: "2026-09-06", prazo: 18 });
  ok("a carência veio do dia da pessoa, não da data do contrato",
     s.dias === 19, s.dias);

  anotarDiaDoBeneficio(c, "");
  const semDia = simularRefinanciamento(c, k, { ate: "2026-09-06", prazo: 18 });
  ok("sem o dia informado, volta a deduzir do contrato", semDia.dias === 29,
     semDia.dias);
}

// ------------------------------------------------------------------ 29
console.log("\n29. o dia do benefício entre dois aparelhos");
{
  limpar();
  const c = criar("11900008888", "Sincronia do dia");
  anotarDiaDoBeneficio(c, "25");
  const informado = JSON.parse(JSON.stringify(c));

  const semNada = JSON.parse(JSON.stringify(c));
  semNada.diaDoBeneficio = 0;
  semNada.diaDoBeneficioEm = null;
  ok("quem não sabe não apaga quem sabe",
     mesclarContato(semNada, informado).diaDoBeneficio === 25);
  ok("dá no mesmo na ordem trocada",
     mesclarContato(informado, semNada).diaDoBeneficio === 25);

  // Zero é valor legítimo aqui — quer dizer 'apagado de propósito'.
  const apagado = JSON.parse(JSON.stringify(informado));
  apagado.diaDoBeneficio = 0;
  apagado.diaDoBeneficioEm = new Date(Date.now() + 1000).toISOString();
  ok("apagar depois vence o valor antigo",
     mesclarContato(informado, apagado).diaDoBeneficio === 0);
}


// ------------------------------------------------------------------ 30
console.log("\n30. o simulador solto, nos dois sentidos");
{
  // Os dois contratos reais dela: 10x e 15x de R$ 100, carência 20 dias,
  // sem tarifa. O simulador solto tem de reproduzir os dois.
  const a = simularContrato({ modo: "parcela", parcela: "100", prazo: 10,
                              dias: 20, taxa: 18 });
  const b = simularContrato({ modo: "parcela", parcela: "100", prazo: 15,
                              dias: 20, taxa: 18 });
  ok("reproduz o de 10x (real R$ 476)", Math.abs(a.recebido - 476) < 8, a.recebido);
  ok("reproduz o de 15x (real R$ 538)", Math.abs(b.recebido - 538) < 9, b.recebido);

  // O sentido inverso tem de voltar ao mesmo lugar.
  const volta = simularContrato({ modo: "valor", valor: String(a.recebido),
                                  prazo: 10, dias: 20, taxa: 18 });
  ok("entrar pelo valor devolve a mesma parcela",
     Math.abs(volta.parcela - 100) < 0.02, volta.parcela);

  // Com tarifa, a volta também tem de fechar.
  const comTcc = simularContrato({ modo: "parcela", parcela: "100", prazo: 10,
                                   dias: 20, taxa: 18, tcc: true });
  ok("a tarifa tira R$ 130 do recebido",
     Math.abs((a.recebido - comTcc.recebido) - 130) < 0.02,
     centavos(a.recebido - comTcc.recebido));
  const voltaTcc = simularContrato({ modo: "valor", valor: String(comTcc.recebido),
                                     prazo: 10, dias: 20, taxa: 18, tcc: true });
  ok("com tarifa, ida e volta fecham", Math.abs(voltaTcc.parcela - 100) < 0.02,
     voltaTcc.parcela);

  // Recusa em vez de inventar.
  ok("sem taxa, recusa",
     /taxa/i.test(simularContrato({ modo: "parcela", parcela: "100", prazo: 10, dias: 20 }).erro));
  ok("sem prazo, recusa",
     /prazo/i.test(simularContrato({ modo: "parcela", parcela: "100", dias: 20, taxa: 18 }).erro));
  ok("sem os dias, recusa",
     /dias/i.test(simularContrato({ modo: "parcela", parcela: "100", prazo: 10, taxa: 18 }).erro));
  ok("sem parcela, recusa",
     /parcela/i.test(simularContrato({ modo: "parcela", prazo: 10, dias: 20, taxa: 18 }).erro));
  ok("sem valor no modo valor, recusa",
     /receber/i.test(simularContrato({ modo: "valor", prazo: 10, dias: 20, taxa: 18 }).erro));

  // A carência não é enfeite nem aqui.
  const curta = simularContrato({ modo: "parcela", parcela: "100", prazo: 15,
                                  dias: 20, taxa: 18 });
  const longa = simularContrato({ modo: "parcela", parcela: "100", prazo: 15,
                                  dias: 45, taxa: 18 });
  ok("carência maior libera menos", longa.recebido < curta.recebido,
     [curta.recebido, longa.recebido]);
}

// ------------------------------------------------------------------ 31
console.log("\n31. os dois simuladores usam a mesma conta");
{
  limpar();
  const c = criar("11900009999", "Mesma conta");
  anotarRenda(c, "3000", "CREFISA");
  salvarContrato(c, { tipo: "NOVO", prazo: 15, parcela: "300",
                      primeiraEm: "2026-01-25", taxa: "18" });
  const k = contratosDe(c)[0];
  const ate = "2026-09-06";

  const refi = simularRefinanciamento(c, k, { ate, prazo: 18, tcc: false });
  const solto = simularContrato({
    modo: "parcela", parcela: String(refi.parcela), prazo: 18,
    dias: refi.dias, taxa: 18, tcc: 0,
  });

  ok("o financiado é o mesmo nos dois", refi.financiado === solto.financiado,
     [refi.financiado, solto.financiado]);
  ok("o recebido é o mesmo nos dois", refi.recebido === solto.recebido,
     [refi.recebido, solto.recebido]);
  ok("o refi apenas desconta o saldo",
     refi.troco === centavos(solto.recebido - refi.saldo), [refi.troco, refi.saldo]);
}

console.log(falhas ? `\n${falhas} FALHA(S)\n` : "\ntudo passou\n");
process.exit(falhas ? 1 : 0);
