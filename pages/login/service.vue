<template>
	<view class="legal-page">
		<view class="legal-card">
			<text class="legal-title">用户服务协议</text>
			<text class="legal-date">生效日期：2026年7月5日</text>

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
					title: '一、服务内容',
					lines: [
						'本小程序用于企业内部销售报价、客户报价申请、客户跟进、站内消息、采购申请和成本管控等业务协作。',
						'内部员工、管理员和已审核客户可按分配权限使用对应功能。'
					]
				},
				{
					title: '二、账号注册与登录',
					lines: [
						'员工账号由管理员开通；客户注册时需提交姓名、手机号、公司名称（选填）和登录密码，审核通过后可使用手机号和密码登录。',
						'用户应确保提交信息真实、准确，并妥善保管账号密码。因用户主动泄露或保管不当造成的损失，由用户自行承担。'
					]
				},
				{
					title: '三、用户行为规范',
					lines: [
						'用户不得冒用他人身份，不得提交虚假报价、恶意干扰系统、上传违法违规内容，或将账号提供给无关人员使用。',
						'用户在系统中提交的报价、申请、跟进、消息等内容应与真实业务相关。'
					]
				},
				{
					title: '四、数据使用与管理',
					lines: [
						'系统会根据业务需要保存用户填写或使用功能产生的信息，用于账号识别、业务流转、报价沟通、审核追溯和售后联系。',
						'管理员可根据企业管理需要审核、停用或删除账号，并维护业务数据。采购记录等经营记录可能因财务或业务追溯需要继续保留。'
					]
				},
				{
					title: '五、服务变更与中止',
					lines: [
						'为改进系统功能、保障安全或满足管理要求，系统可能进行功能调整、维护或暂停部分服务。',
						'如用户违反本协议或影响系统安全，管理员可限制或停止其使用权限。'
					]
				},
				{
					title: '六、联系方式',
					lines: [
						'如对账号、报价、数据更正或删除有疑问，可通过小程序内“联系我们”、站内信或企业管理员处理。'
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
.section { margin-top: 34rpx; }
.section-title { display: block; color: #26364d; font-size: 29rpx; font-weight: 800; margin-bottom: 12rpx; }
.section-text { display: block; color: #475467; font-size: 26rpx; line-height: 1.75; margin-top: 8rpx; }
</style>
