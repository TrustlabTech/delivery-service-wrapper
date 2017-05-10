'use-strict'

const Web3 = require('web3')

const token_abi = require('./contracts/Token.abi'),
      registry_abi = require('./contracts/Registry.abi'),
      system_service_abi = require('./contracts/SystemService.abi'),
      delivery_service_abi = require('./contracts/DeliveryService.abi'),
      assurance_service_abi = require('./contracts/AssuranceService.abi')

const token_address = require('./contracts/Token.address'),
      registry_address = require('./contracts/Registry.address'),
      system_service_address = require('./contracts/SystemService.address'),
      delivery_service_address = require('./contracts/DeliveryService.address'),
      assurance_service_address = require('./contracts/AssuranceService.address')

module.exports = function(provider) {
  const web3 = typeof provider === 'string' ? new Web3(new Web3.providers.HttpProvider(provider)) : provider

  const tokenInterface = web3.eth.contract(token_abi),
        registryInterface = web3.eth.contract(registry_abi),
        systemServiceInterface = web3.eth.contract(system_service_abi),
        deliveryServiceInterface = web3.eth.contract(delivery_service_abi),
        assuranceServiceInterface = web3.eth.contract(assurance_service_abi)

  const Token = tokenInterface.at(token_address),
        Registry = registryInterface.at(registry_address),
        SystemService = systemServiceInterface.at(system_service_address),
        DeliveryService = deliveryServiceInterface.at(delivery_service_address),
        AssuranceService = assuranceServiceInterface.at(assurance_service_address)

  return {

    record: function(vchash, date, centreDID, attendees, claimedTokens, callback) {
      SystemService.record(vchash, date, centreDID, attendees, claimedTokens, callback)
    },

    execute: function(to, value, vchash, callback) {
      SystemService.execute(to, value, callback)
    },

    confirm: function(vchash, callback) {
      AssuranceService.confirm(vchash, callback)
    }

  }
}

