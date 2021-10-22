/*
 * Copyright (c) 2020-2021 Juby210
 * Licensed under the Open Software License version 3.0
 */

const { React, channels, getModule } = require('powercord/webpack')
const { getCurrentUser } = getModule(['getCurrentUser'], false) || {}
const { getChannel } = getModule(['getChannel', 'getDMFromUserId'], false) || {}

const Item = require('./Item')
const Utils = require('../../utils')

module.exports = ({ guildId, id, popout, getSetting }) => {
    const channelId = channels.getChannelId()
    const gid = guildId === '@me' ? null : guildId
    const guildOrChannel = gid || channelId
    Utils.createCache(guildOrChannel, id)
    const c = Utils.cache[guildOrChannel][id]
    const dontFetch = !gid && (getCurrentUser().id !== id && (!getChannel(channelId) || !getChannel(channelId).recipients.includes(id)))

    const [ firstMessageSelected, setFirstMessageSelected ] = React.useState(getSetting('defaultFirstMessage'))
    const [ firstMessage, setFirstMessage ] = React.useState(c.firstMessage)
    const [ lastMessage, setLastMessage ] = React.useState(c.lastMessage)

    if (firstMessageSelected) {
        if (dontFetch) return <Item header='First message'>{Utils.dateToString(getSetting, firstMessage, popout)}</Item>
        if (!firstMessage) {
            Utils.searchFirstHitDate(id, guildOrChannel, !gid, true).then(a => {
                c.firstMessage = a
                setFirstMessage(a)
            })
            return null
        }
        return <Item header='First message' onClick={() => setFirstMessageSelected(false)}>
            {Utils.dateToString(getSetting, firstMessage, popout)}
        </Item>
    }

    if (dontFetch) return <Item header='Last message'>{Utils.dateToString(getSetting, lastMessage, popout)}</Item>
    if (!lastMessage) {
        Utils.searchFirstHitDate(id, guildOrChannel, !gid).then(a => {
            c.lastMessage = a
            setLastMessage(a)
        })
        return null
    }
    return <Item header='Last message' onClick={() => setFirstMessageSelected(true)}>
        {Utils.dateToString(getSetting, lastMessage, popout)}
    </Item>
}
