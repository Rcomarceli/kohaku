const { setMember, userDetails } = require('../index');
// console.log(userStuff)
module.exports = {
	name: 'voiceStateUpdate',
	async execute(oldState, newState) {
        if (oldState.member.user.bot) return;
        const tempuser = userDetails.get(oldState.member.id);
        if (!tempuser) return console.log('cant find tempuser. returning');
        if (newState.channelId != oldState.channelId) setMember(newState.member);
        // console.log('old state is: ', oldState);
        // console.log('new state is: ', newState);
	},
};