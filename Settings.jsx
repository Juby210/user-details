const { React } = require('powercord/webpack')
const { SwitchItem } = require('powercord/components/settings')

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
                onChange={ () => this.props.toggleSetting('lastMessage', true) }
            >Display "Last message"</SwitchItem>

            <SwitchItem
                value={ this.props.getSetting('hour12') }
                onChange={ () => this.props.toggleSetting('hour12') }
            >12-hour time format</SwitchItem>
        </>
    }
}
