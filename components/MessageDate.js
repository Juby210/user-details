/*
 * Copyright (c) 2020-2021 Juby210
 * Licensed under the Open Software License version 3.0
 */

const { React, channels, getModule } = require('powercord/webpack')

const { getCurrentUser } = getModule(['getCurrentUser'], false) || {}
const { getChannel } = getModule(['getChannel'], false) || {}

const Utils = require('../utils')

module.exports = class MessageDate extends React.PureComponent {
    constructor(props) {
        super(props)

        this.props.channelId = channels.getChannelId()
        this.props.dontFetch = !this.props.guildId && (getCurrentUser().id !== this.props.id && (!getChannel(this.props.channelId) || !getChannel(this.props.channelId).recipients.includes(user.id)))
        
        const guildOrChannel = this.props.guildId || this.props.channelId
        Utils.createCache(guildOrChannel, this.props.id)
        const c = Utils.cache[guildOrChannel][this.props.id]
        this.state = { lastMessage: this.props.dontFetch ? '-' : c.lastMessage, firstMessage: this.props.dontFetch ? '-' : c.firstMessage, firstMessageSelected: props.getSetting('defaultFirstMessage') }
    }

    async componentDidMount() {
        const { id, guildId, channelId } = this.props
        if (!this.state.firstMessageSelected && !this.state.lastMessage) {
            const guildOrChannel = guildId || channelId
            const c = Utils.cache[guildOrChannel][id]
            const lastMessage = c.lastMessage || await Utils.searchFirstHitDate(id, guildOrChannel, !guildId)
            c.lastMessage = lastMessage
            this.setState({ lastMessage })
        } else if (this.state.firstMessageSelected && !this.state.firstMessage) {
            const guildOrChannel = guildId || channelId
            const c = Utils.cache[guildOrChannel][id]
            const firstMessage = c.firstMessage || await Utils.searchFirstHitDate(id, guildOrChannel, !guildId, true)
            c.firstMessage = firstMessage
            this.setState({ firstMessage })
        }
    }
    componentDidUpdate = this.componentDidMount

    render() {
        if (!this.state.firstMessageSelected && !this.state.lastMessage ||
            this.state.firstMessageSelected && !this.state.firstMessage
        ) return null

        if (this.state.firstMessageSelected) return React.createElement('div', this.props.dontFetch ? null : {
            style: { cursor: 'pointer' },
            onClick: () => this.setState({ firstMessageSelected: false })
        }, `First message: ${Utils.dateToString(this.props.getSetting, this.state.firstMessage, this.props.popout)}`)
        return React.createElement('div', this.props.dontFetch ? null : {
            style: { cursor: 'pointer' },
            onClick: () => this.setState({ firstMessageSelected: true })
        }, `Last message: ${Utils.dateToString(this.props.getSetting, this.state.lastMessage, this.props.popout)}`)
    }
}
