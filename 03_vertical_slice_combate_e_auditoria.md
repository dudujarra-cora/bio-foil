# PASSO 3: O Escopo Mínimo de Combate (Vertical Slice e Simulação Passo a Passo)

Aqui colocamos os números do Passo 1 e a interface do Passo 2 em movimento real: definimos a ficha exata da **Nave Inicial**, dos **2 Primeiros Inimigos (Barco e Monstro)** e rodamos uma **simulação segundo a segundo** para testar se o combate se sustenta matematicamente.

---

## 3.1. Ficha Técnica da Nave Inicial: *Carcaça Alfa ("Nautilus-Zero")*

* **Casco:** $30\text{ HP}$ | **Peso Seco:** $100\text{ kg}$ | **Água nas 8 Câmaras Inundadas:** $100\text{ kg}$ ($12.5\text{ kg}$ cada)
* **Coração Bio-Elétrico Inicial:** $6\text{ Barras de Energia Base}$ (+1 Barra gratuita gerada pela Arraia Elétrica = **$7\text{ Barras disponíveis}$** para **$8\text{ Barras}$ de sistemas totais** — forçando o dilema de soma zero desde o Setor 1: desligar a Bomba Branquial em combate para manter o Sifão em 2 barras, ou voar com o Sifão em 1 barra no limite de $230\text{ kg}$!).
* **Sistemas Instalados (6 Câmaras Base + 2 Câmaras de Enxerto Livres):**
  1. **Mastro do Foil Nv. 1 (Poço da Quilha — Sala 6):** Sustentação base de $200\text{ kg}$ (Passivo).
  2. **Sifão de Propulsão Nv. 2 (Sala 5):** Até $2\text{ Barras}$ ($+60\text{ kg}$ de sustentação, $25\%$ de esquiva base).
  3. **Glândula de Barreira Nv. 2 (Sala 4):** Consome $2\text{ Barras}$ = **1 Bolha de Escudo** (regenera em $1.7\text{s}$ com operador).
  4. **Bomba Branquial Nv. 1 (Sala 3):** Consome $1\text{ Barra}$ (mantém $O_2$ em $100\%$).
  5. **Córtex de Navegação Nv. 1 (Sala 2):** Passivo (exige operador para dar esquiva).
  6. **Artilharia Dorsal Nv. 3 (Sala 1):** **4 Slots de Armas Ativas**, suporta até $3\text{ Barras}$ de armas no início.
  7. **Câmaras de Enxerto A e B (Salas 7 e 8):** Livres no início da run, inundadas com $12.5\text{ kg}$ de água cada.
* **Tripulação Inicial (3 Animais):**
  * **Polvo** (no Córtex de Navegação $\rightarrow +5\%$ esquiva; repara $2\times$ mais rápido).
  * **Arraia Elétrica** (na Glândula de Barreira $\rightarrow$ fornece $+1\text{ Energia}$ e acelera recarga do escudo para $1.7\text{s}$).
  * **Baiacu Espinhoso** (no Sifão de Propulsão $\rightarrow +10\%$ esquiva; pode sair do posto para tampar furos sem alterar os quilos de sustentação da nave!).
* **Sustentação Total Inicial no Ar:** $200\text{ (Mastro)} + 60\text{ (Sifão Nv.2)} = \mathbf{260\text{ kg}}$ (Esquiva Total = **$40\%$**).

### Arsenal Inicial da Nave:
1. **Emissor Acústico I (Arma de Energia — Sem Munição):**
   * **Consumo:** $1\text{ Barra}$ | **Peso:** $10\text{ kg}$ | **Recarga:** $9\text{ segundos}$
   * **Efeito:** Dispara 1 onda sônica concentrada. Causa $1\text{ de dano ao sistema/órgão}$ e $1\text{ de dano ao casco}$ (ou derruba $1\text{ camada de Barreira}$). **Soquete (1):** Vazio no início.
2. **Canhão de Arpão de Cabo (Arma Balística — Sem Munição):**
   * **Consumo:** $2\text{ Barras}$ | **Peso:** $15\text{ kg}$ | **Recarga:** $11\text{ segundos}$ | **Custo:** $0\text{ Munição}$ (usa ar comprimido e arpão retrátil).
   * **Efeito:** Dispara 1 arpão pesado. **Não ignora Barreira** (exige sincronizar com o Emissor Acústico se o inimigo tiver escudo), causa $1\text{ de dano ao casco}$, $1\text{ de dano ao sistema}$ e tem **$100\%$ de chance de abrir um Rombo (Furo) no casco inimigo**!
   * **Soquetes (2):** Vazios no início (qualquer Órgão enxertado posteriormente adicionará $+5\text{ kg}$ ao peso da arma, conforme catálogo do Passo 5).

* **Peso Total da Nave:** $100\text{ (chassi)} + 100\text{ (água)} + 25\text{ (armas)} = \mathbf{225\text{ kg}}$ (Folga de sustentação inicial: $35\text{ kg}$).

---

## 3.2. Inimigo 1 (Metal): *Lancha Patrulheira da Corporação (Setor 1)*

* **Casco:** $8\text{ HP}$ | **Esquiva:** $15\%$ | **Ambiente Interno:** $100\%$ **SECO** (Ar respirável para humanos).
* **Salas do Barco (4 Salas — 2 no Convés Superior Seco, 2 Abaixo da Linha d'Água):**
  1. **Cabine de Pilotagem (Convés Superior):** Operada por *Marinheiro Humano 1 ($100\text{ HP}$, $8\text{ DPS}$)*.
  2. **Torreta de Metralhadora Naval (Convés Superior):** Arma de Energia ($1\text{ Barra}$), recarga de $10\text{s}$, dispara **2 tiros** de $1\text{ de dano}$ cada ($30\%$ de chance de furo).
  3. **Lançador de Torpedo Raso (Abaixo da Linha d'Água):** Arma de Munição ($1\text{ Barra}$), recarga de $13\text{s}$, ignora Barreira e causa **$1\text{ de dano estrutural direto no Mastro do Foil}$ ($-50\text{ kg}$ de sustentação)** e **$1\text{ de dano ao casco}$** (com furo garantido se o jogador estiver caído em *Touchdown*!).
  4. **Sala do Motor a Diesel (Abaixo da Linha d'Água):** $1\text{ Barra}$ de sistema, operada por *Marinheiro Humano 2 ($100\text{ HP}$, $8\text{ DPS}$)*. Fornece os $15\%$ de esquiva da lancha e alimenta a Bomba de Porão.
* **Defesa e Bomba de Porão:** Sem escudo de energia, mas possui **Bomba de Porão Automática** (ligada ao Motor: se uma sala superior receber água de impacto sem furo abaixo da linha d'água, a bomba drena em $15\text{s}$; se o Motor quebrar ou houver rombo abaixo da linha d'água, a inundação vence a bomba).
* **IA dos Marinheiros Humanos:** Se uma sala submersa inundar completamente, os marinheiros tentam fechar o furo até caírem para $<30\text{ HP}$, momento em que **recuam para as salas secas do convés superior** (abandonando os sistemas inferiores inundados!).
* **Tabela de Saque:**
  * *Vitória por Destruição Bruta ($0\text{ HP}$):* $12\text{ Sucata}$, $1\text{ Combustível}$.
  * *Vitória por Asfixia/Eliminação da Tripulação (Barco Intacto):* **$25\text{ Sucata}$, $3\text{ Combustível}$, $2\text{ Munições}$ + $25\%$ de chance de recuperar a Metralhadora Naval**.

---

## 3.3. Inimigo 2 (Biológico): *Teuthis Couraçada Mutante (Setor 1)*

* **Vida Total (Corpo):** $10\text{ HP}$ | **Esquiva:** $20\%$ | **Ambiente:** Aquático.
* **Anatomia Mapeada pelo Sonar (4 Órgãos = 4 Salas):**
  1. **Tentáculos Chicoteadores (Armas):** Recarga $8\text{s}$. Golpe físico duplo ($2\times 1\text{ de dano}$, bloqueável pela Barreira).
  2. **Bico Quitinoso (Arma Perfurante):** Recarga $14\text{s}$. Ataca diretamente o **Mastro do Foil** lá embaixo ($1\text{ de dano de sistema no Mastro}$ + trava a nave por $3\text{s}$).
  3. **Sifão Muscular (Motor):** Dá os $20\%$ de esquiva da criatura.
  4. **Gânglio Central (Cérebro — $3\text{ Barras de Vitalidade}$):** Se as 3 barras do Gânglio forem zeradas com ataques de Choque ou Acústicos **antes** de a Vida Total do monstro chegar a $0\text{ HP}$, o monstro entra em **Torpor Neural (Vitória Cirúrgica)**!
* **Tabela de Saque:**
  * *Matar por Dano Bruto ($0\text{ HP}$):* $15\text{ Biomassa}$ comum.
  * *Vitória Cirúrgica (Gânglio neutralizado com monstro vivo):* **$25\text{ Biomassa}$ + Órgão Intacto: *Bolsa de Tinta Abissal* (Soquete de Arma: escurece a sala atingida por $8\text{s}$, impedindo reparos/mira e reduzindo a precisão das armas naquela sala em $-40\%$)**.

---

## 3.4. Simulação Real Passo a Passo (33 Segundos de Combate)

**Cenário:** A nossa *Carcaça Alfa* ($225\text{ kg}$, Sustentação $260\text{ kg}$) encontra a *Lancha Patrulheira da Corporação* ($8\text{ HP}$, Esquiva $15\%$, sem escudo).

* **$t = 0.0\text{s}$:** Combate inicia. O jogador aperta **ESPAÇO (Pausa)**.
  * Avalia a ameaça: A lancha inimiga tem uma *Metralhadora ($10\text{s}$)* no convés superior e um *Lançador de Torpedo Raso ($13\text{s}$)* + *Sala do Motor* abaixo da linha d'água.
  * **Gestão de Energia ($7/7\text{ Barras}$):** Para alimentar Barreira ($2$), Sifão Nv.2 ($2$), Emissor Acústico I ($1$) e Canhão de Arpão ($2$), o jogador **desliga temporariamente 1 barra da Bomba Branquial** (o $O_2$ começa em $100\%$ e cairá a $-4\%/\text{s}$).
  * O jogador mira o **Emissor Acústico I ($9\text{s}$)** na *Torreta de Metralhadora* e o **Canhão de Arpão de Cabo ($11\text{s}$)** na **Sala do Motor a Diesel** (abaixo da linha d'água, para zerar a esquiva inimiga, desligar a Bomba de Porão e abrir um rombo submerso!). Despausa.
* **$t = 9.0\text{s}$:** O *Emissor Acústico I* dispara na *Metralhadora*, mas a lancha inimiga rola seus **$15\%$ de esquiva e desvia do pulso (`MISS!`)**!
* **$t = 10.0\text{s}$:** A *Metralhadora Naval* inimiga intacta dispara 2 tiros!
  * Tiro 1: Acerta a nossa **Glândula de Barreira (Escudo)** $\rightarrow$ A bolha absorve o tiro e cai (regenerará em $1.7\text{s}$, em $t = 11.7\text{s}$).
  * Tiro 2: Passa pelos nossos $40\%$ de esquiva e acerta o **Sifão de Propulsão** (Sala 5): causa **$1\text{ de dano no casco}$ ($29/30\text{ HP}$)**, **$1\text{ de dano no Sifão}$** (cai de 2 barras para 1 barra!), **$-15\text{ HP}$ de dano antipessoal no Baiacu ($100 \rightarrow 85\text{ HP}$)** e **abre um Rombo (Furo) no Sifão**!
* **$t = 10.0\text{s} \rightarrow 11.0\text{s}$ (Crise Imediata — Pausa Tática):**
  * Como o Sifão perdeu 1 barra ($-30\text{ kg}$), a sustentação da nave cai de $260\text{ kg}$ para **$230\text{ kg}$** (margem de apenas $5\text{ kg}$!). A barra de energia liberada do Sifão danificado é **alocada imediatamente na Bomba Branquial ($1\text{ Barra}$)** (o $O_2$, que havia caído para $60\%$, volta a subir a $+8\%/\text{s}$, retornando a $100\%$ em $t = 15.0\text{s}$).
  * O furo no Sifão vaza água no ar a **$-1.0\text{ kg/s}$**.
  * O **Baiacu** (já dentro do Sifão) desacopla do Bulbo e ativa **Inflar** sobre o furo (leva $1.0\text{s}$, vedando o furo em $t = 11.0\text{s}$ após vazar exato **$-1.0\text{ kg}$** $\rightarrow$ água na sala $= 11.5\text{ kg}$, Peso da Nave $= \mathbf{224.0\text{ kg}}$).
  * Simultaneamente, o jogador ordena que o **Polvo** saia do Córtex (Sala 2) e nade até o Sifão (Sala 5) atravessando 2 salas ($2 \times 1.25\text{s} = 2.5\text{s}$ de nado, chegando em $t = 12.5\text{s}$). *(Nota: Enquanto o Córtex fica sem piloto, nossa Esquiva cai para $0\%$, mas a Sustentação de $230\text{ kg}$ no Foil é mantida!).*
* **$t = 11.0\text{s}$ (Nosso Disparo de Arpão):**
  * O **Canhão de Arpão de Cabo** dispara e acerta a **Sala do Motor a Diesel** inimiga (abaixo da linha d'água): causa **$1\text{ de dano no casco inimigo}$ ($7/8\text{ HP}$)**, **$15\text{ HP}$ de dano ao Marinheiro 2**, **quebra o Motor** (a esquiva inimiga cai para **$0\%$** e a *Bomba de Porão Automática* desliga!) e **abre um rombo submerso**! O mar invade violentamente o compartimento do motor (enchendo em $2.5\text{s}$ e afogando a $-8\text{ HP/s}$), forçando o *Marinheiro 1* a descer da Cabine para tentar ajudar o *Marinheiro 2* no controle de danos submerso!
* **$t = 12.5\text{s}$:** O Polvo chega ao Sifão e inicia o reparo da barra quebrada ($6.0\text{s}$ de reparo $\rightarrow$ concluirá em $t = 18.5\text{s}$).
* **$t = 13.0\text{s}$:** O *Lançador de Torpedo Raso* inimigo completa seus $13\text{s}$, ignora nossa Barreira (por ser arma de Munição) e, como estamos com $0\%$ de esquiva (Córtex sem piloto), atinge em cheio o nosso **Mastro do Foil** (Sala 6 — Poço da Quilha)!
  * Causa $1\text{ de dano no nosso casco}$ ($28/30\text{ HP}$) e $1\text{ ponto de dano estrutural no Mastro}$ ($-50\text{ kg}$ de sustentação: $200\text{ kg} \rightarrow 150\text{ kg}$).
  * Nossa Sustentação Total cai para $150\text{ (Mastro)} + 30\text{ (Sifão 1 barra)} = \mathbf{180\text{ kg}}$, contra **$224.0\text{ kg}$** de peso!
  * **ALARME DE ESTOL! A NAVE CAI EM TOUCHDOWN NO MAR EM $t = 13.0\text{s}$!**
* **$t = 13.0\text{s} \rightarrow 22.5\text{s}$ (A Virada na Água):**
  * A nave bate a barriga no mar! Como o Baiacu já está inflado sobre o furo do Sifão, a água do mar é bloqueada ($0\text{ kg/s}$ de alagamento pesado)!
  * Em *Touchdown*, o resfriamento oceânico reduz o tempo restante de recarga das nossas armas em **$-25\%$**!
  * Em **$t = 16.75\text{s}$** ($4.0\text{s}$ no ar $+ 5.0\text{s} \times 0.75 = 3.75\text{s}$ na água), nosso **Emissor Acústico I** dispara na *Torreta de Metralhadora* inimiga (acerto garantido com $0\%$ de esquiva inimiga: casco inimigo cai para **$6/8\text{ HP}$** e a Metralhadora quebra!).
  * Em **$t = 18.5\text{s}$**, o Polvo termina de consertar a 2ª barra do Sifão (o jogador passa 1 barra da Bomba Branquial, já com $O_2$ em $100\%$, de volta para o Sifão) e gasta mais **$4.0\text{s}$** ($t = 18.5\text{s} \rightarrow t = 22.5\text{s}$) **fechando definitivamente o rombo no casco do Sifão** (liberando o Baiacu para voltar ao Bulbo enquanto a sala repõe $1.0\text{ kg}$ de água $\rightarrow \mathbf{225.0\text{ kg}}$).
  * Em **$t = 19.75\text{s}$** ($2.0\text{s}$ no ar $+ 9.0\text{s} \times 0.75 = 6.75\text{s}$ na água), nosso **Canhão de Arpão** dispara no **Lançador de Torpedo Submerso** inimigo (onde o *Marinheiro 1* estava operando/reparando no andar inferior): causa $1\text{ de dano no casco}$ (**$5/8\text{ HP}$**), **$-15\text{ HP}$ de impacto no Marinheiro 1**, quebra o lançador de torpedo e abre o **segundo rombo submerso** no andar inferior do barco!
  * Em **$t = 20.625\text{s}$**, após $7.125\text{s}$ de afogamento contínuo no andar inferior inundado desde $t = 13.5\text{s}$ ($7.125\text{s} \times -8\text{ HP/s} = -57\text{ HP}$) somados aos $-15\text{ HP}$ que cada marinheiro levou de impacto de Arpão ($100 - 15 - 57 = \mathbf{28\text{ HP}}$ cada, cruzando o limiar de $<30\text{ HP}$), os **2 marinheiros abandonam o convés inferior e fogem para a Cabine de Pilotagem seca no convés superior**!
* **$t = 22.5\text{s} \rightarrow 32.75\text{s}$ (Decolagem e Golpe de Misericórdia):**
  * Em $t = 22.5\text{s}$, o Polvo nada do Sifão até o **Poço da Quilha** adjacente ($1.25\text{s}$, chegando em $t = 23.75\text{s}$) e conserta o Mastro do Foil em **$6.0\text{s}$** (concluindo em **$t = 29.75\text{s}$** e restaurando a sustentação para **$260\text{ kg}$**!).
  * Enquanto isso, em **$t = 23.50\text{s}$** ($16.75\text{s} + 9.0\text{s} \times 0.75$), nosso *Emissor Acústico I* atinge a **Cabine de Pilotagem** (**$4/8\text{ HP}$** no casco inimigo e $-15\text{ HP}$ nos dois marinheiros lá dentro, deixando-os com **$13\text{ HP}$ cada**).
  * Em **$t = 30.25\text{s}$**, nossa salva final sincronizada (**Emissor Acústico I** recarregado em $23.50 + 6.75 = 30.25\text{s}$ + **Canhão de Arpão** pronto desde $19.75 + 8.25 = 28.0\text{s}$) atinge a **Cabine de Pilotagem**, causando $30\text{ HP}$ de dano antipessoal e eliminando os dois marinheiros humanos ($13\text{ HP} \rightarrow 0\text{ HP}$) enquanto o casco da lancha inimiga ainda resta com **$2/8\text{ HP}$**!
  * Em $t = 32.75\text{s}$ (após os $3.0\text{s}$ de *Spool-up* iniciados em $t = 29.75\text{s}$), nossa nave já estabilizada no Foil atraca ao lado da lancha neutralizada e recolhe **$25\text{ de Sucata}$, $3\text{ Combustíveis}$ e $2\text{ Munições}$**!

---

# CONTRA-AUDITORIA #3 (Análise Brutal da Simulação do Passo 3)

O que essa simulação real de 33 segundos revelou de **defeitos ocultos** no nosso design?

### Falha Encontrada 1: O Arpão "Sem Munição que Ignora Escudo" é Quebrado (Overpowered)
* **O Problema:** Na ficha acima, demos ao *Arpão Pneumático* a propriedade de "Ignorar 1 camada de Barreira + 100% de furo + Custo Zero de Munição". Se uma arma ignora escudo e não gasta munição, **por que o jogador usaria qualquer outra arma no jogo?** No FTL, mísseis ignoram escudo *justamente porque custam 1 Míssil por tiro*!
* **Correção Obrigatória Aplicada ao Design:**
  * Divisão estrita de categorias de armas:
    1. **Arpões de Cabo Curto (Sem Munição):** **NÃO ignoram Barreira/Escudo!** Eles precisam que uma arma Acústica ou de Rajada derrube a bolha da Barreira primeiro para então acertar o casco e causar furo.
    2. **Torpedos / Arpões Pesados Propulsados (Ignoram Barreira):** Custam obrigatoriamente **1 Munição por disparo**!
  * *Resultado:* Restaura a regra sagrada do FTL de **Sincronização de Salvas (Volleys)**! Primeiro você atira o Pulso Acústico para estourar a bolha de Barreira inimiga e, $0.5\text{s}$ depois, o Arpão de Cabo entra no casco aberto para rasgar e inundar a sala!

### Falha Encontrada 2: Como um Tiro no Ar "Inunda" o Barco Inimigo?
* **O Problema:** Na simulação ($t=11\text{s}$), o nosso Arpão acertou a *Torreta de Metralhadora* (que fica no topo do barco inimigo, acima da linha d'água) e nós dissemos que "a sala começou a inundar com água do mar". **Contradição física!** Se a torreta do barco inimigo está acima da linha d'água, um furo nela entra AR, não água do mar!
* **Correção Obrigatória Aplicada ao Design (E que melhora a Tática em 200%):**
  * **Furos Acima da Linha d'Água vs. Abaixo da Linha d'Água no Barco Inimigo:**
    * Acertar salas **superiores** do barco inimigo (Cabine, Torreta) causa dano ao sistema e ferimento nos humanos, mas **não inunda com água do mar** (a menos que você use uma arma enxertada com *Bexiga de Alta Pressão* ou o *Tubo Pressurizado de Abordagem* que injeta $15\text{ kg}$ de água junto!).
    * Acertar salas **inferiores/na linha d'água** do barco inimigo (Casco Submerso, Sala de Motor) abre um rombo abaixo da linha d'água: **o mar invade violentamente de baixo para cima**, inundando o andar inferior do barco e subindo para o convés superior se eles não fecharem as escotilhas!
  * *Olha o ganho tático:* Para afogar a tripulação de um barco humano sem gastar cápsulas de água, o jogador mira deliberadamente **abaixo da linha d'água** do navio inimigo para deixá-lo fazer água!

### Falha Encontrada 3: Reparo do Mastro do Foil Submerso
* **O Problema:** Na simulação ($t=13\text{s}$), o torpedo inimigo danificou o **Mastro do Foil** (Sala 6, que fica lá embaixo). Se o Mastro é uma asa sólida debaixo d'água, como um Polvo entra lá para consertar?
* **Correção Obrigatória Aplicada ao Design:**
  * A Sala 6 é o **Poço da Quilha (Hidro-Poço)**: uma câmara inundada na base da barriga da nave onde fica a raiz hidráulica e os tendões do mastro do foil. Qualquer animal aquático pode nadar até o Poço da Quilha internamente para reparar o mastro ou operar seu bulbo de estabilidade!
