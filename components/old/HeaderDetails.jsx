/*
 * Copyright (c) 2020-2021 Juby210
 * Licensed under the Open Software License version 3.0
 */

const { React, getModule } = require('powercord/webpack')

const { textRow } = getModule(['textRow'], false) || {}

const JoinedAt = require('./JoinedAt')
const MessageDate = require('./MessageDate')
const Utils = require('../../utils')

module.exports = ({ user, guildId, popout, settings, updatePosition }) => <div className={`user-details-text ${textRow} ${popout ? '' : 'user-details-modal'}`}>
    {settings.createdAt ? <div>Created at: {Utils.dateToString(settings.get, user.createdAt, popout)}</div> : null}
    {guildId && guildId !== '@me' && user.discriminator !== '0000' && settings.joinedAt ? <JoinedAt guildId={guildId} id={user.id} popout={popout} getSetting={settings.get} updatePosition={updatePosition} /> : null}
    {user.discriminator !== '0000' && settings.lastMessage ? <MessageDate guildId={guildId} id={user.id} popout={popout} getSetting={settings.get} updatePosition={updatePosition} /> : null}
</div>
