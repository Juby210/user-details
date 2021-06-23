/*
 * Copyright (c) 2020-2021 Juby210
 * Licensed under the Open Software License version 3.0
 */

const { Plugin } = require('powercord/entities')
const { findInReactTree } = require('powercord/util')
const { getModule, React, FluxDispatcher } = require('powercord/webpack')
const { inject, uninject } = require('powercord/injector')

const Utils = require('./utils')
const Settings = require('./components/Settings')
const Details = require('./components/UserDetails')

module.exports = class UserDetails extends Plugin {
    async startPlugin() {
        powercord.api.settings.registerSettings(this.entityID, {
            category: this.entityID, label: 'User Details', render: Settings })
        this.loadStylesheet('style.css')

        const { getGuildId } = await getModule(['getLastSelectedGuildId'])

        // pain.
        const UserPopoutContainer = await getModule(m => m.type && m.type.displayName === 'UserPopoutContainer')
        inject('user-details', UserPopoutContainer, 'type', (_, ret) => {
            if (!this.settings.get('profilePopout', true)) return res
            const UserPopout = ret.type
            ret.type = (...e) => {
                const r = UserPopout(...e)
                const infoParent = findInReactTree(r, c => c?.type?.displayName === 'UserPopoutInfo')
                if (!infoParent) return r
                const UserPopoutInfo = infoParent.type
                infoParent.type = (...args) => {
                    const res = UserPopoutInfo(...args)
                    if (Array.isArray(res?.props?.children)) res.props.children.splice(2, 0, React.createElement(Details, {
                        user: args[0].user,
                        guildId: getGuildId(),
                        popout: true,
                        settings: {
                            createdAt: this.settings.get('createdAt', true),
                            joinedAt: this.settings.get('joinedAt', true),
                            lastMessage: this.settings.get('lastMessage', true),
                            get: this.settings.get
                        }
                    }))
                    return res
                }
                Object.assign(infoParent.type, UserPopoutInfo)
                return r
            }
            Object.assign(ret.type, UserPopout)
            return ret
        })
        UserPopoutContainer.type.displayName = 'UserPopoutContainer'

        const UserProfileModalHeader = await getModule(m => m.default && m.default.displayName === 'UserProfileModalHeader')
        inject('user-details-modal', UserProfileModalHeader, 'default', ([{ user }], res) => {
            if (!this.settings.get('profileModal', true)) return res
            const children = findInReactTree(res, a => Array.isArray(a) && a.find(c => c?.type?.displayName === 'DiscordTag'))
            if (children != null) children.splice(3, 0, React.createElement(Details, {
                user,
                guildId: getGuildId(),
                settings: {
                    createdAt: this.settings.get('createdAt', true),
                    joinedAt: this.settings.get('joinedAt', true),
                    lastMessage: this.settings.get('lastMessage', true),
                    get: this.settings.get
                }
            }))
            return res
        })
        UserProfileModalHeader.default.displayName = 'UserProfileModalHeader'

        FluxDispatcher.subscribe('GUILD_MEMBERS_CHUNK', this.onMembersUpdate = data => {
            if (!data?.members?.length) return
            data.members.forEach(m => {
                Utils.createCache(data.guildId, m.user.id)
                Utils.cache[data.guildId][m.user.id].joinedAt = m.joined_at ? new Date(m.joined_at) : '-'
            })
        })

        FluxDispatcher.subscribe('MESSAGE_CREATE', this.onMessage = m => {
            if (!this.settings.get('lastMessage', true) || !m.message) return
            const msg = m.message, gid = msg.guild_id ? msg.guild_id : msg.channel_id
            Utils.createCache(gid, msg.author.id)
            Utils.cache[gid][msg.author.id].lastMessage = new Date(msg.timestamp)
        })
    }

    pluginWillUnload() {
        powercord.api.settings.unregisterSettings(this.entityID)
        uninject('user-details')
        uninject('user-details-modal')

        if (this.onMembersUpdate) FluxDispatcher.unsubscribe('GUILD_MEMBERS_CHUNK', this.onMembersUpdate)
        if (this.onMessage) FluxDispatcher.unsubscribe('MESSAGE_CREATE', this.onMessage)
    }
}
