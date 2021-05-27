/*
 * Copyright (c) 2020-2021 Juby210
 * Licensed under the Open Software License version 3.0
 */

const { React } = require('powercord/webpack')
const { SwitchItem, TextInput } = require('powercord/components/settings')

module.exports = ({ getSetting, toggleSetting, updateSetting }) => <>
    <SwitchItem
        value={getSetting('profilePopout', true)}
        onChange={() => toggleSetting('profilePopout', true)}
    >Add details in Profile Popout</SwitchItem>
    <SwitchItem
        value={getSetting('profileModal', true)}
        onChange={() => toggleSetting('profileModal', true)}
    >Add details in Profile Modal</SwitchItem>

    <SwitchItem
        value={getSetting('createdAt', true)}
        onChange={() => toggleSetting('createdAt', true)}
    >Display "Created at"</SwitchItem>
    <SwitchItem
        value={getSetting('joinedAt', true)}
        onChange={() => toggleSetting('joinedAt', true)}
    >Display "Joined at"</SwitchItem>
    <SwitchItem
        value={getSetting('lastMessage', true)}
        note={getSetting('defaultFirstMessage')
            ? 'Click on "First message" to toggle it to "Last message"'
            : 'Click on "Last message" to toggle it to "First message"'}
        onChange={() => toggleSetting('lastMessage', true)}
    >Display "Last/First message"</SwitchItem>
    <SwitchItem
        value={getSetting('defaultFirstMessage')}
        onChange={() => toggleSetting('defaultFirstMessage')}
        disabled={!getSetting('lastMessage', true)}
    >Default first message</SwitchItem>

    <SwitchItem
        value={getSetting('hour12')}
        onChange={() => toggleSetting('hour12')}
    >12-hour time format</SwitchItem>
    <SwitchItem
        value={getSetting('custom')}
        note='If you have this option off, the time format is based on your locale'
        onChange={() => toggleSetting('custom')}
    >Custom time format</SwitchItem>
    <SwitchItem
        value={getSetting('custom2')}
        onChange={() => toggleSetting('custom2')}
        note='If you have this option off, the time format is based on custom time format'
    >Custom format for popout</SwitchItem>
    <TextInput
        value={getSetting('format', '%d.%m.%y, %H:%M:%S %ampm')}
        note='Variables: %d - day, %m - month, %y - year, %H - hour, %M - minute, %S - second, %ampm - AM/PM if 12-hour format is enabled'
        disabled={!getSetting('custom')}
        onChange={val => updateSetting('format', val)}
    >Format</TextInput>
    <TextInput
        value={getSetting('format2', getSetting('format', '%d.%m.%y, %H:%M:%S %ampm'))}
        disabled={!getSetting('custom2')}
        onChange={val => updateSetting('format2', val)}
    >Format for popout</TextInput>
</>
