#!/usr/bin/env bash
# =====================================================================
# Выкладка сайта на хостинг reg.ru (club1.moscow).
#
#   ./deploy.sh            — залить сайт
#   ./deploy.sh --dry-run  — показать, что изменится, ничего не трогая
#
# Доступы берутся из окружения или из файла .env рядом со скриптом:
#   CLUB1_SSH_HOST=uXXXXXXX.plsk.regruhosting.ru
#   CLUB1_SSH_USER=uXXXXXXX
#   CLUB1_SSH_PORT=22
#   CLUB1_DOCROOT=/var/www/uXXXXXXX/data/www/club1.moscow
#
# Пароль SSH не хранится: настройте ключ (ssh-copy-id) — иначе rsync
# спросит пароль в терминале.
# =====================================================================
set -euo pipefail

cd "$(dirname "$0")"
[[ -f .env ]] && set -a && . ./.env && set +a

: "${CLUB1_SSH_HOST:?не задан CLUB1_SSH_HOST — см. шапку скрипта}"
: "${CLUB1_SSH_USER:?не задан CLUB1_SSH_USER}"
: "${CLUB1_SSH_PORT:=22}"
: "${CLUB1_DOCROOT:?не задан CLUB1_DOCROOT}"

DRY=""
[[ "${1:-}" == "--dry-run" ]] && DRY="--dry-run"

# .htpasswd в git не хранится — репозиторий публичный.
# Пересоздать: htpasswd -nbB club1 '<пароль>' > .htpasswd
if [[ ! -f .htpasswd ]]; then
  echo "нет .htpasswd — сайт уехал бы без пароля." >&2
  echo "создайте: htpasswd -nbB club1 '<пароль>' > .htpasswd" >&2
  exit 1
fi

REMOTE="${CLUB1_SSH_USER}@${CLUB1_SSH_HOST}"
SSH="ssh -p ${CLUB1_SSH_PORT}"

echo "→ ${REMOTE}:${CLUB1_DOCROOT}"

# .htaccess ссылается на .htpasswd абсолютным путём — подставляем реальный
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
sed "s|AuthUserFile .*|AuthUserFile ${CLUB1_DOCROOT}/.htpasswd|" .htaccess > "$tmp/.htaccess"

rsync -az --delete $DRY --itemize-changes \
  -e "$SSH" \
  --exclude '.git/' \
  --exclude '.claude/' \
  --exclude 'backups/' \
  --exclude 'sweeps/' \
  --exclude 'sweep-*/' \
  --exclude '.DS_Store' \
  --exclude 'deploy.sh' \
  --exclude '.env' \
  --exclude '.htaccess' \
  ./ "${REMOTE}:${CLUB1_DOCROOT}/"

rsync -az $DRY -e "$SSH" "$tmp/.htaccess" "${REMOTE}:${CLUB1_DOCROOT}/.htaccess"

if [[ -z "$DRY" ]]; then
  $SSH "$REMOTE" "chmod 644 ${CLUB1_DOCROOT}/.htaccess ${CLUB1_DOCROOT}/.htpasswd"
  echo "✓ выложено — https://club1.moscow"
else
  echo "(dry-run: ничего не изменено)"
fi
