# PASSO 1: A Matemática Base no Papel (Nave, Peso, Água, Energia e Tripulação)

Este documento define os números fundacionais da simulação. Nenhum valor é arbitrário: todos estão ancorados na relação entre **Peso Total (kg)**, **Sustentação do Hidrofólio (kg)** e **Tempo (segundos)**.

---

## 1.1. Equação Mestre de Sustentação (O Coração Físico)

A nave possui um **Peso Total Atual ($P_{\text{total}}$)** e uma **Capacidade de Sustentação Atual ($S_{\text{atual}}$)**.

$$P_{\text{total}} = P_{\text{chassi}} + P_{\text{água}} + P_{\text{armas}} + P_{\text{blindagem}}$$

$$S_{\text{atual}} = \begin{cases} S_{\text{mastro}} + S_{\text{sifão}} - C_{\text{cavitação}}, & \text{se Energia no Sifão} \ge 1\text{ e Integridade do Mastro} > 0 \\ 0\text{ kg}, & \text{se Energia no Sifão} = 0\text{ ou Mastro totalmente destruído} \end{cases}$$

* **Condição de Voo (*No Foil*):** $P_{\text{total}} \le S_{\text{atual}}$
* **Condição de Queda (*Touchdown*):** $P_{\text{total}} > S_{\text{atual}}$ (se o Sifão de Propulsão ficar com $0\text{ Barras}$ ou o Mastro do Foil perder todas as barras estruturais, a nave perde a velocidade hidrodinâmica mínima, $S_{\text{atual}}$ cai para $0\text{ kg}$ e ocorre *Touchdown* imediato).
* **Peso de Subsistemas Internos:** Enxertar subsistemas nas Câmaras 7 e 8 (*Tubo Pressurizado* ou *Glândula de Tinta Furtiva*) substitui biomassa interna equivalente e tem peso líquido adicional de **$0\text{ kg}$** (já embutido em $P_{\text{chassi}}$).

### Valores Base da Nave Inicial (*Carcaça Alfa*)
* **Integridade do Casco (HP da Nave):** $30\text{ HP}$
* **Peso Seco do Chassi ($P_{\text{chassi}}$):** $100\text{ kg}$ (fixo)
* **Geometria de 8 Câmaras Inundadas ($12.5\text{ kg}$ cada = $100\text{ kg}$ de Água Total):**
  * **6 Câmaras de Sistemas Base:** 1. *Artilharia Dorsal* (Armas — até $4\text{ Slots de Armas Ativas}$ e máximo de $8\text{ Barras}$), 2. *Córtex de Navegação* (Piloto), 3. *Bomba Branquial* ($O_2$ + Cura), 4. *Glândula de Barreira* (Escudo), 5. *Sifão de Propulsão* (Motor), 6. *Poço da Quilha* (Raiz do Mastro do Foil).
  * **2 Câmaras de Enxerto Livres (Slots A e B):** 7. *Câmara de Enxerto A* e 8. *Câmara de Enxerto B* (funcionam como câmaras de circulação inundadas até que novos subsistemas como o *Tubo Pressurizado* ou a *Glândula de Tinta Furtiva* sejam instalados nelas nos Recifes-Forja).
  * Todas as **8 câmaras** começam $100\%$ inundadas com **$12.5\text{ kg}$ de água salgada cada** ($8 \times 12.5\text{ kg} = \mathbf{100\text{ kg}}$ de água total), permitindo que qualquer animal nade e opere em todas as salas da nave sem sufocar.
* **Peso Inicial das Armas e Blindagem:**
  * Arma Inicial 1 (*Canhão de Arpão de Cabo*): $15\text{ kg}$
  * Arma Inicial 2 (*Emissor Acústico I*): $10\text{ kg}$
  * Blindagem Inicial: $0\text{ kg}$
* **Peso Total Inicial da Nave em Combate:**
  $$P_{\text{total inicial}} = 100\text{ (chassi)} + 100\text{ (água)} + 25\text{ (armas)} = 225\text{ kg}$$

---

## 1.2. Tabela de Progressão: Sifão de Propulsão e Mastro do Foil

Para evitar que o jogador tenha dois sistemas redundantes fazendo a mesma coisa, a função de **Sustentação e Esquiva** é dividida de forma complementar entre o **Mastro do Foil** (passivo/estrutural) e o **Sifão de Propulsão** (ativo/consome energia):

### A. Mastro do Foil (Subsistema Estrutural Mecânico — Custa 100% Sucata, Não Consome Energia)
Define o **Limite Base de Sustentação** da asa hidrodinâmica (enquanto o Sifão tiver $\ge 1\text{ Barra}$ ativa). Quando o Mastro sofre dano estrutural no Poço da Quilha, sua sustentação cai para o patamar exato do número de barras estruturais intactas restantes (abaixo de $4\text{ barras}$, cada barra intacta sustenta $50\text{ kg}$: $3\text{ barras} = 150\text{ kg}$, $2\text{ barras} = 100\text{ kg}$, $1\text{ barra} = 50\text{ kg}$, e $0\text{ barras} = 0\text{ kg}$ com colapso imediato):
* **Nível 1 (Inicial — 4 Barras Estruturais):** Suporta até **$200\text{ kg}$** base.
* **Nível 2 (Custo: 45 Sucata — 5 Barras Estruturais):** Suporta até **$240\text{ kg}$** base.
* **Nível 3 (Custo: 80 Sucata — 6 Barras Estruturais):** Suporta até **$280\text{ kg}$** base.
* **Nível 4 (Custo: 120 Sucata — 7 Barras Estruturais):** Suporta até **$330\text{ kg}$** base.

### B. Sifão de Propulsão (Sistema Ativo — Consome Energia do Coração Bio-Elétrico)
Cada barra de energia alocada no Sifão gera **Empuxo Adicional (Sustentação Extra)** independentemente de haver piloto no Córtex, e gera **Esquiva Base** (a Esquiva exige que o Córtex de Navegação esteja operacional e tripulado; sem piloto no Córtex, a Esquiva cai para $0\%$, mas a Sustentação hidrodinâmica em kg é mantida):

| Energia no Sifão | Sustentação Extra Gerada | Sustentação Total (c/ Foil Nv. 1) | Esquiva no Ar (*No Foil*) | Velocidade de Cruzeiro no Mapa (c/ 225kg) |
| :---: | :---: | :---: | :---: | :---: |
| **0 Barras** | $+0\text{ kg}$ | $0\text{ kg}$ (Cai em *Touchdown* imediato) | $0\%$ | Imóvel |
| **1 Barra** | $+30\text{ kg}$ | $230\text{ kg}$ (Margem de apenas $5\text{ kg}$!) | $15\%$ | $9.7\text{ MN/h}$ |
| **2 Barras (Inicial)** | $+60\text{ kg}$ | $260\text{ kg}$ (Margem de $35\text{ kg}$) | $25\%$ | $11.0\text{ MN/h}$ |
| **3 Barras** | $+90\text{ kg}$ | $290\text{ kg}$ | $32\%$ | $12.2\text{ MN/h}$ |
| **4 Barras** | $+120\text{ kg}$ | $320\text{ kg}$ | $40\%$ | $13.5\text{ MN/h}$ |
| **5 Barras** | $+150\text{ kg}$ | $350\text{ kg}$ | $45\%$ | $14.8\text{ MN/h}$ |

* **Bônus de Operador e Carga de Fuga:** Um animal acoplado ao Bulbo do Córtex dá **$+5\%$ de Esquiva**; um animal acoplado ao Bulbo do Sifão dá **$+10\%$ de Esquiva** e reduz o tempo do **Botão de Fuga** de **$20\text{s}$ para $15\text{s}$** enquanto voa *No Foil* (em *Touchdown*, o arrasto do mar reduz a velocidade de carregamento da Fuga pela metade, para $0.5\times$; sem piloto no Córtex ou com $0\text{ Barras}$ no Sifão, a Fuga pausa). *(Correção de Auditoria: Operadores NUNCA alteram os quilos de Sustentação para que mover um tripulante não derrube a nave acidentalmente).*
* **Olhe a tensão matemática criada aqui:**
  * A nave começa pesando **$225\text{ kg}$**.
  * Se o jogador deixar apenas **1 Barra de Energia** no Sifão (para economizar energia para armas/escudo), a sustentação máxima dele é **$230\text{ kg}$** — uma margem de apenas **$5\text{ kg}$**!

---

## 1.3. Dinâmica de Água, Rombo de Casco (Breach) e Curto-Circuito

Cada uma das **8 câmaras internas** tem capacidade normal de **$12.5\text{ kg}$ de água** (escala de $0\%$ a $100\%$, totalizando $100\text{ kg}$ na nave).

### A. Quando a Nave está NO AR (*No Foil*):
1. **Rombo no Casco (1 Furo):** Drena a água da câmara atingida a uma taxa de **$-1.0\text{ kg por segundo}$** ($8\%$ por segundo).
   * Tempo para a sala secar completamente ($100\% \rightarrow 0\%$): **$12.5\text{ segundos}$**.
2. **Abertura Voluntária de Válvula Externa (Airlock):** Drena a água a **$-2.5\text{ kg por segundo}$** ($5.0\text{ segundos}$ para esvaziar os $12.5\text{ kg}$ de uma sala em emergência!).
3. **Curto-Circuito Aquático (Substituto do "Fogo" do FTL):**
   * Os cabos bio-elétricos correm dentro de bainhas isolantes nas paredes das salas.
   * Quando um tiro inimigo causa **Ruptura de Isolamento** (ou quando uma sala sofre **Alagamento Pesado no mar**), a corrente vaza para a água da sala, iniciando um **Curto-Circuito**.
   * **Efeito do Curto-Circuito:** Eletrifica a água da sala ($-4\text{ HP/s}$ nos tripulantes dentro dela) e queima $1\text{ barra de sistema}$ a cada $8\text{ segundos}$.
   * **Como apagar um Curto-Circuito:**
     * **No Ar (*No Foil*):** Abrir a válvula externa e drenar a água da sala para $0\%$ (no seco, o arco elétrico perde o meio condutor e apaga sozinho em $3\text{ segundos}$ — equivalente a abrir as portas no FTL para apagar fogo com vácuo!).
     * **No Mar (*Touchdown*):** Como o casco está submerso no oceano, **não é possível drenar a sala abrindo a válvula externa** (abri-la no mar faz entrar mais água!). Em *Touchdown*, o curto-circuito só pode ser apagado consertando a bainha isolante diretamente com um tripulante ($8\text{s}$ base, ou $4\text{s}$ com a **Arraia Elétrica**, que é $100\%$ imune ao dano de Curto-Circuito!).

### B. Quando a Nave está NA ÁGUA (*Touchdown*):
1. **Rombo no Casco (1 Furo):** Como o casco agora está submerso, o mar invade sob pressão a **$+5.0\text{ kg por segundo}$**!
   * Em salas biológicas que já estão com $12.5\text{ kg}$ de água, o excesso de pressão causa **Sobrecarga Hidrostática (Alagamento Pesado)**, adicionando até **$+20\text{ kg}$ extras por sala furada** (a sala passa a pesar $32.5\text{ kg}$!).
   * Se duas salas furadas alagarem no mar ($+40\text{ kg}$ extras), a nave sobe de $225\text{ kg}$ para **$265\text{ kg}$** — ultrapassando os $260\text{ kg}$ do Sifão Nível 2! A nave fica **presa na água** até o jogador tampar o furo (ou usar o Baiacu) e bombear o excesso para fora!
2. **Recarga Tática no Touchdown (Sem Furo):**
   * Meramente encostar na água (*Touchdown* voluntário) reabastece todas as câmaras biológicas secas a **$+5.0\text{ kg por segundo}$** ($2.5\text{ segundos}$ para encher um tanque de $12.5\text{ kg}$) e reduz o calor/tempo de recarga das armas em $25\%$.

---

## 1.4. Sistemas de Defesa, Suporte e Enxertos (Câmaras 3, 4, 7 e 8)

### Glândula de Barreira (Escudos — Câmara 4)
* **Consumo:** $2\text{ Barras de Energia}$ por camada de barreira (máximo de 4 camadas no Nível 8).
* **Tempo de Regeneração de 1 Camada:**
  * Sem operador: $2.0\text{ segundos}$ por camada.
  * Com operador comum acoplado ao Bulbo: $1.7\text{ segundos}$ por camada ($-15\%$).
  * Com **Polvo** acoplado ao Bulbo: $1.5\text{ segundos}$ por camada ($-25\%$).
* **Comportamento:** Bloqueia $100\%$ de arpões de cabo, tiros balísticos, pulsos acústicos e feixes térmicos, consumindo 1 camada por projétil ou feixe bloqueado. Apenas armas que consomem **Munição** (Torpedos Abissais e Morteiros) e cápsulas do **Tubo Pressurizado** (exceto contra a Blindagem Térmica Externa da Fase 3 do Chefe Final) atravessam a Barreira diretamente.
* **Dano Antipessoal de Armas:** Todo projétil ou feixe que acerta uma sala sem Barreira causa **$15\text{ HP}$ de dano direto** aos tripulantes (aliados ou inimigos) presentes naquela sala por ponto de dano de sistema da arma.

### Bomba Branquial (Oxigênio + Reabastecimento + Cura Integrados — Câmara 3)
* **0 Barras (Desligada ou Quebrada):** O nível de Oxigênio ($O_2$) da água cai a **$-4\%$ por segundo** ($20\text{ segundos}$ até cair de $100\%$ para o limiar crítico de $20\%$, e $25\text{s}$ até $0\%$) e salas secas não conseguem puxar água nova enquanto a nave estiver no ar. Água com $O_2 < 20\%$ causa asfixia ($-8\text{ HP/s}$) igual a uma sala seca.
* **1 Barra (Operação Normal):**
  * Regenera $O_2$ a $+8\%\text{/s}$ na nave toda;
  * **Captação Capilar pelo Mastro:** Puxa água do mar através do Mastro do Foil submerso para reencher salas que secaram no ar (desde que a sala esteja sem rombo aberto e com a válvula fechada) a **$+1.25\text{ kg/s}$** ($10\text{s}$ para encher uma sala de $12.5\text{ kg}$ no ar, contra apenas $2.5\text{s}$ se mergulhar a nave em *Touchdown*!) e drena excesso de alagamento pesado a $-4.0\text{ kg/s}$;
  * **Cura Local:** Cura tripulantes que estiverem **dentro da própria sala da Bomba Branquial a $+5\text{ HP/s}$**.
* **2 Barras (Enzimas Regenerativas Nv. 1):** Cura a **$+12\text{ HP/s}$ dentro da sala da Bomba Branquial** e libera a habilidade ativa **Pulso de Enzimas** (cura $+5\text{ HP/s}$ nas demais salas inundadas por $6\text{s}$, sem somar acima da cura local de quem já está dentro da própria Bomba Branquial, com $25\text{s}$ de recarga).
* **3 Barras (Enzimas Regenerativas Nv. 2):** Cura a **$+18\text{ HP/s}$** na sala e neutraliza toxinas/sangramento instantaneamente.

### Tubo Pressurizado de Abordagem (Subsistema de Enxerto — Câmara 7)
* **Consumo:** $1\text{ a }2\text{ Barras de Energia}$ ($1\text{ Barra}$: recarga de $14\text{s}$, lança até 2 animais; $2\text{ Barras}$: recarga de $9\text{s}$).
* **Regra de Via Única ("Se perdeu morreu, se ganhou pega no atracar"):** Dispara uma cápsula biológica hidropneumática que atravessa Barreiras comuns (mas é bloqueada pela Blindagem Térmica Externa da Fase 3 do Chefe Final até ela quebrar). Não há teleporte de volta durante a luta: os animais lançados só retornam à sua nave quando o combate vence (no momento do **Atracar**) ou na transição entre fases do Chefe Final.
* **Efeito contra Barcos Humanos:** Injeta os animais escolhidos + **$15\text{ kg}$ de água salgada de impacto** na sala inimiga atingida (criando ambiente aquático temporário por $15\text{s}$ até a Bomba de Porão inimiga drenar, ou permanente se o Motor inimigo estiver quebrado).
* **Efeito contra Monstros Marinhos (*Modo Parasita*):** O animal lançado se agarra à cavidade externa do órgão escolhido da criatura (ambiente aquático nativo, $0\text{ dano de seca}$), atacando o órgão por dentro com seu DPS corpo-a-corpo até o órgão quebrar ou o monstro enviar anticorpos/tentáculos para expulsá-lo.

### Glândula de Tinta Furtiva (*Cloaking* — Subsistema de Enxerto — Câmara 8)
* **Consumo:** $1\text{ a }2\text{ Barras de Energia}$.
* **Efeito:** Libera uma nuvem densa de tinta bio-reflexiva e névoa acústica que concede **$+60\%$ de Esquiva** (enquanto estiver voando *No Foil*; em *Touchdown* a esquiva contra tiros já em voo permanece $0\%$ pela trava física do mar) e **impede em ambos os estados ($100\%$)** que o inimigo carregue a mira das armas por **$5\text{ segundos}$** (Nível 1) ou **$8\text{ segundos}$** (Nível 2), seguido de $20\text{ segundos}$ de recarga pós-efeito. Disparar armas (exceto Tubo Pressurizado) reduz a duração restante da furtividade em $50\%$.

### Córtex de Navegação (Pilotagem — Câmara 2 — Passivo, $0\text{ Energia}$)
* **Nível 1 (Inicial — 1 Barra):** Exige um tripulante na sala para ativar a Esquiva da nave e concede $+5\%$ de Esquiva de operador (sem tripulante no Córtex, a Esquiva cai para $0\%$, mas a Sustentação em kg do Sifão/Mastro permanece ativa).
* **Nível 2 ($2\text{ Barras}$ — Reflexo Ganglionar):** Mantém **$50\%$ da Esquiva base** da nave mesmo quando o piloto sai da sala para consertar outros sistemas.
* **Nível 3 ($3\text{ Barras}$ — Piloto Autônomo):** Mantém **$80\%$ da Esquiva base** sem piloto na sala e serve como *buffer* contra dano.

### Placas de Blindagem Externa ($P_{\text{blindagem}}$ — Upgrade Estrutural Passivo)
* Comprável nos Recifes-Forja (até $3\text{ Níveis}$, $100\%$ Sucata). Cada nível adiciona **$+15\text{ kg}$** ao peso da nave ($P_{\text{blindagem}} = 15\text{ kg}, 30\text{ kg}, 45\text{ kg}$), aumenta o HP máximo do casco em **$+5\text{ HP}$** (até $45\text{ HP}$) e concede **$15\%$ de chance por nível** (até $45\%$) de defletir o dano ao casco e impedir a abertura de rombos de impacto.

---

## 1.5. Tabela Matemática da Tripulação (Os 4 Arquétipos)

* **Tempo base de travessia entre salas adjacentes:** $1.5\text{ segundos}$ (dividido pelo multiplicador de velocidade da espécie).
* **Tempo base para reparar 1 barra de sistema:** $12\text{ segundos}$ ($6\text{s}$ com Polvo).
* **Tempo base para fechar 1 rombo no casco:** $8\text{ segundos}$ ($4\text{s}$ com Polvo). *(Como um rombo leva $12.5\text{s}$ para secar a sala de $12.5\text{ kg}$, um tripulante comum que nada da sala vizinha em $1.5\text{s}$ e repara em $8\text{s}$ fecha o furo em $9.5\text{s}$, salvando a sala antes de secar!).*
* **Penalidade de Reparo no Seco ($0\%$ de água):** Tripulantes puramente aquáticos (Polvo, Arraia, Baiacu) sofrem **$-50\%$ na velocidade de reparo** enquanto sufocam numa sala seca; o **Caranguejo Anfíbio** mantém $100\%$ da velocidade de reparo no seco.
* **Dano de Asfixia / Dessecação (Sala Seca ou $O_2 < 20\%$):** $-8\text{ HP por segundo}$ (padrão).

| Espécie | HP Máx | Vel. Nado (Água) | Vel. Rastejo (Seco) | Vel. Reparo (Sist./Furo) | DPS Combate | Dano Sofrido no Seco | Habilidade Passiva / Ativa |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1. Polvo** | $80\text{ HP}$ | $1.2\times$ (Rápido) | $0.2\times$ | **$2.0\times$ ($6\text{s} / 4\text{s}$)** | $5\text{ DPS}$ | $-10\text{ HP/s}$ (Frágil ao ar) | Conserta 2x mais rápido; em Bulbos de Armas/Barreira reduz recarga em $-20\%/-25\%$ (contra $-10\%/-15\%$ de operador comum; no Córtex/Sifão dá $+5\%/+10\%$ esquiva). |
| **2. Arraia Elétrica** | $70\text{ HP}$ | $1.3\times$ (Rápido) | $0.2\times$ | $1.0\times$ ($12\text{s} / 8\text{s}$) | $8\text{ DPS}$ | $-8\text{ HP/s}$ | **+1 Energia gratuita** na sala atual (**Capacitor Residual de $4\text{s}$** ao sair). **100% Imune a Curto-Circuito Aquático** (absorve e apaga curtos em $4\text{s}$!). |
| **3. Baiacu Espinhoso** | $150\text{ HP}$ | $0.8\times$ (Lento) | $0.25\times$ | $0.5\times$ ($24\text{s} / 16\text{s}$) | **$14\text{ DPS}$** | $-6\text{ HP/s}$ | **Ativa (Inflar):** Trava no lugar e, após $1.0\text{s}$ de ativação, zera o vazamento de água na sala e reflete $50\%$ do dano corpo-a-corpo. |
| **4. Caranguejo Anfíbio** | $110\text{ HP}$ | $0.9\times$ | **$1.0\times$ (Normal!)** | $1.0\times$ ($12\text{s} / 8\text{s}$) | $12\text{ DPS}$ | **$0\text{ HP/s}$ (Imune!)** | Respira no ar e na água; pode andar no casco externo e invadir barcos secos sem perder vida. |

### Regra de Simetria: Como Invasores Inimigos Operam Dentro da Sua Nave
* **Mergulhadores de Assalto da Corporação (Humanos c/ Escafandro Pressurizado):** Causam $12\text{ DPS}$ corpo-a-corpo. Não se afogam nas suas câmaras inundadas graças ao escafandro, mas caminham devagar na água ($0.7\times$). **Ponto fraco:** São altamente vulneráveis a **Curto-Circuito Aquático** e à Arraia Elétrica (o traje metálico amplifica o choque em $+50\%$).
* **Parasitas / Predadores Invasores (Biológicos):** Nadam rápido nas suas câmaras inundadas ($1.2\times$), mas **sofrem $-10\text{ HP/s}$ de dessecação se você abrir a válvula externa no ar (*No Foil*) para secar a sala**, permitindo sufocá-los exatamente como você sufoca invasores com vácuo no FTL!

---

# CONTRA-AUDITORIA #1 (Análise Brutal da Matemática do Passo 1)

Agora vamos atacar a nossa própria criação para procurar **exploits, quebras de equilíbrio e falhas matemáticas**:

### Falha Encontrada 1: O Exploit da "Nave Seca Voadora" (e a Armadilha de Castrar o Caranguejo Anfíbio)
* **O Problema:** Olhe para a fórmula de peso: $P_{\text{chassi}} (100\text{ kg}) + P_{\text{água}} (100\text{ kg})$. Se um jogador esperto recrutar 4 *Caranguejos Anfíbios* (que são imunes à seca) e **esvaziar 100% da água de todas as salas da nave**, ele tentaria reduzir o peso da nave em **$-100\text{ kg}$ de graça**.
* **Por que NÃO devemos simplesmente desligar o Bulbo no seco:** Se disséssemos que "Bulbos não funcionam no seco", mataríamos a principal vantagem do Caranguejo Anfíbio (que existe justamente para operar e lutar em salas secas!).
* **A Correção Física Real (O Hidrojato exige Reserva Mínima de $62.5\text{ kg}$ de Água na Nave):**
  1. **O Bulbo funciona no seco SIM** (permitindo que o Caranguejo Anfíbio brilhe operando salas que secaram no combate!).
  2. **Alívio Tático de até 3 Salas (Sem Penalidade):** O jogador pode drenar completamente **até 3 salas inteiras** ($3 \times 12.5\text{ kg}$, baixando a água da nave de $100\text{ kg}$ para $62.5\text{ kg}$) e ganhar até **$-37.5\text{ kg}$ de alívio real e imediato de peso** (ou apagar um Curto-Circuito) **sem perder nenhum quilo de Sustentação do Sifão**!
  3. **Trava contra o Exploit de Esvaziar a Nave Toda ($P_{\text{água}} < 62.5\text{ kg}$):** O Sifão de Propulsão precisa de pelo menos **$62.5\text{ kg}$ de água total circulando na nave** (5 das 8 câmaras cheias) para alimentar o jato hidráulico sem cavitar. Para cada $1\text{ kg}$ de água drenado *abaixo* de $62.5\text{ kg}$ (tentar esvaziar da 4ª à 8ª sala), o Sifão perde **$-2\text{ kg}$ de Sustentação** por cavitação da bomba!
  * *Resultado:* Drenar de 1 a 3 salas é uma manobra tática fortíssima que alivia até $37.5\text{ kg}$, mas tentar deixar a nave inteira seca com 4 Caranguejos causa cavitação no Sifão e derruba a nave!

### Falha Encontrada 2: O Tempo de Transição entre "No Foil" e "Touchdown" (Efeito Ioiô)
* **O Problema:** Se a nave tem limite de $230\text{ kg}$ e está em $229\text{ kg}$, e oscila $2\text{ kg}$ de água para cima e para baixo a cada segundo, a nave ficaria subindo e caindo na água a cada 1 segundo (efeito sanfona visual e mecânico insuportável).
* **Correção Obrigatória Aplicada ao Design:**
  * **Histerese e Tempo de Decolagem (*Spool-up*):**
    * Quando a nave ultrapassa o peso máximo ($P_{\text{total}} > S_{\text{atual}}$), ela cai em *Touchdown* imediatamente.
    * Porém, uma vez que caiu na água, para **voltar a subir no Foil (Decolar)**, não basta empatar o peso: a nave precisa estar com $P_{\text{total}} \le S_{\text{atual}}$ por **3 segundos contínuos** de aceleração hidrodinâmica para vencer o arrasto da água e levantar voo!
    * Isso elimina qualquer pisca-pisca de estado e dá peso físico real ao ato de cair na água.

### Falha Encontrada 3: A Bomba Branquial Curando o Jogo Inteiro de Graça
* **O Problema:** Se a Bomba Branquial no Nível 2 curasse *todos* os tripulantes em *todas* as salas inundadas ao mesmo tempo continuamente, qualquer invasão inimiga ficaria trivial.
* **Correção Obrigatória Aplicada ao Design:**
  * **Cura Local vs. Circulação Global:**
    * Com **1 Barra**: Oxigena todas as salas normalmente e cura a **$+5\text{ HP/s}$ apenas quem estiver dentro da sala da Bomba Branquial**.
    * Com **2 Barras**: Cura a **$+12\text{ HP/s}$ dentro da sala da Bomba Branquial** e libera a habilidade ativa **Pulso de Enzimas** ($6\text{s}$ de duração, $+5\text{ HP/s}$ na nave toda, $25\text{s}$ de recarga).
  * *Resultado da Correção:* Preserva a necessidade tática de recuar tripulantes feridos para a Bomba Branquial, mantendo uma válvula de emergência com *cooldown*.
