const { resolve } = require('path')
const { Plugin } = require('powercord/entities')
const { findInReactTree } = require('powercord/util')
const { getModule, getModuleByDisplayName, constants: { Endpoints }, http: { get }, React } = require('powercord/webpack')
const { inject, uninject } = require('powercord/injector')
const cache = {}

const Settings = require('./Settings')

module.exports = class UserDetails extends Plugin {
    async startPlugin() {
        this.registerSettings('user-details', 'User Details', Settings)
        this.loadCSS(resolve(__dirname, 'style.css'))

        const _this = this
        const g = await getModule(['getGuildId'])
        const c = await getModule(['getLastSelectedChannelId'])
        const dispatcher = await getModule(['dispatch'])
        const { textRow } = await getModule(['textRow'])
        const AnalyticsContext = await getModuleByDisplayName('AnalyticsContext')

        inject('user-details', AnalyticsContext.prototype, 'renderProvider', function (_, res) {
            let arr, popout, text = []
            if (_this.settings.get('profilePopout', true) && this.props.section == 'Profile Popout') {
                arr = findInReactTree(res, a => Array.isArray(a) && a.find(c => c && c.type && c.type.displayName == 'CustomStatus'))
                popout = true
            } else if (_this.settings.get('profileModal', true) && this.props.section == 'Profile Modal') 
                arr = findInReactTree(res, a => Array.isArray(a) && a.find(c => c && c.type && c.type.displayName == 'DiscordTag'))

            if (!arr) return res

            const { user } = findInReactTree(arr, p => p.user), gid = g.getGuildId()
            if (_this.settings.get('createdAt', true)) text.push(React.createElement('div', null, `Created at: ${_this.dateToString(user.createdAt)}`))
            if (user.discriminator != '0000') {
                const gid2 = gid ? gid : c.getChannelId()
                _this.createCache(user.id, gid2)
                let fetchingMember, fetchingLast

                if (_this.settings.get('joinedAt', true) && gid) {
                    if (!cache[user.id][gid].joinedAt) {
                        fetchingMember = true
                        _this.fetchMember(gid, user.id).then(res => {
                            if (res && res.joined_at) {
                                cache[user.id][gid].joinedAt = new Date(res.joined_at)
                                if (!fetchingLast) setTimeout(() => _this.forceUpdate(user))
                            }
                            fetchingMember = false
                        })
                    } else text.push(React.createElement('div', null, `Joined at: ${_this.dateToString(cache[user.id][gid].joinedAt)}`))
                }
                if (_this.settings.get('lastMessage', true)) {
                    const c = cache[user.id][gid2]
                    if (!c.lastMessage) {
                        fetchingLast = true
                        _this.search(user.id, gid2, !gid).then(res => {
                            if (res && res.messages && res.messages[0]) {
                                const hit = res.messages[0].find(m => m.hit)
                                if (!hit) c.lastMessage = '-'
                                else c.lastMessage = new Date(hit.timestamp)
                            } else c.lastMessage = '-'
                            fetchingLast = false
                            if (!fetchingMember) setTimeout(() => _this.forceUpdate(user))
                        }).catch(() => c.lastMessage = '-')
                    } else text.push(React.createElement('div', null, `Last message: ${c.lastMessage == '-' ? '-' : _this.dateToString(c.lastMessage)}`))
                }
            }
            arr.splice(popout ? 2 : 1, 0, React.createElement('div', { className: `user-details-text${popout ? ' user-details-center' : ''} ${textRow}` }, ...text))

            return res
        })

        dispatcher.subscribe('MESSAGE_CREATE', this.onMessage = m => {
            if (!m.message) return
            const msg = m.message, gid = msg.guild_id ? msg.guild_id : msg.channel_id
            this.createCache(msg.author.id, gid)
            cache[msg.author.id][gid].lastMessage = new Date(msg.timestamp)
        })
    }

    async pluginWillUnload() {
        uninject('user-details')

        if (this.onMessage) {
            const dispatcher = await getModule(['dispatch'])
            dispatcher.unsubscribe('MESSAGE_CREATE', this.onMessage)
        }
    }

    createCache(id, gid) {
        if (!cache[id]) cache[id] = {}
        if (!cache[id][gid]) cache[id][gid] = {}
    }

    dateToString(date) {
        return date.toLocaleString('arab', { hour12: this.settings.get('hour12') })
    }

    // i really can't find better way to rerender ~~pls make pr with better way~~
    async forceUpdate(user) {
        const a = await getModule(['getActivities'])
        const dispatcher = await getModule(['dispatch'])

        const activities = a.getActivities(user.id)
        const clientStatus = a.getState().clientStatuses[user.id] || {}
        const status = a.getStatus(user.id)

        dispatcher.dispatch({ type: 'PRESENCE_UPDATE', activities, clientStatus, status: status != 'offline' ? 'offline' : 'online', user })
        setTimeout(dispatcher.dispatch({ type: 'PRESENCE_UPDATE', activities, clientStatus, status, user }))
    }

    // why members in discord cache doesn't have joinedAt :<
    async fetchMember(gid, id) {
        const data = await get({ url: Endpoints.GUILD_MEMBER(gid, id) })
        return data.body
    }

    // contains code by Bowser65 (Powercord's server, https://discord.com/channels/538759280057122817/539443165455974410/662376605418782730)
    search(author_id, id, dm) {
        return new Promise((resolve, reject) => {
            const Search = getModule(m => m.prototype && m.prototype.retryLater, false)
            const s = new Search(id, dm ? 'DM' : 'GUILD', { author_id })
            s.fetch(res => resolve(res.body), () => void 0, reject)
        })
    }
}
