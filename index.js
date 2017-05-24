'use-strict'

const Web3 = require('web3'),      
      Tx = require('ethereumjs-tx'),
      ut = require('ethereumjs-util')

const token_abi = require('./contracts/Token.abi'),
      registry_abi = require('./contracts/Registry.abi'),
      delivery_service_abi = require('./contracts/DeliveryService.abi')

const token_address = require('./contracts/Token.address'),
      registry_address = require('./contracts/Registry.address'),
      delivery_service_address = require('./contracts/DeliveryService.address')

let intervalIDs = {}

function watchExecution(txhash, web3) {
  return new Promise(function(resolve, reject) {
    let ttl = 60 // 60 tries, once every 5 seconds === 5 minutes
    intervalIDs[txhash] = setInterval(function() {
      web3.eth.getTransactionReceipt(txhash, function(error, receipt) {
        if (error || ttl < 0) {
          reject(error || new Error('ran out of retries waiting for tx confirmation'))
          clearInterval(intervalIDs[txhash])
          return
        }
        
        if (receipt && Array.isArray(receipt.logs) && receipt.logs.length) {
          resolve(`0x${receipt.logs[0].data.slice(26)}`)
          clearInterval(intervalIDs[txhash])
          return
        }
        
        ttl--
      })
    }, 5 * 1000)
  })
}

module.exports = function(provider) {

  const web3 = typeof provider === 'string' ? new Web3(new Web3.providers.HttpProvider(provider)) : provider

  const tokenInterface = web3.eth.contract(token_abi),
        registryInterface = web3.eth.contract(registry_abi),
        deliveryServiceInterface = web3.eth.contract(delivery_service_abi)

  const Token = tokenInterface.at(token_address),
        Registry = registryInterface.at(registry_address),
        DeliveryService = deliveryServiceInterface.at(delivery_service_address)

  return {

    record: function(vchash, date, centreDID, unitCode, senderPrivateKey) {
      return new Promise(function (parentResolve, parentReject) {
        const calldata = Registry.record.getData(vchash, date, unitCode, centreDID)
        
        const signer_buf = Buffer.from(senderPrivateKey, 'hex'),
              signer_addr = `0x${ut.privateToAddress(signer_buf).toString('hex')}`

        web3.eth.getTransactionCount(signer_addr, (err, nonce) => {
        
          if (err) {
            parentReject(err)
            return
          }

          const transaction = new Tx({
            to: registry_address,
            gasLimit: 500000,
            gasPrice: +web3.toWei(20, 'gwei'),
            nonce,
            data: calldata,
          })

          transaction.sign(signer_buf)
          
          const raw = `0x${transaction.serialize().toString('hex')}`

          web3.eth.sendRawTransaction(raw, function(error, txhash) {
            if (error) {
              parentReject(error)
              return
            }
            
            watchExecution(txhash, web3).then(parentResolve).catch(parentReject)
          })
        })
      })
    },

    execute: function(to, value, vchash, senderPrivateKey) {
      return new Promise(function (parentResolve, parentReject) {
        const calldata = DeliveryService.execute.getData(to, value, vchash)

        const signer_buf = Buffer.from(senderPrivateKey, 'hex'),
              signer_addr = `0x${ut.privateToAddress(signer_buf).toString('hex')}`
        
        web3.eth.getTransactionCount(signer_addr, (err, nonce) => {
        
          if (err) {
            parentReject(err)
            return
          }

          const transaction = new Tx({
            to: delivery_service_address,
            gasLimit: 4000000,
            gasPrice: +web3.toWei(20, 'gwei'),
            nonce,
            data: calldata,
          })

          transaction.sign(signer_buf)
          
          const raw = `0x${transaction.serialize().toString('hex')}`

          return web3.eth.sendRawTransaction(raw, function(error, txhash) {
            if (error) {
              parentReject(error)
              return
            }

            watchExecution(txhash, web3).then(parentResolve).catch(parentReject)
          })
        })
      })
    },

    confirm: function(vchash, senderPrivateKey) {
      return new Promise(function(parentResolve, parentReject) {
        const calldata = DeliveryService.confirm.getData(vchash)
      
        const signer_buf = Buffer.from(senderPrivateKey, 'hex'),
              signer_addr = `0x${ut.privateToAddress(signer_buf).toString('hex')}`
        
        web3.eth.getTransactionCount(signer_addr, (err, nonce) => {
        
          if (err) {
            parentReject(err)
            return
          }

          const transaction = new Tx({
            to: delivery_service_address,
            gasLimit: 4000000,
            gasPrice: +web3.toWei(20, 'gwei'),
            nonce,
            data: calldata,
          })

          transaction.sign(signer_buf)
          
          const raw = `0x${transaction.serialize().toString('hex')}`

          return web3.eth.sendRawTransaction(raw, function(error, txhash) {
            if (error) {
              parentReject(error)
              return
            }

            watchExecution(txhash, web3).then(parentResolve).catch(parentReject)
          })
        })
      })
    }

  }
}