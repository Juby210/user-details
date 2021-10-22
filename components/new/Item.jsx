/*
 * Copyright (c) 2020-2021 Juby210
 * Licensed under the Open Software License version 3.0
 */

const { React, getModule } = require('powercord/webpack')
const Header = getModule(m => m.displayName === 'Header' && m.Sizes, false) || 'div'

const classes = {
    ...getModule(['bodyTitle'], false),
    ...getModule(['colorStandard'], false),
    ...getModule(['marginBottom8'], false)
}

module.exports = ({ header, children, onClick }) => <div onClick={onClick} style={onClick ? { cursor: 'pointer' } : null}>
    <Header className={classes.bodyTitle} muted={true} size={Header.Sizes.SIZE_12} uppercase={true}>{header}</Header>
    <div className={`${classes.colorStandard} ${classes.marginBottom8}`}>{children}</div>
</div>
