/*
 * Copyright (c) 2020-2021 Juby210
 * Licensed under the Open Software License version 3.0
 */

const { Plugin } = require('powercord/entities')
const { findInReactTree } = require('powercord/util')
const { getModule, getModuleByDisplayName, React, FluxDispatcher } = require('powercord/webpack')
const { inject, uninject } = require('powercord/injector')

const Utils = require('./utils')
const Settings = require('./components/Settings')
const Details = require('./components/UserDetails')

module.exports = class UserDetails extends Plugin {
    async startPlugin() {
        powercord.api.settings.registerSettings(this.entityID, {
            category: this.entityID, label: 'User Details', render: Settings })
        this.loadStylesheet('style.css')

        const UserPopoutHeader = await getModule(m => m.default && m.default.displayName === 'UserPopoutHeader')
        inject('user-details', UserPopoutHeader, 'default', ([{ user, guildId }], res) => {
            if (!this.settings.get('profilePopout', true)) return res
            const children = findInReactTree(res, a => Array.isArray(a) && a.find(c => c?.type?.displayName === 'CustomStatus'))
            if (children != null) children.splice(2, 0, React.createElement(Details, {
                user, guildId, popout: true,
                settings: {
                    createdAt: this.settings.get('createdAt', true),
                    joinedAt: this.settings.get('joinedAt', true),
                    lastMessage: this.settings.get('lastMessage', true),
                    get: this.settings.get
                }
            }))
            return res
        })
        UserPopoutHeader.default.displayName = 'UserPopoutHeader'

        const _this = this
        const UserProfileBody = await this._getUserProfileBody()
        if (UserProfileBody) inject('user-details-modal', UserProfileBody.prototype, 'renderHeader', function (args, res) {
            if (!_this.settings.get('profileModal', true)) return res
            const children = findInReactTree(res, a => Array.isArray(a) && a.find(c => c?.type?.displayName === 'DiscordTag'))
            if (children != null) children.splice(1, 0, React.createElement(Details, {
                user: this.props.user,
                guildId: this.props.guildId,
                settings: {
                    createdAt: _this.settings.get('createdAt', true),
                    joinedAt: _this.settings.get('joinedAt', true),
                    lastMessage: _this.settings.get('lastMessage', true),
                    get: _this.settings.get
                }
            }))
            return res
        })

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

    // based on https://github.com/cyyynthia/pronoundb-powercord/blob/1ef42d7407b73020ee197e10430c02c269f62f09/index.js#L160-L185
    async _getUserProfileBody() {
        try {
            const UserProfile = await getModuleByDisplayName('UserProfile')
            const FluxUserProfileBody = UserProfile.prototype.render().type
            const DecoratedUserProfileBody = this._extractFromFlux(FluxUserProfileBody).render().type
            return DecoratedUserProfileBody.prototype.render.call({ props: { forwardedRef: null } }).type
        } catch (e) { console.error('Failed to get UserProfileBody', e) }
    }

    _extractFromFlux(FluxContainer) {
        return FluxContainer.prototype.render.call({ memoizedGetStateFromStores: () => null }).type
    }
}
