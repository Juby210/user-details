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

        if (this.settings.get('useNew', true)) {
            if (profilePopout) {
                const UserPopoutBody = await getModule(m => m.default && m.default.displayName === 'UserPopoutBody')
                inject('user-details', UserPopoutBody, 'default', ([{ user, guild }], res) => {
                    if (Array.isArray(res?.props?.children)) res.props.children.push(React.createElement(Details, {
                        user, guildId: guild?.id, popout: true, settings
                    }))
                    return res
                })
                UserPopoutBody.default.displayName = 'UserPopoutBody'
            }
            if (profileModal) this.lazyPatchProfileModal(
                m => m.default && m.default.displayName === 'UserInfoBase',
                UserInfoBase => {
                    inject('user-details-modal', UserInfoBase, 'default', ([{ user }], res) => {
                        const infoSection = findInReactTree(res, c => c?.className && c.className.indexOf('userInfoSection-') !== -1)
                        if (infoSection) infoSection.children.push(React.createElement(Details, {
                            user, guildId: getGuildId(), settings
                        }))
                        return res
                    })
                    UserInfoBase.default.displayName = 'UserInfoBase'
                }
            )
        } else {
            if (profilePopout) {
                const mdl = await getModule(['UserPopoutInfo'])
                inject('user-details', mdl, 'UserPopoutInfo', ([{ user }], res) => {
                    if (Array.isArray(res?.props?.children)) res.props.children.splice(2, 0, React.createElement(HeaderDetails, {
                        user, guildId: getGuildId(), popout: true, settings
                    }))
                    return res
                })
                mdl.UserPopoutInfo.displayName = 'UserPopoutInfo'
            }
            if (profileModal) this.lazyPatchProfileModal(
                m => m.default && m.default.displayName === 'UserProfileModalHeader',
                UserProfileModalHeader => {
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
            )
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
        uninject('user-details')
        uninject('user-details-modal')
        uninject('user-details-lazy-modal')

        if (this.onMembersUpdate) FluxDispatcher.unsubscribe('GUILD_MEMBERS_CHUNK', this.onMembersUpdate)
        if (this.onMessage) FluxDispatcher.unsubscribe('MESSAGE_CREATE', this.onMessage)
    }

    async lazyPatchProfileModal(filter, patch) {
        const m = getModule(filter, false)
        if (m) patch(m)
        else {
            const { useModalsStore } = await getModule(['useModalsStore'])
            inject('user-details-lazy-modal', useModalsStore, 'setState', a => {
                const og = a[0]
                a[0] = (...args) => {
                    const ret = og(...args)
                    try {
                        if (ret?.default?.length) {
                            const el = ret.default[0]
                            if (el && el.render && el.render.toString().indexOf(',friendToken:') !== -1) {
                                uninject('user-details-lazy-modal')
                                patch(getModule(filter, false))
                            }
                        } 
                    } catch (e) {
                        this.error(e)
                    }
                    return ret
                }
                return a
            }, true)
        }
    }
}
