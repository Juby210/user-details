const { Plugin } = require('powercord/entities')
const { findInReactTree } = require('powercord/util')
const { getModule, getModuleByDisplayName, constants: { Endpoints }, http: { get }, i18n, React } = require('powercord/webpack')
const { inject, uninject } = require('powercord/injector')
const cache = {}

const Settings = require('./Settings')

module.exports = class UserDetails extends Plugin {
    async startPlugin() {
        powercord.api.settings.registerSettings('user-details', {
            category: this.entityID, label: 'User Details', render: Settings })
        this.loadStylesheet('style.css')

        const _this = this
        const g = await getModule(['getGuildId'])
        const lc = await getModule(['getLastSelectedChannelId'])
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
                const gid2 = gid ? gid : lc.getChannelId()
                _this.createCache(user.id, gid2)
                const c = cache[user.id][gid2]
                let fetchingMember, fetchingLast

                if (_this.settings.get('joinedAt', true) && gid) {
                    if (!c.joinedAt) {
                        fetchingMember = true
                        _this.fetchMember(gid, user.id).then(res => {
                            if (res && res.joined_at) {
                                c.joinedAt = new Date(res.joined_at)
                                if (!fetchingLast) setTimeout(() => _this.forceUpdate(user))
                            }
                            fetchingMember = false
                        }).catch(res => {
                            if (res.body && res.body.code == 10007) c.joinedAt = '-' // Unknown Member
                            else if (res.body && res.body.retry_after) setTimeout(() => _this.forceUpdate(user), res.body.retry_after + 10)
                            fetchingMember = false
                        })
                    } else text.push(React.createElement('div', null, `Joined at: ${_this.dateToString(c.joinedAt)}`))
                }
                if (_this.settings.get('lastMessage', true)) {
                    if (!this.state || !this.state.firstMessage) {
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
                        } else text.push(React.createElement('div', { onClick: () => {
                            this.setState({ firstMessage: true })
                            setTimeout(() => _this.forceUpdate(user))
                        } }, `Last message: ${_this.dateToString(c.lastMessage)}`))
                    } else {
                        if (!c.firstMessage) {
                            fetchingLast = true
                            _this.search(user.id, gid2, !gid, true).then(res => {
                                if (res && res.messages && res.messages[0]) {
                                    const hit = res.messages[0].find(m => m.hit)
                                    if (!hit) c.firstMessage = '-'
                                    else c.firstMessage = new Date(hit.timestamp)
                                } else c.firstMessage = '-'
                                fetchingLast = false
                                if (!fetchingMember) setTimeout(() => _this.forceUpdate(user))
                            }).catch(() => c.firstMessage = '-')
                        } else text.push(React.createElement('div', { onClick: () => {
                            this.setState({ firstMessage: false })
                            setTimeout(() => _this.forceUpdate(user))
                        } }, `First message: ${_this.dateToString(c.firstMessage)}`))
                    }
                }
            }
            arr.splice(popout ? 2 : 1, 0, React.createElement('div', { className: `user-details-text${popout ? ' user-details-center' : ''} ${textRow}` }, ...text))

            return res
        })

        dispatcher.subscribe('MESSAGE_CREATE', this.onMessage = m => {
            if (!this.settings.get('lastMessage', true) || !m.message) return
            const msg = m.message, gid = msg.guild_id ? msg.guild_id : msg.channel_id
            this.createCache(msg.author.id, gid)
            cache[msg.author.id][gid].lastMessage = new Date(msg.timestamp)
        })
    }

    async pluginWillUnload() {
        powercord.api.settings.unregisterSettings('user-details')
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
        if (date == '-') return '-'
        if (this.settings.get('custom')) {
            let h = date.getHours(), ampm = ''
            if (this.settings.get('hour12')) {
                ampm = h >= 12 ? 'PM' : 'AM'
                h = h % 12 || 12
            }
            return this.settings.get('format', '%d.%m.%y, %H:%M:%S %ampm')
                .replace('%d', ('0' + date.getDate()).substr(-2))
                .replace('%m', ('0' + (date.getMonth() + 1)).substr(-2))
                .replace('%y', date.getFullYear())
                .replace('%H', ('0' + h).substr(-2))
                .replace('%M', ('0' + date.getMinutes()).substr(-2))
                .replace('%S', ('0' + date.getSeconds()).substr(-2))
                .replace('%ampm', ampm)
        }
        return date.toLocaleString(i18n.getLocale(), { hour12: this.settings.get('hour12') })
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
        const data = await get(Endpoints.GUILD_MEMBER(gid, id))
        return data.body
    }

    // contains code by Bowser65 (Powercord's server, https://discord.com/channels/538759280057122817/539443165455974410/662376605418782730)
    search(author_id, id, dm, asc) {
        return new Promise((resolve, reject) => {
            const Search = getModule(m => m.prototype && m.prototype.retryLater, false)
            let opts = { author_id, include_nsfw: true }
            const s = new Search(id, dm ? 'DM' : 'GUILD', asc ? { offset: 0, sort_by: 'timestamp', sort_order: 'asc', ...opts } : opts)
            s.fetch(res => resolve(res.body), () => void 0, reject)
        })
    }
}
