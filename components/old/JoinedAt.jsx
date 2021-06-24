/*
 * Copyright (c) 2020-2021 Juby210
 * Licensed under the Open Software License version 3.0
 */

const { React } = require('powercord/webpack')
const { AsyncComponent } = require('powercord/components')

const Utils = require('../../utils')

module.exports = ({ guildId, id, popout, getSetting }) => <AsyncComponent _provider={async () => {
    Utils.createCache(guildId, id)
    const c = Utils.cache[guildId][id]
    const joinedAt = c.joinedAt || await Utils.fetchJoinedAt(guildId, id)
    return () => <div>Joined at: {Utils.dateToString(getSetting, joinedAt, popout)}</div>
}} />
