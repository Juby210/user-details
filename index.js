const { Plugin } = require('powercord/entities')
const { findInReactTree } = require('powercord/util')
const { getModule, getModuleByDisplayName, channels, i18n, FluxDispatcher, React } = require('powercord/webpack')
const { AsyncComponent } = require('powercord/components')
const { inject, uninject } = require('powercord/injector')
const cache = {}

const Settings = require('./Settings')

module.exports = class UserDetails extends Plugin {
    async startPlugin() {
        powercord.api.settings.registerSettings('user-details', {
            category: this.entityID, label: 'User Details', render: Settings })
        this.loadStylesheet('style.css')

        const _this = this
        const g = await getModule(['getGuildId', 'getLastSelectedGuildId'])
        const { getChannel } = await getModule(['getChannel'])
        const { getCurrentUser } = await getModule(['getCurrentUser'])
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
            if (_this.settings.get('createdAt', true)) text.push(React.createElement('div', null, `Created at: ${_this.dateToString(user.createdAt, popout)}`))
            if (user.discriminator != '0000') {
                const gid2 = gid || channels.getChannelId()
                const dontFetchLast = gid ? false : !(getCurrentUser().id == user.id || !getChannel(gid2) || getChannel(gid2).recipients.includes(user.id))
                _this.createCache(user.id, gid2)
                const c = cache[user.id][gid2]

                if (_this.settings.get('joinedAt', true) && gid) text.push(React.createElement(AsyncComponent, { _provider: async () => {
                    const joinedAt = c.joinedAt || await _this.fetchJoinedAt(gid, user.id)
                    return () => React.createElement('div', null, `Joined at: ${_this.dateToString(joinedAt, popout)}`)
                }}))
                if (_this.settings.get('lastMessage', true)) text.push(React.createElement(class extends React.PureComponent {
                    constructor(props) {
                        super(props)

                        this.state = { lastMessage: null, firstMessage: null, firstMessageSelected: _this.settings.get('defaultFirstMessage') }
                    }

                    async componentDidMount() {
                        if (!this.state.firstMessageSelected && !this.state.lastMessage) this.setState({
                            lastMessage: dontFetchLast ? '-' : c.lastMessage || await new Promise(r => {
                                _this.search(user.id, gid2, !gid).then(res => {
                                    if (res && res.messages && res.messages[0]) {
                                        const hit = res.messages[0].find(m => m.hit)
                                        if (!hit) c.lastMessage = '-'
                                        else c.lastMessage = new Date(hit.timestamp)
                                    } else c.lastMessage = '-'
                                    r(c.lastMessage)
                                }).catch(() => {
                                    c.lastMessage = '-'
                                    r(c.lastMessage)
                                })
                            })
                        }); else if (this.state.firstMessageSelected && !this.state.firstMessage) this.setState({
                            firstMessage: dontFetchLast ? '-' : c.firstMessage || await new Promise(r => {
                                _this.search(user.id, gid2, !gid, true).then(res => {
                                    if (res && res.messages && res.messages[0]) {
                                        const hit = res.messages[0].find(m => m.hit)
                                        if (!hit) c.firstMessage = '-'
                                        else c.firstMessage = new Date(hit.timestamp)
                                    } else c.firstMessage = '-'
                                    r(c.firstMessage)
                                }).catch(() => {
                                    c.firstMessage = '-'
                                    r(c.firstMessage)
                                })
                            })
                        })
                    }
                    componentDidUpdate = this.componentDidMount

                    render() {
                        if (!this.state.firstMessageSelected && !this.state.lastMessage ||
                            this.state.firstMessageSelected && !this.state.firstMessage
                        ) return null

                        if (this.state.firstMessageSelected) return React.createElement('div', dontFetchLast ? null : {
                            style: { cursor: 'pointer' },
                            onClick: () => this.setState({ firstMessageSelected: false })
                        }, `First message: ${_this.dateToString(this.state.firstMessage, popout)}`)
                        return React.createElement('div', dontFetchLast ? null : {
                            style: { cursor: 'pointer' },
                            onClick: () => this.setState({ firstMessageSelected: true })
                        }, `Last message: ${_this.dateToString(this.state.lastMessage, popout)}`)
                    }
                }))
            }
            arr.splice(popout ? 2 : 1, 0, React.createElement('div', { className: `user-details-text${popout ? ' user-details-center' : ''} ${textRow}` }, ...text))

            return res
        })

        FluxDispatcher.subscribe('GUILD_MEMBERS_CHUNK', this.onMembersUpdate = data => {
            if (!data?.members?.length) return
            data.members.forEach(m => {
                this.createCache(m.user.id, data.guildId)
                cache[m.user.id][data.guildId].joinedAt = m.joined_at ? new Date(m.joined_at) : '-'
            })
        })

        FluxDispatcher.subscribe('MESSAGE_CREATE', this.onMessage = m => {
            if (!this.settings.get('lastMessage', true) || !m.message) return
            const msg = m.message, gid = msg.guild_id ? msg.guild_id : msg.channel_id
            this.createCache(msg.author.id, gid)
            cache[msg.author.id][gid].lastMessage = new Date(msg.timestamp)
        })
    }

    pluginWillUnload() {
        powercord.api.settings.unregisterSettings('user-details')
        uninject('user-details')

        if (this.onMembersUpdate) FluxDispatcher.unsubscribe('GUILD_MEMBERS_CHUNK', this.onMembersUpdate)
        if (this.onMessage) FluxDispatcher.unsubscribe('MESSAGE_CREATE', this.onMessage)
    }

    createCache(id, gid) {
        if (!cache[id]) cache[id] = {}
        if (!cache[id][gid]) cache[id][gid] = {}
    }

    dateToString(date, popout) {
        if (date == '-') return '-'
        const customPopout = popout && this.settings.get('custom2')
        if (this.settings.get('custom') || customPopout) {
            let h = date.getHours(), ampm = ''
            if (this.settings.get('hour12')) {
                ampm = h >= 12 ? 'PM' : 'AM'
                h = h % 12 || 12
            }
            return this.settings.get(customPopout ? 'format2' : 'format', this.settings.get('format', '%d.%m.%y, %H:%M:%S %ampm'))
                .replace(/%d/g, ('0' + date.getDate()).substr(-2))
                .replace(/%m/g, ('0' + (date.getMonth() + 1)).substr(-2))
                .replace(/%y/g, date.getFullYear())
                .replace(/%H/g, ('0' + h).substr(-2))
                .replace(/%M/g, ('0' + date.getMinutes()).substr(-2))
                .replace(/%S/g, ('0' + date.getSeconds()).substr(-2))
                .replace(/%ampm/g, ampm)
        }
        return date.toLocaleString(i18n.getLocale(), { hour12: this.settings.get('hour12') })
    }

    fetchJoinedAt(gid, id) {
        const c = cache[id][gid]
        return new Promise(r => {
            const { requestMembersById } = getModule(['requestMembersById'], false)
            requestMembersById(gid, id)

            const sub = data => {
                if (data.guildId == gid) {
                    const m = data.members?.find(m => m?.user?.id)
                    if (m) r(m.joined_at ? new Date(m.joined_at) : '-')
                    else if (data.notFound?.find(m => m == id)) {
                        c.joinedAt = '-'
                        r('-')
                    } else return
                    FluxDispatcher.unsubscribe('GUILD_MEMBERS_CHUNK', sub)
                }
            }

            FluxDispatcher.subscribe('GUILD_MEMBERS_CHUNK', sub)
        })
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