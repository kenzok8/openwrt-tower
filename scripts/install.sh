#!/bin/sh

set -eu

feed_setup_url='https://down.dllkids.xyz/openwrt-feed/openwrt-feed-setup.sh'

if [ "$(id -u)" -ne 0 ]; then
	echo 'Please run as root on OpenWrt.' >&2
	exit 1
fi

if ! command -v wget >/dev/null 2>&1; then
	echo 'wget is required to configure the software feed.' >&2
	exit 1
fi

setup_file="$(mktemp /tmp/tower-feed-setup.XXXXXX)"
trap 'rm -f "$setup_file"' 0

wget -O "$setup_file" "$feed_setup_url"
sh "$setup_file"

if command -v apk >/dev/null 2>&1; then
	apk update
	apk add tower luci-app-tower
elif command -v opkg >/dev/null 2>&1; then
	opkg update
	opkg install tower luci-app-tower
else
	echo 'Neither apk nor opkg is available.' >&2
	exit 1
fi
