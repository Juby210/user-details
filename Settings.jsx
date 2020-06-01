const { React } = require('powercord/webpack')
const { SwitchItem, TextInput } = require('powercord/components/settings')

module.exports = class Settings extends React.PureComponent {
    render() {
        return <>
            <SwitchItem
                value={ this.props.getSetting('profilePopout', true) }
                onChange={ () => this.props.toggleSetting('profilePopout', true) }
            >Add details in Profile Popout</SwitchItem>
            <SwitchItem
                value={ this.props.getSetting('profileModal', true) }
                onChange={ () => this.props.toggleSetting('profileModal', true) }
            >Add details in Profile Modal</SwitchItem>

            <SwitchItem
                value={ this.props.getSetting('createdAt', true) }
                onChange={ () => this.props.toggleSetting('createdAt', true) }
            >Display "Created at"</SwitchItem>
            <SwitchItem
                value={ this.props.getSetting('joinedAt', true) }
                onChange={ () => this.props.toggleSetting('joinedAt', true) }
            >Display "Joined at"</SwitchItem>
            <SwitchItem
                value={ this.props.getSetting('lastMessage', true) }
                note='Click on "Last message" to toggle it to "First message"'
                onChange={ () => this.props.toggleSetting('lastMessage', true) }
            >Display "Last/First message"</SwitchItem>

            <SwitchItem
                value={ this.props.getSetting('hour12') }
                onChange={ () => this.props.toggleSetting('hour12') }
            >12-hour time format</SwitchItem>
            <SwitchItem
                value={ this.props.getSetting('custom') }
                note='If you have this option off, the time format is based on your locale'
                onChange={ () => this.props.toggleSetting('custom') }
            >Custom time format</SwitchItem>
            <TextInput
                value={ this.props.getSetting('format', '%d.%m.%y, %H:%M:%S %ampm') }
                note='Variables: %d - day, %m - month, %y - year, %H - hour, %M - minute, %S - second, %ampm - AM/PM if 12-hour format is enabled'
                disabled={ !this.props.getSetting('custom') }
                onChange={ val => this.props.updateSetting('format', val) }
            >Format</TextInput>
        </>
    }
}
