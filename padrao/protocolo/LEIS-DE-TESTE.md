# Protocolo de Testes e Bugs — Projeto Bio-Foil (`ftl`)

- **Projeto:** Bio-Foil (Nave Biológica com Hidrofólio)
- **Repositório Principal:** `./` (raiz do repositório Git)
- **Runtime / Runner:** Node.js `v22.22.2` (`node --test`, zero dependências externas)
- **Registro de Mutações:** `padrao/protocolo/MUTACOES.md`

---

## 1. Regra de Ouro

Verde não é evidência. Teste que passa sem provar nada é pior que teste que não existe, porque ninguém olha para ele. Todo teste novo nasce com a pergunta: *"se esta peça quebrasse, qual teste ficaria vermelho?"*. Se a resposta for nenhum, o teste não serve.

---

## 2. As 14 Leis

### Parte A — As Sete Leis de Base
- **L1 — A camada que mocka a peça não vê a peça quebrar:** A peça roda de verdade. Dublê só para o que custa dinheiro, rede externa ou banco de produção.
- **L2 — O fixture mais generoso que a peça:** O dado sai novo a cada leitura; nada é compartilhado entre as duas pontas (`Object.freeze` / cópia profunda a cada chamada).
- **L3 — Zero por ausência não é zero por cálculo:** `0`, `null`, `[]` não misturam "não existe" com "não posso ver". Permissão viaja em canal próprio (`{ status: 'OK' | 'NAO_ENCONTRADO' | 'SEM_PERMISSAO', valor }`).
- **L4 — A asserção que compara a peça consigo mesma:** Asserir o valor real, não o símbolo importado do mesmo módulo.
- **L5 — Portão de estado final com cadeia parcial é verde por construção:** Aplicar a cadeia inteira na ordem canônica (`01` a `06`), declarar a lista e rodar *tripwire* contra o diretório. Item fora da lista = vermelho.
- **L6 — Vermelho pela razão errada:** Mutação muda o significado, nunca a forma. Rodar, ler a 1ª linha de falha real, registrar e reverter.
- **L7 — Relato de passada não é medição:** Banco, arquivo e log primeiro; tela depois.

### Parte B — As Sete Leis desta Onda
- **N1 — Junção roda os dois lados:** Produtor e consumidor (ex.: Passos `01–05` ↔ Matriz/SSOT do Passo `06`) rodam juntos de verdade.
- **N2 — Lista-catraca:** Defeito aberto de outra frente entra em `LISTA_CATRACA` com `{ id, data, frase }`. Se passar a verde enquanto estiver na lista, o teste reprova até o item ser removido.
- **N3 — "Declarado" tem motivo e data:** Portão só vira obrigatório após 3 corridas verdes seguidas na branch principal com saída colada.
- **N4 — Quem enumera diz quantos examinou:** Todo teste que lista coisas imprime `[N4] Examinados: <N>`. Zero examinados = vermelho.
- **N5 — Trabalho paralelo:** Uma frente = uma worktree nova da branch principal, irmã do checkout vivo. Carga da máquina < 20. Proibido `--no-verify`, `--force`, `--admin`.
- **N6 — Onda de teste não conserta produto:** Defeito achado em produto vira item na catraca.
- **N7 — O vivo não é a main:** Todo relatório declara o commit medido e quantos commits o vivo está atrás da `main`.

---

## 3. Ambiente de Hook (Seção 5)

No topo de cada hook (`pre-commit`, `pre-push`), antes de qualquer teste:
```sh
unset GIT_DIR GIT_INDEX_FILE GIT_WORK_TREE GIT_PREFIX GIT_COMMON_DIR GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES
```
Antes de cada commit e de cada push: `git config --get core.bare` no repositório principal tem que dar `false`.

---

## 4. Regras operacionais medidas neste projeto (2026-10-22)

- **Onde ficam as worktrees (N5):** `../ftl-worktrees/<frente>` (diretório irmão da raiz do projeto). Em ambientes restritos de sandbox, a pasta `/tmp` pode recusar criação de worktrees, então use uma pasta irmã do repositório.
- **Commit direto na `main` é recusado** pelo `pre-commit` (Lei N5). A `main` só recebe `git merge --ff-only` da frente; isso não dispara o hook.
- **O hook testa o conteúdo do commit**, não a árvore de trabalho. Ele exporta o índice, inclusive o índice temporário de `git commit <arquivo>` (B4).
- **`NODE_TEST_CONTEXT` herdado** faz um `node --test` filho sair com 0 mesmo havendo falha (medido). Hooks e executor de mutações limpam essa variável (B16).
- **Mutação só vale se re-executada:** `mutacoes.json` é a fonte; `node scripts/rodar-mutacoes.mjs --gerar-md` mede e gera o bloco do `MUTACOES.md` (B6).
- **Portão novo nasce `DECLARADO`** em `PORTOES.md` e só vira `OBRIGATORIO` com 3 corridas verdes seguidas na `main`, com evidência colada (N3).
- **Apagar arquivo de produto ou documento** exige mostrar o que vai mudar e esperar o ok do responsável.
- **Worktree e ramo de frente** já juntados na `main` *e* no remoto são removidos pelo próprio agente, mas só com comandos que recusam quando há pendência: `git worktree remove` (sem `--force`) e `git branch -d` (nunca `-D`). Decisão delegada em 2026-10-22.
- **Dúvida não se deduz, se testa:** quando um número do GDD depende de um parâmetro não declarado, o portão enumera as possibilidades, imprime quais quebram o resultado e exige que o GDD declare o valor canônico (exemplo: os 12 cenários do Marinheiro 1).
- **Portão no servidor (CI + proteção da `main`):** o repositório remoto roda o job `portoes` (que executa `sh scripts/hooks/pre-push`) em todo push. A `main` está protegida: exige o job verde, não aceita push forçado nem exclusão, e a regra vale também para administradores.
- **Fluxo de envio:** 1) `git push origin frente/<nome>`; 2) esperar o job `portoes` ficar verde nesse commit; 3) `git merge --ff-only` na `main` local; 4) `git push origin main`, que reaproveita o mesmo commit e por isso o check já verde.
- **E-mail de commit:** este repositório usa só o endereço `noreply` do GitHub (`git config user.email`, local ao repositório). O histórico foi reescrito uma única vez, em 2026-10-22, com autorização do Dudu. A cópia anterior ficou na etiqueta local `backup/pre-reescrita-email`, que nunca deve ir para o remoto.
