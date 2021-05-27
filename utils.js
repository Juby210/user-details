/*
 * Copyright (c) 2020-2021 Juby210
 * Licensed under the Open Software License version 3.0
 */

const { getModule, i18n, FluxDispatcher } = require('powercord/webpack')

const { requestMembersById } = getModule(['requestMembersById'], false) || {}
const Search = getModule(m => m.prototype && m.prototype.retryLater, false)

module.exports = class Utils {
    static cache = {}
    static createCache(gid, id) {
        if (!this.cache[gid]) this.cache[gid] = {}
        if (!this.cache[gid][id]) this.cache[gid][id] = {}
    }

    static dateToString(getSetting, date, popout) {
        if (date === '-') return '-'
        const customPopout = popout && getSetting('custom2')
        const hour12 = getSetting('hour12')
        if (getSetting('custom') || customPopout) {
            let h = date.getHours(), ampm = ''
            if (hour12) {
                ampm = h >= 12 ? 'PM' : 'AM'
                h = h % 12 || 12
            }
            return getSetting(customPopout ? 'format2' : 'format', getSetting('format', '%d.%m.%y, %H:%M:%S %ampm'))
                .replace(/%d/g, ('0' + date.getDate()).substr(-2))
                .replace(/%m/g, ('0' + (date.getMonth() + 1)).substr(-2))
                .replace(/%y/g, date.getFullYear())
                .replace(/%H/g, ('0' + h).substr(-2))
                .replace(/%M/g, ('0' + date.getMinutes()).substr(-2))
                .replace(/%S/g, ('0' + date.getSeconds()).substr(-2))
                .replace(/%ampm/g, ampm)
        }
        return date.toLocaleString(i18n.getLocale(), { hour12 })
    }

    static fetchJoinedAt(gid, id) {
        const c = this.cache[gid][id]
        return new Promise(r => {
            requestMembersById(gid, id)

            const sub = data => {
                if (data.guildId === gid) {
                    const m = data.members?.find(m => m?.user?.id)
                    if (m) r(m.joined_at ? new Date(m.joined_at) : '-')
                    else if (data.notFound?.find(m => m === id)) {
                        c.joinedAt = '-'
                        r('-')
                    } else return
                    FluxDispatcher.unsubscribe('GUILD_MEMBERS_CHUNK', sub)
                }
            }

            FluxDispatcher.subscribe('GUILD_MEMBERS_CHUNK', sub)
        })
    }

    static searchFirstHitDate(id, gid, dm, asc) {
        return new Promise(r => this.search(id, gid, dm, asc).then(res => {
            if (res && res.messages && res.messages[0]) {
                const hit = res.messages[0].find(m => m.hit)
                if (!hit) r('-')
                else r(new Date(hit.timestamp))
            } else r('-')
        }).catch(() => r('-')))
    }

    // contains code by Cynthia
    static search(author_id, id, dm, asc) {
        return new Promise((resolve, reject) => {
            const opts = { author_id, include_nsfw: true }
            const s = new Search(id, dm ? 'DM' : 'GUILD', asc ? { offset: 0, sort_by: 'timestamp', sort_order: 'asc', ...opts } : opts)
            s.fetch(res => resolve(res.body), () => void 0, reject)
        })
    }
} 
