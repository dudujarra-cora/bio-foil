# PASSO 5: Catálogo de Conteúdo, Naves Desbloqueáveis (Modo FTL) e Chefe Final

Este documento fecha a camada de expansão horizontal do jogo: o arsenal de **Chassis + Órgãos**, os **Biomas**, as **Naves Desbloqueáveis** e a arquitetura das **3 Fases do Chefe Final**, seguido da **Contra-Auditoria Global**.

---

## 5.1. Catálogo de Chassis de Armas (Base Humana)

Todas as armas respeitam a regra da Contra-Auditoria #3: **armas sem munição NÃO atravessam Barreira; armas que atravessam Barreira custam Munição**.

| Chassi da Arma | Energia | Peso | Recarga | Munição | Comportamento Base | Soquetes |
| :--- | :---: | :---: | :---: | :---: | :--- | :---: |
| **1. Emissor Acústico I** | $1$ | $10\text{ kg}$ | $9\text{s}$ | $0$ | $1\text{ tiro sônico}$ ($1\text{ dano de casco/sistema}$). Derruba $1\text{ camada de Barreira}$. | $1$ |
| **2. Rajada Hidropneumática II** | $2$ | $18\text{ kg}$ | $12\text{s}$ | $0$ | Dispara **$3\text{ projéteis}$** de $1\text{ dano}$ (Equivalente ao *Burst Laser II* do FTL). | $1$ |
| **3. Canhão de Arpão de Cabo** | $2$ | $15\text{ kg}$ | $11\text{s}$ | $0$ | $1\text{ tiro}$ ($1\text{ dano} + 100\%\text{ Furo no Casco}$). Bloqueado por Barreira. | $2$ |
| **4. Dispersor de Estilhaços (Flak Naval)** | $2$ | $22\text{ kg}$ | $10\text{s}$ | $0$ | Dispara **$3\text{ fragmentos}$** em área. Ótimo para quebrar Barreiras, impreciso contra salas pequenas. | $1$ |
| **5. Cortador Térmico a Plasma (Beam)** | $2$ | $25\text{ kg}$ | $14\text{s}$ | $0$ | Feixe contínuo que corta $3\text{ salas adjacentes}$ ($2\text{ dano por sala}$ se a Barreira estiver caída; se houver Barreira ativa, consome $1\text{ camada}$ e é bloqueado). | $1$ |
| **6. Lançador de Torpedo Abissal** | $2$ | $28\text{ kg}$ | $13\text{s}$ | **$1$** | **Ignora Barreira.** Atinge apenas salas **abaixo da linha d'água** ($3\text{ dano} + \text{Furo garantido}$). | $2$ |
| **7. Morteiro de Esporos / Bomba** | $1$ | $12\text{ kg}$ | $11\text{s}$ | **$1$** | **Ignora Barreira.** Não causa dano ao casco estrutural (ótimo para captura!), mas causa dano direto ao sistema e à tripulação na sala. | $2$ |

---

## 5.2. Catálogo de Órgãos de Enxerto (As "Gemas" Biológicas)

Cada Órgão adiciona **$+5\text{ kg}$** ao peso da arma onde for enxertado. **Regra de Flexibilidade:** Fora de combate (no Mapa), o jogador pode encaixar e desencaixar Órgãos das armas livremente (guardando-os no porão de carga), permitindo adaptar o arsenal antes de enfrentar drones sem tripulação ou fases do Chefe Final.

1. **Glândula de Baiacu (Neurotoxina):** O disparo libera veneno na sala atingida ($-6\text{ HP/s}$ em tripulantes orgânicos por $10\text{s}$), reduzindo o dano ao casco da arma em $-1\text{ por projétil/sala}$ (mínimo de $0$ de dano ao casco, mantendo o dano normal ao sistema — perfeito para capturar barcos intactos).
2. **Eletro-Placa de Arraia (Choque / Íon):** O disparo desativa $1\text{ Barra de Energia}$ do sistema atingido por $6\text{s}$ ($+2\text{s}$ na recarga da arma).
3. **Bexiga de Alta Pressão (Inundação / Concussão):** Contra salas secas de barcos humanos (mesmo acima da linha d'água!), injeta **$15\text{ kg}$ de água salgada** instantaneamente. Contra Monstros ou salas já inundadas, o jato hidráulico causa **Concussão** (atordoa tripulantes na sala por $2\text{s}$ e reduz a esquiva do monstro em $-10\%$ por $5\text{s}$).
4. **Bolsa de Tinta Abissal (Cegueira):** Escurece a sala atingida por $8\text{s}$: tripulantes inimigos lá dentro não podem mirar nem reparar, e armas naquela sala perdem $40\%$ de precisão.
5. **Dente Serrilhado de Leviatã (Sangramento/Perfuração):** Adiciona $+1\text{ de dano ao sistema/órgão}$ quando atinge uma sala já sem escudo.
6. **Glândula Termofílica (Fogo/Fervura):** Ferve a água da sala atingida (ou incendeia salas secas) por **$8\text{s}$**, causando **$-5\text{ HP/s}$** aos tripulantes presentes e **$1\text{ de dano ao sistema}$** ao final dos $8\text{s}$.

---

## 5.3. Os 8 Biomas / Setores Oceânicos

Em cada transição de setor, o jogador escolhe entre 2 rotas numa árvore ramificada (estilo FTL):

1. **Setor 1 — Atóis de Sucata Rasos (Obrigatório):** Mar calmo, patrulhas leves da corporação e fauna mutante juvenil.
2. **Bioma Verde — Recifes Bioluminescentes (Território Aliado):** Mais Recifes-Forja, eventos de recrutamento pacífico de Polvos e Estrelas-do-Mar, águas ricas em nutrientes.
3. **Bioma Verde — Floresta de Kelp Gigante:** Águas densas de algas. Barcos grandes da corporação têm $-15\%$ de esquiva aqui, mas há muitas rotas de *Mar Revolto*.
4. **Bioma Vermelho — Estreito dos Arrastões (Zona Industrial):** Alta concentração de navios-fábrica humanos. Dobro de **Sucata**, mas muitos nós com Sonares Militares ativos.
5. **Bioma Vermelho — Fossa Abissal de Pressão:** Escuridão total (esconde salas inimigas sem sonar). Predomínio de Monstros Colossais que dropam os melhores **Órgãos Raros**.
6. **Bioma Roxo — Cratera da Usina Submersa (Zona Radioativa):** Chuvas ácidas frequentes (forçam *Touchdown* tático para lavar o casco), mutações aleatórias em eventos de risco.
7. **Bioma Roxo — Mar de Sargaços Químicos:** Água corrosiva. Cair em *Touchdown* neste setor corrói o mastro do foil se demorar mais de $8\text{s}$ na água!
8. **Setor 8 — A Cratera da Draga Continental (Confronto Final):** Onde a Megaplataforma da Corporação está triturando o último Grande Recife.

---

## 5.4. As 5 Naves Biológicas Desbloqueáveis (Modo FTL Puro)

Sem árvore de atributos passivos: o jogador desbloqueia novas arquiteturas de naves cumprindo façanhas táticas:

| Nome da Nave | Estilo Tático | Tripulação Inicial | Diferencial Mecânico (Peso / Sustentação / Arsenal Inicial) | Condição de Desbloqueio |
| :--- | :--- | :--- | :--- | :--- |
| **1. Carcaça Alfa** | Equilibrada | 1 Polvo, 1 Arraia, 1 Baiacu | Chassi $100\text{ kg} +$ Água $100\text{ kg} +$ **Arpão de Cabo ($15\text{ kg}$) + Emissor Acústico I ($10\text{ kg}$)** $= \mathbf{225\text{ kg}}$. Foil Nv.1 ($200\text{ kg}$) $+$ Sifão Nv.2 ($60\text{ kg}$) $= \mathbf{260\text{ kg}}$ inicial. | Disponível desde o início. |
| **2. Manta-Volt** | Guerra Elétrica / Choque | **2 Arraias**, 1 Polvo | **Chassi Leve ($70\text{ kg}$)** $+$ Água $100\text{ kg} +$ **2x Emissor Acústico I ($20\text{ kg}$) + Eletro-Placa ($5\text{ kg}$)** $= \mathbf{195\text{ kg}}$. Foil Nv.1 ($200\text{ kg}$) $+$ Sifão Nv.2 ($60\text{ kg}$) $= \mathbf{260\text{ kg}}$ inicial ($12.7\text{ MN/h}$). | Vencer um combate no Setor 4+ sem causar dano ao casco inimigo. |
| **3. Couraça-Limiar** | Abordagem Brutal (*All-In*) | **2 Caranguejos**, 1 Baiacu | **Começa SEM Barreira**, mas traz **Tubo Pressurizado Nv.2**, **Emissor Acústico I ($10\text{ kg}$)** e **Canhão de Arpão de Cabo ($15\text{ kg}$)** ($P_{\text{total}} = \mathbf{225\text{ kg}}$) + Asa Larga Nv.2 ($240\text{ kg}$ base $+ 60\text{ kg}$ Sifão $= \mathbf{300\text{ kg}}$ inicial). | Capturar 5 barcos corporativos intactos em uma única run. |
| **4. Sombra-Abissal** | Furtiva / Veneno Cirúrgico | 1 Polvo, 1 Caranguejo | Casco frágil ($20\text{ HP}$, Chassi $90\text{ kg}$), começa com **Glândula de Tinta Furtiva Nv.1**, **Emissor Acústico I ($10\text{ kg}$)** e **Arpão de Cabo ($15\text{ kg}$) c/ Glândula de Baiacu ($5\text{ kg}$)** ($P_{\text{total}} = \mathbf{220\text{ kg}}$, Sustentação $= \mathbf{260\text{ kg}}$). | Extrair 4 Órgãos Intactos de monstros na mesma run. |
| **5. Colmeia-Viva** | Regeneração / Touchdown | 2 Baiacus, 1 Arraia | Casco orgânico ($P_{\text{total}} = \mathbf{230\text{ kg}}$, Sustentação $= \mathbf{260\text{ kg}}$, **Rajada Hidropneumática II ($18\text{ kg}$) + Morteiro de Esporos ($12\text{ kg}$)**); **regenera $+1\text{ HP}$ de casco a cada $12\text{s}$ contínuos em *Touchdown* em combate ativo (máx. $+2\text{ HP}$ por luta)**! | Chegar ao Setor 8 pela primeira vez. |

---

## 5.5. O Chefe Final em 3 Fases: *A Draga Continental ("Leviatã S.A.")*

Assim como a *Rebel Flagship* do FTL, a **Draga Continental** é uma cidade-fábrica flutuante enfrentada em **3 Fases Consecutivas** no Setor 8:

### Fase 1: A Muralha de Arrasto (Foco: Armas Isoladas e Redes)
* **Salas Principais:** Escudo Acústico Triplo (3 bolhas), Canhão de Arpão Triplo, Lançador de Mísseis Térmicos, Gerador de Rede Magnética.
* **Ataque Especial (*Power Surge* a cada $22\text{s}$):** **Onda de Arrasto Hidráulico** — puxa o mar para baixo, adicionando **$+50\text{ kg}$ de peso virtual** na sua nave por $6\text{ segundos}$! Se você não tiver margem de sustentação no Foil ou não abrir uma comporta de água para aliviar peso, você é forçado ao *Touchdown* bem na hora em que os Mísseis Térmicos dela disparam!

### Fase 2: O Enxame de Processamento (Foco: Drones e Invasão)
* A muralha externa cai, revelando o convés de processamento.
* **Ataque Especial (*Power Surge* a cada $20\text{s}$):** **Enxame de Drones Cortadores + Pulso Sonar Militar**.
  * 4 drones atacam simultaneamente (2 pelo ar, 2 por baixo d'água mirando no seu Mastro do Foil!).
  * **Como sobreviver:** Usar a *Glândula de Tinta Furtiva (Cloaking)*, ou manter o Baiacu protegendo o Poço da Quilha enquanto sobrecarrega a Barreira.

### Fase 3: O Núcleo de Perfuração Abissal (Foco: Barreira de Sobrecarga + Fervura do Mar)
* A estrutura final liga a broca térmica no leito oceânico.
* **Defesa Inicial:** Começa com uma **Blindagem Térmica Externa de $10\text{ pontos}$** (equivalente ao *Zoltan Shield* da Fase 3 do FTL — precisa ser quebrada com tiros antes de poder usar o Tubo Pressurizado ou furar salas!).
* **Ataque Especial (*Power Surge* a cada $18\text{s}$):** **Fervura Oceânica + Rajada de 7 Lasers Industriais**.
  * Durante $5\text{ segundos}$ (precedidos por um alarme sonoro/visual de $4\text{ segundos}$), a água do mar ao redor ferve! Se a sua nave estiver caída em *Touchdown* na água durante a Fervura, o casco sofre **$1\text{ de Dano Estrutural por segundo}$** (até $5\text{ HP}$ de casco) e os tripulantes nas salas inferiores sofrem **$-5\text{ HP/s}$** — **obrigando o jogador a estar voando No Foil durante o ataque especial!**

---

# CONTRA-AUDITORIA #5 (Auditoria Global de Fechamento: Passos 1 a 5)

Vamos cruzar todas as regras dos Passos 1 a 5 para caçar **combos infinitos (*game-breaking bugs*)** ou **becos sem saída onde uma nave não consegue zerar o jogo**:

### Falha Global Encontrada 1: O Exploit do "Stunlock Infinito" com Eletro-Placa de Arraia
* **O Problema:** Na seção 5.2, definimos que a *Eletro-Placa de Arraia* desativa $1\text{ Barra}$ do sistema atingido por $6\text{s}$. Se o jogador colocar essa placa num *Emissor Acústico Rápido* (recarga de $7\text{s}$ com operador treinado), ele consegue manter a arma principal do Chefe Final desligada **para sempre**, vencendo qualquer luta de 1 arma sem nunca levar um tiro!
* **Correção Obrigatória Aplicada ao Design:**
  * **Imunidade Pós-Choque (*Refractory Period*):** Todo sistema mecânico ou órgão neural que sofre efeito de *Choque/Paralisia* recebe um **Isolamento Residual de $5\text{ segundos}$** após o término do efeito, durante o qual não pode ser paralisado novamente (apenas sofre o dano normal). Isso impede *stunlock* infinito e exige que o jogador alterne alvos!

### Falha Global Encontrada 2: O Impasse da Nave de Abordagem (*Couraça-Limiar*) no Chefe Final e Fogo Amigo por Sabotagem
* **O Problema Triplo:**
  1. Se o jogador matar todos os marinheiros humanos da **Draga Continental** na Fase 1, quem opera o Chefe nas Fases 2 e 3?
  2. Se não há botão de retorno no Tubo Pressurizado ("só pega no atracar quando ganha"), o que acontece com os seus animais dentro da Draga Continental quando a Fase 1 termina e muda para a Fase 2?
  3. Se quebrar um sistema inimigo por dentro causa $1\text{ de Dano ao Casco}$, e o barco inimigo estiver com $1\text{ HP}$, o seu próprio animal morreria ao dar a última patada no motor!
* **Correção Obrigatória Aplicada ao Design:**
  1. **IA de Backup Corporativa:** Se todos os operadores humanos da Draga Continental morrerem, o **Computador Central Autônomo** da Draga assume o controle e passa a auto-reparar todas as salas lentamente (igual à IA da Rebel Flagship do FTL).
  2. **Atracar entre Fases do Chefe Final:** Ao concluir a Fase 1 ou a Fase 2 da Draga Continental, o módulo derrotado colapsa na água e **sua nave atraca brevemente nos destroços antes da fase seguinte**, recolhendo automaticamente todos os seus animais invasores sobreviventes!
  3. **Segurança na Sabotagem Interna:** Quando o casco inimigo chega a $0\text{ HP}$ por **Sabotagem Interna** (ou quando um Monstro morre com seu animal no Modo Parasita), ocorre um **Naufrágio Controlado**: seus animais escapam nadando no momento do Atracar (embora o saque seja o reduzido de Destruição Bruta). O invasor só morre se: (a) seu HP zerar em luta/seca, (b) sua nave **Fugir** da batalha, ou (c) você atirar com **arma explosiva externa diretamente na sala onde seu próprio animal está** (fogo amigo direto na sala!).

### Falha Global Encontrada 3: A Armadilha da Fase 3 contra a Nave *Colmeia-Viva*
* **O Problema:** A nave 5 (*Colmeia-Viva*) foi desenhada para gostar de lutar na água (*Touchdown*), mas a Fase 3 do Chefe Final tem a **Fervura Oceânica** que pune quem está na água! Se a nave não conseguir subir pro Foil na Fase 3, ela morre sem chance de defesa.
* **Correção Obrigatória Aplicada ao Design:**
  * A *Colmeia-Viva* possui um Mastro de Foil funcional normalmente: ela usa o *Touchdown* nos intervalos de $18\text{s}$ para se curar e resfriar, mas antes do alarme de *Fervura Oceânica* disparar (aviso sonoro de $4\text{ segundos}$ antes do pulso!), o jogador liga o Sifão para **saltar para fora da água fervente por $5\text{ segundos}$** e depois mergulha de volta! Isso transforma a luta da *Colmeia-Viva* contra a Fase 3 num balé tático incrível de saltar fora da água fervente no tempo certo!

### Falha Global Encontrada 4: O Gargalo de RNG das Duas Moedas (Sucata vs. Biomassa)
* **O Problema:** Se todos os upgrades da nave exigirem uma proporção rígida de `Sucata + Biomassa` ao mesmo tempo, um jogador que atravessar um setor cheio de Monstros (acumulando $100\text{ de Biomassa}$ e $0\text{ de Sucata}$) ficará **travado sem conseguir melhorar a nave**, mesmo tendo vencido 8 lutas seguidas!
* **Correção Obrigatória Aplicada ao Design:**
  1. **Separação de Árvores de Custo:**
     * Upgrades de **Sistemas Estruturais/Mecânicos** (Mastro do Foil, Artilharia Dorsal, Placas de Blindagem Externa e Reparo de Casco) custam **100% Sucata**.
     * Upgrades de **Sistemas Biológicos** (Sifão de Propulsão, Glândula de Barreira, Bomba Branquial, Córtex de Navegação, Tubo Pressurizado e Glândula de Tinta Furtiva) custam **100% Biomassa**.
     * O **Coração Bio-Elétrico (Reator)** aceita **qualquer uma das duas moedas** (você pode comprar a próxima barra de energia pagando em Sucata OU em Biomassa!).
  2. **Digestão Enzimática nos Recifes-Forja:** Toda loja permite converter excesso de Sucata em Biomassa (ou vice-versa) na taxa de $2:1$. O jogador nunca fica travado por RNG de setor!

### Falha Global Encontrada 5: O Teto de Energia do Reator (Jogo de Soma Zero até o Fim)
* **O Problema:** Somando todos os sistemas da nave no nível máximo (Barreira $8 +$ Armas $8 +$ Sifão $5 +$ Branquial $3 +$ Tubo Pressurizado $2 +$ Tinta Furtiva $2$), a nave consome **$28\text{ Barras de Energia}$**. Se o jogador puder comprar 28 barras no Coração Bio-Elétrico, no Setor 7 ele liga a nave inteira no máximo e **para de gerenciar energia**!
* **Correção Obrigatória Aplicada ao Design:**
  * O **Coração Bio-Elétrico tem teto máximo estrito de $18\text{ Barras}$ compráveis** (chegando no máximo a $20\text{ ou } 21$ com Arraias Elétricas na tripulação).
  * Isso garante matematicamente um déficit mínimo de $7\text{ a } 10\text{ Barras}$ no Chefe Final: **até no último segundo da Fase 3, o jogador é obrigado a tirar energia de um sistema para alimentar outro na Pausa Tática!**
