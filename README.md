# Employee System App

员工系统用户端应用，基于 uni-app 与 Vue3 构建，面向员工、客户和移动端业务场景，提供档案查看、客户跟进、商品浏览、采购、报价、消息沟通和个人中心等功能。

## 技术栈

- uni-app
- Vue 3
- Vite
- Sass
- H5 / 微信小程序构建
- 本地状态与业务工具模块

## 关联仓库

| 子项目 | 仓库 | 说明 |
| --- | --- | --- |
| 后端服务 | [employee-system-backend](https://github.com/jiangyi3265/employee-system-backend) | 提供认证、权限、系统管理和员工档案等 API |
| 管理后台 | [employee-system-admin](https://github.com/jiangyi3265/employee-system-admin) | 面向管理员的 Web 管理端 |
| 用户端 | [employee-system-app](https://github.com/jiangyi3265/employee-system-app) | 面向员工、客户和移动端场景的应用 |

## 快速启动

```bash
# 安装依赖
npm install

# H5 开发预览
npm run dev:h5

# H5 构建
npm run build:h5

# 微信小程序开发构建
npm run dev:mp-weixin
```

移动端接口服务建议对接 `employee-system-backend`，具体地址可在项目配置或请求工具模块中调整。

## 简历描述示例

负责员工系统用户端开发，基于 uni-app、Vue3 和 Vite 实现员工档案、客户跟进、商品采购、报价流转与消息模块，支持 H5 和微信小程序多端交付。
