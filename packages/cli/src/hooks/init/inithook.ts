import {Hook} from '@oclif/config'
import cli from 'cli-ux'
import * as fs from 'fs-extra'
const chalk = require('chalk')
const path = require('path')
const latestVersion = require('latest-version')
const semver = require('semver')

const hook: Hook<'init'> = async function (opts) {
  // get config settings
  let userConfig: any
  const curDateTime = new Date()
  const configFileExists = fs.existsSync(path.join(this.config.configDir, 'config.json'))

  try {
    // if config file exists, load settings
    if (configFileExists) {
      userConfig = await fs.readJSON(path.join(this.config.configDir, 'config.json'))
    } else {
      // otherwise create in-memory config
      userConfig = {
        telemetry: null,
        lastVersionCheck: null
      }
    }

    const checkForUpdate = async () => {
      const latest = await latestVersion(opts.config.name, {version: `>${opts.config.version}`})
      if (semver.gt(latest, opts.config.version)) {
        this.log('Update available ')
        this.log('     Run ')
        this.log(`npm i -g ${opts.config.name} `)
      }
    }

    const updateUserConfig = (curVersionCheck: Date) => {
      userConfig.lastVersionCheck = curVersionCheck
      fs.writeFileSync(path.join(this.config.configDir, 'config.json'), JSON.stringify(userConfig, null, 2))
    }

    const isToday = (dateObj: Date | null, today: Date) => {
      return dateObj && dateObj.getDate() === today.getDate() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getFullYear() === today.getFullYear()
    }

    // if there's no timestamp in config, create one and check for updates
    // if there is a timestamp in config and it's not from today, check for updates
    const lastCheck = userConfig.lastVersionCheck ? new Date(userConfig.lastVersionCheck) : null
      if (!isToday(lastCheck, curDateTime)) {
        await checkForUpdate()
        updateUserConfig(curDateTime)
    }

  /* tslint:disable:no-unused */
  } catch (err) {
      // swallow the exception; we don't want to crash the app
      // on a failed attempt to check version
  }

  // Ensure telemetry is set
  try {
    if (userConfig.telemetry === null) {
      const disableTelemetry = await cli.prompt(chalk.red('Telemetry is disabled. Would you like to opt in?. Only command and flags usage will be sent. (Y/N)'))
      if (disableTelemetry === 'Y' || disableTelemetry === 'y') {
        userConfig.telemetry = true
        this.log(chalk.blue('Telemetry has been enabled.'))
        this.log(chalk.blue('You can find Microsoft Privacy Statement at https://privacy.microsoft.com/en-US/privacystatement'))
        this.log(chalk.blue('we will gather some usage data as follows:'))
        this.log(chalk.blue('Command group calls'))
        this.log(chalk.blue('Flags used **excluding** specific values (i.e. if used parameter _--folder=name_, we will only gather the use of _--folder_ but will not capture _name_)'))
      } else {
        userConfig.telemetry = false
        this.log(chalk.blue('Telemetry will remain disabled'))
        this.log(chalk.blue('At any time you may enable data collection by changing the configuration using command:'))
        this.log(chalk.blue('bf config:telemetry:enable'))
      }

      await fs.mkdirp(this.config.configDir)

      fs.writeFileSync(path.join(this.config.configDir, 'config.json'), JSON.stringify(userConfig, null, 2))
    }

    this.config.pjson.telemetry = userConfig.telemetry
  /* tslint:disable:no-unused */

  } catch (err) {
    this.config.pjson.telemetry = false
  }
}

export default hook
