<p align="center"><img src="docs/site/assets/logo.png" width="96" height="96" alt="Tower"></p>

<h1 align="center">Tower</h1>

<p align="center"><strong>An OpenWrt config workbench: organize subscriptions and nodes, pick a routing ruleset, and export to OpenClash / Nikki / Clashoo / Momo / dae / Honk.</strong></p>

<p align="center">English · <a href="README.md">中文</a></p>

<div align="center">
  <a href="https://github.com/kenzok8/openwrt-tower/releases"><img alt="Release" src="https://img.shields.io/github/v/release/kenzok8/openwrt-tower?style=flat-square&label=release"></a>
  <a href="https://github.com/kenzok8/openwrt-tower/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/kenzok8/openwrt-tower/total?style=flat-square&label=downloads"></a>
  <a href="https://github.com/kenzok8/openwrt-tower/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/kenzok8/openwrt-tower/main?style=flat-square"></a>
  <a href="https://github.com/kenzok8/openwrt-tower/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/kenzok8/openwrt-tower?style=flat-square"></a>
  <a href="https://github.com/kenzok8/openwrt-tower/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/kenzok8/openwrt-tower?style=flat-square"></a>
</div>

---

> Tower is a config workbench on your router: it organizes subscriptions and own nodes, lets you pick a routing ruleset, and generates configs your clients can import. It currently targets OpenClash, Nikki, Clashoo, Momo, dae, Honk and similar plugins.
>
> This is the OpenWrt port of "Tower" by pengchujin, maintained by kenzok8 — not the official upstream project. Subscription credentials and node passwords stay on your router and are never sent to an online converter.
>
> Documentation site: <https://kenzok8.github.io/openwrt-tower/> (sources in [`docs/site/`](docs/site/))

---

## Screenshots

<details open>
<summary><b>Desktop Screenshots</b></summary>
<br>
<table>
<tr>
<td align="center"><b>Subscriptions</b><br><img width="400" src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/subscriptions-redacted.png"></td>
<td align="center"><b>Rule presets</b><br><img width="400" src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/rules-presets.png"></td>
</tr>
<tr>
<td align="center"><b>Import rules</b><br><img width="400" src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/rules-import.png"></td>
<td align="center"><b>Generate config</b><br><img width="400" src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/export-redacted.png"></td>
</tr>
</table>
<br>
</details>

---

## Features

**Subscriptions & nodes**
- Manage multiple subscriptions and own nodes, view provider traffic and expiry, update subscriptions, edit or delete own nodes
- Select by subscription source, protocol, or individual node; provider and self-hosted nodes can be exported together

**Rule schemes**
- Built-in ACL4SSR, Self-Configuration and kenzok8 schemes; custom Clash YAML, subconverter `.ini` or Surge configs can be imported under a name
- Importing a rule scheme never imports nodes; the remote rule cache can be refreshed manually when online

**Export**
- Generates Mihomo YAML, Surge / Shadowrocket configs, sing-box JSON, dae / Honk configs (Kenzo template), and standalone node links — preview, copy or download
- Serves a local subscription URL for plugins on the same router (listens on `127.0.0.1` only)

### Export boundaries

| Target | Exported content | Notes |
|---|---|---|
| OpenClash, Nikki, Clashoo (Mihomo) | Mihomo YAML | The target plugin still needs to validate the config and logs after import |
| Clashoo (sing-box), Momo | sing-box JSON, default routing | Tower rule schemes cannot yet translate losslessly to sing-box routing; Momo also needs its inbounds adjusted per run mode |
| daede, Honk | Full dae config (Kenzo template) | Check the interface names in the template against your device before importing; Honk does not support SSR |

dae-based plugins that only accept an http(s) subscription URL can use the local node subscription at `http://127.0.0.1:7443/daesub/v1/<tag>` instead.

---

## Usage

1. Install `tower` and `luci-app-tower`, then open LuCI "Services → Tower"
2. Add subscriptions or paste node links, filter and select as needed, pick a rule scheme
3. On "Export", pick the client, nodes and rules, check the preview and compatibility notes, then copy or download and validate in the target plugin

---

## Install

### One-click install

Run as `root` on an OpenWrt / ImmortalWrt router. The script adds the existing [dllkids software feed](https://down.dllkids.xyz/openwrt-feed/), then installs `tower` and `luci-app-tower` via `apk` (25.12) or `opkg` (24.10):

```sh
wget -O - https://raw.githubusercontent.com/kenzok8/openwrt-tower/main/scripts/install.sh | sh
```

If the feed is already configured, you can also run `apk update && apk add tower luci-app-tower`, or on 24.10 `opkg update && opkg install tower luci-app-tower`.

### Manual install from Releases

Download the `tower` and `luci-app-tower` packages matching your system version and architecture from [Releases](https://github.com/kenzok8/openwrt-tower/releases). 24.10 uses IPK, 25.12 uses APK; release APKs are unsigned, so manual install needs `apk add --allow-untrusted`. Devices with a trusted feed configured should prefer installing from the feed.

Back up `/etc/config/tower` and `/etc/tower/` before installing or upgrading.

<details>
<summary><b>Build it yourself with the SDK</b></summary>

Add the repo as a `src-link` feed to an OpenWrt / ImmortalWrt SDK or Buildroot with a Go toolchain installed:

```sh
echo 'src-link tower /absolute/path/to/openwrt-tower' >> feeds.conf
./scripts/feeds update -a
./scripts/feeds install -p tower tower luci-app-tower
make package/tower/compile V=s
make package/luci-app-tower/compile V=s
```

</details>

### Uninstall

```sh
apk del luci-app-tower tower        # 25.12
opkg remove luci-app-tower tower    # 24.10
```

Uninstalling does not delete `/etc/tower/`; remove it manually once you are sure you no longer need it.

---

## Dependencies

| Package | Purpose |
| :--- | :--- |
| `ca-bundle` | CA certificates, used to verify HTTPS when fetching subscriptions and remote rules |
| `tower` | The Go backend; the `luci-app-tower` rpcd backend invokes `/usr/bin/tower` as a subprocess |

LuCI base packages (`luci-base` etc.) are pulled in automatically by `luci.mk` and are not listed in the package Makefiles. See `tower/Makefile` and `luci-app-tower/Makefile` for the full dependency lists.

---

## Development

Run inside `tower/`:

```sh
go test ./...
go vet ./...
go build ./cmd/tower
```

---

## System requirements

- ImmortalWrt SDK 24.10: 23 architectures pass cross-compilation; SDK 25.12: 22 architectures (`mips_4kec` excluded)
- Only x86_64 on 25.12 has been verified on real hardware (device 252); other architectures are compile-verified only, not individually run-tested

---

## Privacy

Tower's private state lives in `/etc/tower/tower.json`, and the remote rule cache in `/etc/tower/rule-cache/`. This repo only contains the program, the LuCI pages and public built-in rules — no real subscriptions or test-device configs. Third-party sources and licenses are listed in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

---

## Credits

- [pengchujin/tower](https://github.com/pengchujin/tower) — the original Tower app; thanks to pengchujin for sharing the product idea and code

## License

This project is licensed under the [MIT License](LICENSE).
