# Protocolo de Testes e Bugs — Projeto Bio-Foil (`ftl`)

- **Projeto:** Bio-Foil (Nave Biológica com Hidrofólio)
- **Repositório Principal:** `/Users/dudujarra/Documents/ftl`
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
