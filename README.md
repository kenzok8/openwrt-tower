<h1 align="center">Tower</h1>

<p align="center"><strong>OpenWrt 配置工作台：整理订阅与节点，选择分流规则，导出给 OpenClash / Nikki / Clashoo / Momo。</strong></p>

<div align="center">
  <a href="https://github.com/kenzok8/openwrt-tower"><img alt="GitHub stars" src="https://img.shields.io/github/stars/kenzok8/openwrt-tower?style=flat-square"></a>
  <a href="https://github.com/kenzok8/openwrt-tower/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/kenzok8/openwrt-tower?style=flat-square"></a>
</div>

---

> Tower 是路由器上的配置工作台，不是代理内核。它负责整理订阅和自有节点、选择分流规则、生成客户端可导入的配置；真正接管流量的仍是 OpenClash、Nikki、Clashoo、Momo 等插件。
>
> 本项目是「酱紫表 Tower」的 OpenWrt 适配版，由 kenzok8 维护，并非原版官方项目。订阅凭据与节点密码只保存在你的路由器上，不会送往在线转换服务。

---

## 界面预览

<details open>
<summary><b>Desktop Screenshots</b></summary>
<br>
<table>
<tr>
<td align="center"><b>订阅管理</b><br><img width="400" src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/subscriptions-redacted.png"></td>
<td align="center"><b>规则方案</b><br><img width="400" src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/rules-presets.png"></td>
</tr>
<tr>
<td align="center"><b>导入规则</b><br><img width="400" src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/rules-import.png"></td>
<td align="center"><b>生成配置</b><br><img width="400" src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/export-redacted.png"></td>
</tr>
</table>
<br>
</details>

---

## 功能

**订阅与节点**
- 管理多个订阅和自有节点，查看机场流量与到期，更新订阅，编辑或删除自有节点
- 按订阅来源、协议或单个节点勾选，机场节点与自建节点可组合导出

**规则方案**
- 内置 ACL4SSR、Self-Configuration、kenzok8 方案，也可给自定义 Clash YAML、subconverter `.ini`、Surge 配置命名后导入
- 导入规则方案不会导入节点；网络可用时可手动刷新远程规则缓存

**导出**
- 生成 Mihomo YAML、Surge / Shadowrocket 配置、sing-box JSON，以及单独的节点链接，可预览、复制或下载
- 为同一路由器上的插件提供本机订阅地址（仅监听 `127.0.0.1`）

### 导出边界

| 目标 | 导出内容 | 需要注意 |
|---|---|---|
| OpenClash、Nikki、Clashoo（Mihomo） | Mihomo YAML | 导入后仍需目标插件校验配置与日志 |
| Clashoo（sing-box）、Momo | sing-box JSON，默认分流 | Tower 规则方案尚不能等价转成 sing-box 分流；Momo 还需按运行模式调整入站 |
| daede | 节点订阅 | 规则仍由 daede 自己管理 |

---

## 使用

1. 安装 `tower` 和 `luci-app-tower`，打开 LuCI「服务 → Tower」
2. 添加订阅或粘贴节点链接，按需筛选与勾选，选好规则方案
3. 在「导出」选客户端、节点和规则，生成后先看预览与兼容提示，再复制或下载到目标插件校验

---

## 安装

作为 `src-link` feed 接入已装好 Go 编译环境的 OpenWrt / ImmortalWrt SDK 或 Buildroot：

```sh
echo 'src-link tower /absolute/path/to/openwrt-tower' >> feeds.conf
./scripts/feeds update -a
./scripts/feeds install -p tower tower luci-app-tower
make package/tower/compile V=s
make package/luci-app-tower/compile V=s
```

安装或升级前请备份 `/etc/config/tower` 和 `/etc/tower/`。

---

## 开发

在 `tower/` 下运行：

```sh
go test ./...
go vet ./...
go build ./cmd/tower
```

---

## 系统要求

- OpenWrt / ImmortalWrt 24.10+（当前 CI 仅验证 x86_64 的 24.10 / 25.12）

---

## 隐私

Tower 的私有状态位于 `/etc/tower/tower.json`，远程规则缓存位于 `/etc/tower/rule-cache/`。本仓库只提交程序、LuCI 页面与公开内置规则，不含真实订阅或测试设备配置。第三方来源与许可见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

---

## 致谢

- [pengchujin/tower](https://github.com/pengchujin/tower) — 原版「塔台 Tower」，感谢「酱紫表」开放产品思路与代码

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
