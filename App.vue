<script>
	import { ensureSeed } from '@/store/seed.js'
	import { bootstrapRemoteSync } from '@/store/sync.js'
	export default {
		onLaunch: async function() {
			// 首次启动写入演示数据
			ensureSeed()
			await bootstrapRemoteSync()
		},
		onShow: function() {},
		onHide: function() {}
	}
</script>

<style lang="scss">
/* ============ 全局样式 / 设计系统 ============ */
page {
	background-color: #f2f4f8;
	color: #1f2937;
	font-size: 28rpx;
	font-family: -apple-system, "PingFang SC", "Helvetica Neue", Helvetica, "Microsoft YaHei", Arial, sans-serif;
}
view, text, input, textarea, scroll-view { box-sizing: border-box; }

/* 主题色 */
$primary: #2563eb;
$danger: #ef4444;
$success: #16a34a;
$warning: #f59e0b;

.page { min-height: 100vh; padding-bottom: 40rpx; }
.sub-hero { margin: 20rpx 24rpx 12rpx; padding: 28rpx; border-radius: 24rpx; background: linear-gradient(135deg, #2563eb, #1e40af); color: #fff; box-shadow: 0 14rpx 34rpx rgba(37, 99, 235, 0.18); }
.sub-hero-title { color: #f8fbff; font-size: 36rpx; font-weight: 800; }
.sub-hero-desc { display: block; color: rgba(248,251,255,0.82); font-size: 24rpx; margin-top: 10rpx; line-height: 1.5; }
.metric-row { display: flex; flex-direction: row; gap: 16rpx; margin-top: 24rpx; }
.metric-pill { flex: 1; padding: 18rpx; border-radius: 18rpx; background: rgba(255,255,255,0.14); }
.metric-num { display: block; color: #f8fbff; font-size: 34rpx; font-weight: 800; }
.metric-label { display: block; color: rgba(248,251,255,0.76); font-size: 22rpx; margin-top: 4rpx; }
.toolbar { display: flex; flex-direction: row; align-items: center; gap: 14rpx; padding: 18rpx 24rpx; background: #fff; }
.toolbar-search { flex: 1; height: 78rpx; line-height: 78rpx; background: #f3f6fb; border-radius: 999rpx; padding: 0 28rpx; font-size: 27rpx; border: 1rpx solid #e8edf5; }
.list-card { background: #fff; border-radius: 22rpx; padding: 26rpx; margin: 16rpx 24rpx; box-shadow: 0 8rpx 24rpx rgba(17, 24, 39, 0.05); }
.meta-line { display: block; font-size: 25rpx; color: #667085; margin-top: 10rpx; line-height: 1.5; }
.sub-empty { margin: 34rpx 24rpx; padding: 80rpx 34rpx; border-radius: 24rpx; background: #fff; text-align: center; color: #98a2b3; font-size: 28rpx; box-shadow: 0 8rpx 24rpx rgba(17, 24, 39, 0.04); }
.inline-action { color: #2563eb; font-size: 26rpx; font-weight: 600; }

/* 卡片 */
.card {
	background: #fff;
	border-radius: 20rpx;
	padding: 28rpx;
	margin: 20rpx 24rpx;
	box-shadow: 0 4rpx 20rpx rgba(17, 24, 39, 0.04);
}
.card-tight { padding: 20rpx 24rpx; }

/* 文本 */
.t-title { font-size: 32rpx; font-weight: 700; color: #111827; }
.t-sub { font-size: 26rpx; color: #6b7280; }
.t-muted { color: #9ca3af; font-size: 24rpx; }
.t-primary { color: #2563eb; }
.t-danger { color: #ef4444; }
.t-success { color: #16a34a; }
.t-warning { color: #f59e0b; }
.t-bold { font-weight: 700; }
.t-price { color: #ef4444; font-weight: 700; }
.t-lg { font-size: 36rpx; }
.t-xl { font-size: 44rpx; }

/* 布局 */
.row { display: flex; flex-direction: row; align-items: center; }
.row-between { display: flex; flex-direction: row; align-items: center; justify-content: space-between; }
.col { display: flex; flex-direction: column; }
.flex1 { flex: 1; }
.wrap { flex-wrap: wrap; }
.gap-s { gap: 12rpx; }
.gap-m { gap: 20rpx; }
.mt-s { margin-top: 12rpx; } .mt-m { margin-top: 20rpx; } .mt-l { margin-top: 32rpx; }
.mb-s { margin-bottom: 12rpx; } .mb-m { margin-bottom: 20rpx; }

/* 按钮 */
.btn {
	display: flex; align-items: center; justify-content: center;
	height: 84rpx; border-radius: 16rpx; font-size: 30rpx; font-weight: 600;
	background: #2563eb; color: #fff; border: none;
}
.btn::after { border: none; }
.btn-block { width: 100%; }
.btn-ghost { background: #eef2ff; color: #2563eb; }
.btn-danger { background: #ef4444; }
.btn-gray { background: #f3f4f6; color: #4b5563; }
.btn-sm { height: 60rpx; font-size: 26rpx; padding: 0 24rpx; border-radius: 12rpx; }
.btn[disabled] { opacity: 0.5; }

/* 标签徽章 */
.tag {
	display: inline-flex; align-items: center; justify-content: center;
	padding: 4rpx 16rpx; border-radius: 999rpx; font-size: 22rpx; line-height: 1.6;
}
.tag-blue { background: #e0edff; color: #2563eb; }
.tag-green { background: #dcfce7; color: #16a34a; }
.tag-red { background: #fee2e2; color: #ef4444; }
.tag-orange { background: #ffedd5; color: #ea580c; }
.tag-gray { background: #f3f4f6; color: #6b7280; }

/* 列表项 */
.list-item {
	background: #fff; padding: 28rpx 24rpx; margin-bottom: 2rpx;
	display: flex; flex-direction: row; align-items: center; justify-content: space-between;
}
.divider { height: 1rpx; background: #f0f1f4; margin: 16rpx 0; }

/* 表单 */
.field { display: flex; flex-direction: row; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.field-label { width: 180rpx; color: #6b7280; font-size: 28rpx; }
.field-input { flex: 1; text-align: right; font-size: 28rpx; }
.field-col { display: flex; flex-direction: column; padding: 20rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.input-box { background: #f7f8fa; border-radius: 12rpx; padding: 20rpx 24rpx; font-size: 28rpx; border: 1rpx solid #eef1f6; color: #1f2937; }
input.input-box { height: 88rpx; line-height: 88rpx; padding: 0 24rpx; }
textarea.input-box { line-height: 1.6; }

/* 空状态 */
.empty { text-align: center; color: #9ca3af; padding: 120rpx 0; font-size: 28rpx; }

/* 悬浮新增按钮 */
.fab {
	position: fixed; right: 40rpx; bottom: 60rpx; z-index: 99;
	width: 104rpx; height: 104rpx; border-radius: 50%;
	background: #2563eb; color: #fff; font-size: 56rpx;
	display: flex; align-items: center; justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.4);
}

/* 统计卡片网格 */
.stat-grid { display: flex; flex-wrap: wrap; }
.stat-cell { width: 50%; padding: 16rpx; box-sizing: border-box; }
.stat-inner { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.stat-num { font-size: 44rpx; font-weight: 700; color: #111827; }
.stat-label { font-size: 24rpx; color: #6b7280; margin-top: 8rpx; }
</style>
