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

module.exports = function(provider) {

  var tasks = {}
  var task_timer = setInterval(function() {
    var tx_hashes = Object.keys(tasks)
    for (var i = tx_hashes.length - 1; i >= 0; i--) {
      tasks[tx_hashes[i]].task()
    }
  }, 10 * 1000)

  const web3 = typeof provider === 'string' ? new Web3(new Web3.providers.HttpProvider(provider)) : provider

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

    record: function(vchash, date, centreDID, attendees, claimedTokens, senderPrivateKey, callback) {
      
      const calldata = Registry.record.getData(vchash, date, centreDID, attendees, claimedTokens)
      
      const signer_buf = Buffer.from(senderPrivateKey, 'hex'),
          signer_addr = `0x${ut.privateToAddress(signer_buf).toString('hex')}`

      web3.eth.getTransactionCount(signer_addr, (err, nonce) => {
        
        if (err)
          return callback(err)

        const transaction = new Tx({
          to: registry_address,
          gasLimit: 3000000,
          gasPrice: +web3.toWei(20, 'gwei'),
          nonce: nonce,
          data: calldata,
        })

        transaction.sign(signer_buf)
        
        const raw = `0x${transaction.serialize().toString('hex')}`

        return web3.eth.sendRawTransaction(raw, function(error, txhash) {
          if (error)
            return callback(error)
          
          return new_task(txhash, callback)
        })
      })
    },

    execute: function(to, value, vchash, senderPrivateKey, callback) {
      const calldata = DeliveryService.execute.getData(to, value, vchash)
      
      const signer_buf = Buffer.from(senderPrivateKey, 'hex'),
            signer_addr = `0x${ut.privateToAddress(signer_buf).toString('hex')}`

      web3.eth.getTransactionCount(signer_addr, (err, nonce) => {
        
        if (err)
          return callback(err)

        const transaction = new Tx({
          to: delivery_service_address,
          gasLimit: 4000000,
          gasPrice: +web3.toWei(20, 'gwei'),
          nonce: nonce,
          data: calldata,
        })

        transaction.sign(signer_buf)
        
        const raw = `0x${transaction.serialize().toString('hex')}`

        return web3.eth.sendRawTransaction(raw, function(error, txhash) {
          if (error)
            return callback(error)
          
          return new_task(txhash, callback)
        })
      })
    },

    confirm: function(vchash, senderPrivateKey, callback) {
      const calldata = DeliveryService.confirm.getData(vchash)
      
      const signer_buf = Buffer.from(senderPrivateKey, 'hex'),
            signer_addr = `0x${ut.privateToAddress(signer_buf).toString('hex')}`

      web3.eth.getTransactionCount(signer_addr, (err, nonce) => {
        
        if (err)
          return callback(err)

        const transaction = new Tx({
          to: delivery_service_address,
          gasLimit: 4000000,
          gasPrice: +web3.toWei(20, 'gwei'),
          nonce: nonce,
          data: calldata,
        })

        transaction.sign(signer_buf)
        
        const raw = `0x${transaction.serialize().toString('hex')}`

        return web3.eth.sendRawTransaction(raw, function(error, txhash) {
          if (error)
            return callback(error)
          
          return new_task(txhash, callback)
        })
      })
    }

  }
}

