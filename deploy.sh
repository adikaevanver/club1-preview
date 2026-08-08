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

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# .htaccess ссылается на .htpasswd абсолютным путём — подставляем реальный
sed "s|AuthUserFile .*|AuthUserFile ${CLUB1_DOCROOT}/.htpasswd|" .htaccess > "$tmp/.htaccess"

# В страницах прописан адрес превью на GitHub Pages (canonical, og:url).
# На боевом домене он бы указывал поисковикам и мессенджерам на чужой хост,
# поэтому подменяем при выкладке — в репозитории превью остаётся рабочим.
stage="$tmp/site"
mkdir -p "$stage"
rsync -a \
  --exclude '.git/' --exclude '.claude/' --exclude '.playwright-cli/' \
  --exclude 'backups/' --exclude 'sweeps/' --exclude 'sweep-*/' \
  --exclude '.DS_Store' --exclude 'deploy.sh' --exclude '.env' \
  --exclude '.htaccess' \
  ./ "$stage/"
find "$stage" -name '*.html' -exec \
  sed -i '' -e 's|https://adikaevanver\.github\.io/club1-preview|https://club1.moscow|g' {} +

rsync -az --delete $DRY --itemize-changes \
  -e "$SSH" "$stage/" "${REMOTE}:${CLUB1_DOCROOT}/"

rsync -az $DRY -e "$SSH" "$tmp/.htaccess" "${REMOTE}:${CLUB1_DOCROOT}/.htaccess"

if [[ -z "$DRY" ]]; then
  $SSH "$REMOTE" "chmod 644 ${CLUB1_DOCROOT}/.htaccess ${CLUB1_DOCROOT}/.htpasswd"
  echo "✓ выложено — https://club1.moscow"
else
  echo "(dry-run: ничего не изменено)"
fi
