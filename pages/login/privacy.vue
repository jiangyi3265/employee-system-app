<template>
	<view class="legal-page">
		<view class="legal-card">
			<text class="legal-title">隐私政策</text>
			<text class="legal-date">生效日期：2026年7月5日</text>
			<text class="legal-intro">本政策说明本小程序收集、使用和存储用户信息的目的、方式和用途。请在勾选同意后再填写手机号、密码或提交注册资料。</text>

			<view class="section" v-for="item in sections" :key="item.title">
				<text class="section-title">{{ item.title }}</text>
				<text class="section-text" v-for="line in item.lines" :key="line">{{ line }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			sections: [
				{
					title: '一、我们收集的信息',
					lines: [
						'账号信息：姓名、手机号、公司名称（选填）、登录密码、角色、账号状态。',
						'微信登录信息：用户主动使用微信登录或绑定微信时，我们会通过微信接口获取用于识别账号的 openid、unionid（如微信返回）和绑定时间。',
						'业务信息：报价申请、报价单、报价明细、客户跟进、采购申请、站内消息、投诉建议、联系人信息及用户主动填写的其它业务内容。',
						'安全与运行信息：为保障系统安全和排查问题，服务器可能记录登录时间、请求时间、操作结果等必要运行信息。'
					]
				},
				{
					title: '二、收集方式',
					lines: [
						'用户主动填写：包括注册、登录、报价申请、投诉建议、站内消息等页面中填写的信息。',
						'使用功能产生：包括报价、跟进、采购申请、审核处理、消息往来等业务流程中形成的信息。',
						'授权接口返回：仅在用户主动点击微信登录、微信绑定等功能后，通过微信接口获取必要账号标识。'
					]
				},
				{
					title: '三、使用目的和用途',
					lines: [
						'手机号用于账号注册、登录验证、管理员审核、客户或员工身份识别以及必要业务联系。',
						'姓名、公司和角色信息用于区分客户、员工、管理员身份，并在报价、跟进、消息和审核流程中展示。',
						'报价、跟进、采购和消息数据用于完成销售报价管理、成本控制、业务追溯、客户服务和内部协作。',
						'微信账号标识用于实现微信登录、账号绑定、避免重复绑定和账号安全校验。'
					]
				},
				{
					title: '四、存储与保护',
					lines: [
						'用户信息和业务数据会存储在本小程序后台服务及必要的本地缓存中，用于持续提供业务服务。',
						'我们会采取合理的权限控制和安全措施保护信息，限制无关人员访问。',
						'请妥善保管账号密码，不要将账号借给他人使用。'
					]
				},
				{
					title: '五、共享与委托处理',
					lines: [
						'除实现微信登录、绑定所必需的微信平台能力以及服务器运行服务外，我们不会主动向无关第三方出售或非法提供用户个人信息。',
						'如因法律法规、监管要求或维护系统安全需要提供相关信息，我们会在必要范围内处理。'
					]
				},
				{
					title: '六、用户权利',
					lines: [
						'用户可联系企业管理员查询、更正、停用或删除账号信息。',
						'为满足业务、财务、审计或纠纷处理需要，部分已产生的报价、采购、跟进等经营记录可能依法依规继续保留。'
					]
				},
				{
					title: '七、未成年人保护',
					lines: [
						'本小程序面向企业业务协作场景，不主动面向未成年人提供服务。如未成年人需要使用，应在监护人同意和指导下进行。'
					]
				},
				{
					title: '八、联系我们',
					lines: [
						'如对个人信息处理有疑问，或需要查询、更正、删除相关信息，可通过小程序内“联系我们”、站内信或企业管理员反馈处理。'
					]
				}
			]
		}
	}
}
</script>

<style lang="scss" scoped>
.legal-page { min-height: 100vh; background: #f2f4f8; padding: 28rpx 24rpx 48rpx; }
.legal-card { background: #fbfcff; border-radius: 20rpx; padding: 34rpx 30rpx; border: 1rpx solid #e8edf5; }
.legal-title { display: block; color: #1f2937; font-size: 38rpx; font-weight: 800; line-height: 1.3; }
.legal-date { display: block; margin-top: 10rpx; color: #7f8ea3; font-size: 24rpx; }
.legal-intro { display: block; margin-top: 22rpx; color: #475467; font-size: 26rpx; line-height: 1.75; }
.section { margin-top: 34rpx; }
.section-title { display: block; color: #26364d; font-size: 29rpx; font-weight: 800; margin-bottom: 12rpx; }
.section-text { display: block; color: #475467; font-size: 26rpx; line-height: 1.75; margin-top: 8rpx; }
</style>
