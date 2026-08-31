# Apron · 美国机场接送调度原型

按甲方功能清单做的可走查原型：预约专车 + 客服调度，不是路边即时抢单。

## GitHub Pages

👉 **https://cryangle0.github.io/wangyueche/**

## 本地预览

用浏览器打开 `index.html`，或：

```bash
npx serve .
```

## 给客户看什么

- **乘客 / 司机 / 客服**：桌面里的手机模拟窗口
- **管理后台**：桌面布局
- **中 / EN / ES** 随时切换，四端共用一份 `localStorage` 数据

产品名 **Apron**（机坪）：航班落地后在廊桥外接人。交互参考开源项目 [OpenRide](https://github.com/adam-nelson/openride) 的 rider / driver / admin 分端与 MapLibre 路网，以及 [Complete Taxi Booking](https://github.com/blinks32/Complete-Taxi-Booking-Parcel-Delivery-Solution) 的调度台与机场预约桌。站点结构对齐 [锐涞经销商管理系统](https://cryangle0.github.io/ruilai/)：静态页 + 手机框。地图用 OpenStreetMap 矢量底图 + OSRM 驾车路线（演示无 Google 账单 Key；生产接 Google Maps 路况）。

## 建议走查路径

1. 门户选 **乘客端**，验证码 `888888` 进入 → 洛杉矶、LAX → 市中心、航班 `UA456`、看预估（里程 / 预约费 / 行李）→ Stripe/PayPal/Wise/Revolut → 提交，状态为 **待调度**
2. 顶栏切 **客服调度** → AI 预匹配（真实 GPS 距离）→ 派给 Maya → 可批量匹配、临期重排、同步航班、航班重排
3. 顶栏切 **司机端** → 出车 / 新派单弹窗 → 接或填拒单原因 → 到达上车点 → 看从 **实际落地** 起算的 105 分钟免费等候钟 → 申请超时费；导航跳转 Google Maps
4. 切回 **乘客端** 打开同一单 → 真实路线图、**确认并继续等候** 或 **拒绝**；拒绝后司机可 **No-show 关单** 并生成证据包（到场时间、等候日志、沟通、GPS）；可投诉、评价、电子收据
5. **管理后台**：7 日看板、订单导出/退款、No-show 证据审核、投诉工单回复、司机等级/停用、105 分钟与超时费、Stripe/PayPal、CCPA

演示时钟固定在 **2026-08-31 10:40 PDT**。芝加哥为未开通城市，选中后不可下单。

## 仓库

| 路径 | 说明 |
|------|------|
| `index.html` | 入口 |
| `assets/` | 样式、多语言、交互 |
| 甲方清单里的航班落地数据源、手动派单是否保留，原型里按「AI 只推荐、客服确认」处理 |

演示不接真实 Google Maps / 支付 / FlightAware，地图与落地时间为可点演示数据。
