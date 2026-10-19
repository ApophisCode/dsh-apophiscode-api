# DSH ApophisCode 插件

本项目围绕用户在 DSH 中使用 Apophis 中转服务建立统一用语。

## Language

**DSH**：
用户本地安装的 DeepSeek Harness，是承载会话与插件的宿主应用。
_Avoid_：中转站、Apophis 插件

**Apophis 中转站**：
模型 API 服务，插件默认根地址为 https://www.apophis.uk/。
_Avoid_：DSH、插件、已通过所有模型验证的服务

**ApophisCode 插件**：
本项目交付的 DSH provider 插件，使用 Apophis API，并在独立 scope 内管理配置与凭据。
_Avoid_：新建代理服务、从零实现的插件体系

**模型标识**：
Apophis API 用于指定某个模型的实际名称；以服务端接受的值为准。
_Avoid_：模型展示名称、公开模型广场的全部条目

**ApophisCode 发行包**：
带有本项目独立版本号、供 DSH 安装使用的插件交付物。
_Avoid_：DSH 安装包、其他插件的发行包

**ApophisCode 发布列表**：
本项目 GitHub Releases 中已公开版本的更新说明与下载入口集合。
_Avoid_：插件内历史版本选择器、模型目录

**ApophisCode 在线更新**：
使用者在插件设置页主动将 npm 安装的本插件升级到本项目最新公开版本。
_Avoid_：后台自动升级、替换其他插件
