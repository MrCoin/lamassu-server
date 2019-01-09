const _ = require('lodash/fp')
const axios = require('axios')
const uuid = require('@fczbkk/uuid4')

const db = require('./db')
const pairing = require('./pairing')
const configManager = require('./config-manager')
const settingsLoader = require('./settings-loader')

module.exports = {getMachineName, getMachines, getMachineNames, setMachine}

function getMachines () {
  return db.any('select * from devices where display=TRUE order by created')
    .then(rr => rr.map(r => ({
      deviceId: r.device_id,
      cashbox: r.cashbox,
      cassette1: r.cassette1,
      cassette2: r.cassette2,
      paired: r.paired
    })))
}

function getConfig (defaultConfig) {
  if (defaultConfig) return Promise.resolve(defaultConfig)

  return settingsLoader.loadRecentConfig()
}

function getMachineNames (config) {
  return Promise.all([getMachines(), getConfig(config)])
    .then(([machines, config]) => {
      const addName = r => {
        const machineScoped = configManager.machineScoped(r.deviceId, config)
        const name = _.defaultTo('', machineScoped.machineName)
        const cashOut = machineScoped.cashOutEnabled

        return _.assign(r, {name, cashOut})
      }

      return _.map(addName, machines)
    })
}

/**
 * Given the machine id, get the machine name
 *
 * @name getMachineName
 * @function
 * @async
 *
 * @param {string} machineId machine id
 * @returns {string} machine name
 */
function getMachineName (machineId) {
  return settingsLoader.loadRecentConfig()
    .then(config => {
      const machineScoped = configManager.machineScoped(machineId, config)
      return machineScoped.machineName
    })
}

async function resetCashOutBills (rec) {
  let { cassette1, cassette2 } = await db.one(`
    SELECT cassette1, cassette2
    FROM devices
    WHERE device_id = $1
    LIMIT 1
  `, [rec.deviceId])

  let config = await settingsLoader.loadRecentConfig()
  let topCashOutDenomination = configManager.scopedValue('global', 'global', 'topCashOutDenomination', config)
  let bottomCashOutDenomination = configManager.scopedValue('global', 'global', 'bottomCashOutDenomination', config)

  let refillsQuery = `
    INSERT INTO cash_out_refills
      (
        id,
        device_id,
        user_id,
        cassette1,
        cassette2,
        denomination1,
        denomination2,
        prev_cassette1,
        prev_cassette2
      )
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `

  await db.none(refillsQuery, [
    uuid.generate(),
    rec.deviceId,
    '0', // TODO: unable to add meaningful user_id at this point
    rec.cassettes[0],
    rec.cassettes[1],
    topCashOutDenomination,
    bottomCashOutDenomination,
    cassette1,
    cassette2
  ])

  const sql = 'update devices set cassette1=$1, cassette2=$2 where device_id=$3'
  return db.none(sql, [rec.cassettes[0], rec.cassettes[1], rec.deviceId])
}

function unpair (rec) {
  return pairing.unpair(rec.deviceId)
}

function reboot (rec) {
  return axios.post(`http://localhost:3030/reboot?device_id=${rec.deviceId}`)
}

function setMachine (rec) {
  switch (rec.action) {
    case 'resetCashOutBills': return resetCashOutBills(rec)
    case 'unpair': return unpair(rec)
    case 'reboot': return reboot(rec)
    default: throw new Error('No such action: ' + rec.action)
  }
}
