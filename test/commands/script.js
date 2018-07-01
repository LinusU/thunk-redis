'use strict'

const tman = require('tman')
const should = require('should')
const thunk = require('thunks')()
const redis = require('../..')

tman.suite('commands:Script', function () {
  let client

  tman.before(function () {
    client = redis.createClient({
      database: 0
    })
    client.on('error', function (error) {
      console.error('redis client:', error)
    })
  })

  tman.beforeEach(function (done) {
    client.flushdb()(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
    })(done)
  })

  tman.after(function () {
    client.clientEnd()
  })

  tman.it('client.eval', function (done) {
    client.eval('return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}', 2, 'key1', 'key2', 'first', 'second')(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql(['key1', 'key2', 'first', 'second'])
      return this.eval('return redis.call("set",KEYS[1],"bar")', 1, 'foo')
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return thunk.all(this.get('foo'), this.eval('return redis.call("get","foo")', 0))
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql(['bar', 'bar'])
      return thunk.all(this.lpush('list', 123), this.eval('return redis.call("get", "list")', 0))
    })(function (error, res) {
      should(error).be.instanceOf(Error)
      return this.eval('return redis.pcall("get", "list")', 0)
    })(function (error, res) {
      should(error).be.instanceOf(Error)
    })(done)
  })

  tman.it('client.script, client.evalsha', function (done) {
    let sha = null

    client.script('load', 'return "hello thunk-redis"')(function (error, res) {
      should(error).be.equal(null)
      sha = res
      return this.evalsha(res, 0)
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('hello thunk-redis')
      return this.script('exists', sha)
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql([1])
      return thunk.all(this.script('flush'), this.script('exists', sha))
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql(['OK', [0]])
      return this.script('kill')
    })(function (error, res) {
      should(error).be.instanceOf(Error)
    })(done)
  })

  tman.it('client.evalauto', function (done) {
    client.evalauto('return {KEYS[1],ARGV[1],ARGV[2]}', 1, 'key1', 'first', 'second')(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql(['key1', 'first', 'second'])
      return this.evalauto('return redis.call("set",KEYS[1],"bar")', 1, 'foo')
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return thunk.all(this.get('foo'), this.evalauto('return redis.call("get","foo")', 0))
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql(['bar', 'bar'])
      return thunk.all(this.lpush('list', 123), this.evalauto('return redis.call("get", "list")', 0))
    })(function (error, res) {
      should(error).be.instanceOf(Error)
      return this.evalauto('return redis.pcall("get", "list")', 0)
    })(function (error, res) {
      should(error).be.instanceOf(Error)
    })(done)
  })
})
