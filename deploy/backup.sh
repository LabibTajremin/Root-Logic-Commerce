#!/usr/bin/env bash
# Nightly compressed database dump; keeps the last 7 (spec §8 — counts toward the disk budget).
# Installed by setup.sh as /etc/cron.d/rlc-backup (02:30 every night).
set -euo pipefail
DIR=/var/backups/rlc
mkdir -p "$DIR"
sudo -u postgres pg_dump --format=custom rlc | gzip -9 > "$DIR/rlc-$(date +%F).dump.gz"
ls -1t "$DIR"/rlc-*.dump.gz | tail -n +8 | xargs -r rm --
