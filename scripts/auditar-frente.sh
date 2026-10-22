#!/usr/bin/env sh
unset GIT_DIR GIT_INDEX_FILE GIT_WORK_TREE GIT_PREFIX GIT_COMMON_DIR GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES
set -eu

REPO_ROOT="$(git rev-parse --show-toplevel)"
MAIN_GIT_DIR="$(git rev-parse --git-common-dir)"

echo "=== [AUDITORIA DE PRE-VOO E FECHAMENTO — 14 LEIS] ==="

# 1. Lei N5: Carga da máquina < 20
LOAD_1M="$(sysctl -n vm.loadavg 2>/dev/null | awk '{print $2}' || uptime | awk -F'load averages?: ' '{print $2}' | awk '{print $1}' | tr -d ',')"
LOAD_INT="$(echo "$LOAD_1M" | awk -F'.' '{print $1}')"
echo "[N5] Carga da maquina (1m): $LOAD_1M (limite < 20)"
if [ "$LOAD_INT" -ge 20 ]; then
  echo "ERRO FATAL [Lei N5]: Carga da maquina ($LOAD_1M) >= 20. Espere baixar antes de rodar." >&2
  exit 1
fi

# 2. Seção 5: core.bare == false no repositório principal
BARE_MAIN="$(git --git-dir="$MAIN_GIT_DIR" config --get core.bare || echo "false")"
echo "[Secao 5] core.bare no repositorio principal ($MAIN_GIT_DIR): $BARE_MAIN"
if [ "$BARE_MAIN" != "false" ]; then
  echo "ERRO FATAL [Secao 5]: core.bare=$BARE_MAIN no repositorio principal. Pare e reporte." >&2
  exit 1
fi

# 3. Brecha 1: core.hooksPath == scripts/hooks
HOOKS_PATH="$(git --git-dir="$MAIN_GIT_DIR" config --get core.hooksPath || echo "")"
echo "[Hooks] core.hooksPath: $HOOKS_PATH"
if [ "$HOOKS_PATH" != "scripts/hooks" ]; then
  echo "ERRO FATAL [Hooks]: core.hooksPath='$HOOKS_PATH' (esperado: 'scripts/hooks')." >&2
  exit 1
fi

# 4. Lei N5 & N7: Estado do Git, Commit, Distância da main, Ramos e Worktrees
COMMIT_ATUAL="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
ATRAS_MAIN="$(git -C "$REPO_ROOT" rev-list --count HEAD..main 2>/dev/null || echo "0")"
echo "[N7] Commit medido: $COMMIT_ATUAL | Commits atras da main: $ATRAS_MAIN"
echo "[N5] Worktrees ativas:"
git -C "$REPO_ROOT" worktree list
echo "[N5] Ramos abertos:"
git -C "$REPO_ROOT" branch -a

# 5. Lei N3 / Seção 3.6: 3 Corridas Verdes Seguidas
for i in 1 2 3; do
  echo "=== CORRIDA $i/3 ==="
  env -u GIT_DIR -u GIT_INDEX_FILE -u GIT_WORK_TREE -u GIT_PREFIX -u GIT_COMMON_DIR -u GIT_OBJECT_DIRECTORY -u GIT_ALTERNATE_OBJECT_DIRECTORIES \
    node --test "$REPO_ROOT"/tests/*.test.mjs
done

# 6. Seção 5 Pós-Teste: reconfirma core.bare == false
BARE_AFTER="$(git --git-dir="$MAIN_GIT_DIR" config --get core.bare || echo "false")"
if [ "$BARE_AFTER" != "false" ]; then
  echo "ERRO FATAL POS-TESTE [Secao 5]: core.bare=$BARE_AFTER apos as 3 corridas." >&2
  exit 1
fi

echo "=== [AUDITORIA APROVADA: 3/3 CORRIDAS VERDES | core.bare=$BARE_AFTER] ==="
