# Registro de Mutações Reais — Projeto Bio-Foil (`ftl`)

Conforme **Seção 3.5** e **Lei L6**, toda mutação abaixo foi executada alterando o significado sem quebrar a sintaxe, medida via `node --test`, teve sua primeira linha de falha real copiada literalmente e foi revertida em seguida.

| ID | Alvo da Mutação | Lei Provada | Mutação Aplicada (Significado) | Primeira Linha de Falha Real Medida |
| :--- | :--- | :---: | :--- | :--- |
| `MUT-01` | `src/gdd-parser.mjs` (`CADEIA_CANONICA_GDD`) | **L5 / N4** | Remoção de `06_prova_formal_matriz_e_limites.md` da lista canônica (cadeia parcial de 5 volumes com 6 no diretório) | `Error: [L5 TRIPWIRE FALHOU] Cadeia incompleta ou item fora da lista. Faltando=[] Extras=[06_prova_formal_matriz_e_limites.md]` |
| `MUT-02` | `src/gdd-parser.mjs` (`consultarConstanteSsotComPermissao`) | **L2 / L3** | Retornar marcador `CHAVE_INEXISTENTE_NO_SSOT` quando `autorizado: false` (misturando ausência com falta de permissão) | `AssertionError [ERR_ASSERTION]: [L3] "Não existe" e "Não posso ver" nunca podem devolver o mesmo marcador` |
| `MUT-03` | `src/gdd-parser.mjs` (`extrairSsotEMatrizDoVolume06`) | **N1 / L4 / N4** | Omitir a 5ª coluna (`5_FURTIVO_AGUA`) ao ler a Matriz de Estados 5x8 (32 células em vez de 40) | `AssertionError [ERR_ASSERTION]: A Matriz 6.2 (5 estados x 8 eventos) deve conter 40 células` |
| `MUT-04` | `src/gdd-parser.mjs` (`calcularPesoTotalNave`) | **N1 / L1 / L4** | Trocar o peso de órgãos enxertados de `* 5` para `* 0` no motor matemático | `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: 190 !== 195` |
| `MUT-05` | `tests/01-portao-gdd.test.mjs` (`LISTA_CATRACA`) | **N2** | Inserir item `CAT-TEST-01` na catraca cuja falha já passou a verde (`verificarFalha: () => false`) | `AssertionError [ERR_ASSERTION]: [N2 CATRACA] O item CAT-TEST-01 (Item resolvido que esqueceram de tirar da catraca) passou a verde! Remova-o da LISTA_CATRACA.` |
| `MUT-06` | `scripts/hooks/pre-commit` | **Seção 5** | Remover `unset GIT_DIR GIT_INDEX_FILE ...` do topo do hook | `AssertionError [ERR_ASSERTION]: O hook scripts/hooks/pre-commit deve conter o unset das 7 variáveis no topo` |
