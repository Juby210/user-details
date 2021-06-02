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

        const channelId = channels.getChannelId()
        const gid = this.props.guildId === '@me' ? null : this.props.guildId
        const guildOrChannel = gid || channelId
        Utils.createCache(guildOrChannel, this.props.id)
        const c = Utils.cache[guildOrChannel][this.props.id]
        const dontFetch = !gid && (getCurrentUser().id !== this.props.id && (!getChannel(channelId) || !getChannel(channelId).recipients.includes(this.props.id)))

        this.state = {
            lastMessage: this.props.dontFetch ? '-' : c.lastMessage,
            firstMessage: this.props.dontFetch ? '-' : c.firstMessage,
            firstMessageSelected: props.getSetting('defaultFirstMessage'),
            channelId, dontFetch
        }
    }

    async componentDidMount() {
        const { id, guildId } = this.props
        const { channelId } = this.state
        const gid = guildId === '@me' ? null : guildId
        if (!this.state.firstMessageSelected && !this.state.lastMessage) {
            const guildOrChannel = gid || channelId
            Utils.createCache(guildOrChannel, id)
            const c = Utils.cache[guildOrChannel][id]
            const lastMessage = c.lastMessage || await Utils.searchFirstHitDate(id, guildOrChannel, !gid)
            c.lastMessage = lastMessage
            this.setState({ lastMessage })
        } else if (this.state.firstMessageSelected && !this.state.firstMessage) {
            const guildOrChannel = gid || channelId
            Utils.createCache(guildOrChannel, id)
            const c = Utils.cache[guildOrChannel][id]
            console.log('a', guildOrChannel, id)
            const firstMessage = c.firstMessage || await Utils.searchFirstHitDate(id, guildOrChannel, !gid, true)
            c.firstMessage = firstMessage
            this.setState({ firstMessage })
        }
    }
    componentDidUpdate = this.componentDidMount

    render() {
        if (!this.state.firstMessageSelected && !this.state.lastMessage ||
            this.state.firstMessageSelected && !this.state.firstMessage
        ) return null

        if (this.state.firstMessageSelected) return React.createElement('div', this.state.dontFetch ? null : {
            style: { cursor: 'pointer' },
            onClick: () => this.setState({ firstMessageSelected: false })
        }, `First message: ${Utils.dateToString(this.props.getSetting, this.state.firstMessage, this.props.popout)}`)
        return React.createElement('div', this.state.dontFetch ? null : {
            style: { cursor: 'pointer' },
            onClick: () => this.setState({ firstMessageSelected: true })
        }, `Last message: ${Utils.dateToString(this.props.getSetting, this.state.lastMessage, this.props.popout)}`)
    }
}
