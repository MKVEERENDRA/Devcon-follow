#!/usr/bin/env bash
set -euo pipefail
# Official Ubuntu repositories only; no application credentials in metadata.
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q docker.io caddy ca-certificates unattended-upgrades
systemctl enable --now docker
# Give the small VM build headroom without adding a paid disk.
if ! swapon --show=NAME --noheadings | grep -q /swapfile; then
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi
install -d -m 700 /etc/devcon-follow
install -d -m 755 /opt/devcon-follow
install -d /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=100M\n' > /etc/systemd/journald.conf.d/devcon-follow.conf
systemctl restart systemd-journald
# HTTPS is configured only after an approved hostname and app are available.
systemctl disable --now caddy
echo 'Devcon VM bootstrap complete; application not yet configured.'
