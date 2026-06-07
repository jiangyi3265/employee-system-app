# 员工档案用户端需求梳理

## 1. 范围说明

本文档基于 `员工档案` 用户端代码梳理，覆盖 H5/小程序端当前已实现的页面、业务实体、角色权限、核心流程、同步接口设计以及后端/管理端开发清单。

当前用户端是 uni-app + Vue 3 项目，业务数据通过 `store/db.js` 封装在本地 `uni.storage` 中，表名前缀为 `sqms_`。后续后端同步层可以把该通用 CRUD 层替换为远程 API，或在本地 CRUD 外增加增量同步队列。

## 2. 页面清单

### 2.1 公共与通用页面

| 页面路径 | 页面名称 | 主要功能 | 可访问角色 |
| --- | --- | --- | --- |
| `pages/login/login` | 登录 | 员工/客户登录、微信一键登录演示入口 | 未登录 |
| `pages/login/register` | 客户注册 | 客户提交注册信息，进入待审核状态 | 未登录 |
| `pages/index/index` | 工作台 | 按角色展示入口与统计概览 | 已登录 |
| `pages/message/list` | 消息 | 站内通知列表、未读消息 | 已登录 |
| `pages/message/chat` | 站内信 | 按 `threadId` 查看和发送会话消息 | 已登录 |
| `pages/mine/mine` | 我的 | 当前用户资料、角色、退出登录、开发重置数据 | 已登录 |

### 2.2 档案页面

| 页面路径 | 页面名称 | 主要功能 | 可访问角色 |
| --- | --- | --- | --- |
| `pages/archive/customer` | 客户档案 | 客户列表、搜索、进入详情/编辑 | 员工、管理员 |
| `pages/archive/customer-detail` | 客户详情 | 客户资料、报价、成交、跟进时间线 | 员工、管理员 |
| `pages/archive/employee` | 员工档案 | 员工列表、维护员工账号 | 管理员 |
| `pages/archive/supplier` | 供应商档案 | 供应商列表、维护供应商 | 员工、管理员 |
| `pages/archive/competitor` | 同行档案 | 竞争对手/同行列表、维护同行 | 员工、管理员 |
| `pages/archive/edit` | 编辑档案 | 新增/编辑客户、员工、供应商、同行 | 员工、管理员；员工档案仅管理员 |

### 2.3 产品与价格页面

| 页面路径 | 页面名称 | 主要功能 | 可访问角色 |
| --- | --- | --- | --- |
| `pages/product/list` | 产品基础信息 | 产品搜索、列表、进入编辑 | 员工、管理员 |
| `pages/product/detail` | 产品详情/编辑 | 维护产品基础字段、单位换算、采购价与销售价格、价格历史、同行报价 | 员工、管理员 |
| `pages/product/settings` | 价格参数设置 | 税费、运费、配送费、最低销售价系数、建议价系数、零售价系数 | 员工、管理员 |

### 2.4 报价页面

| 页面路径 | 页面名称 | 主要功能 | 可访问角色 |
| --- | --- | --- | --- |
| `pages/quote/list` | 报价单列表 | 按成交状态、客户名筛选报价单 | 员工、管理员 |
| `pages/quote/detail` | 报价单详情 | 新建/编辑报价单、添加产品、改数量/单价、成交标记、低价审核、跟进、删除、导出入口 | 员工、管理员 |
| `pages/quote/select` | 选择报价产品 | 查看产品价格、最近成交价、最近报价、同行报价，生成推荐报价，录入同行报价 | 员工、管理员 |
| `pages/quote/export` | 报价单导出 | 生成固定格式报价单文本/CSV，复制到剪贴板 | 员工、管理员 |

### 2.5 客户跟进页面

| 页面路径 | 页面名称 | 主要功能 | 可访问角色 |
| --- | --- | --- | --- |
| `pages/follow/index` | 客户跟进 | 预警/全部/已成交客户跟进列表，按未跟进天数排序 | 员工、管理员 |
| `pages/follow/customer` | 客户跟进详情 | 客户维度跟进记录、报价时间线、添加跟进 | 员工、管理员 |
| `pages/follow/add` | 添加跟进 | 独立添加客户跟进记录 | 员工、管理员 |

### 2.6 采购页面

| 页面路径 | 页面名称 | 主要功能 | 可访问角色 |
| --- | --- | --- | --- |
| `pages/purchase/list` | 采购列表 | 采购订单列表，按供应商/时间等查看 | 员工、管理员 |
| `pages/purchase/detail` | 采购详情 | 新建/编辑采购单、选择供应商、添加产品、录入采购价/数量/运费、按数量分摊运费、同步产品价格 | 员工、管理员 |

### 2.7 客户端页面

| 页面路径 | 页面名称 | 主要功能 | 可访问角色 |
| --- | --- | --- | --- |
| `pages/customer/products` | 商品浏览 | 客户查看商品列表与建议销售价 | 客户 |
| `pages/customer/product-detail` | 商品详情 | 查看商品基础信息、建议价/零售价，加入报价申请清单 | 客户 |
| `pages/customer/cart` | 申请报价 | 管理待提交/待审核报价申请，追加商品，提交申请 | 客户 |
| `pages/customer/request-detail` | 申请报价详情 | 查看/编辑草稿或待审核申请，维护数量、预期价、其他供应商报价 | 客户 |
| `pages/customer/orders` | 我的报价 | 查看已生成报价单、复制报价、申请修改报价、申请成交状态变更 | 客户 |
| `pages/customer/contact` | 联系我们 | 联系信息展示 | 客户 |
| `pages/customer/suggest` | 投诉建议 | 提交投诉/建议 | 客户 |

### 2.8 审核与统计页面

| 页面路径 | 页面名称 | 主要功能 | 可访问角色 |
| --- | --- | --- | --- |
| `pages/admin/requests` | 申请报价审核 | 客户报价申请列表、低价报价待审核入口 | 员工、管理员 |
| `pages/admin/request-detail` | 审核详情 | 审核客户报价申请、生成/更新正式报价单、低价管理员审核、驳回 | 员工、管理员；低价最终通过仅管理员 |
| `pages/admin/suggestions` | 客户建议 | 查看客户投诉建议并回复 | 管理员 |
| `pages/admin/stats` | 统计分析 | 日期筛选、整体概览、员工跟进统计、员工业绩排行、产品成交排行、复制统计 | 管理员 |

## 3. 业务实体与字段

### 3.1 账号与档案

#### employees 员工档案

| 字段 | 说明 |
| --- | --- |
| `_id` | 本地/后端主键 |
| `name` | 员工姓名 |
| `phone` | 登录手机号，建议唯一 |
| `password` | 登录密码，后端需改为哈希存储 |
| `role` | `admin` / `employee` |
| `position` | 职位 |
| `remark` | 备注、负责事项 |
| `disabled` | 是否停用 |
| `createTime` / `updateTime` | 创建/更新时间 |

#### customers 客户档案

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `name` | 客户姓名 |
| `phone` | 登录手机号，建议唯一 |
| `password` | 客户密码，后端需哈希 |
| `company` | 公司名称 |
| `grade` | 客户等级：`A` / `B` / `C` |
| `pool` | 客户归属：`public` 公盘 / `private` 私盘 |
| `ownerId` | 负责员工 ID，公盘为空 |
| `ownerName` | 负责员工名称，页面编辑时使用 |
| `approved` | 客户账号是否审核通过 |
| `createTime` / `updateTime` | 创建/更新时间 |

#### suppliers 供应商档案

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `name` | 供应商名称 |
| `contact` | 联系人 |
| `phone` | 电话 |
| `address` | 地址 |
| `createTime` / `updateTime` | 创建/更新时间 |

#### competitors 同行档案

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `name` | 同行/竞争对手名称 |
| `contact` | 联系人 |
| `phone` | 电话 |
| `createTime` / `updateTime` | 创建/更新时间 |

### 3.2 产品与价格

#### products 产品基础信息

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `name` | 产品名称，不允许重复 |
| `spec` | 规格，必填 |
| `brand` | 品牌 |
| `category` | 分类标签 |
| `attr1` / `attr2` | 一级/二级辅助属性 |
| `unitSmall` / `unitMedium` / `unitLarge` | 小/中/大单位 |
| `mediumToSmall` | 1 中单位等于多少小单位 |
| `largeToMedium` | 1 大单位等于多少中单位 |
| `stock` | 库存，当前演示数据有字段但未形成完整库存流 |
| `purchasePrice` | 采购价，手动录入 |
| `costPrice` | 成本价，按采购价与参数计算，可手动修改 |
| `minPrice` | 最低销售价 |
| `suggestPrice` | 建议销售价，客户侧主要展示 |
| `retailPrice` | 零售价 |
| `createTime` / `updateTime` | 创建/更新时间 |

价格公式：

- `costPrice = purchasePrice * (1 + taxRate + freightRate + deliveryRate) + extraFreight`
- `minPrice = costPrice * minRatio`
- `retailPrice = costPrice * retailRatio`
- `suggestPrice = costPrice * suggestRatio`

#### settings 系统设置

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `key` | 配置键，如 `pricing`、`units` |
| `value` | 配置对象 |

`pricing.value` 默认字段：

- `taxRate`：税费比例
- `deliveryRate`：配送费比例
- `freightRate`：分摊运费比例
- `minRatio`：最低销售价系数
- `retailRatio`：零售价系数
- `suggestRatio`：建议销售价系数

#### competitorQuotes 同行报价

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `productId` | 产品 ID |
| `competitorId` | 同行 ID |
| `competitorName` | 同行名称快照 |
| `price` | 同行报价 |
| `createTime` / `updateTime` | 创建/更新时间 |

### 3.3 报价

#### quoteOrders 报价订单

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `customerId` | 客户 ID |
| `customerName` | 客户名称快照 |
| `employeeId` | 报价员工 ID，系统自动关联 |
| `employeeName` | 报价员工名称快照 |
| `dealStatus` | `pending` 未成交 / `partial` 部分成交 / `done` 已成交 |
| `sourceRequestOrderId` | 来源客户报价申请 ID |
| `createTime` / `updateTime` | 创建/更新时间 |

#### quoteItems 产品报价行

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `orderId` | 报价单 ID |
| `productId` | 产品 ID |
| `productName` | 产品名称快照 |
| `spec` | 规格快照 |
| `unit` | 报价单位 |
| `qty` | 数量 |
| `price` | 最终报价单价 |
| `costPrice` | 成本价快照 |
| `customerExpect` | 客户预期价 |
| `status` | `pending` 未成交 / `done` 已成交 |
| `employeeId` | 员工 ID，便于统计 |
| `customerId` | 客户 ID，便于统计 |
| `minPriceSnapshot` | 生成报价时的最低销售价快照 |
| `specialPrice` | 是否低于最低销售价 |
| `needsAdminReview` | 是否需要管理员审核 |
| `specialApproved` | 是否低价特批通过 |
| `priceEffective` | 是否纳入报价/成交参考统计；低价特批默认不纳入 |
| `customerPendingReview` | 客户修改后等待销售确认 |
| `sourceRequestOrderId` | 来源客户申请单 |
| `sourceRequestItemId` | 来源客户申请明细 |
| `createTime` / `updateTime` | 创建/更新时间 |

### 3.4 客户报价申请

#### requestOrders 客户申请报价订单

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `customerId` | 客户 ID |
| `customerName` | 客户名称快照 |
| `totalReference` | 申请清单参考总额 |
| `status` | `submitted` 待审核 / `approved` 已审核 / `rejected` 已驳回 |
| `requestType` | `newQuote` 新报价申请 / `modifyQuote` 报价单修改申请 |
| `sourceQuoteOrderId` | 修改申请对应的原报价单 |
| `employeeId` / `employeeName` | 修改申请原报价员工 |
| `acceptedQuoteOrderId` | 员工接单后创建/关联的报价单 |
| `approvedQuoteOrderId` | 审核通过后正式报价单 |
| `adminReviewStatus` | 低价管理员审核状态 |
| `adminReviewQuoteOrderId` | 低价管理员审核中的报价单 |
| `createTime` / `updateTime` | 创建/更新时间 |

#### requestItems 客户申请报价明细

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `requestOrderId` | 客户申请单 ID |
| `productId` | 产品 ID |
| `productName` | 产品名称快照 |
| `spec` | 规格快照 |
| `qty` | 申请数量 |
| `suggestPrice` | 系统建议价快照 |
| `customerExpect` | 客户预期价 |
| `supplierQuotes` | 客户提供的其他供货商报价数组：`[{ name, price }]` |
| `quotePrice` | 审核时填写/计算的最终报价 |
| `createTime` / `updateTime` | 创建/更新时间 |

### 3.5 采购

#### purchaseOrders 采购订单

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `employeeId` / `employeeName` | 创建员工 |
| `supplierId` / `supplierName` | 供应商 |
| `freight` | 总运费 |
| `createTime` / `updateTime` | 创建/更新时间 |

#### purchaseItems 采购明细

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `purchaseOrderId` | 采购订单 ID |
| `productId` | 产品 ID |
| `productName` | 产品名称快照 |
| `spec` | 规格快照 |
| `supplierId` / `supplierName` | 供应商 |
| `qty` | 采购数量 |
| `purchasePrice` | 采购价 |
| `freightShare` | 分摊到单件的运费 |
| `createTime` / `updateTime` | 创建/更新时间 |

采购保存后可以按数量分摊运费，并用 `purchasePrice + freightShare` 重新计算产品成本价、最低销售价、建议销售价、零售价。

### 3.6 跟进、消息、建议

#### follows 客户跟进

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `customerId` / `customerName` | 客户 |
| `employeeId` / `employeeName` | 员工 |
| `orderId` | 关联报价单，可为空 |
| `way` | 沟通方式：电话、微信、上门、到店、系统、跟进等 |
| `actorRole` | `employee` / `system` 等 |
| `source` | 来源：`customer`、`quote`、`request`、`quote-tip` 等 |
| `privateOrder` | 是否报价单私有跟进 |
| `relatedOrderId` | 相关报价单 |
| `content` | 跟进内容 |
| `createTime` / `updateTime` | 创建/更新时间 |

跟进预警规则：

- 已报价未成交客户：1 天未跟进预警。
- 未报价客户：3 天未跟进预警。
- 已成交客户不进入预警。

#### messages 站内信/通知

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `toType` | `employee` 广播给员工/管理员，或 `user` 指定用户 |
| `toId` | 指定接收人 ID，广播为空 |
| `title` | 标题 |
| `content` | 内容 |
| `type` | `notice` / `request` / `quote` / `chat` 等 |
| `refId` | 关联业务 ID |
| `fromId` / `fromName` / `fromRole` | 发送人 |
| `threadId` | 会话线程 ID |
| `read` | 是否已读 |
| `createTime` / `updateTime` | 创建/更新时间 |

#### suggestions 投诉建议

| 字段 | 说明 |
| --- | --- |
| `_id` | 主键 |
| `customerId` / `customerName` | 客户 |
| `content` | 投诉/建议内容 |
| `reply` | 管理员回复 |
| `createTime` / `updateTime` | 创建/更新时间 |

### 3.7 本地临时状态

以下当前只在客户端本地存储，后端可按业务需要服务端化：

| Key | 说明 |
| --- | --- |
| `sqms_session` | 当前登录会话 `{ role, id, name }` |
| `sqms_cart` | 客户报价申请草稿清单 |
| `sqms_append_request_id` | 客户追加待审核申请时的申请单 ID |
| `sqms_modify_quote_id` | 客户申请修改报价单时的原报价单 ID |
| `sqms_seeded_v1` | 演示数据是否已初始化 |

## 4. 角色权限

### 4.1 角色定义

| 角色 | 值 | 说明 |
| --- | --- | --- |
| 管理员 | `admin` | 员工账号的一种角色，拥有员工全部权限和额外管理权限 |
| 员工 | `employee` | 内部销售/采购/跟进人员 |
| 客户 | `customer` | 外部客户账号，注册后需审核 |

### 4.2 权限矩阵

| 模块 | 管理员 | 员工 | 客户 |
| --- | --- | --- | --- |
| 登录、我的、消息 | 是 | 是 | 是 |
| 客户档案 | 查看/维护 | 查看/维护 | 否 |
| 员工档案 | 查看/维护 | 否 | 否 |
| 供应商/同行档案 | 查看/维护 | 查看/维护 | 否 |
| 产品与价格参数 | 查看/维护 | 查看/维护 | 客户仅看商品与建议/零售价 |
| 报价单 | 全部查看/维护/审核低价 | 维护自己的报价单，低价需管理员审核 | 查看自己的报价单，申请修改或成交状态变更 |
| 客户申请报价 | 查看/接单/审核 | 查看/接单/审核；低价需管理员终审 | 新建、追加、修改待审核申请 |
| 客户跟进 | 查看全部 | 查看自己负责客户与公盘客户 | 否 |
| 采购 | 查看/维护 | 查看/维护 | 否 |
| 投诉建议 | 查看/回复 | 否 | 提交 |
| 统计分析 | 查看全部 | 否 | 否 |

### 4.3 数据可见性规则

- 员工报价列表只显示 `employeeId` 等于当前员工的报价单；管理员可看全部。
- 员工跟进列表只显示自己负责的私盘客户和公盘客户；管理员可看全部。
- 客户只可访问自己的客户侧页面、报价申请、报价单和消息。
- 客户注册后 `approved=false`，审核通过前不能登录。
- 客户归属可由报价单数量自动判定：报价最多的员工成为客户私盘负责人。

## 5. 核心流程

### 5.1 登录与客户注册

1. 员工/管理员使用手机号 + 密码登录。
2. 客户使用手机号 + 密码登录，必须已审核通过。
3. 微信一键登录当前为演示逻辑：按角色取第一个可用账号。
4. 客户注册生成 `customers` 记录，默认 `grade=C`、`pool=public`、`approved=false`。
5. 管理员或有权限人员在客户档案中审核客户账号。

### 5.2 产品建档与价格维护

1. 员工维护产品名称、规格、品牌、分类、辅助属性、单位换算。
2. 产品名称不允许重复，规格必填。
3. 采购价手动录入。
4. 系统根据价格参数自动计算成本价、最低销售价、建议销售价、零售价。
5. 自动计算后的价格允许手动调整并保存。
6. 产品详情可查看最近成交价、最近报价和同行报价，可录入/更新/删除同行报价。

### 5.3 员工创建报价单

1. 员工新建报价单，选择已审核客户。
2. 进入产品选择页，查看产品价格、最近成交价、最近报价、同行最低报价。
3. 系统生成推荐报价：
   - 默认使用建议销售价。
   - 如最近成交价低于建议价但不低于最低销售价，可按最近成交价。
   - 如同行最低价低于当前推荐价且不低于最低销售价，可按同行价。
   - 如客户预期价或客户提供供应商报价可接受，也可纳入推荐。
   - 报价不得低于成本价。
4. 报价行保存数量、单价、成本价快照、最低价快照。
5. 低于最低销售价的报价行标记 `needsAdminReview=true`，审核前不可导出、不可成交、也不纳入有效统计。
6. 报价单保存后自动写入系统跟进记录，并刷新客户归属。

### 5.4 报价成交与低价审核

1. 员工可在报价单明细中标记单个产品已成交/未成交。
2. 系统根据报价行状态自动刷新报价单状态：
   - 全部未成交：`pending`
   - 部分成交：`partial`
   - 全部成交：`done`
3. 员工改价后，如低于最低销售价，自动通知员工/管理员并进入低价审核。
4. 管理员可通过低价报价，低价特批价格标记 `specialApproved=true`、`priceEffective=false`。
5. 低价特批价格可以对外报价，但不纳入最近成交价、最近报价、统计参考。

### 5.5 客户申请报价

1. 客户浏览商品，只能看到建议销售价、零售价和商品基础信息。
2. 客户将商品加入报价申请清单，填写数量、预期单价。
3. 如果客户预期价低于建议价，必须填写至少一条其他供应商报价。
4. 客户提交后生成 `requestOrders` 和 `requestItems`，状态为 `submitted`。
5. 系统广播通知员工/管理员，并生成客户跟进系统记录。
6. 客户可在待审核状态下继续追加商品、调整数量/预期价、维护供应商报价、移除商品。

### 5.6 员工/管理员审核客户报价申请

1. 员工/管理员在申请审核列表查看待审核申请。
2. 审核详情按申请明细加载产品成本、最低价、建议价，并结合客户预期价、供应商报价、最近成交价、同行报价生成推荐价。
3. 审核人可以调整最终报价。
4. 普通员工接单时，如果存在低于最低销售价的报价行，生成报价单后进入管理员低价审核。
5. 管理员审核通过后，申请状态改为 `approved`，正式报价单生效，并通知客户。
6. 审核驳回时，申请状态改为 `rejected`，通知客户。

### 5.7 客户申请修改已有报价单

1. 客户在“我的报价”中对未成交报价单发起修改申请。
2. 系统把原报价单行转换为客户申请草稿，客户可调整数量、预期价、供应商报价。
3. 提交后生成 `requestType=modifyQuote` 的客户申请，并关联 `sourceQuoteOrderId`。
4. 员工/管理员审核通过后，更新原正式报价单。
5. 若修改产生低价，则仍进入低价审核流程。

### 5.8 客户申请成交状态变更

1. 客户在“我的报价”中对未成交报价单提交成交状态变更说明。
2. 系统发送站内通知给员工/管理员。
3. 同时向报价单跟进记录写入系统记录。
4. 员工在报价单中手动确认成交状态。

### 5.9 客户跟进与预警

1. 每次报价、客户申请、报价单变更、人工沟通都可写入 `follows`。
2. 已报价未成交客户要求每天跟进，超过 1 天预警。
3. 未报价客户要求 3 天内跟进，超过 3 天预警。
4. 跟进首页按预警优先、未跟进天数倒序展示。
5. 管理员统计员工跟进达成率、超期条数、已报价未跟进、未报价未跟进。

### 5.10 采购与成本同步

1. 员工创建采购单，选择供应商，填写总运费。
2. 保存采购单后添加产品采购明细。
3. 明细维护数量、采购价、分摊运费。
4. 系统按总数量平均分摊单件运费。
5. 保存明细或点击同步时，按采购价和分摊运费更新产品价格体系。

### 5.11 投诉建议与站内信

1. 客户提交投诉/建议，写入 `suggestions`。
2. 管理员在建议列表回复，保存 `reply`。
3. 客户报价申请、低价审核、申请结果、报价单变更等流程通过 `messages` 通知。
4. `threadId` 用于聚合同一业务会话。

### 5.12 报价导出与统计

1. 报价导出只包含可对外报价的报价行，即排除 `needsAdminReview=true` 的行。
2. 导出字段：序号、物品名称、规格、单位、单价、数量、合计、总计。
3. 管理员统计支持日期范围筛选和复制统计文本。
4. 统计口径排除无效低价特批价格。

## 6. 同步接口设计

### 6.1 总体原则

当前 `db.js` 暴露 `list/get/find/count/insert/update/remove/removeWhere/setAll`。后端同步建议保留同类数据访问语义，在前端增加 API 适配层：

- 在线优先：关键业务写操作直接请求后端，成功后更新本地缓存。
- 弱网兼容：写入本地队列，使用 `clientMutationId`、`baseUpdateTime` 做重试和冲突处理。
- 增量同步：所有实体保留 `_id`、`createTime`、`updateTime`、`deleted` 或删除墓碑。
- 权限前置：后端必须根据 token 角色过滤数据，不能依赖前端路由守卫。
- 价格、低价审核、成交统计等关键规则应在后端再次计算与校验。

### 6.2 通用数据结构

建议所有业务表统一返回：

```json
{
  "_id": "string",
  "createTime": 1717000000000,
  "updateTime": 1717000000000,
  "deleted": false
}
```

建议所有写接口支持：

```json
{
  "clientMutationId": "uuid",
  "baseUpdateTime": 1717000000000,
  "payload": {}
}
```

冲突响应：

```json
{
  "code": "CONFLICT",
  "serverRecord": {},
  "message": "记录已被其他端修改"
}
```

### 6.3 认证接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/auth/login/employee` | 员工/管理员手机号密码登录 |
| `POST` | `/api/auth/login/customer` | 客户手机号密码登录，校验 `approved` |
| `POST` | `/api/auth/login/wechat` | 微信登录/绑定手机号 |
| `POST` | `/api/auth/register/customer` | 客户注册，生成待审核客户 |
| `GET` | `/api/auth/me` | 当前用户信息 |
| `POST` | `/api/auth/logout` | 退出登录 |

登录响应建议：

```json
{
  "token": "jwt",
  "user": {
    "_id": "id",
    "role": "employee",
    "name": "张伟",
    "phone": "13800000001"
  }
}
```

### 6.4 增量同步接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/sync/bootstrap` | 首次拉取当前角色可见的基础数据、设置、未读消息 |
| `GET` | `/api/sync/changes?since=timestamp` | 拉取增量变更 |
| `POST` | `/api/sync/push` | 批量提交本地离线变更 |
| `GET` | `/api/sync/server-time` | 获取服务器时间，校准增量游标 |

`/api/sync/changes` 返回建议：

```json
{
  "serverTime": 1717001000000,
  "changes": {
    "customers": [],
    "products": [],
    "quoteOrders": [],
    "quoteItems": [],
    "messages": []
  },
  "deleted": {
    "customers": ["id1"],
    "quoteItems": ["id2"]
  }
}
```

### 6.5 档案与基础资料接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/employees` | 员工列表，管理员可用 |
| `POST` | `/api/employees` | 新增员工 |
| `PATCH` | `/api/employees/{id}` | 更新员工 |
| `DELETE` | `/api/employees/{id}` | 删除/停用员工，建议软删除 |
| `GET` | `/api/customers` | 客户列表，按角色过滤 |
| `POST` | `/api/customers` | 新增客户 |
| `PATCH` | `/api/customers/{id}` | 更新客户资料、归属、等级、审核状态 |
| `POST` | `/api/customers/{id}/approve` | 客户注册审核通过 |
| `GET` | `/api/suppliers` | 供应商列表 |
| `POST` | `/api/suppliers` | 新增供应商 |
| `PATCH` | `/api/suppliers/{id}` | 更新供应商 |
| `DELETE` | `/api/suppliers/{id}` | 删除供应商 |
| `GET` | `/api/competitors` | 同行列表 |
| `POST` | `/api/competitors` | 新增同行 |
| `PATCH` | `/api/competitors/{id}` | 更新同行 |
| `DELETE` | `/api/competitors/{id}` | 删除同行 |

### 6.6 产品、价格、同行报价接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/products` | 产品列表，支持 `keyword/category/attr` |
| `POST` | `/api/products` | 新增产品，校验名称唯一和规格必填 |
| `GET` | `/api/products/{id}` | 产品详情 |
| `PATCH` | `/api/products/{id}` | 更新产品 |
| `DELETE` | `/api/products/{id}` | 删除产品 |
| `POST` | `/api/products/calc-prices` | 按采购价和参数试算价格 |
| `GET` | `/api/products/{id}/price-history` | 最近成交价、最近报价、同行报价 |
| `GET` | `/api/settings/pricing` | 获取价格参数 |
| `PUT` | `/api/settings/pricing` | 保存价格参数 |
| `GET` | `/api/competitor-quotes?productId=` | 查询同行报价 |
| `POST` | `/api/competitor-quotes` | 新增同行报价 |
| `PATCH` | `/api/competitor-quotes/{id}` | 更新同行报价 |
| `DELETE` | `/api/competitor-quotes/{id}` | 删除同行报价 |

### 6.7 报价接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/quote-orders` | 报价单列表，员工只返回自己的，管理员返回全部 |
| `POST` | `/api/quote-orders` | 新建报价单 |
| `GET` | `/api/quote-orders/{id}` | 报价单详情，包含明细和跟进 |
| `PATCH` | `/api/quote-orders/{id}` | 更新报价单客户等头信息 |
| `DELETE` | `/api/quote-orders/{id}` | 删除报价单及明细 |
| `POST` | `/api/quote-orders/{id}/items` | 添加报价行 |
| `PATCH` | `/api/quote-items/{id}` | 更新数量、价格、成交状态 |
| `DELETE` | `/api/quote-items/{id}` | 删除报价行 |
| `POST` | `/api/quote-items/{id}/approve-special-price` | 管理员通过低价报价 |
| `POST` | `/api/quote-orders/{id}/refresh-status` | 刷新成交状态 |
| `POST` | `/api/quote/recommend` | 后端计算推荐报价 |
| `GET` | `/api/quote-orders/{id}/export` | 获取可导出的报价单数据/文件 |

推荐报价请求建议：

```json
{
  "productId": "product_id",
  "customerId": "customer_id",
  "qty": 1,
  "customerExpect": 10.5,
  "supplierQuotes": [{ "name": "其他供货商", "price": 10.2 }]
}
```

### 6.8 客户申请报价接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/request-orders` | 申请列表，客户看自己的，员工/管理员看待审核 |
| `POST` | `/api/request-orders` | 客户提交新报价申请或修改申请 |
| `GET` | `/api/request-orders/{id}` | 申请详情 |
| `PATCH` | `/api/request-orders/{id}` | 客户在待审核状态追加/更新申请，或审核方更新状态 |
| `DELETE` | `/api/request-orders/{id}` | 删除空申请或撤销申请 |
| `POST` | `/api/request-orders/{id}/items` | 添加申请明细 |
| `PATCH` | `/api/request-items/{id}` | 更新数量、预期价、供应商报价、审核报价 |
| `DELETE` | `/api/request-items/{id}` | 移除申请明细 |
| `POST` | `/api/request-orders/{id}/accept` | 员工接单，生成/关联正式报价单 |
| `POST` | `/api/request-orders/{id}/approve` | 审核通过，生成或更新正式报价单 |
| `POST` | `/api/request-orders/{id}/reject` | 驳回申请 |
| `POST` | `/api/request-orders/{id}/submit-admin-review` | 员工提交低价管理员审核 |
| `POST` | `/api/request-orders/{id}/approve-admin-review` | 管理员低价终审通过 |

### 6.9 跟进、消息、建议接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/follows` | 跟进列表，支持 `customerId/orderId/employeeId` |
| `POST` | `/api/follows` | 新增人工跟进 |
| `GET` | `/api/follows/warnings` | 跟进预警列表 |
| `GET` | `/api/messages` | 当前用户收件箱 |
| `POST` | `/api/messages/{id}/read` | 标记已读 |
| `GET` | `/api/messages/threads/{threadId}` | 会话消息 |
| `POST` | `/api/messages/threads/{threadId}` | 发送站内信 |
| `GET` | `/api/suggestions` | 建议列表，管理员 |
| `POST` | `/api/suggestions` | 客户提交建议 |
| `POST` | `/api/suggestions/{id}/reply` | 管理员回复 |

### 6.10 采购与统计接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/purchase-orders` | 采购列表 |
| `POST` | `/api/purchase-orders` | 新建采购单 |
| `GET` | `/api/purchase-orders/{id}` | 采购详情 |
| `PATCH` | `/api/purchase-orders/{id}` | 更新供应商、运费 |
| `DELETE` | `/api/purchase-orders/{id}` | 删除采购单及明细 |
| `POST` | `/api/purchase-orders/{id}/items` | 添加采购明细 |
| `PATCH` | `/api/purchase-items/{id}` | 更新数量、采购价、分摊运费 |
| `DELETE` | `/api/purchase-items/{id}` | 删除采购明细 |
| `POST` | `/api/purchase-orders/{id}/allocate-freight` | 按数量分摊运费 |
| `POST` | `/api/purchase-orders/{id}/sync-product-prices` | 同步更新产品价格 |
| `GET` | `/api/stats/dashboard` | 工作台统计 |
| `GET` | `/api/stats/admin` | 管理员统计 |
| `GET` | `/api/stats/follow` | 员工跟进统计 |
| `GET` | `/api/stats/performance` | 员工业绩排行、产品成交排行 |

## 7. 后端开发清单

### 7.1 基础设施

- 建立后端业务表，字段覆盖本文第 3 节实体。
- 所有表增加 `id/_id`、`create_time`、`update_time`、`deleted`、`version`。
- 密码使用安全哈希，不保存明文密码。
- 实现 JWT/Session 鉴权，区分 `admin`、`employee`、`customer`。
- 后端统一权限过滤，禁止客户越权读取其他客户报价和申请。
- 实现全局异常、参数校验、幂等写入、操作日志。
- 建立文件/CSV 导出能力，报价单导出采用固定模板。

### 7.2 数据模型与约束

- `employees.phone` 唯一；停用员工不可登录。
- `customers.phone` 唯一；`approved=false` 不可登录。
- `products.name` 唯一；`products.spec` 必填。
- 报价行不得低于成本价。
- 低于最低销售价时必须进入低价审核。
- 低价特批通过的 `quoteItems.priceEffective=false`，不纳入最近成交/报价参考和业绩统计。
- 删除报价单时同步删除或软删除报价行。
- 删除采购单时同步删除或软删除采购行。
- 客户申请单无明细时可自动撤销/删除。

### 7.3 业务服务

- 价格计算服务：采购价、税费、运费、配送费、成本价、最低价、建议价、零售价。
- 推荐报价服务：综合建议价、最低价、成本价、最近成交价、同行报价、客户预期价、客户供应商报价。
- 报价单服务：创建、编辑、成交状态刷新、导出、低价审核。
- 客户申请服务：提交、追加、修改、审核、驳回、接单、管理员低价终审。
- 跟进服务：人工跟进、系统跟进、报价单时间线、客户时间线。
- 客户归属服务：按报价单数量自动判定客户私盘负责人。
- 消息服务：员工广播、客户定向通知、会话线程、未读数。
- 采购服务：运费分摊、采购价格同步产品价格。
- 统计服务：工作台、跟进达成率、员工业绩、产品成交排行、客户/报价/成交概览。

### 7.4 同步层

- 实现 `/api/sync/bootstrap` 和 `/api/sync/changes`。
- 支持客户端离线写入队列 `/api/sync/push`。
- 所有写操作支持 `clientMutationId` 幂等。
- 使用 `updateTime` 或 `version` 做冲突检测。
- 删除使用软删除或删除墓碑，确保其他端可同步删除。
- 客户侧只同步自己的报价、申请、消息、建议；员工侧按权限同步客户、报价、跟进等。
- 关键业务写入后返回受影响实体集合，便于客户端一次更新缓存。

### 7.5 管理端开发清单

- 登录页：员工/管理员登录。
- 工作台：总客户数、待审核客户、报价单数、成交金额、待审核报价申请、待回复建议、低价待审核。
- 员工管理：新增、编辑、停用、重置密码、角色设置。
- 客户管理：客户资料、等级、公盘/私盘、负责人、注册审核、客户报价/成交/跟进历史。
- 供应商管理：供应商档案增删改查。
- 同行管理：同行档案和同行报价维护。
- 产品管理：产品基础信息、辅助属性、单位换算、价格、价格历史、同行报价。
- 价格参数管理：税费、配送费、运费、销售价系数配置。
- 报价管理：报价单列表、详情、报价行编辑、成交状态、低价审核、导出。
- 客户申请审核：新报价申请、修改报价申请、接单、驳回、低价管理员终审、通知客户。
- 跟进管理：预警列表、客户跟进详情、员工跟进达成率。
- 采购管理：采购单、采购明细、运费分摊、同步产品价格。
- 投诉建议：列表、回复、消息通知。
- 统计分析：日期筛选、员工业绩、产品成交排行、跟进统计、导出。
- 消息中心：广播通知、客户会话、业务线程消息。

### 7.6 客户端联调清单

- 替换 `store/db.js` 或新增 API 层，保持页面调用改动最小。
- 登录后保存 token 与用户信息，替代 `sqms_session`。
- 客户购物车草稿可继续保留本地；提交时调用后端生成申请单。
- 所有列表页面接入分页/筛选参数，避免全量拉取。
- 消息、申请审核、低价审核需要刷新未读数和工作台数字。
- 报价推荐、价格计算、低价判定必须以后端返回结果为准。
- 离线/弱网情况下明确提示用户数据待同步状态。

## 8. 优先级建议

1. 先落地账号、角色、客户/员工/产品/价格参数基础表。
2. 再落地报价单、报价行、推荐报价、低价审核。
3. 接着落地客户申请报价与正式报价单转换。
4. 然后补齐跟进、消息、客户归属、投诉建议。
5. 最后落地采购成本同步、统计分析、增量同步和离线队列。
