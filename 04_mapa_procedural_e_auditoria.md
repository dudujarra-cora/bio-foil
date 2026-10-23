# PASSO 4: Arquitetura Matemática do Mapa Procedural e Relógio de Tempo

Agora que o Peso da Nave ($225\text{ kg}$ inicial) e a Sustentação ($260\text{ kg}$ inicial) estão travados pelos Passos 1 e 3, podemos especificar o **Gerador Procedural de Setores Oceânicos** sem chutes.

---

## 4.1. Algoritmo de Geração Espacial do Grafo (18 a 22 Nós por Setor)

Cada Setor representa uma região oceânica de **$120\text{ Milhas Náuticas (MN)}$ de largura** por **$60\text{ MN}$ de altura**, dividida em **6 Colunas Lógicas (Camadas 0 a 5)** da esquerda para a direita:

```
COLUNA 0         COLUNA 1         COLUNA 2         COLUNA 3         COLUNA 4         COLUNA 5
(Entrada)                                                                            (Saída)

                 [Nó 1A] =====> [Nó 2A (FORJA)] ==> [Nó 3A] =====> [Nó 4A (SOS: 6h)]
                /              /                   \              \
[NÓ INICIAL] ==+====> [Nó 1B] +======> [Nó 2B] =====+===> [Nó 3B] =+===> [Nó 4B] ===> [CORRENTE DE
                \                     /                           /                    SAÍDA SETOR]
                 [Nó 1C (SOS: 4h)] ==+=====> [Nó 2C] ====> [Nó 3C]
```

### Regras Matemáticas de Geração da Malha:
1. **Amostragem de Pontos (*Poisson Disc*):**
   * Coluna 0: 1 Nó fixo à esquerda (Ponto de Entrada no Setor).
   * Colunas 1 a 4: 4 a 5 Nós por coluna, com distância mínima de **$14\text{ MN}$** e máxima de **$28\text{ MN}$** entre vizinhos.
   * Coluna 5: 1 Nó fixo à direita (**Fossa/Corrente de Saída** para o próximo Setor).
2. **Conexão de Rotas (Triangulação Filtrada):**
   * Dois nós são conectados por uma rota navegável se a distância entre eles for $\le 28\text{ MN}$.
   * **Garantia Anti-Beco Sem Saída:** O gerador valida que todo nó das Colunas 1 a 4 possua pelo menos **1 rota de avanço para a direita** (nunca obrigando o jogador a voltar pelo mesmo nó, a menos que queira).
3. **Geração Procedural de Correntes Marítimas nas Rotas:**
   * $60\%$ das rotas: **Mar Normal** (Multiplicador de Distância Efetiva = $1.0\times$).
   * $20\%$ das rotas: **Correnteza a Favor** (Setas azuis em direção ao destino $\rightarrow$ Distância Efetiva = **$0.75\times$**).
   * $20\%$ das rotas: **Mar Revolto / Banco de Algas** (Linhas laranjas $\rightarrow$ Distância Efetiva = **$1.35\times$**).

---

## 4.2. A Equação do Relógio: Convertendo Peso em Horas de Viagem

O tempo do mundo é medido em **Horas (h)** com precisão de $0.5\text{h}$. O relógio fica $100\%$ parado enquanto o jogador analisa o mapa ou luta. Ele só avança no momento da travessia entre dois nós.

### 1. Cálculo da Velocidade de Cruzeiro ($V_{\text{cruzeiro}}$) — Sem Escalamento Duplo!
$$V_{\text{cruzeiro}} = \min\left(15.0,\; V_{\text{base}} \times \left(\frac{S_{\text{máx}}}{P_{\text{total}}}\right)\right)$$

* $V_{\text{base}} = 9.5\text{ MN/hora}$.
* $\left(\frac{S_{\text{máx}}}{P_{\text{total}}}\right)$ = Razão direta entre a Sustentação Máxima da sua nave (Mastro + Sifão) e o seu Peso Total atual!
* **Teto Hidrodinâmico ($\le 15.0\text{ MN/h}$):** Eliminamos o multiplicador duplicado $M_{\text{sifão}}$ (que causaria escalamento quadrático nos setores finais) e travamos a velocidade máxima em $15.0\text{ MN/h}$, garantindo que mesmo uma nave maximizada no Setor 7 nunca quebre o relógio do mapa!

#### Exemplo Real com a Nave Inicial (*Carcaça Alfa*):
* **Nave Leve/Padrão ($P_{\text{total}} = 225\text{ kg}$, $S_{\text{máx}} = 260\text{ kg}$):**
  $$V_{\text{cruzeiro}} = 9.5 \times \left(\frac{260}{225}\right) = \mathbf{11.0\text{ MN/hora}}$$
  * Uma travessia média de **$22\text{ MN}$** leva exatas **$2.0\text{ Horas}$** (e consome **1 Célula de Combustível**).
* **Nave Pesada / Entupida de Aço e Armas ($P_{\text{total}} = 258\text{ kg}$, $S_{\text{máx}} = 260\text{ kg}$):**
  $$V_{\text{cruzeiro}} = 9.5 \times \left(\frac{260}{258}\right) = \mathbf{9.5\text{ MN/hora}}$$
  * A mesma travessia de $22\text{ MN}$ sobe para **$2.3\text{ Horas}$**.
* **Nave em Sobrepeso Crítico ($P_{\text{total}} > S_{\text{máx}}$ — Viajando em *Touchdown* arrastando no mar):**
  * Penalidade severa de arrasto: $V_{\text{cruzeiro}}$ cai pela metade (**$4.75\text{ MN/hora}$**).
  * A mesma travessia de $22\text{ MN}$ demora **$4.6\text{ Horas}$** e consome **2 Células de Combustível**!

---

## 4.3. Janelas de Tempo (*Quasimorph*) e Avanço da Maré Corporativa

### 1. Como o Gerador Calcula o Prazo de um Evento ($T_{\text{prazo}}$)
Para que o gerador procedural nunca crie um evento matematicamente impossível, quando um nó na Coluna $K$ recebe um Evento com Relógio (ex: *Resgate de Criatura em Rede de Arrasto* ou *Cápsula de Suprimento Afundando*), o gerador calcula:

$$T_{\text{prazo}} = T_{\text{rota mínima (peso padrão)}} + 1.5\text{ Horas de Folga}$$

* **O efeito estratégico:** Se o evento está a 2 saltos de distância ($4.0\text{h}$ de viagem normal), o prazo gerado para ele é de **$5.5\text{ Horas}$**.
* O jogador olha o mapa e percebe:
  * Se for direto pela rota principal, chega com $1.5\text{h}$ de sobra.
  * Se pegar uma *Correnteza a Favor*, chega com $2.5\text{h}$ de sobra (podendo até visitar 1 nó extra no caminho!).
  * Se estiver carregando sucata pesada demais ou desviar para uma loja antes, vai gastar $6.0\text{h}$ $\rightarrow$ **chega atrasado e encontra a Zona Morta Industrializada!**

### 2. O Avanço da Frente Extrativista (A "Frota Rebelde" em Horas)
A mancha vermelha/poluída da Megacorporação avança da esquerda para a direita a uma velocidade constante de **$6.0\text{ MN por Hora de Jogo}$**.
* Como o setor tem $120\text{ MN}$ de largura, a Corporação engole o setor inteiro em **$20\text{ Horas de Jogo}$**.
* **A Matemática da Bola de Neve:**
  * Uma nave bem equilibrada no Foil ($2.0\text{h}$ por salto) consegue visitar **10 nós** no setor antes das $20\text{h}$ acabarem!
  * Uma nave sobrecarregada e mal gerida ($3.3\text{h}$ por salto) só consegue visitar **6 nós** no mesmo setor — perdendo 4 oportunidades de coletar Sucata e Biomassa!

---

## 4.4. O Baralho Procedural de Nós por Setor (Base 20 Nós, Variação 18 a 22)

Todo setor sorteia a posição dos seus nós usando um baralho de cotas fixo para a malha padrão de $20\text{ Nós}$ (caso a amostragem *Poisson Disc* da Seção 4.1 gere $18\text{ a }22\text{ Nós}$, a variação de $\pm 1\text{ a }2\text{ nós}$ é adicionada ou subtraída exclusivamente da cota de *Combate Padrão* e *Exploração*, mantendo Lojas, Eventos SOS e Perigos Ambientais 100% invariantes):
* **2 Nós de Recife-Forja / Baleia-Oficina (Lojas):** Sempre gerados entre as Colunas 2 e 4, nunca colados um no outro.
* **4 Nós de Evento com Janela de Tempo (SOS / Oportunidade Perecível):** Alto risco, alta recompensa (onde se recrutam animais novos ou se ganham órgãos raros).
* **6 Nós de Combate Padrão:** Patrulhas corporativas ou predadores territoriais.
* **3 Nós de Combate com Perigo Ambiental:**
  * *Chuva Radioativa Ácida:* Corrói $1\text{ de Casco}$ a cada $15\text{s}$ se a nave estiver no ar (*No Foil*), forçando o jogador a mergulhar na água (*Touchdown*) periodicamente para lavar o casco!
  * *Vórtice de Correnteza:* Reduz a sustentação do Foil em $-40\text{ kg}$ para ambos os lados.
  * *Águas Turvas Abissais:* Desativa sensores; você não vê a intenção de mira nem as salas internas do inimigo a menos que tenha uma Arraia Elétrica ou arma da família **Emissor Acústico** equipada.
* **3 Nós de Exploração / Evento de Escolha (*Blue Options*):** Naufrágios antigos, plataformas abandonadas, cardumes neutros.
* **1 Nó de Entrada + 1 Nó de Saída (Guardião do Setor).**

---

## 4.5. Catálogo Determinístico de Eventos de Nós (`SOS`, *Blue Options* e Perigos) e Regra de SOS Expirado

Para que a Onda 4 (`src/onda4-mapa/gerador-poisson.mjs` e `src/onda4-mapa/relogio-viagem.mjs`) opere com **zero texto placeholder e zero sorteio global impuro**, todos os **10 nós especiais** do baralho setorial ($4\text{ SOS} + 3\text{ Exploração} + 3\text{ Perigos Ambientais} = \mathbf{10\text{ templates}}$) são resolvidos de forma $100\%$ determinística a partir de `(seedPartida, setorNumero, noId)` e da tabela de saque setorial $S \in \{1..8\}$ da Seção 5.6.C.

### A. Tabela Canônica dos 10 Templates de Eventos (4 SOS + 3 Exploração + 3 Perigos Ambientais)

* **Resolução Determinística da Opção A (Sem Requisito):** Calcula-se a paridade $p = \text{hash32}(\text{seedPartida}, S, \text{noId}) \bmod 2 \in \{0, 1\}$. Se $p = 0$ (**Sucesso Padrão**), entrega a recompensa base sem dano; se $p = 1$ (**Complicação Padrão**), cobra o custo de risco ($-3\text{ HP}$ de casco ou combate imediato) em troca de recompensa parcial.
* **Resolução da Opção B (*Blue Option* — Requisito Satisfeito):** Tem **$100\%$ de sucesso crítico garantido** ($0\text{ dano}$ de casco e recompensa máxima), independente da paridade $p$.
* **Resolução da Opção C (Recusar / Seguir Viagem):** Nos nós `SOS` e `EXPLORACAO`, permite recuar com $0\text{ dano}$ e $0\text{ recompensa}$; nos nós `PERIGO`, o combate é obrigatório (`BLOQUEADO_COMBATE_OBRIGATORIO`).

| ID do Evento | Categoria | Nome do Evento | Opção A (Padrão: $p=0$ Sucesso / $p=1$ Risco) | Requisito Exato da Opção B (*Blue Option*) | Recompensa Crítica da Opção B ($100\%$ Garantida) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `SOS_1_REDE_ARRASTO` | `SOS` | **1. Criatura em Rede de Arrasto** | $p=0$: $+1\text{ Tripulante}$ e $-2\text{ HP}$ casco; $p=1$: Combate Barco $+ \text{Biomassa}_{\text{bruta}}(S)$ | `ARMA: Cortador Térmico a Plasma OU TRIPULANTE: Caranguejo Anfíbio` | **Recruta $+1\text{ Tripulante}$** ($0\text{ dano}$) $+ \text{Biomassa}_{\text{bruta}}(S)$ |
| `SOS_2_CAPSULA_AFUNDANDO` | `SOS` | **2. Cápsula Suprimento na Fossa** | $p=0$: $+\text{Sucata}_{\text{bruta}}(S) + 2\text{ Comb.}$; $p=1$: $-3\text{ HP}$ casco $+\text{Sucata}_{\text{bruta}}(S)$ | `SISTEMA: Sifão de Propulsão Nv. 3+ OU TRIPULANTE: Polvo` | **$+\text{Sucata}_{\text{captura}}(S) + 3\text{ Combustíveis} + 2\text{ Munições}$** |
| `SOS_3_NINHO_SITIADO` | `SOS` | **3. Recife-Berçário Sitiado** | $p=0$: $+\text{Biomassa}_{\text{cirúrgica}}(S)$; $p=1$: Combate Monstro $+\text{Biomassa}_{\text{bruta}}(S)$ | `SISTEMA: Bomba Branquial Nv. 2+ OU TRIPULANTE: Baiacu Espinhoso` | **$+1\text{ Órgão Intacto}$ (Catálogo 5.2) $+ \text{Biomassa}_{\text{cirúrgica}}(S)$** |
| `SOS_4_COMBOIO_ENCALHADO` | `SOS` | **4. Cargueiro Corporativo em Pane** | $p=0$: $+\text{Sucata}_{\text{captura}}(S)$; $p=1$: Combate Barco $+\text{Sucata}_{\text{bruta}}(S)$ | `SISTEMA: Glândula de Tinta Furtiva Nv. 1+ OU TRIPULANTE: Arraia Elétrica` | **$+1\text{ Arma Recuperada}$ (Catálogo 5.1) $+ \text{Sucata}_{\text{captura}}(S)$** |
| `EXP_1_NAUFRAGIO_ANTIGO` | `EXPLORACAO` | **5. Couraçado Pré-Dilúvio** | $p=0$: $+\text{Sucata}_{\text{bruta}}(S)$; $p=1$: $-3\text{ HP}$ casco $+\text{Sucata}_{\text{bruta}}(S)$ | `TRIPULANTE: Caranguejo Anfíbio OU ARMA: Canhão de Arpão de Cabo` | **$+\text{Sucata}_{\text{captura}}(S) + 2\text{ Munições}$** ($0\text{ dano}$) |
| `EXP_2_PLATAFORMA_FANTASMA` | `EXPLORACAO` | **6. Estação de Sonar Abandonada** | $p=0$: $+\text{Sucata}_{\text{bruta}}(S)$; $p=1$: Alarme dispara Combate Barco | `TRIPULANTE: Arraia Elétrica OU SISTEMA: Córtex de Navegação Nv. 2+` | **Revela $100\%$ Mapa Setorial $+ \text{Sucata}_{\text{bruta}}(S) + 2\text{ Combustíveis}$** |
| `EXP_3_CARDUME_SIMBIOTICO` | `EXPLORACAO` | **7. Cardume Bioluminescente** | $p=0$: $+\text{Biomassa}_{\text{bruta}}(S)$; $p=1$: $-2\text{ HP}$ casco $+\text{Biomassa}_{\text{bruta}}(S)$ | `TRIPULANTE: Polvo OU SISTEMA: Bomba Branquial Nv. 2+` | **Repara $+5\text{ HP}$ no Casco $+ \text{Biomassa}_{\text{cirúrgica}}(S)$** |
| `PER_1_CHUVA_ACIDA` | `PERIGO` | **8. Chuva Radioativa Ácida** | Combate obrigatório c/ Ácido ($-1\text{ HP}$ casco a cada $15\text{s}$ *No Foil*) | `SISTEMA: Placas de Blindagem Nv. 2+ OU Glândula de Barreira Nv. 4+` | **Neutraliza os primeiros $30\text{s}$ de Chuva Ácida** $+ 10\text{ Sucata}$ bônus pós-luta |
| `PER_2_VORTICE_CORRENTEZA` | `PERIGO` | **9. Vórtice de Correnteza** | Combate obrigatório c/ Vórtice ($-40\text{ kg}$ na Sustentação do Foil) | `SISTEMA: Mastro do Foil Nv. 2+ OU Sifão de Propulsão Nv. 3+` | **Reduz penalidade do Vórtice pela metade ($-20\text{ kg}$ em vez de $-40\text{ kg}$)** |
| `PER_3_AGUAS_TURVAS` | `PERIGO` | **10. Águas Turvas Abissais** | Combate obrigatório c/ Canal `L3` em `NEGADO_SONAR` | `TRIPULANTE: Arraia Elétrica OU ARMA: Família Emissor Acústico` | **Restaura Canal `L3` para `VISIVEL` durante todo o combate** |

### B. Regra Mecânica Exata de SOS Expirado (*Zona Morta Industrializada*) e Nó Engolido pela Frente Corporativa

1. **SOS Dentro do Prazo ($t_{\text{atual}} \le T_{\text{prazo}}$):** O evento `SOS_1..4` está ativo com suas Opções A, B (*Blue Option*) e C íntegras.
2. **SOS Expirado ($t_{\text{atual}} > T_{\text{prazo}} \Rightarrow$ *Zona Morta Industrializada*):**
   * Quando o relógio do setor ultrapassa estritamente $T_{\text{prazo}} = T_{\text{rota mínima}} + 1.5\text{h}$, a Corporação conclui o saque/abate antes da chegada do jogador e o estado do nó muda para `ZONA_MORTA_INDUSTRIALIZADA`.
   * **Penalidade Mecânica ao Visitar:** As Opções A/B/C do SOS desaparecem ($0\%$ de chance de recrutamento, órgão ou arma bônus). O jogador cai obrigatoriamente em combate contra uma **Patrulha Corporativa de Retaguarda** do setor atual (`BARCO_HUMANO`) cujo saque pós-combate sofre **penalidade de $-50\%$ arredondada para baixo**:
     $$\text{Sucata}_{\text{SOS expirado}}(S) = \lfloor 0.5 \times \text{Sucata}_{\text{modalidade}}(S) \rfloor \quad (\text{com } 0\text{ Combustível e } 0\text{ Munição extras})$$
     *(Ex.: No Setor 1, vencer por Destruição Bruta num SOS Expirado rende apenas $\lfloor 0.5 \times 12 \rfloor = \mathbf{6\text{ Sucata}}$, e por Captura Intacta rende $\lfloor 0.5 \times 25 \rfloor = \mathbf{12\text{ Sucata}}$).*
3. **Nó Engolido pela Frente Extrativista ($X_{\text{nó}} \le 6.0\text{ MN/h} \times t_{\text{atual}} \Rightarrow$ *Frota Principal da Corporação*):**
   * Se o jogador visitar qualquer nó cuja coordenada horizontal $X_{\text{nó}}$ já foi alcançada ou ultrapassada pela Frente Extrativista ($6.0\text{ MN/h}$), enfrenta um **Barco Corporativo de Elite** com **$+1\text{ bolha}$ de Barreira adicional** (até o teto de $4\text{ bolhas}$) que concede **$0\text{ Sucata}$, $0\text{ Biomassa}$ e $0\text{ Munição}$**, entregando exclusivamente **$1\text{ Célula de Combustível}$** em caso de vitória.

---

# CONTRA-AUDITORIA #4 (Análise Brutal do Mapa Procedural do Passo 4)

Vamos procurar onde o jogador pode trapacear esse sistema de mapa ou onde o gerador procedural pode travar a partida (*Softlock*):

### Falha Encontrada 1: O Exploit da "Mochila sem Peso" (Desequipar Armas para Viajar Rápido)
* **O Problema:** Se o cálculo de $P_{\text{total}}$ no mapa levasse em conta apenas as armas *equipadas nos slots*, o jogador tiraria todas as armas pesadas, colocaria na mochila/inventário antes de clicar em "Viajar", viajaria super leve em $1.5\text{h}$, e reequiparia as armas antes do combate começar!
* **Correção Obrigatória Aplicada ao Design:**
  * **Todo item carregado na nave tem Peso Físico Real (Equipado ou no Porão de Carga):**
    * Uma arma de $25\text{ kg}$ pesa $25\text{ kg}$ esteja ela montada na Artilharia Dorsal ou guardada nos 4 slots do porão de carga!
    * **Decisão de Descarte (*Jettison Cargo*):** Se o jogador saqueou um canhão pesado demais e precisa correr para alcançar um evento com relógio curto, ele tem o botão **"Descartar Carga no Mar"** (joga o item fora permanentemente para aliviar o peso imediatamente) ou vende no próximo Recife-Forja!

### Falha Encontrada 2: O Exploit de "Esvaziar os Tanques Antes de Viajar"
* **O Problema:** E se o jogador abrir todas as válvulas de água no último segundo da batalha anterior (baixando o peso da nave de $225\text{ kg}$ para $125\text{ kg}$) e clicar em "Viajar no Mapa" com os tanques vazios para viajar no dobro da velocidade?
* **Correção Obrigatória Aplicada ao Design:**
  * **Travessia Exige Estabilização Biológica:** Ao clicar em "Viajar para o próximo Nó", a nave automaticamente **fecha as válvulas e nivela os tanques biológicos em $100\%$ ($100\text{ kg}$)** usando a água do oceano antes de iniciar a viagem de horas (caso contrário, sua tripulação morreria sufocada durante as 2 horas de viagem!). Portanto, o peso de viagem no mapa considera sempre os tanques cheios + chassi + armas/carga + blindagem.

### Falha Encontrada 3: Softlock de Combustível Zero + Tempo Correndo
* **O Problema:** O que acontece quando as **Células de Combustível chegam a 0**? No FTL, você ativa o sinal de SOS e espera 1 turno parado. No nosso jogo, se você ficar parado sem combustível, quanto tempo passa?
* **Correção Obrigatória Aplicada ao Design:**
  * **Deriva na Correnteza (Modo Sem Combustível):**
    * Sem combustível, você ainda pode viajar para o próximo nó usando apenas a força muscular dos animais e as correntes marítimas (**Modo Deriva**), **MAS a viagem demora o DOBRO de Horas ($2.0\times$)** e você começa o próximo combate já caído na água (*Touchdown*) com o Sifão em partida a frio (exigindo $2\text{s}$ de ignição hidrodinâmica + os $3\text{s}$ padrão de *Spool-up* = **$5\text{ segundos}$ totais** para levantar o foil)!
    * Isso é melhor que o FTL: você nunca fica travado esperando sorteio numa tela parada, mas ficar sem combustível te atrasa brutalmente no relógio do setor e te joga em combate em desvantagem!

### Falha Encontrada 4: O Exploit de "Farming Infinito" na Frente da Corporação e nos SOS Expirados
* **O Problema Duplo:**
  1. Se os nós engolidos pela Frente Extrativista ($6.0\text{ MN/h}$) continuassem pagando Sucata normal, uma nave forte no Setor 6 ficaria indo e voltando dentro da mancha vermelha da Corporação para farmar Sucata infinita!
  2. Se um nó de **SOS Expirado** ($t_{\text{atual}} > T_{\text{prazo}}$) apenas virasse um combate normal com $100\%$ de saque, perder o prazo de um SOS não teria punição econômica real para uma *build* focada em combate bruto.
* **Correção Obrigatória Aplicada ao Design (Travada na Seção 4.5.B):**
  1. **Zero Farming na Frente Extrativista ($0\text{ Sucata} / 0\text{ Biomassa}$):** Nós engolidos pela maré corporativa colocam o jogador contra naves de elite ($+1\text{ bolha}$ de Barreira) que dão apenas **$1\text{ Célula de Combustível}$** de sobrevivência (zero Sucata/Biomassa).
  2. **Saque Cortado pela Metade no SOS Expirado ($\lfloor 0.5 \times \text{Sucata} \rfloor$):** Visitar uma *Zona Morta Industrializada* após $T_{\text{prazo}}$ elimina o evento especial e reduz o saque da patrulha remanescente em **$-50\%$** (com $0\text{ Combustível}$ e $0\text{ Munição}$ extras), tornando o relógio de $T_{\text{prazo}}$ uma pressão tática real em qualquer *build*!
