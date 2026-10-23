# PASSO 6: Prova Formal de Consistência (Tabela SSOT, Matriz $N \times N$, Limites Extremos e Precedência)

Para garantir que **nenhuma contradição lógica ou matemática** exista ou volte a surgir entre os Passos 1 a 5, este documento institui as **4 Travas Formais de Engenharia de Game Design**:
1. **Fonte Única da Verdade (*Single Source of Truth* — SSOT)**
2. **Matriz de Interação Cruzada de Estados $N \times N$ (*State-Interaction Matrix*)**
3. **Prova Matemática dos 4 Limites Extremos (*Boundary Value Analysis*)**
4. **Hierarquia Estrita de Precedência e Fórmulas de Acúmulo**

> **Regra de Soberania Documental:** Nenhum arquivo descritivo (Passos 1 a 5) pode redefinir valores fora da Tabela 6.1 ou violar uma célula da Matriz 6.2.

---

## 6.1. Fonte Única da Verdade (Tabela Mestre de Constantes Canônicas — SSOT)

| ID da Constante | Valor Canônico | Unidade / Escopo | Onde Atua |
| :--- | :---: | :--- | :--- |
| `HP_CASCO_BASE` | $30\text{ HP}$ | Exceção: *Sombra-Abissal* ($20\text{ HP}$) | Passo 1, 2, 3, 5 |
| `PESO_CHASSI_BASE` | $100\text{ kg}$ | Exceções: *Manta-Volt* ($70\text{ kg}$), *Sombra-Abissal* ($90\text{ kg}$) | Passo 1, 3, 5 |
| `NUM_CAMARAS_NAVE` | $8\text{ câmaras}$ | $6\text{ Sistemas Base} + 2\text{ Câmaras de Enxerto (A e B)}$ | Passo 1, 2, 3 |
| `CAP_AGUA_CAMARA` | $12.5\text{ kg}$ | $8 \times 12.5\text{ kg} = 100.0\text{ kg}$ de água total ($100\%$) | Passo 1, 2, 3, 4 |
| `RESERVA_MIN_SIFAO` | $62.5\text{ kg}$ | $5\text{ câmaras cheias}$ (até $3\text{ salas} / -37.5\text{ kg}$ sem penalidade) | Passo 1, 5 |
| `PENALIDADE_CAVITACAO` | $-2.0\text{ kg}$ | Sustentação perdida por cada $1\text{ kg}$ de água abaixo de $62.5\text{ kg}$ | Passo 1 |
| `SLOTS_ARMAS_ATIVAS` | $4\text{ slots}$ | Capacidade máxima de armas montadas na Artilharia Dorsal | Passo 1, 2, 5 |
| `SLOTS_PORAO_CARGA` | $4\text{ slots}$ | Itens no porão somam seu peso em $P_{\text{total}}$ normalmente | Passo 4, 5 |
| `PESO_ORGAO_ENXERTO` | $+5.0\text{ kg}$ | Adicionado ao peso da arma por cada Órgão enxertado | Passo 3, 5 |
| `PESO_SUBSISTEMA` | $0.0\text{ kg}$ | Tubo Pressurizado e Tinta Furtiva já embutidos em $P_{\text{chassi}}$ | Passo 1, 5 |
| `PESO_BLINDAGEM_NV` | $+15.0\text{ kg}$ | Por nível ($1\text{ a }3\text{ níveis}$: $+5\text{ HP}$ máx e $15\%$ deflexão/nv) | Passo 1, 5 |
| `MASTRO_FOIL_CURVA` | $200 / 240 / 280 / 330\text{ kg}$ | Níveis 1 a 4 ($4\text{ a }7\text{ barras}$; abaixo de $4$: $150/100/50/0\text{ kg}$) | Passo 1, 3, 5 |
| `SIFAO_EMP_POR_BARRA` | $+30.0\text{ kg}$ | De $1\text{ a }5\text{ barras}$ ($+30\text{ a }+150\text{ kg}$; se $0\text{ barras} \Rightarrow S_{\text{atual}} = 0$) | Passo 1, 3, 5 |
| `SUSTENTACAO_MAX_ABS` | $480.0\text{ kg}$ | Mastro Nv.4 ($330\text{ kg}$) $+$ Sifão Nv.5 ($150\text{ kg}$) | Passo 1, 6 |
| `TEMPO_SPOOL_UP` | $3.0\text{ s}$ | Contínuos com $P_{\text{total}} \le S_{\text{atual}}$ para subir do mar ao Foil | Passo 1, 3, 4 |
| `TAXA_FURO_AR` | $-1.0\text{ kg/s}$ | $1\text{ rombo}$ no ar (*No Foil*) seca $12.5\text{ kg}$ em $12.5\text{ s}$ | Passo 1, 3 |
| `TAXA_VALVULA_AR` | $-2.5\text{ kg/s}$ | Válvula aberta no ar (*No Foil*) seca $12.5\text{ kg}$ em $5.0\text{ s}$ | Passo 1, 2 |
| `TAXA_FURO_MAR` | $+5.0\text{ kg/s}$ | Em *Touchdown*, adiciona até $+20\text{ kg}$ de Alagamento Pesado/sala | Passo 1, 2 |
| `TAXA_RECARGA_MAR` | $+5.0\text{ kg/s}$ | Em *Touchdown* sem furo, enche sala seca em $2.5\text{ s}$ | Passo 1 |
| `TAXA_CAPILAR_AR` | $+1.25\text{ kg/s}$ | Bomba Branquial ($\ge 1\text{ barra}$) enche sala seca vedada em $10.0\text{ s}$ | Passo 1 |
| `TAXA_DRENO_PESADO` | $-4.0\text{ kg/s}$ | Bomba Branquial ($\ge 1\text{ barra}$) drena $+20\text{ kg}$ extras em $5.0\text{ s}$ | Passo 1 |
| `TEMPO_NADO_SALA` | $1.5\text{ s}$ | Tempo base por sala adjacente ($\div \text{Vel. da Espécie}$) | Passo 1, 3 |
| `TEMPO_REPARO_SIST` | $12.0\text{ s}$ | Tempo base por $1\text{ barra}$ ($6.0\text{ s}$ Polvo; $24.0\text{ s}$ Baiacu) | Passo 1, 3 |
| `TEMPO_REPARO_FURO` | $8.0\text{ s}$ | Tempo base por $1\text{ rombo}$ ($4.0\text{ s}$ Polvo; $16.0\text{ s}$ Baiacu) | Passo 1, 3 |
| `DANO_ANTIPESSOAL` | $15\text{ HP}$ | Por ponto de dano de sistema que atinge sala sem Barreira | Passo 1, 3 |
| `REATOR_TETO_COMPRA` | $18\text{ barras}$ | Máximo comprável para $28\text{ barras}$ de sistemas totais possíveis | Passo 1, 3, 5 |
| `VEL_FRENTE_EXTRATIVISTA` | $6.0\text{ MN/h}$ | Engole o setor de $120\text{ MN}$ em $20\text{ h}$ de jogo; nó com $X_{\text{nó}} \le 6.0 \times t$ vira Frota Corporativa | Passo 4, 6, 9 |

---

## 6.2. Matriz de Interação Cruzada $N \times N$ (*State-Interaction Matrix*)

Esta matriz cruza todos os **5 Estados Físicos da Nave** com os **8 Eventos/Ações de Combate**, eliminando qualquer zona cinzenta onde duas mecânicas ocorram no mesmo segundo:

| Evento / Ação $\downarrow$ \ Estado da Nave $\rightarrow$ | 1. *No Foil* (Voando no Ar: $P_{\text{total}} \le S_{\text{atual}}$) | 2. *Touchdown* (Caído no Mar: $P_{\text{total}} > S_{\text{atual}}$ ou Mergulho) | 3. *Spool-up* ($3.0\text{s}$ de Aceleração na Água antes de Decolar) | 4. *Furtivo no Ar* (*No Foil* + Tinta Furtiva Ativa) | 5. *Furtivo na Água* (*Touchdown* + Tinta Furtiva Ativa) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Esquiva da Nave ($\%$)** | Base do Sifão ($15\text{–}45\%$) $+$ Córtex ($+5\%$) $+$ Bulbo Sifão ($+10\%$). Cai p/ $0\%$ se Córtex Nv.1 sem piloto. | **$0\%$ absoluta** (casco imerso no mar). | **$0\%$ absoluta** (casco ainda está na água até completar $t=3.0\text{s}$). | Esquiva *No Foil* **$+60\%$** (teto de $100\%$) $+$ congela mira inimiga. | **$0\%$ para projéteis já em voo** (trava física do mar), **MAS congela $100\%$ o carregamento de mira inimiga!** |
| **B. Rombo no Casco (1 Furo)** | Vaza água para o ar a **$-1.0\text{ kg/s}$** (sala seca em $12.5\text{s}$; nave fica mais leve). | Entra água do mar sob pressão a **$+5.0\text{ kg/s}$** até **$+20\text{ kg}$** extras (Alagamento Pesado). | Igual a *Touchdown* ($+5.0\text{ kg/s}$). Se o peso cruzar $S_{\text{atual}}$, aborta e zera o *Spool-up*! | Igual a *No Foil* ($-1.0\text{ kg/s}$). | Igual a *Touchdown* ($+5.0\text{ kg/s}$). |
| **C. Abrir Válvula Externa (Airlock)** | Drena água a **$-2.5\text{ kg/s}$** ($5.0\text{s}$ p/ secar). Se houver Furo junto, soma **$-3.5\text{ kg/s}$**. | **BLOQUEADO PELA FÍSICA** (casco submerso; válvula não drena para o mar). | **BLOQUEADO PELA FÍSICA** (só libera após concluir os $3.0\text{s}$ e subir ao ar). | Drena normalmente a **$-2.5\text{ kg/s}$** sem quebrar a furtividade. | **BLOQUEADO PELA FÍSICA**. |
| **D. Curto-Circuito Aquático** | Causa $-4\text{ HP/s}$ e $1\text{ barra}/8\text{s}$. Apaga em $3\text{s}$ se secar a sala via Válvula, ou reparo manual ($8\text{s}/4\text{s}$ Arraia). | Válvula indisponível. Exige **reparo manual** da bainha ($8\text{s}$ base, ou **$4\text{s}$ com Arraia Elétrica imune**). | Igual a *Touchdown* (exige reparo manual até que a nave conclua a decolagem). | Igual a *No Foil*. | Igual a *Touchdown*. |
| **E. Recarga de Armas e Captação de Água** | Armas em velocidade normal ($1.0\times$). Sala seca vedada puxa água capilar a **$+1.25\text{ kg/s}$** ($10\text{s}$). | Armas recarregam **$-25\%$ mais rápido** (resfriamento). Salas secas sem furo enchem a **$+5.0\text{ kg/s}$** ($2.5\text{s}$). | Mantém bônus de *Touchdown* ($-25\%$ recarga e $+5.0\text{ kg/s}$ em salas secas) até decolar em $t=3.0\text{s}$. | Igual a *No Foil*. **Disparar arma de fogo/acústica corta $50\%$ da furtividade restante.** | Igual a *Touchdown*. **Disparar arma corta $50\%$ da furtividade restante.** |
| **F. Disparar Tubo Pressurizado** | Normal ($14\text{s}/9\text{s}$). Atravessa Barreira comum; bloqueado por Blindagem Térmica (Fase 3). | Normal ($14\text{s}/9\text{s}$). Pode lançar invasores mesmo caído no mar! | Normal ($14\text{s}/9\text{s}$). | Normal e **NÃO reduz a duração da Tinta Furtiva**! | Normal e **NÃO reduz a duração da Tinta Furtiva**! |
| **G. Carregamento de Fuga (Salto)** | **$20.0\text{s}$ base** ($15.0\text{s}$ com operador no Sifão). Pausa se Sifão $= 0$ ou sem piloto. | Avança na **metade da velocidade ($0.5\times \Rightarrow 40\text{s}/30\text{s}$)** devido ao arrasto oceânico. | Avança a $0.5\times$ durante os $3.0\text{s}$ e passa para $1.0\times$ no instante em que decola. | Avança normalmente a $1.0\times$ (excelente para carregar Fuga em segurança!). | Avança a $0.5\times$. |
| **H. Perigos Ambientais e Chefe Final** | Vulnerável a **Chuva Ácida** ($-1\text{ HP}/15\text{s}$) e **Onda de Arrasto** ($+50\text{ kg}$ por $6\text{s}$ na Fase 1). **Imune à Fervura Oceânica (Fase 3)!** | **Lava Chuva Ácida instantaneamente.** **Sofre Fervura Oceânica na Fase 3** ($-1\text{ HP casco/s}$ e $-5\text{ HP/s}$ tripulação) e Corrosão no Setor 7 após $8\text{s}$! | Ainda está na água: **sofre Fervura Oceânica (Fase 3)** até completar os $3.0\text{s}$ (por isso o alarme toca **$4.0\text{s}$ antes** do pulso!). | Igual a *No Foil* (a Tinta não anula o peso da Onda de Arrasto nem a Chuva Ácida). | Igual a *Touchdown*. |

> **Verificação Crucial na Célula 3H:** Repare por que o alarme da *Fervura Oceânica* na Fase 3 do Chefe Final toca exatamente **$4.0\text{ segundos}$ antes** do pulso térmico: como o *Spool-up* exige **$3.0\text{ segundos}$** para tirar a nave da água, o alarme de $4.0\text{s}$ dá ao jogador na água exatos **$1.0\text{s}$ de reação + $3.0\text{s}$ de *Spool-up*** para levantar voo antes de o mar ferver!

---

## 6.3. Prova Matemática dos 4 Limites Extremos (*Boundary Value Analysis*)

### Limite Extremo 1: Nave Mais Leve Possível no Jogo (*Lower Bound*)
* **Configuração:** Nave *Manta-Volt* ($70\text{ kg}$ chassi) + 3 câmaras drenadas no ar ($62.5\text{ kg}$ de água restante, limite sem cavitação) + 1 *Emissor Acústico I* ($10\text{ kg}$) + $0\text{ kg}$ blindagem.
* **Peso Mínimo Operacional:**
  $$P_{\text{mín}} = 70 + 62.5 + 10 = \mathbf{142.5\text{ kg}}$$
* **Teste na Equação de Velocidade de Cruzeiro (com Sustentação Máxima de $480\text{ kg}$):**
  * Como na viagem de mapa os tanques estabilizam em $100\text{ kg}$ (`CONTRA-AUDITORIA #4`), o peso mínimo de viagem é $70 + 100 + 10 = \mathbf{180.0\text{ kg}}$.
  * $$V_{\text{cruzeiro}} = \min\left(15.0,\; 9.5 \times \frac{480}{180}\right) = \min(15.0,\; 25.33) = \mathbf{15.0\text{ MN/h}}$$
* **Resultado da Prova:** O teto hidrodinâmico de $15.0\text{ MN/h}$ absorve o caso extremo sem divisão por zero e sem quebrar o relógio do mapa (salto mínimo de $14\text{ MN}$ em correnteza favorável $0.75\times$ leva $10.5\text{ MN} \div 15.0\text{ MN/h} = 0.7\text{h} \rightarrow$ arredondado para $0.5\text{h}$).

### Limite Extremo 2: Nave Mais Pesada Possível no Jogo (*Upper Bound*)
* **Configuração Máxima Equipada em Combate:** Chassi padrão ($100\text{ kg}$) + Água cheia ($100\text{ kg}$) + Placas de Blindagem Nv.3 ($3 \times 15 = 45\text{ kg}$) + 4 Armas mais pesadas do catálogo (*4x Lançador de Torpedo Abissal*, $4 \times 28 = 112\text{ kg}$) + 8 Órgãos enxertados nos 8 soquetes ($8 \times 5 = 40\text{ kg}$).
* **Peso Máximo Equipado:**
  $$P_{\text{máx equipado}} = 100 + 100 + 45 + 112 + 40 = \mathbf{397.0\text{ kg}}$$
* **Comparação com a Sustentação Máxima Absoluta ($480.0\text{ kg}$):**
  * Folga em voo normal: $480.0 - 397.0 = \mathbf{+83.0\text{ kg}}$ de margem!
  * Mesmo durante o ataque especial **Onda de Arrasto Hidráulico ($+50\text{ kg}$)** da Fase 1 do Chefe Final: $397.0 + 50.0 = \mathbf{447.0\text{ kg}} \le 480.0\text{ kg}$ (a nave maximizada suporta a Onda de Arrasto sem cair!).
  * **E se sofrer Alagamento Pesado ou lotar o Porão de Carga?** Se o jogador carregar mais 4 armas pesadas ociosas nos 4 slots do porão ($+112\text{ kg}$), o peso vai a $397 + 112 = \mathbf{509.0\text{ kg}} > 480.0\text{ kg}$, forçando-o a usar o botão **Descartar Carga no Mar** ou vender itens nos Recifes-Forja. Nenhuma configuração equipada legítima trava a nave!

### Limite Extremo 3: Cura Máxima vs. DPS Inimigo (*Anti-Immortality Proof*)
* **Cenário:** O jogador coloca 1 tripulante dentro da **Bomba Branquial Nv.3** ($+18\text{ HP/s}$ de cura local) e ativa o **Pulso de Enzimas** ($+5\text{ HP/s}$ global por $6\text{s}$).
* **Regra de Acúmulo na Sala da Bomba Branquial:** O Pulso de Enzimas circula a enzima da Bomba Branquial para as *demais* salas inundadas da nave (não soma $+5\text{ HP/s}$ em cima dos $+18\text{ HP/s}$ de quem já está dentro da própria fonte!). Logo, a cura máxima absoluta por segundo em qualquer tripulante é **$+18.0\text{ HP/s}$**.
* **Comparação com 2 Invasores de Assalto Corporativos na mesma sala:**
  * 2 Mergulhadores de Assalto ($2 \times 12\text{ DPS} = \mathbf{24.0\text{ DPS}}$) causam $24.0 - 18.0 = \mathbf{-6.0\text{ HP/s}}$ de dano líquido!
* **Resultado da Prova:** É matematicamente impossível ficar imortal parado dentro da Bomba Branquial contra uma dupla de invasores de elite sem revidar ou usar Curto-Circuito/Arraia.

### Limite Extremo 4: Pior RNG Econômico e de Combustível em um Setor
* **Cenário:** O jogador fica com **$0\text{ Combustível}$** logo no Nó Inicial do Setor e está com a nave em sobrepeso crítico (viajando em **Modo Deriva** pelo setor inteiro).
* **Cálculo de Travessia Mínima até a Saída (5 saltos diretos de $22\text{ MN}$):**
  * Velocidade normal ($11.0\text{ MN/h} \Rightarrow 2.0\text{h}$ por salto); em Modo Deriva ($2.0\times$ tempo) $= \mathbf{4.0\text{h}}$ por salto.
  * Em 5 saltos diretos da Coluna 0 à Coluna 5: $5 \times 4.0\text{h} = \mathbf{20.0\text{ Horas}}$ — exatamente o tempo limite em que a Frente Extrativista da Corporação ($6.0\text{ MN/h} \times 20\text{h} = 120\text{ MN}$) alcança a Coluna 5!
* **Resultado da Prova:** Mesmo com $0\text{ Combustível}$ do início ao fim do setor, o jogador consegue cruzar as 5 colunas e alcançar a Saída do Setor exatamente no limite das $20.0\text{h}$, sem nunca sofrer *softlock* matemático!

---

## 6.4. Hierarquia Estrita de Precedência de Regras (Desempate Lógico)

Sempre que dois ou mais efeitos atuarem sobre o mesmo sistema, tripulante ou atributo no mesmo instante, aplica-se esta ordem estrita de prioridade (do Nível 1 mais forte ao Nível 4 mais fraco):

1. **Nível 1 — Travas de Estado Absolutas (Anulação):**
   * *Sistema com $0\text{ Energia}$ / Destruído*, *Choque (Íon)*, *Mira Congelada por Tinta Furtiva* ou *Tripulante Atordoado (Concussão de $2\text{s}$)*. Enquanto ativo, o sistema ou tripulante não progride recarga/ação, independentemente de qualquer bônus de nível inferior.
2. **Nível 2 — Restrições Físicas de Meio (*Touchdown* vs. *No Foil*):**
   * *Touchdown* (incluindo os $3.0\text{s}$ de *Spool-up*) trava a Esquiva contra projéteis em voo em **$0\%$** e bloqueia a abertura de Válvulas Externas (Airlocks), prevalecendo sobre bônus percentuais de esquiva (como a Tinta Furtiva).
   * *Baiacu Inflado* trava o vazamento/entrada de água daquela sala em **$0.0\text{ kg/s}$**, prevalecendo sobre Rombos no ar ou no mar.
3. **Nível 3 — Modificadores de Tempo de Recarga (Soma Aditiva com Piso de $50\%$):**
   * Bônus de Operador na Artilharia ($-10\%$ comum / $-20\%$ Polvo) e Resfriamento de *Touchdown* ($-25\%$) somam-se **aditivamente**, e penalidades fixas de Órgãos (como $+2\text{s}$ da *Eletro-Placa*) são somadas ao tempo base antes dos multiplicadores:
     $$T_{\text{recarga final}} = \left(T_{\text{chassi}} + T_{\text{órgãos}}\right) \times \max\left(0.50,\; 1.0 - R_{\text{operador}} - R_{\text{touchdown}}\right)$$
4. **Nível 4 — Modificadores de Velocidade e Reparo de Tripulação (Multiplicativos):**
   * Velocidade de Reparo $= V_{\text{espécie}} \times M_{\text{ambiente}}$ (onde $M_{\text{ambiente}} = 0.5\times$ em sala $0\%$ seca para espécies puramente aquáticas, e $1.0\times$ para o Caranguejo Anfíbio ou salas com água).
