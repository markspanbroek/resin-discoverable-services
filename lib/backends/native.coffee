Promise = require('bluebird')
bonjour = require('bonjour')

class NativeServiceBrowser
	constructor: (@timeout) ->
		@findInstance = bonjour()

	find: (serviceName, type, protocol, subtypes = []) ->
		# Perform the bonjour service lookup and return any results after the timeout period
		new Promise (resolve) =>
			foundServices = []
			browser = @findInstance.find
				type: type
				subtypes: subtypes
				protocol: protocol
			, (service) ->
				# Because we spin up a new search for each subtype, we don't
				# need to update records here. Any valid service is unique.
				service.service = serviceName
				foundServices.push(service)

			setTimeout( ->
				browser.stop()
				resolve(foundServices)
			, @timeout)

	destroy: ->
		@findInstance.destroy()

module.exports = (timeout) ->
	Promise.resolve(new NativeServiceBrowser(timeout))
	.disposer (serviceBrowser) ->
		serviceBrowser.destroy()
