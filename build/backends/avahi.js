// Generated by CoffeeScript 1.11.1
(function() {
  var AVAHI_SERVICE_NAME, DONE_SIGNAL, EventEmitter, FAIL_SIGNAL, IF_UNSPEC, NEW_SIGNAL, PROTO_UNSPEC, Promise, SIGNAL_MSG_TYPE, _, dbus, findAvailableServices, formatAvahiService, getAvahiServer, getDbus, prefixSubtype, queryServices;

  EventEmitter = require('events').EventEmitter;

  Promise = require('bluebird');

  dbus = require('dbus-native');

  _ = require('lodash');

  AVAHI_SERVICE_NAME = 'org.freedesktop.Avahi';

  IF_UNSPEC = -1;

  PROTO_UNSPEC = -1;

  SIGNAL_MSG_TYPE = 4;

  NEW_SIGNAL = 'ItemNew';

  DONE_SIGNAL = 'AllForNow';

  FAIL_SIGNAL = 'Failure';

  getDbus = function() {
    return Promise["try"](function() {
      return dbus.systemBus();
    }).disposer(function(bus) {
      var ref;
      return bus != null ? (ref = bus.connection) != null ? ref.end() : void 0 : void 0;
    });
  };

  getAvahiServer = function(bus) {
    var service;
    service = bus.getService(AVAHI_SERVICE_NAME);
    return Promise.fromCallback(function(callback) {
      return service.getInterface('/', 'org.freedesktop.Avahi.Server', callback);
    });
  };

  queryServices = function(bus, avahiServer, typeIdentifier) {
    var emitIfRelevant, emitter, serviceBrowserPath, unknownMessages;
    serviceBrowserPath = null;
    unknownMessages = [];
    emitter = new EventEmitter();
    emitIfRelevant = function(msg) {
      if (msg.path === serviceBrowserPath) {
        return emitter.emit(msg.member, msg.body);
      }
    };
    bus.connection.on('message', function(msg) {
      if (serviceBrowserPath == null) {
        return unknownMessages.push(msg);
      } else {
        return emitIfRelevant(msg);
      }
    });
    return Promise.fromCallback(function(callback) {
      return avahiServer.ServiceBrowserNew(IF_UNSPEC, PROTO_UNSPEC, typeIdentifier, 'local', 0, callback);
    }).then(function(path) {
      serviceBrowserPath = path;
      unknownMessages.forEach(emitIfRelevant);
      return unknownMessages = [];
    })["return"](emitter).disposer(function() {
      if (serviceBrowserPath) {
        return Promise.fromCallback(function(callback) {
          return bus.invoke({
            path: serviceBrowserPath,
            destination: 'org.freedesktop.Avahi',
            "interface": 'org.freedesktop.Avahi.ServiceBrowser',
            member: 'Free'
          }, callback);
        });
      }
    });
  };

  prefixSubtype = function(type, subtype) {
    if (subtype != null) {
      return "_" + subtype + "._sub." + type;
    } else {
      return type;
    }
  };

  findAvailableServices = function(bus, avahiServer, arg, timeout) {
    var fullType, protocol, subtype, type;
    type = arg.type, protocol = arg.protocol, subtype = arg.subtype;
    if (timeout == null) {
      timeout = 1000;
    }
    fullType = "_" + type + "._" + protocol;
    fullType = prefixSubtype(fullType, subtype);
    return Promise.using(queryServices(bus, avahiServer, fullType), function(serviceQuery) {
      return new Promise(function(resolve, reject) {
        var services;
        services = [];
        serviceQuery.on(NEW_SIGNAL, function(service) {
          return services.push(service);
        });
        serviceQuery.on(DONE_SIGNAL, function(message) {
          return resolve(services);
        });
        serviceQuery.on(FAIL_SIGNAL, function(message) {
          return reject(new Error(message));
        });
        return setTimeout(function() {
          return resolve(services);
        }, timeout);
      });
    }).then(function(services) {
      return Promise.map(services, function(arg1) {
        var domain, inf, name, protocol, type;
        inf = arg1[0], protocol = arg1[1], name = arg1[2], type = arg1[3], domain = arg1[4];
        return Promise.fromCallback(function(callback) {
          return avahiServer.ResolveService(inf, protocol, name, type, domain, PROTO_UNSPEC, 0, callback);
        }, {
          multiArgs: true
        }).catchReturn(null);
      }).filter(_.identity).map(function(result) {
        return formatAvahiService(subtype, result);
      });
    });
  };

  formatAvahiService = function(subtype, arg) {
    var aProtocol, address, domain, flags, host, inf, name, port, protocol, txt, type;
    inf = arg[0], protocol = arg[1], name = arg[2], type = arg[3], domain = arg[4], host = arg[5], aProtocol = arg[6], address = arg[7], port = arg[8], txt = arg[9], flags = arg[10];
    return {
      service: prefixSubtype(type, subtype),
      fqdn: name + "." + type + "." + domain,
      port: port,
      host: host,
      protocol: type.endsWith('_tcp') ? 'tcp' : 'udp',
      subtypes: [subtype].filter(_.identity),
      referer: {
        family: protocol === 0 ? 'IPv4' : 'IPv6',
        address: address
      }
    };
  };


  /*
   * @summary Detects whether a D-Bus Avahi connection is possible
   * @function
   * @public
   *
   * @description
   * If the promise returned by this method resolves to true, other Avahi methods
   * should work. If it doesn't, they definitely will not.
   *
   * @fulfil {boolean} - Is an Avahi connection possible
   * @returns {Promise}
   *
   * @example
   * avahi.isAvailable().then((canUseAvahi) => {
   *   if (canUseAvahi) { ... }
   * })
   */

  exports.isAvailable = function() {
    return Promise.using(getDbus(), function(bus) {
      return getAvahiServer(bus)["return"](true);
    }).catchReturn(false);
  };


  /*
   * @summary Find publicised services on the local network using Avahi
   * @function
   * @public
   *
   * @description
   * Talks to Avahi over the system D-Bus, to query for local services
   * and resolve their details.
   *
   * @fulfil {Service[]} - An array of service details
   * @returns {Promise}
   *
   * @example
   * avahi.find({ type: 'ssh', protocol: 'tcp', subtype: 'resin-device' ).then((services) => {
   *   services.forEach((service) => ...)
   * })
   */

  exports.find = function(arg) {
    var protocol, subtype, type;
    type = arg.type, protocol = arg.protocol, subtype = arg.subtype;
    return Promise.using(getDbus(), function(bus) {
      return getAvahiServer(bus).then(function(avahi) {
        return findAvailableServices(bus, avahi, {
          type: type,
          protocol: protocol,
          subtype: subtype
        });
      });
    });
  };

}).call(this);