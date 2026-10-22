# PASSO 2: Wireframe Funcional e Ergonomia da Interface de Combate

Em um jogo tático de micropausa estilo *FTL*, **a interface é o próprio tabuleiro do jogo**. Se o jogador demorar mais de $0.5\text{ segundo}$ para entender por que está afundando ou qual sala está secando, a interface falhou.

---

## 2.1. Diagrama Espacial da Tela de Combate (Proporção 16:9)

```
+--------------------------------------------------------------------------------------------------+
| [CASCO: |||||||||||||||| 30/30]  [BARREIRA: (O)]      | [SUCATA: 45] [BIO: 20] [COMB: 12] [MUN: 8]|
| [ESTADO: NO FOIL - ESQUIVA: 40%]                      | [BOTÃO DE FUGA / SALTO: CARREGANDO 65%]   |
+--------------------------------------------------------------------------------------------------+
|         |                                                      |                                 |
|  TERMÔ- |            SUA NAVE BIOLÓGICA (ESQUERDA)             |     ALVO INIMIGO (DIREITA)      |
|  METRO  |                                                      |  [CASCO/VIDA INIMIGA: ||||||||] |
|  FOIL   |       +----------------------+---------------+       |  [BARREIRA INIMIGA: (O)]        |
|         |  (AR) | [1. ARTILHARIA DORS.]| [7. ENXERTO A: TUBO]  |       |                                 |
|  300kg  |       |  (Armas)     (Bulbo) |  (Abordagem)  (Bulbo) |       |   +------------+------------+   |
|   |     |   +---+------------------+---+---------------+-------+---+   |   | [CABINE]   | [TORRETA]  |   |
| [260kg] |   | [2. CÓRTEX]          | [3. BOMBA BRANQUIAL]          |   |   |  (Piloto)  |  (Metralh.)|   |
| LIMITE  |   |  (Piloto)   (Bulbo)  |  (O2 + Cura)          (Bulbo) |   |   +------------+------------+   |
|  FOIL   |   +----------------------+-------------------------------+   |~~~~~~~~~~~~ LINHA D'ÁGUA ~~~~~~~|
|   |     |   | [4. GLÂNDULA BARR.]  | [5. SIFÃO PROPULSOR]          |   |   | [MOTOR SUB]| [TORP. SUB]|   |
| >225kg< |   |  (Escudo)   (Bulbo)  |  (Motor)              (Bulbo) |   |   +------------+------------+   |
|  PESO   |   +-----------+----------+------------+------------------+   |                                 |
|  ATUAL  |~~~~~~~~~~~~~~~| [6. POÇO DA QUILHA]   | [8. ENXERTO B]   |~~~|                                 |
|   |     |               +------||       ||------+------------------+   |  [INTENÇÃO INIMIGA: MIRANDO EM  |
|  100kg  |                      || FOIL  ||                             |   SIFÃO PROPULSOR - 3.2s]       |
|         |                 <====||       ||====>                        |                                 |
| [BOTÃO: |                  +---------------+                           |                                 |
| MERGULHO|                                                              |                                 |
| TÁTICO] |                                                              |                                 |
+---------+--------------------------------------------------------------+---------------------------------+
| [CORAÇÃO BIO-ELÉTRICO]  | [SISTEMAS]              | [ARMAS: 4 SLOTS (3 BARRAS)]| [TRIPULAÇÃO]    |
| [||] [||] [||] [|+1]    | [ESC] [SIF] [BRQ] [TUB] | [1: ARPÃO (||) + (VAZIO)]  | 1. Polvo   80HP |
|  0/7 Barras Livres      | [||]  [||]  [0]   [0]   | [2: ACÚSTICO (|) + (VAZIO)]| 2. Arraia  70HP |
|  (6 Base + 1 Arraia)    |                         | [3: VAZIO]   [4: VAZIO]    | 3. Baiacu 150HP |
+--------------------------------------------------------------------------------------------------+
```

---

## 2.2. Os 5 Componentes Visuais Críticos

### 1. O Termômetro de Sustentação (Coluna Esquerda)
É a inovação de interface mais importante do jogo. Funciona como um altímetro/balança vertical:
* **Marcador Azul (Topo da Sustentação — Ex: $260\text{ kg}$):** Sobe quando você coloca energia no Sifão; cai se o Mastro ou o Sifão levarem dano.
* **Barra Laranja (Peso Atual da Nave — Ex: $225\text{ kg}$):** Sobe quando entra água no mar ou quando você equipa peças pesadas; desce quando você drena água das salas.
* **Leitura Instantânea:** Enquanto a **Barra Laranja estiver ABAIXO do Marcador Azul**, você está voando **No Foil**. No instante em que a Barra Laranja cruzar o Marcador Azul para cima, soa o alarme grave de estol hidrodinâmico e a nave despenca na água (*Touchdown*).
* **Botão de Mergulho Tático (Abaixo do Termômetro):** Um botão de alavanca com trava. Clicar nele recolhe a asa do foil voluntariamente para mergulhar a nave na água (para reabastecer tanques secos e esfriar armas).

### 2. A Linha d'Água Dinâmica (Feedback Físico de Estado)
O jogador nunca precisa ler um texto para saber se está no ar ou na água:
* **Estado *No Foil*:** A superfície do mar corre em alta velocidade lá embaixo, na altura do *Mastro do Foil*. O corpo da nave está suspenso no céu com spray de água voando para trás.
* **Estado *Touchdown*:** A nave inteira cai fisicamente $120\text{ pixels}$ para baixo na tela com um impacto de espuma branca. A linha d'água agora corta o meio das câmaras centrais, e o som do jogo ganha um filtro abafado subaquático grave.

### 3. Leitura Interna das Salas (Água, Seca, Oxigênio e Curto)
Cada câmara tem $100\times 70\text{ pixels}$ de área útil interna:
* **Nível de Água:** Um líquido translúcido dentro da sala que sobe ou desce literalmente como um aquário. Se furar no ar, o jogador vê o nível do líquido baixando até o chão.
* **Falta de Oxigênio ($O_2 < 20\%$):** A água da sala muda de azul-claro para **roxo-escuro turvo com bolhas lentas**, e listras de alerta aparecem nas bordas da sala (padrão visual para daltônicos).
* **Alagamento Pesado (Quando furado no mar):** A sala ganha um contorno pulsante azul-elétrico de alta pressão com jatos d'água entrando pelo furo e um ícone de âncora (`+20kg!`).
* **Curto-Circuito Aquático (Isolamento Elétrico Rompido):** Faíscas amarelas saltando pela água da sala (substituto visual do fogo do FTL; apaga em $3\text{s}$ se a água da sala for drenada para $0\%$).

### 4. Painel de Armas com Soquetes de Órgãos (Rodapé Central-Direito)
Cada caixa de arma mostra:
* A barra de carregamento (em segundos).
* **1 ou 2 círculos pequenos no canto da caixa da arma** representando os **Órgãos Enxertados** (ex: um ícone verde pulsante de *Glândula Tóxica* ou amarelo de *Placa Elétrica*).

### 5. Janela do Inimigo (Direita)
* Contra **Barcos Humanos**: Mostra o corte lateral do barco com suas salas secas. Quando atingidas pelo seu Tubo Pressurizado ou tiros de água, o jogador vê a sala do barco inimigo enchendo de água e os marinheiros humanos nadando devagar.
* Contra **Monstros Colossais**: A criatura nada ao lado da sua nave, e o **Filtro de Sonar Biológico** desenha caixas de mira translúcidas exatamente sobre os 4 órgãos vitais da criatura (*Tentáculos*, *Bico Quitinoso*, *Sifão Muscular*, *Gânglio Central*), mantendo a interface 100% idêntica à de um barco.

---

# CONTRA-AUDITORIA #2 (Análise Brutal da Interface do Passo 2)

Vamos caçar os problemas reais de usabilidade (*UX*), cliques acidentais e sobrecarga cognitiva que esse layout causaria na prática:

### Falha Encontrada 1: O Inferno do "Clique Sobreposto" (Tripulante vs. Bulbo vs. Válvula de Água)
* **O Problema:** Numa sala de $100\times 70\text{ pixels}$ em corte lateral, você tem: 1 ou 2 animais nadando, o Bulbo Neural no centro, um furo no casco para consertar e o botão da Válvula de Drenagem para abrir/fechar água. No calor da batalha, o jogador vai tentar clicar na Válvula para jogar água fora e vai acabar selecionando o Polvo sem querer, ou vice-versa!
* **Correção Obrigatória Aplicada ao Design:**
  1. **Regra do FTL (Clique Esquerdo = Selecionar / Clique Direito = Mover):** O clique dentro da sala **NUNCA** aciona válvulas. Clicar dentro da sala serve exclusivamente para selecionar ou mandar tripulantes para aquela sala (se mandar para a sala, o animal assume automaticamente o Bulbo se estiver vazio, ou conserta o furo prioritariamente!).
  2. **Válvulas de Drenagem ficam FORA da caixa da sala (ou em painel dedicado):** As comportas de drenagem ficam nas bordas externas do casco (com ícones grandes de escotilha, igual às portas externas do FTL) + um botão mestre de **"Drenar/Fechar Tudo"** ao lado do Termômetro de Peso (atalho tecla `V`). Zero cliques acidentais!

### Falha Encontrada 2: Alvo Móvel em Corte Lateral (Mirar em Monstro Nadando)
* **O Problema:** Se o Monstro Marinho na janela da direita ficar subindo e descendo com a animação de nado, e as caixas dos órgãos dele subirem e descerem junto, o jogador vai tentar clicar no *Gânglio Cerebral* com o jogo despausado e vai errar o clique porque o bicho mexeu! Isso gera ódio imediato no jogador.
* **Correção Obrigatória Aplicada ao Design:**
  * **Ícones de Alvo Estáticos Fixos (*Pinned Target Nodes*):** O sprite do monstro pode se mexer e ondular na água o quanto quiser para dar vida à cena, mas os **4 Quadrados de Mira dos Órgãos ficam travados em posições fixas na grade da janela direita**, ligados ao órgão por uma fina linha de mira de sonar (como em *VATS* do Fallout). O alvo sob o mouse nunca foge do clique!

### Falha Encontrada 3: Cegueira de Peso Antes de Equipar ou Inundar
* **O Problema:** O jogador vê que está com $225\text{ kg}$ de $260\text{ kg}$. Ele decide abrir uma comporta ou desligar 1 barra do Sifão de Propulsão, e *depois* que clica descobre que caiu na água porque não fez a conta de cabeça de que perderia $30\text{ kg}$ de sustentação.
* **Correção Obrigatória Aplicada ao Design:**
  * **Pré-visualização Fantasma (*Ghost Preview*) no Termômetro:**
    * Quando o jogador apenas **passa o mouse (hover)** sobre o botão de tirar energia do Sifão ou sobre uma válvula de água, o Termômetro de Sustentação mostra uma **linha tracejada piscando** onde o Peso ou o Limite vai parar se ele clicar.
    * Se a ação for causar um *Touchdown*, o indicador pisca em vermelho com o aviso `[QUEDA NO MAR]` *antes* do clique. O jogador toma decisões táticas conscientes, nunca morre por erro de tabuada.
