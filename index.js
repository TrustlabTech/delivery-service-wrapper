'use-strict'

const Web3 = require('web3')

const token_abi = require('./contracts/Token.abi')
const registry_abi = require('./contracts/Registry.abi')
const delivery_service_abi = require('./contracts/DeliveryService.abi')

const token_address = require('./contracts/Token.address')
const registry_address = require('./contracts/Registry.address')
const delivery_service_address = require('./contracts/DeliveryService.address')

module.exports = function(geth_host) {

  const web3 = new Web3(new Web3.providers.HttpProvider(geth_host))

  const tokenInterface = web3.eth.contract(token_abi),
        registryInterface = web3.eth.contract(registry_abi),
        deliveryServiceInterface = web3.eth.contract(delivery_service_abi)

  const Token = tokenInterface.at(token_address),
        Registry = registryInterface.at(registry_address),
        DeliveryService = deliveryServiceInterface.at(delivery_service_address)

  function new_task(hash, callback) {
    tasks[hash] = {
      ttl: 100,
      callback: callback
    }
    tasks[hash].task = function(tx) {
      web3.eth.getTransactionReceipt(tx, function(err, receipt) {
        var removeflag = false
        if (err || this.ttl < 0) {
          removeflag = true
          this.callback(err || new Error('ran out of retries waiting for tx confirmation'))
        }
        if (!removeflag &&
            receipt &&
            ((web3.eth.blockNumber - receipt.blockNumber) > 0) &&
            Array.isArray(receipt.logs) &&
            receipt.logs.length
        ) {
          removeflag = true
          this.callback(null, `0x${receipt.logs[0].data.slice(26)}`)
        }
        if (removeflag) delete tasks[tx]
        else this.ttl -= 1
      }.bind(this))
    }.bind(tasks[hash], hash)
  }

  return {

    record: function(vchash, date, centreDID, attendees, claimedTokens, centreAddress) {
    }

    execute: function(to, value, vchash) {
    }

  }
}

