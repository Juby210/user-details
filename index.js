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
const Details = require('./components/new/Details')
const HeaderDetails = require('./components/old/HeaderDetails')

module.exports = class UserDetails extends Plugin {
    async startPlugin() {
        powercord.api.settings.registerSettings(this.entityID, {
            category: this.entityID,
            label: 'User Details',
            render: props => React.createElement(Settings, { ...props, toggleSettingAndReload: (name, d) => {
                props.toggleSetting(name, d)
                this._unload()
                this._load()
            }})
        })
        this.loadStylesheet('style.css')

        const { getGuildId } = await getModule(['getLastSelectedGuildId'])

        const settings = {
            createdAt: this.settings.get('createdAt', true),
            joinedAt: this.settings.get('joinedAt', true),
            lastMessage: this.settings.get('lastMessage', true),
            get: this.settings.get
        }
        const profilePopout = this.settings.get('profilePopout', true)
        const profileModal = this.settings.get('profileModal', true)

        if (profilePopout) {
            try {
                const UserPopoutContainer = await getModule(m => m.type && m.type.displayName === 'UserPopoutContainer')
                inject('user-details-popout', UserPopoutContainer, 'type', (_, ret) => {
                    const { type } = ret
                    ret.type = props => {
                        const res = type(props)
                        const body = findInReactTree(res, e => e && e.type && e.type.displayName === 'UserPopoutBody')
                        if (body) body.props.updatePosition = props.updatePosition
                        const info = findInReactTree(res, e => e && e.type && e.type.displayName === 'UserPopoutInfo')
                        if (info) info.props.updatePosition = props.updatePosition
                        return res
                    }
                    Object.assign(ret.type, type)
                    return ret
                })
                UserPopoutContainer.type.displayName = 'UserPopoutContainer'
            } catch (e) {
                console.error(e)
            }
        }


        if (this.settings.get('useNew', true)) {
            if (profilePopout) {
                const UserPopoutBody = await getModule(m => m.default && m.default.displayName === 'UserPopoutBody')
                inject('user-details', UserPopoutBody, 'default', ([{ user, guild, updatePosition }], res) => {
                    // console.log(args, res)
                    if (Array.isArray(res?.props?.children)) res.props.children.push(React.createElement(Details, {
                        user, guildId: guild?.id, popout: true, settings, updatePosition
                    }))
                    return res
                })
                UserPopoutBody.default.displayName = 'UserPopoutBody'
            }
            if (profileModal) {
                const UserInfoBase = await getModule(m => m.default && m.default.displayName === 'UserInfoBase')
                inject('user-details-modal', UserInfoBase, 'default', ([{ user }], res) => {
                    const infoSection = findInReactTree(res, c => c?.className && c.className.indexOf('userInfoSection-') !== -1)
                    if (infoSection) infoSection.children.push(React.createElement(Details, {
                        user, guildId: getGuildId(), settings
                    }))
                    return res
                })
                UserInfoBase.default.displayName = 'UserInfoBase'
            }
        } else {
            if (profilePopout) {
                const mdl = await getModule(['UserPopoutInfo'])
                inject('user-details', mdl, 'UserPopoutInfo', ([{ user, updatePosition }], res) => {
                    if (Array.isArray(res?.props?.children)) res.props.children.splice(2, 0, React.createElement(HeaderDetails, {
                        user, guildId: getGuildId(), popout: true, settings, updatePosition
                    }))
                    return res
                })
                mdl.UserPopoutInfo.displayName = 'UserPopoutInfo'
            }
            if (profileModal) {
                const UserProfileModalHeader = await getModule(m => m.default && m.default.displayName === 'UserProfileModalHeader')
                inject('user-details-modal', UserProfileModalHeader, 'default', ([{ user }], res) => {
                    if (!this.settings.get('profileModal', true)) return res
                    const children = findInReactTree(res, a => Array.isArray(a) && a.find(c => c?.type?.displayName === 'DiscordTag'))
                    if (children != null) children.splice(3, 0, React.createElement(HeaderDetails, {
                        user, guildId: getGuildId(), settings
                    }))
                    return res
                })
                UserProfileModalHeader.default.displayName = 'UserProfileModalHeader'
            }
        }

        if (settings.joinedAt) FluxDispatcher.subscribe('GUILD_MEMBERS_CHUNK', this.onMembersUpdate = data => {
            if (!data?.members?.length) return
            data.members.forEach(m => {
                Utils.createCache(data.guildId, m.user.id)
                Utils.cache[data.guildId][m.user.id].joinedAt = m.joined_at ? new Date(m.joined_at) : '-'
            })
        })

        if (settings.lastMessage) FluxDispatcher.subscribe('MESSAGE_CREATE', this.onMessage = m => {
            if (!m.message) return
            const msg = m.message, gid = msg.guild_id ? msg.guild_id : msg.channel_id
            Utils.createCache(gid, msg.author.id)
            Utils.cache[gid][msg.author.id].lastMessage = new Date(msg.timestamp)
        })
    }

    pluginWillUnload() {
        powercord.api.settings.unregisterSettings(this.entityID)
        uninject('user-details-popout')
        uninject('user-details')
        uninject('user-details-modal')

        if (this.onMembersUpdate) FluxDispatcher.unsubscribe('GUILD_MEMBERS_CHUNK', this.onMembersUpdate)
        if (this.onMessage) FluxDispatcher.unsubscribe('MESSAGE_CREATE', this.onMessage)
    }
}
