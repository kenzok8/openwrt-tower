# Tower for OpenWrt (luci-app-tower)

把 [塔台 Tower](https://github.com/pengchujin/tower)（MIT）的核心流水线搬到 OpenWrt 路由器上：

**添加订阅 → 解析节点 → 选规则 → 生成客户端配置 → 导出**

后端用 Go 重写（单二进制 `tower`），前端是 LuCI JS 界面。配置生成在路由器本地完成，不经过第三方转换服务。

## 目录

- `tower/` — Go 后端：数据模型、订阅解析器、配置生成器、存储、HTTP API / CLI
- `luci-app-tower/` — LuCI 前端：订阅管理、节点列表、导出三个页面 + rpcd 后端

## 后端架构

```
internal/
├── model/     ProxyNode、ClientTarget、RulePolicy、RuleScheme 等数据模型
├── parser/    订阅解析（Base64 / URI / Clash YAML / Surge INI，14 种协议）
├── generator/ 配置生成（Clash YAML / sing-box JSON / Surge+Shadowrocket INI）
├── service/   核心操作（增删订阅、抓取刷新、导出）
├── store/     JSON 持久化（/etc/tower/tower.json）
└── api/       本地 HTTP API
```

`tower` 二进制两种模式：

- 无参数 → HTTP 守护进程（`-listen 127.0.0.1:7443`）
- 带子命令 → CLI（`subscriptions` / `nodes` / `add` / `remove` / `refresh` / `export`），LuCI 前端经 rpcd 调用

## 客户端支持

Phase 1 已实现：Clash/mihomo YAML（Stash、Clash、Clash Verge、ClashMac、FlClash、Mihomo Party、Clash Mi、Karing）、sing-box JSON（sing-box MT、Hiddify）、Surge INI（Surge、Surge Mac）、Shadowrocket INI。

Phase 2 待做：Loon、Quantumult X、Egern、V2Box，以及自定义规则/策略组（ACL4SSR）。

## 开发

```sh
cd tower
go test ./...      # 单元测试
go build ./cmd/tower
```

## 协议与许可证

- 代码 MIT，移植自 [pengchujin/tower](https://github.com/pengchujin/tower)，保留其版权声明。
- 内置规则（ACL4SSR）和地区库按各自许可证分发，见上游 THIRD-PARTY-NOTICES.md。
