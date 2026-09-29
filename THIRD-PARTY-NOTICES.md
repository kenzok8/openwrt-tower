# 第三方规则来源

Tower 源码以 MIT 许可证发布。规则数据由各自上游项目维护，继续采用各自许可证。

## 随包提供的离线规则

| 项目 | 内容 | 版本 | 许可证 |
|---|---|---|---|
| [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR) | 两个 `.ini` 方案及其引用的 `.list` 文件 | `75f0101039d71724b6e998b34604c2e053580e0c` | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

这些文件位于 `tower/files/rules/`，并在 OpenWrt 软件包中一并分发。版权和许可仍属于 ACL4SSR 项目及其贡献者。文件名加了 `ACL4SSR_` 前缀；规则内容没有改写。

## Self-Configuration 方案

`Self_Configuration.ini` 参考 [ClashConnectRules/Self-Configuration](https://github.com/ClashConnectRules/Self-Configuration) 的策略组和规则引用；该项目采用 MIT 许可证。软件包只包含方案定义，不包含其远程规则正文。手动刷新所得规则仍遵循各规则源自己的许可证。

## kenzok8 内置方案

`tower/files/rules/Kenzok8.yaml` 源自个人使用的 Mihomo 分流思路，已去除订阅地址和节点凭据。它引用 [MetaCubeX](https://github.com/MetaCubeX/meta-rules-dat) 和 [kenzok78/ruleset](https://github.com/kenzok78/ruleset) 的公开规则；规则正文不随包分发。再次分发缓存规则前，请核对各上游许可证。

### Group icons

方案通过 HTTPS 引用 [Simple Icons](https://github.com/simple-icons/simple-icons)、[Iconify](https://iconify.design/) 和 [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Microsoft_icon.svg) 的服务图标，图标文件不随包分发。各品牌图形、名称和商标仍归对应权利人；使用图标不代表品牌方认可本项目。

### 客户端图标

LuCI 导出页的客户端图标用于识别目标应用。通用客户端图标参考 [原版 Tower](https://github.com/pengchujin/tower) 的资源；dae 图标来自 [kenzok8/kenzok8](https://github.com/kenzok8/kenzok8/blob/main/screenshot/daede/dae-logo.png)。Momo 当前使用 sing-box 图形作格式提示，不是插件的官方标识。各应用名称和标志权利属于各自所有者。
