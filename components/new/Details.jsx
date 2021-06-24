/*
 * Copyright (c) 2020-2021 Juby210
 * Licensed under the Open Software License version 3.0
 */

const { React } = require('powercord/webpack')

const Item = require('./Item')
const JoinedAt = require('./JoinedAt')
const MessageDate = require('./MessageDate')
const Utils = require('../../utils')

module.exports = ({ user, guildId, popout, settings }) => {
    const Component = popout ? React.Fragment : ({ children }) => <div className='user-details'>{children}</div>
    return <Component>
        {settings.createdAt ? <Item header='Created at'>{Utils.dateToString(settings.get, user.createdAt, popout)}</Item> : null}
        {guildId && guildId !== '@me' && user.discriminator !== '0000' && settings.joinedAt ? <JoinedAt guildId={guildId} id={user.id} popout={popout} getSetting={settings.get} /> : null}
        {user.discriminator !== '0000' && settings.lastMessage ? <MessageDate guildId={guildId} id={user.id} popout={popout} getSetting={settings.get} /> : null}
    </Component>
}
