# openwrt-tower

秦统一文字、车轨与度量衡。Tower 做的是配置管理里的一件小事：把不同来源的订阅、节点、规则和导出方式，收拢到同一个 LuCI 工作台。

本项目是 [酱紫表的「塔台 Tower」](https://github.com/pengchujin/tower) 的 OpenWrt 适配版，由 kenzok8 维护，并非原版 Tower 官方项目。感谢原作者开放产品思路与代码。

## 产品预览

点击图片可查看大图；图片统一存放在 [kenzok8/screenshot/tower](https://github.com/kenzok8/kenzok8/tree/main/screenshot/tower)。

<table>
  <tr>
    <th>订阅管理</th>
    <th>规则方案</th>
  </tr>
  <tr>
    <td><a href="https://github.com/kenzok8/kenzok8/blob/main/screenshot/tower/subscriptions-redacted.png"><img src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/subscriptions-redacted.png" width="440" alt="Tower 订阅管理"></a></td>
    <td><a href="https://github.com/kenzok8/kenzok8/blob/main/screenshot/tower/rules-presets.png"><img src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/rules-presets.png" width="440" alt="Tower 规则方案"></a></td>
  </tr>
  <tr>
    <th>导入规则</th>
    <th>生成配置</th>
  </tr>
  <tr>
    <td><a href="https://github.com/kenzok8/kenzok8/blob/main/screenshot/tower/rules-import.png"><img src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/rules-import.png" width="440" alt="Tower 导入规则"></a></td>
    <td><a href="https://github.com/kenzok8/kenzok8/blob/main/screenshot/tower/export-redacted.png"><img src="https://raw.githubusercontent.com/kenzok8/kenzok8/main/screenshot/tower/export-redacted.png" width="440" alt="Tower 生成配置"></a></td>
  </tr>
</table>

## Tower 是什么

Tower 是路由器上的配置工作台，不是代理内核。它负责整理订阅和自有节点，选择分流规则，再生成目标客户端能导入的配置；真正接管流量的仍是 OpenClash、Nikki、Clashoo、Momo 等插件。

仓库包含两个 OpenWrt 包：`tower` 提供本地解析、规则和配置生成能力，`luci-app-tower` 提供 LuCI 页面。订阅凭据和节点密码只保存在你的路由器上，不会送往在线转换服务。

## Tower 做什么

- 管理多个订阅和自有节点，查看机场流量与到期信息，更新订阅，编辑或删除自有节点。
- 按订阅来源、协议或单个节点勾选；机场节点与自建节点可以组合导出。
- 选用内置的 ACL4SSR、Self-Configuration、kenzok8 方案，也可给自定义 Clash YAML、subconverter `.ini`、Surge 配置命名后导入。导入规则方案不会导入节点。
- 在设备能够访问规则源时手动刷新远程规则缓存。保存方案不要求即时下载；缺少本地缓存时，需要展开规则的导出会明确报错。
- 预览、复制或下载 Mihomo YAML、Surge / Shadowrocket 配置、sing-box JSON，以及单独的节点链接。
- 为同一台路由器上的插件提供可撤销的本机订阅地址。当前仅监听 `127.0.0.1`，不能直接给局域网内其它设备使用。

### OpenWrt 插件的导出边界

| 目标 | 导出内容 | 需要注意 |
|---|---|---|
| OpenClash、Nikki、Clashoo（Mihomo） | Mihomo YAML | 导入后仍需用目标插件校验配置和日志 |
| Clashoo（sing-box）、Momo | sing-box JSON，默认分流 | Tower 规则方案尚不能等价转成 sing-box 分流；Momo 还需按运行模式调整入站 |
| daede | 节点订阅 | 规则仍由 daede 自己管理 |

不同客户端对协议和规则的支持不完全相同。Tower 不会把 Clash 的手动选择组直接冒充为 dae 的同名分流能力；不支持的组合应返回错误。

## 怎么用

1. 安装 `tower` 和 `luci-app-tower`，打开 LuCI 的「服务 → Tower」。
2. 在「订阅」添加订阅，或粘贴节点链接导入自有节点；按需更新、筛选与勾选。
3. 在「规则」选内置方案，或给自定义方案命名后导入。引用远程规则的方案可在网络可用时手动刷新。
4. 在「导出」选客户端、节点和规则方案，生成后先看预览与兼容提示，再复制或下载到目标插件校验。

生成的配置文件可能包含节点密钥，请像保管订阅链接一样保管它。使用 Mihomo 原生远程规则集时，目标客户端也需要能访问相应规则源，或已有缓存。Tower 不提供机场、节点或规则源的可用性保证。

## 安装与打包

本仓库可作为 `src-link` feed 接入已准备好 Go 编译环境的 OpenWrt / ImmortalWrt SDK 或 Buildroot：

```sh
echo 'src-link tower /absolute/path/to/openwrt-tower' >> feeds.conf
./scripts/feeds update -a
./scripts/feeds install -p tower tower luci-app-tower
make package/tower/compile V=s
make package/luci-app-tower/compile V=s
```

产物在 SDK 的 `bin/packages/` 下。GitHub Actions 目前只尝试构建 x86_64 的 24.10 和 25.12 候选包；其它架构尚未宣称通过验证。安装或升级前请备份 `/etc/config/tower` 和 `/etc/tower/`，后者包含真实订阅、节点和本机共享快照，不能上传到公开仓库。

后端开发检查：在 `tower/` 下运行 `go test ./...`、`go vet ./...` 和 `go build ./cmd/tower`。发布前还需用测试设备检查 LuCI、RPC 权限、目标插件的配置校验与代理服务状态。

## 规则、隐私与许可证

随包提供两个 ACL4SSR 离线方案和相关 `.list` 文件。Self-Configuration 与 kenzok8 方案内置策略组及远程规则引用；远程规则正文仅在手动刷新后缓存，不随包分发。来源与许可见 [第三方声明](THIRD-PARTY-NOTICES.md)。

Tower 的私有状态位于 `/etc/tower/tower.json`，远程规则缓存位于 `/etc/tower/rule-cache/`。本仓库只提交程序、LuCI 页面和公开内置规则，不包含真实订阅或测试设备配置。

项目源码采用 [MIT 许可证](LICENSE)。再次感谢 [pengchujin/tower](https://github.com/pengchujin/tower) 的作者「酱紫表」；各规则、图标和品牌素材仍归原作者或项目所有。
