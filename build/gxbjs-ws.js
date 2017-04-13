(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.gxbjs_ws = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _ChainWebSocket = require("./ChainWebSocket");

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

var _GXChainApi = require("./GXChainApi");

var _GXChainApi2 = _interopRequireDefault(_GXChainApi);

var _ChainConfig = require("./ChainConfig");

var _ChainConfig2 = _interopRequireDefault(_ChainConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } // var { List } = require("immutable");


var inst = void 0;

/**
    Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This returns a promise, once resolved the connection is ready.

    Import: import { Apis } from "@graphene/chain"

    Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

    Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).  Returns a promise with results.
*/

exports.default = {

    setRpcConnectionStatusCallback: function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
        if (inst) inst.setRpcConnectionStatusCallback(callback);
    },

    /**
        @arg {string} cs is only provided in the first call
        @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
    */
    reset: function reset() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

        if (inst) {
            inst.close();
            inst = null;
        }
        inst = new ApisInstance();
        inst.setRpcConnectionStatusCallback(this.statusCb);

        if (inst && connect) {
            inst.connect(cs, connectTimeout);
        }

        return inst;
    },
    instance: function instance() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

        if (!inst) {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
        }

        if (inst && connect) {
            inst.connect(cs, connectTimeout);
        }

        return inst;
    },
    chainId: function chainId() {
        return Apis.instance().chain_id;
    },

    close: function close() {
        if (inst) {
            inst.close();
            inst = null;
        }
    }
    // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
    // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
    // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
    // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))
};

var ApisInstance = function () {
    function ApisInstance() {
        _classCallCheck(this, ApisInstance);
    }

    /** @arg {string} connection .. */
    ApisInstance.prototype.connect = function connect(cs, connectTimeout) {
        var _this = this;

        // console.log("INFO\tApiInstances\tconnect\t", cs);

        var rpc_user = "",
            rpc_password = "";
        if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
            throw new Error("Secure domains require wss connection");
        }

        this.ws_rpc = new _ChainWebSocket2.default(cs, this.statusCb, connectTimeout);

        this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(function () {
            console.log("Connected to API node:", cs);
            _this._db = new _GXChainApi2.default(_this.ws_rpc, "database");
            _this._net = new _GXChainApi2.default(_this.ws_rpc, "network_broadcast");
            _this._hist = new _GXChainApi2.default(_this.ws_rpc, "history");
            _this._crypt = new _GXChainApi2.default(_this.ws_rpc, "crypto");
            var db_promise = _this._db.init().then(function () {
                //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                return _this._db.exec("get_chain_id", []).then(function (_chain_id) {
                    _this.chain_id = _chain_id;
                    return _ChainConfig2.default.setChainId(_chain_id);
                    //DEBUG console.log("chain_id1",this.chain_id)
                });
            });
            _this.ws_rpc.on_reconnect = function () {
                _this.ws_rpc.login("", "").then(function () {
                    _this._db.init().then(function () {
                        if (_this.statusCb) _this.statusCb("reconnect");
                    });
                    _this._net.init();
                    _this._hist.init();
                    _this._crypt.init();
                });
            };
            return Promise.all([db_promise, _this._net.init(), _this._hist.init(), _this._crypt.init()
            // Temporary squash crypto API error until the API is upgraded everywhere
            .catch(function (e) {
                return console.error("ApiInstance\tCrypto API Error", e);
            })]);
        });
    };

    ApisInstance.prototype.close = function close() {
        if (this.ws_rpc) this.ws_rpc.close();
        this.ws_rpc = null;
    };

    ApisInstance.prototype.db_api = function db_api() {
        return this._db;
    };

    ApisInstance.prototype.network_api = function network_api() {
        return this._net;
    };

    ApisInstance.prototype.history_api = function history_api() {
        return this._hist;
    };

    ApisInstance.prototype.crypto_api = function crypto_api() {
        return this._crypt;
    };

    ApisInstance.prototype.setRpcConnectionStatusCallback = function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
    };

    return ApisInstance;
}();

module.exports = exports["default"];
},{"./ChainConfig":2,"./ChainWebSocket":3,"./GXChainApi":4}],2:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;
var _this = void 0;

var ecc_config = {
    address_prefix: process.env.npm_config__graphene_ecc_default_address_prefix || "GXC"
};

_this = {
    core_asset: "GXC",
    address_prefix: "GXC",
    expire_in_secs: 15,
    expire_in_secs_proposal: 24 * 60 * 60,
    review_in_secs_committee: 24 * 60 * 60,
    networks: {
        GXC: {
            core_asset: "GXC",
            address_prefix: "GXC",
            chain_id: "e5129b7af67cc760b45b2afa8b6cd85d44a75ab07951762906c1cccbe84e5b34"
        }
    },

    /** Set a few properties for known chain IDs. */
    setChainId: function setChainId(chain_id) {

        var i = void 0,
            len = void 0,
            network = void 0,
            network_name = void 0,
            ref = void 0;
        ref = Object.keys(_this.networks);

        for (i = 0, len = ref.length; i < len; i++) {

            network_name = ref[i];
            network = _this.networks[network_name];

            if (network.chain_id === chain_id) {

                _this.network_name = network_name;

                if (network.address_prefix) {
                    _this.address_prefix = network.address_prefix;
                    ecc_config.address_prefix = network.address_prefix;
                }

                // console.log("INFO    Configured for", network_name, ":", network.core_asset, "\n");

                return {
                    network_name: network_name,
                    network: network
                };
            }
        }

        if (!_this.network_name) {
            console.log("Unknown chain id (this may be a testnet)", chain_id);
        }
    },

    reset: function reset() {
        _this.core_asset = "GXC";
        _this.address_prefix = "GXC";
        ecc_config.address_prefix = "GXC";
        _this.expire_in_secs = 15;
        _this.expire_in_secs_proposal = 24 * 60 * 60;

        console.log("Chain config reset");
    },

    setPrefix: function setPrefix() {
        var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "GXC";

        _this.address_prefix = prefix;
        ecc_config.address_prefix = prefix;
    }
};

exports.default = _this;
module.exports = exports["default"];
}).call(this,require('_process'))

},{"_process":7}],3:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebSocketClient = void 0;
if (typeof WebSocket === "undefined" && !process.env.browser) {
    WebSocketClient = require("ws");
} else if (typeof WebSocket !== "undefined" && typeof document !== "undefined") {
    WebSocketClient = require("ReconnectingWebSocket");
} else {
    WebSocketClient = WebSocket;
}

var SOCKET_DEBUG = false;

var ChainWebSocket = function () {
    function ChainWebSocket(ws_server, statusCb) {
        var _this = this;

        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

        _classCallCheck(this, ChainWebSocket);

        this.statusCb = statusCb;
        this.connectionTimeout = setTimeout(function () {
            if (_this.current_reject) _this.current_reject(new Error("Connection attempt timed out: " + ws_server));
        }, connectTimeout);
        try {
            this.ws = new WebSocketClient(ws_server);
        } catch (error) {
            console.error("invalid websocket URL:", error, ws_server);
            this.ws = new WebSocketClient("wss://127.0.0.1:8090");
        }
        this.ws.timeoutInterval = 5000;
        this.current_reject = null;
        this.on_reconnect = null;
        this.connect_promise = new Promise(function (resolve, reject) {
            _this.current_reject = reject;
            _this.ws.onopen = function () {
                clearTimeout(_this.connectionTimeout);
                if (_this.statusCb) _this.statusCb("open");
                if (_this.on_reconnect) _this.on_reconnect();
                resolve();
            };
            _this.ws.onerror = function (error) {
                clearTimeout(_this.connectionTimeout);
                if (_this.statusCb) _this.statusCb("error");

                if (_this.current_reject) {
                    _this.current_reject(error);
                }
            };
            _this.ws.onmessage = function (message) {
                return _this.listener(JSON.parse(message.data));
            };
            _this.ws.onclose = function () {
                if (_this.statusCb) _this.statusCb("closed");
            };
        });
        this.cbId = 0;
        this.cbs = {};
        this.subs = {};
        this.unsub = {};
    }

    ChainWebSocket.prototype.call = function call(params) {
        var _this2 = this;

        var method = params[1];
        if (SOCKET_DEBUG) console.log("[ChainWebSocket] >---- call ----->  \"id\":" + (this.cbId + 1), JSON.stringify(params));

        this.cbId += 1;

        if (method === "set_subscribe_callback" || method === "subscribe_to_market" || method === "broadcast_transaction_with_callback" || method === "set_pending_transaction_callback") {
            // Store callback in subs map
            this.subs[this.cbId] = {
                callback: params[2][0]
            };

            // Replace callback with the callback id
            params[2][0] = this.cbId;
        }

        if (method === "unsubscribe_from_market" || method === "unsubscribe_from_accounts") {
            if (typeof params[2][0] !== "function") {
                throw new Error("First parameter of unsub must be the original callback");
            }

            var unSubCb = params[2].splice(0, 1)[0];

            // Find the corresponding subscription
            for (var id in this.subs) {
                if (this.subs[id].callback === unSubCb) {
                    this.unsub[this.cbId] = id;
                    break;
                }
            }
        }

        var request = {
            method: "call",
            params: params
        };
        request.id = this.cbId;

        return new Promise(function (resolve, reject) {
            _this2.cbs[_this2.cbId] = {
                time: new Date(),
                resolve: resolve,
                reject: reject
            };
            _this2.ws.onerror = function (error) {
                console.log("!!! ChainWebSocket Error ", error);
                reject(error);
            };
            _this2.ws.send(JSON.stringify(request));
        });
    };

    ChainWebSocket.prototype.listener = function listener(response) {
        if (SOCKET_DEBUG) console.log("[ChainWebSocket] <---- reply ----<", JSON.stringify(response));

        var sub = false,
            callback = null;

        if (response.method === "notice") {
            sub = true;
            response.id = response.params[0];
        }

        if (!sub) {
            callback = this.cbs[response.id];
        } else {
            callback = this.subs[response.id].callback;
        }

        if (callback && !sub) {
            if (response.error) {
                callback.reject(response.error);
            } else {
                callback.resolve(response.result);
            }
            delete this.cbs[response.id];

            if (this.unsub[response.id]) {
                delete this.subs[this.unsub[response.id]];
                delete this.unsub[response.id];
            }
        } else if (callback && sub) {
            callback(response.params[1]);
        } else {
            console.log("Warning: unknown websocket response: ", response);
        }
    };

    ChainWebSocket.prototype.login = function login(user, password) {
        var _this3 = this;

        return this.connect_promise.then(function () {
            return _this3.call([1, "login", [user, password]]);
        });
    };

    ChainWebSocket.prototype.close = function close() {
        this.ws.close();
    };

    return ChainWebSocket;
}();

exports.default = ChainWebSocket;
module.exports = exports["default"];
}).call(this,require('_process'))

},{"ReconnectingWebSocket":5,"_process":7,"ws":6}],4:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GXChainApi = function () {
    function GXChainApi(ws_rpc, api_name) {
        _classCallCheck(this, GXChainApi);

        this.ws_rpc = ws_rpc;
        this.api_name = api_name;
    }

    GXChainApi.prototype.init = function init() {
        var self = this;
        return this.ws_rpc.call([1, this.api_name, []]).then(function (response) {
            //console.log("[GXChainApi.js:11] ----- GXChainApi.init ----->", this.api_name, response);
            self.api_id = response;
            return self;
        });
    };

    GXChainApi.prototype.exec = function exec(method, params) {
        return this.ws_rpc.call([this.api_id, method, params]).catch(function (error) {
            console.log("!!! GXChainApi error: ", method, params, error, JSON.stringify(error));
            throw error;
        });
    };

    return GXChainApi;
}();

exports.default = GXChainApi;
module.exports = exports["default"];
},{}],5:[function(require,module,exports){
// MIT License:
//
// Copyright (c) 2010-2012, Joe Walnes
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * This behaves like a WebSocket in every way, except if it fails to connect,
 * or it gets disconnected, it will repeatedly poll until it successfully connects
 * again.
 *
 * It is API compatible, so when you have:
 *   ws = new WebSocket('ws://....');
 * you can replace with:
 *   ws = new ReconnectingWebSocket('ws://....');
 *
 * The event stream will typically look like:
 *  onconnecting
 *  onopen
 *  onmessage
 *  onmessage
 *  onclose // lost connection
 *  onconnecting
 *  onopen  // sometime later...
 *  onmessage
 *  onmessage
 *  etc...
 *
 * It is API compatible with the standard WebSocket API, apart from the following members:
 *
 * - `bufferedAmount`
 * - `extensions`
 * - `binaryType`
 *
 * Latest version: https://github.com/joewalnes/reconnecting-websocket/
 * - Joe Walnes
 *
 * Syntax
 * ======
 * var socket = new ReconnectingWebSocket(url, protocols, options);
 *
 * Parameters
 * ==========
 * url - The url you are connecting to.
 * protocols - Optional string or array of protocols.
 * options - See below
 *
 * Options
 * =======
 * Options can either be passed upon instantiation or set after instantiation:
 *
 * var socket = new ReconnectingWebSocket(url, null, { debug: true, reconnectInterval: 4000 });
 *
 * or
 *
 * var socket = new ReconnectingWebSocket(url);
 * socket.debug = true;
 * socket.reconnectInterval = 4000;
 *
 * debug
 * - Whether this instance should log debug messages. Accepts true or false. Default: false.
 *
 * automaticOpen
 * - Whether or not the websocket should attempt to connect immediately upon instantiation. The socket can be manually opened or closed at any time using ws.open() and ws.close().
 *
 * reconnectInterval
 * - The number of milliseconds to delay before attempting to reconnect. Accepts integer. Default: 1000.
 *
 * maxReconnectInterval
 * - The maximum number of milliseconds to delay a reconnection attempt. Accepts integer. Default: 30000.
 *
 * reconnectDecay
 * - The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. Accepts integer or float. Default: 1.5.
 *
 * timeoutInterval
 * - The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. Accepts integer. Default: 2000.
 *
 */
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module !== 'undefined' && module.exports){
        module.exports = factory();
    } else {
        global.ReconnectingWebSocket = factory();
    }
})(this, function () {

    if (typeof window === "undefined" || !('WebSocket' in window)) {
        return;
    }

    function ReconnectingWebSocket(url, protocols, options) {

        // Default settings
        var settings = {

            /** Whether this instance should log debug messages. */
            debug: false,

            /** Whether or not the websocket should attempt to connect immediately upon instantiation. */
            automaticOpen: true,

            /** The number of milliseconds to delay before attempting to reconnect. */
            reconnectInterval: 1000,
            /** The maximum number of milliseconds to delay a reconnection attempt. */
            maxReconnectInterval: 30000,
            /** The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. */
            reconnectDecay: 1.5,

            /** The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. */
            timeoutInterval: 2000,

            /** The maximum number of reconnection attempts to make. Unlimited if null. */
            maxReconnectAttempts: null,

            /** The binary type, possible values 'blob' or 'arraybuffer', default 'blob'. */
            binaryType: 'blob'
        }
        if (!options) { options = {}; }

        // Overwrite and define settings with options if they exist.
        for (var key in settings) {
            if (typeof options[key] !== 'undefined') {
                this[key] = options[key];
            } else {
                this[key] = settings[key];
            }
        }

        // These should be treated as read-only properties

        /** The URL as resolved by the constructor. This is always an absolute URL. Read only. */
        this.url = url;

        /** The number of attempted reconnects since starting, or the last successful connection. Read only. */
        this.reconnectAttempts = 0;

        /**
         * The current state of the connection.
         * Can be one of: WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED
         * Read only.
         */
        this.readyState = WebSocket.CONNECTING;

        /**
         * A string indicating the name of the sub-protocol the server selected; this will be one of
         * the strings specified in the protocols parameter when creating the WebSocket object.
         * Read only.
         */
        this.protocol = null;

        // Private state variables

        var self = this;
        var ws;
        var forcedClose = false;
        var timedOut = false;
        var t = null;
        var eventTarget = document.createElement('div');

        // Wire up "on*" properties as event handlers

        eventTarget.addEventListener('open',       function(event) { self.onopen(event); });
        eventTarget.addEventListener('close',      function(event) { self.onclose(event); });
        eventTarget.addEventListener('connecting', function(event) { self.onconnecting(event); });
        eventTarget.addEventListener('message',    function(event) { self.onmessage(event); });
        eventTarget.addEventListener('error',      function(event) { self.onerror(event); });

        // Expose the API required by EventTarget

        this.addEventListener = eventTarget.addEventListener.bind(eventTarget);
        this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
        this.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);

        /**
         * This function generates an event that is compatible with standard
         * compliant browsers and IE9 - IE11
         *
         * This will prevent the error:
         * Object doesn't support this action
         *
         * http://stackoverflow.com/questions/19345392/why-arent-my-parameters-getting-passed-through-to-a-dispatched-event/19345563#19345563
         * @param s String The name that the event should use
         * @param args Object an optional object that the event will use
         */
        function generateEvent(s, args) {
        	var evt = document.createEvent("CustomEvent");
        	evt.initCustomEvent(s, false, false, args);
        	return evt;
        };

        this.open = function (reconnectAttempt) {
            ws = new WebSocket(self.url, protocols || []);
            ws.binaryType = this.binaryType;

            if (reconnectAttempt) {
                if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
                    return;
                }
            } else {
                eventTarget.dispatchEvent(generateEvent('connecting'));
                this.reconnectAttempts = 0;
            }

            if (self.debug || ReconnectingWebSocket.debugAll) {
                console.debug('ReconnectingWebSocket', 'attempt-connect', self.url);
            }

            var localWs = ws;
            var timeout = setTimeout(function() {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'connection-timeout', self.url);
                }
                timedOut = true;
                localWs.close();
                timedOut = false;
            }, self.timeoutInterval);

            ws.onopen = function(event) {
                clearTimeout(timeout);
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onopen', self.url);
                }
                self.protocol = ws.protocol;
                self.readyState = WebSocket.OPEN;
                self.reconnectAttempts = 0;
                var e = generateEvent('open');
                e.isReconnect = reconnectAttempt;
                reconnectAttempt = false;
                eventTarget.dispatchEvent(e);
            };

            ws.onclose = function(event) {
                clearTimeout(timeout);
                ws = null;
                if (forcedClose) {
                    self.readyState = WebSocket.CLOSED;
                    eventTarget.dispatchEvent(generateEvent('close'));
                } else {
                    self.readyState = WebSocket.CONNECTING;
                    var e = generateEvent('connecting');
                    e.code = event.code;
                    e.reason = event.reason;
                    e.wasClean = event.wasClean;
                    eventTarget.dispatchEvent(e);
                    if (!reconnectAttempt && !timedOut) {
                        if (self.debug || ReconnectingWebSocket.debugAll) {
                            console.debug('ReconnectingWebSocket', 'onclose', self.url);
                        }
                        eventTarget.dispatchEvent(generateEvent('close'));
                    }

                    var timeout = self.reconnectInterval * Math.pow(self.reconnectDecay, self.reconnectAttempts);
                    t = setTimeout(function() {
                        self.reconnectAttempts++;
                        self.open(true);
                    }, timeout > self.maxReconnectInterval ? self.maxReconnectInterval : timeout);
                }
            };
            ws.onmessage = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onmessage', self.url, event.data);
                }
                var e = generateEvent('message');
                e.data = event.data;
                eventTarget.dispatchEvent(e);
            };
            ws.onerror = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onerror', self.url, event);
                }
                eventTarget.dispatchEvent(generateEvent('error'));
            };
        }

        // Whether or not to create a websocket upon instantiation
        if (this.automaticOpen == true) {
            this.open(false);
        }

        /**
         * Transmits data to the server over the WebSocket connection.
         *
         * @param data a text string, ArrayBuffer or Blob to send to the server.
         */
        this.send = function(data) {
            if (ws) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'send', self.url, data);
                }
                return ws.send(data);
            } else {
                throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
            }
        };

        /**
         * Closes the WebSocket connection or connection attempt, if any.
         * If the connection is already CLOSED, this method does nothing.
         */
        this.close = function(code, reason) {
            // Default CLOSE_NORMAL code
            if (typeof code == 'undefined') {
                code = 1000;
            }
            forcedClose = true;
            if (ws) {
                ws.close(code, reason);
            }
            if (t) {
                clearTimeout(t);
                t = null;
            }
        };

        /**
         * Additional public API method to refresh the connection if still open (close, re-open).
         * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
         */
        this.refresh = function() {
            if (ws) {
                ws.close();
            }
        };
    }

    /**
     * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
     * this indicates that the connection is ready to send and receive data.
     */
    ReconnectingWebSocket.prototype.onopen = function(event) {};
    /** An event listener to be called when the WebSocket connection's readyState changes to CLOSED. */
    ReconnectingWebSocket.prototype.onclose = function(event) {};
    /** An event listener to be called when a connection begins being attempted. */
    ReconnectingWebSocket.prototype.onconnecting = function(event) {};
    /** An event listener to be called when a message is received from the server. */
    ReconnectingWebSocket.prototype.onmessage = function(event) {};
    /** An event listener to be called when an error occurs. */
    ReconnectingWebSocket.prototype.onerror = function(event) {};

    /**
     * Whether all instances of ReconnectingWebSocket should log debug messages.
     * Setting this to true is the equivalent of setting all instances of ReconnectingWebSocket.debug to true.
     */
    ReconnectingWebSocket.debugAll = false;

    ReconnectingWebSocket.CONNECTING = WebSocket.CONNECTING;
    ReconnectingWebSocket.OPEN = WebSocket.OPEN;
    ReconnectingWebSocket.CLOSING = WebSocket.CLOSING;
    ReconnectingWebSocket.CLOSED = WebSocket.CLOSED;

    return ReconnectingWebSocket;
});

},{}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjanMvc3JjL0FwaUluc3RhbmNlcy5qcyIsImNqcy9zcmMvQ2hhaW5Db25maWcuanMiLCJjanMvc3JjL0NoYWluV2ViU29ja2V0LmpzIiwiY2pzL3NyYy9HWENoYWluQXBpLmpzIiwibm9kZV9tb2R1bGVzL1JlY29ubmVjdGluZ1dlYlNvY2tldC9yZWNvbm5lY3Rpbmctd2Vic29ja2V0LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9lbXB0eS5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xYQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9DaGFpbldlYlNvY2tldCA9IHJlcXVpcmUoXCIuL0NoYWluV2ViU29ja2V0XCIpO1xuXG52YXIgX0NoYWluV2ViU29ja2V0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NoYWluV2ViU29ja2V0KTtcblxudmFyIF9HWENoYWluQXBpID0gcmVxdWlyZShcIi4vR1hDaGFpbkFwaVwiKTtcblxudmFyIF9HWENoYWluQXBpMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0dYQ2hhaW5BcGkpO1xuXG52YXIgX0NoYWluQ29uZmlnID0gcmVxdWlyZShcIi4vQ2hhaW5Db25maWdcIik7XG5cbnZhciBfQ2hhaW5Db25maWcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2hhaW5Db25maWcpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfSAvLyB2YXIgeyBMaXN0IH0gPSByZXF1aXJlKFwiaW1tdXRhYmxlXCIpO1xuXG5cbnZhciBpbnN0ID0gdm9pZCAwO1xuXG4vKipcbiAgICBDb25maWd1cmU6IGNvbmZpZ3VyZSBhcyBmb2xsb3dzIGBBcGlzLmluc3RhbmNlKFwid3M6Ly9sb2NhbGhvc3Q6ODA5MFwiKS5pbml0X3Byb21pc2VgLiAgVGhpcyByZXR1cm5zIGEgcHJvbWlzZSwgb25jZSByZXNvbHZlZCB0aGUgY29ubmVjdGlvbiBpcyByZWFkeS5cblxuICAgIEltcG9ydDogaW1wb3J0IHsgQXBpcyB9IGZyb20gXCJAZ3JhcGhlbmUvY2hhaW5cIlxuXG4gICAgU2hvcnQtaGFuZDogQXBpcy5kYihcIm1ldGhvZFwiLCBcInBhcm0xXCIsIDIsIDMsIC4uLikuICBSZXR1cm5zIGEgcHJvbWlzZSB3aXRoIHJlc3VsdHMuXG5cbiAgICBBZGRpdGlvbmFsIHVzYWdlOiBBcGlzLmluc3RhbmNlKCkuZGJfYXBpKCkuZXhlYyhcIm1ldGhvZFwiLCBbXCJtZXRob2RcIiwgXCJwYXJtMVwiLCAyLCAzLCAuLi5dKS4gIFJldHVybnMgYSBwcm9taXNlIHdpdGggcmVzdWx0cy5cbiovXG5cbmV4cG9ydHMuZGVmYXVsdCA9IHtcblxuICAgIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjazogZnVuY3Rpb24gc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuc3RhdHVzQ2IgPSBjYWxsYmFjaztcbiAgICAgICAgaWYgKGluc3QpIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICAgIEBhcmcge3N0cmluZ30gY3MgaXMgb25seSBwcm92aWRlZCBpbiB0aGUgZmlyc3QgY2FsbFxuICAgICAgICBAcmV0dXJuIHtBcGlzfSBzaW5nbGV0b24gLi4gQ2hlY2sgQXBpcy5pbnN0YW5jZSgpLmluaXRfcHJvbWlzZSB0byBrbm93IHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgZXN0YWJsaXNoZWRcbiAgICAqL1xuICAgIHJlc2V0OiBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAgICAgdmFyIGNzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBcIndzOi8vbG9jYWxob3N0OjgwOTBcIjtcbiAgICAgICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG4gICAgICAgIHZhciBjb25uZWN0VGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogNDAwMDtcblxuICAgICAgICBpZiAoaW5zdCkge1xuICAgICAgICAgICAgaW5zdC5jbG9zZSgpO1xuICAgICAgICAgICAgaW5zdCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdCA9IG5ldyBBcGlzSW5zdGFuY2UoKTtcbiAgICAgICAgaW5zdC5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sodGhpcy5zdGF0dXNDYik7XG5cbiAgICAgICAgaWYgKGluc3QgJiYgY29ubmVjdCkge1xuICAgICAgICAgICAgaW5zdC5jb25uZWN0KGNzLCBjb25uZWN0VGltZW91dCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5zdDtcbiAgICB9LFxuICAgIGluc3RhbmNlOiBmdW5jdGlvbiBpbnN0YW5jZSgpIHtcbiAgICAgICAgdmFyIGNzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBcIndzOi8vbG9jYWxob3N0OjgwOTBcIjtcbiAgICAgICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG4gICAgICAgIHZhciBjb25uZWN0VGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogNDAwMDtcblxuICAgICAgICBpZiAoIWluc3QpIHtcbiAgICAgICAgICAgIGluc3QgPSBuZXcgQXBpc0luc3RhbmNlKCk7XG4gICAgICAgICAgICBpbnN0LnNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayh0aGlzLnN0YXR1c0NiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbnN0ICYmIGNvbm5lY3QpIHtcbiAgICAgICAgICAgIGluc3QuY29ubmVjdChjcywgY29ubmVjdFRpbWVvdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3Q7XG4gICAgfSxcbiAgICBjaGFpbklkOiBmdW5jdGlvbiBjaGFpbklkKCkge1xuICAgICAgICByZXR1cm4gQXBpcy5pbnN0YW5jZSgpLmNoYWluX2lkO1xuICAgIH0sXG5cbiAgICBjbG9zZTogZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgIGlmIChpbnN0KSB7XG4gICAgICAgICAgICBpbnN0LmNsb3NlKCk7XG4gICAgICAgICAgICBpbnN0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBkYjogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmRiX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIG5ldHdvcms6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5uZXR3b3JrX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIGhpc3Rvcnk6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5oaXN0b3J5X2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIGNyeXB0bzogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmNyeXB0b19hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKVxufTtcblxudmFyIEFwaXNJbnN0YW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBBcGlzSW5zdGFuY2UoKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBBcGlzSW5zdGFuY2UpO1xuICAgIH1cblxuICAgIC8qKiBAYXJnIHtzdHJpbmd9IGNvbm5lY3Rpb24gLi4gKi9cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbiBjb25uZWN0KGNzLCBjb25uZWN0VGltZW91dCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiSU5GT1xcdEFwaUluc3RhbmNlc1xcdGNvbm5lY3RcXHRcIiwgY3MpO1xuXG4gICAgICAgIHZhciBycGNfdXNlciA9IFwiXCIsXG4gICAgICAgICAgICBycGNfcGFzc3dvcmQgPSBcIlwiO1xuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3cubG9jYXRpb24gJiYgd2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIGNzLmluZGV4T2YoXCJ3c3M6Ly9cIikgPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZWN1cmUgZG9tYWlucyByZXF1aXJlIHdzcyBjb25uZWN0aW9uXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy53c19ycGMgPSBuZXcgX0NoYWluV2ViU29ja2V0Mi5kZWZhdWx0KGNzLCB0aGlzLnN0YXR1c0NiLCBjb25uZWN0VGltZW91dCk7XG5cbiAgICAgICAgdGhpcy5pbml0X3Byb21pc2UgPSB0aGlzLndzX3JwYy5sb2dpbihycGNfdXNlciwgcnBjX3Bhc3N3b3JkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGVkIHRvIEFQSSBub2RlOlwiLCBjcyk7XG4gICAgICAgICAgICBfdGhpcy5fZGIgPSBuZXcgX0dYQ2hhaW5BcGkyLmRlZmF1bHQoX3RoaXMud3NfcnBjLCBcImRhdGFiYXNlXCIpO1xuICAgICAgICAgICAgX3RoaXMuX25ldCA9IG5ldyBfR1hDaGFpbkFwaTIuZGVmYXVsdChfdGhpcy53c19ycGMsIFwibmV0d29ya19icm9hZGNhc3RcIik7XG4gICAgICAgICAgICBfdGhpcy5faGlzdCA9IG5ldyBfR1hDaGFpbkFwaTIuZGVmYXVsdChfdGhpcy53c19ycGMsIFwiaGlzdG9yeVwiKTtcbiAgICAgICAgICAgIF90aGlzLl9jcnlwdCA9IG5ldyBfR1hDaGFpbkFwaTIuZGVmYXVsdChfdGhpcy53c19ycGMsIFwiY3J5cHRvXCIpO1xuICAgICAgICAgICAgdmFyIGRiX3Byb21pc2UgPSBfdGhpcy5fZGIuaW5pdCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vaHR0cHM6Ly9naXRodWIuY29tL2NyeXB0b25vbWV4L2dyYXBoZW5lL3dpa2kvY2hhaW4tbG9ja2VkLXR4XG4gICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLl9kYi5leGVjKFwiZ2V0X2NoYWluX2lkXCIsIFtdKS50aGVuKGZ1bmN0aW9uIChfY2hhaW5faWQpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuY2hhaW5faWQgPSBfY2hhaW5faWQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfQ2hhaW5Db25maWcyLmRlZmF1bHQuc2V0Q2hhaW5JZChfY2hhaW5faWQpO1xuICAgICAgICAgICAgICAgICAgICAvL0RFQlVHIGNvbnNvbGUubG9nKFwiY2hhaW5faWQxXCIsdGhpcy5jaGFpbl9pZClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgX3RoaXMud3NfcnBjLm9uX3JlY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy53c19ycGMubG9naW4oXCJcIiwgXCJcIikudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLl9kYi5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwicmVjb25uZWN0XCIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuX25ldC5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLl9oaXN0LmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2NyeXB0LmluaXQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW2RiX3Byb21pc2UsIF90aGlzLl9uZXQuaW5pdCgpLCBfdGhpcy5faGlzdC5pbml0KCksIF90aGlzLl9jcnlwdC5pbml0KClcbiAgICAgICAgICAgIC8vIFRlbXBvcmFyeSBzcXVhc2ggY3J5cHRvIEFQSSBlcnJvciB1bnRpbCB0aGUgQVBJIGlzIHVwZ3JhZGVkIGV2ZXJ5d2hlcmVcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb25zb2xlLmVycm9yKFwiQXBpSW5zdGFuY2VcXHRDcnlwdG8gQVBJIEVycm9yXCIsIGUpO1xuICAgICAgICAgICAgfSldKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMud3NfcnBjKSB0aGlzLndzX3JwYy5jbG9zZSgpO1xuICAgICAgICB0aGlzLndzX3JwYyA9IG51bGw7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuZGJfYXBpID0gZnVuY3Rpb24gZGJfYXBpKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGI7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUubmV0d29ya19hcGkgPSBmdW5jdGlvbiBuZXR3b3JrX2FwaSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25ldDtcbiAgICB9O1xuXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5oaXN0b3J5X2FwaSA9IGZ1bmN0aW9uIGhpc3RvcnlfYXBpKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdDtcbiAgICB9O1xuXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5jcnlwdG9fYXBpID0gZnVuY3Rpb24gY3J5cHRvX2FwaSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NyeXB0O1xuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLnNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayA9IGZ1bmN0aW9uIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjaykge1xuICAgICAgICB0aGlzLnN0YXR1c0NiID0gY2FsbGJhY2s7XG4gICAgfTtcblxuICAgIHJldHVybiBBcGlzSW5zdGFuY2U7XG59KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1tcImRlZmF1bHRcIl07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG52YXIgX3RoaXMgPSB2b2lkIDA7XG5cbnZhciBlY2NfY29uZmlnID0ge1xuICAgIGFkZHJlc3NfcHJlZml4OiBwcm9jZXNzLmVudi5ucG1fY29uZmlnX19ncmFwaGVuZV9lY2NfZGVmYXVsdF9hZGRyZXNzX3ByZWZpeCB8fCBcIkdYQ1wiXG59O1xuXG5fdGhpcyA9IHtcbiAgICBjb3JlX2Fzc2V0OiBcIkdYQ1wiLFxuICAgIGFkZHJlc3NfcHJlZml4OiBcIkdYQ1wiLFxuICAgIGV4cGlyZV9pbl9zZWNzOiAxNSxcbiAgICBleHBpcmVfaW5fc2Vjc19wcm9wb3NhbDogMjQgKiA2MCAqIDYwLFxuICAgIHJldmlld19pbl9zZWNzX2NvbW1pdHRlZTogMjQgKiA2MCAqIDYwLFxuICAgIG5ldHdvcmtzOiB7XG4gICAgICAgIEdYQzoge1xuICAgICAgICAgICAgY29yZV9hc3NldDogXCJHWENcIixcbiAgICAgICAgICAgIGFkZHJlc3NfcHJlZml4OiBcIkdYQ1wiLFxuICAgICAgICAgICAgY2hhaW5faWQ6IFwiZTUxMjliN2FmNjdjYzc2MGI0NWIyYWZhOGI2Y2Q4NWQ0NGE3NWFiMDc5NTE3NjI5MDZjMWNjY2JlODRlNWIzNFwiXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqIFNldCBhIGZldyBwcm9wZXJ0aWVzIGZvciBrbm93biBjaGFpbiBJRHMuICovXG4gICAgc2V0Q2hhaW5JZDogZnVuY3Rpb24gc2V0Q2hhaW5JZChjaGFpbl9pZCkge1xuXG4gICAgICAgIHZhciBpID0gdm9pZCAwLFxuICAgICAgICAgICAgbGVuID0gdm9pZCAwLFxuICAgICAgICAgICAgbmV0d29yayA9IHZvaWQgMCxcbiAgICAgICAgICAgIG5ldHdvcmtfbmFtZSA9IHZvaWQgMCxcbiAgICAgICAgICAgIHJlZiA9IHZvaWQgMDtcbiAgICAgICAgcmVmID0gT2JqZWN0LmtleXMoX3RoaXMubmV0d29ya3MpO1xuXG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXG4gICAgICAgICAgICBuZXR3b3JrX25hbWUgPSByZWZbaV07XG4gICAgICAgICAgICBuZXR3b3JrID0gX3RoaXMubmV0d29ya3NbbmV0d29ya19uYW1lXTtcblxuICAgICAgICAgICAgaWYgKG5ldHdvcmsuY2hhaW5faWQgPT09IGNoYWluX2lkKSB7XG5cbiAgICAgICAgICAgICAgICBfdGhpcy5uZXR3b3JrX25hbWUgPSBuZXR3b3JrX25hbWU7XG5cbiAgICAgICAgICAgICAgICBpZiAobmV0d29yay5hZGRyZXNzX3ByZWZpeCkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5hZGRyZXNzX3ByZWZpeCA9IG5ldHdvcmsuYWRkcmVzc19wcmVmaXg7XG4gICAgICAgICAgICAgICAgICAgIGVjY19jb25maWcuYWRkcmVzc19wcmVmaXggPSBuZXR3b3JrLmFkZHJlc3NfcHJlZml4O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiSU5GTyAgICBDb25maWd1cmVkIGZvclwiLCBuZXR3b3JrX25hbWUsIFwiOlwiLCBuZXR3b3JrLmNvcmVfYXNzZXQsIFwiXFxuXCIpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya19uYW1lOiBuZXR3b3JrX25hbWUsXG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcms6IG5ldHdvcmtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFfdGhpcy5uZXR3b3JrX25hbWUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5rbm93biBjaGFpbiBpZCAodGhpcyBtYXkgYmUgYSB0ZXN0bmV0KVwiLCBjaGFpbl9pZCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVzZXQ6IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgICBfdGhpcy5jb3JlX2Fzc2V0ID0gXCJHWENcIjtcbiAgICAgICAgX3RoaXMuYWRkcmVzc19wcmVmaXggPSBcIkdYQ1wiO1xuICAgICAgICBlY2NfY29uZmlnLmFkZHJlc3NfcHJlZml4ID0gXCJHWENcIjtcbiAgICAgICAgX3RoaXMuZXhwaXJlX2luX3NlY3MgPSAxNTtcbiAgICAgICAgX3RoaXMuZXhwaXJlX2luX3NlY3NfcHJvcG9zYWwgPSAyNCAqIDYwICogNjA7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJDaGFpbiBjb25maWcgcmVzZXRcIik7XG4gICAgfSxcblxuICAgIHNldFByZWZpeDogZnVuY3Rpb24gc2V0UHJlZml4KCkge1xuICAgICAgICB2YXIgcHJlZml4ID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBcIkdYQ1wiO1xuXG4gICAgICAgIF90aGlzLmFkZHJlc3NfcHJlZml4ID0gcHJlZml4O1xuICAgICAgICBlY2NfY29uZmlnLmFkZHJlc3NfcHJlZml4ID0gcHJlZml4O1xuICAgIH1cbn07XG5cbmV4cG9ydHMuZGVmYXVsdCA9IF90aGlzO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzW1wiZGVmYXVsdFwiXTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIFdlYlNvY2tldENsaWVudCA9IHZvaWQgMDtcbmlmICh0eXBlb2YgV2ViU29ja2V0ID09PSBcInVuZGVmaW5lZFwiICYmICFwcm9jZXNzLmVudi5icm93c2VyKSB7XG4gICAgV2ViU29ja2V0Q2xpZW50ID0gcmVxdWlyZShcIndzXCIpO1xufSBlbHNlIGlmICh0eXBlb2YgV2ViU29ja2V0ICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIFdlYlNvY2tldENsaWVudCA9IHJlcXVpcmUoXCJSZWNvbm5lY3RpbmdXZWJTb2NrZXRcIik7XG59IGVsc2Uge1xuICAgIFdlYlNvY2tldENsaWVudCA9IFdlYlNvY2tldDtcbn1cblxudmFyIFNPQ0tFVF9ERUJVRyA9IGZhbHNlO1xuXG52YXIgQ2hhaW5XZWJTb2NrZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ2hhaW5XZWJTb2NrZXQod3Nfc2VydmVyLCBzdGF0dXNDYikge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIHZhciBjb25uZWN0VGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogNDAwMDtcblxuICAgICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgQ2hhaW5XZWJTb2NrZXQpO1xuXG4gICAgICAgIHRoaXMuc3RhdHVzQ2IgPSBzdGF0dXNDYjtcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKF90aGlzLmN1cnJlbnRfcmVqZWN0KSBfdGhpcy5jdXJyZW50X3JlamVjdChuZXcgRXJyb3IoXCJDb25uZWN0aW9uIGF0dGVtcHQgdGltZWQgb3V0OiBcIiArIHdzX3NlcnZlcikpO1xuICAgICAgICB9LCBjb25uZWN0VGltZW91dCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLndzID0gbmV3IFdlYlNvY2tldENsaWVudCh3c19zZXJ2ZXIpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImludmFsaWQgd2Vic29ja2V0IFVSTDpcIiwgZXJyb3IsIHdzX3NlcnZlcik7XG4gICAgICAgICAgICB0aGlzLndzID0gbmV3IFdlYlNvY2tldENsaWVudChcIndzczovLzEyNy4wLjAuMTo4MDkwXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMud3MudGltZW91dEludGVydmFsID0gNTAwMDtcbiAgICAgICAgdGhpcy5jdXJyZW50X3JlamVjdCA9IG51bGw7XG4gICAgICAgIHRoaXMub25fcmVjb25uZWN0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5jb25uZWN0X3Byb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBfdGhpcy5jdXJyZW50X3JlamVjdCA9IHJlamVjdDtcbiAgICAgICAgICAgIF90aGlzLndzLm9ub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMuY29ubmVjdGlvblRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5zdGF0dXNDYikgX3RoaXMuc3RhdHVzQ2IoXCJvcGVuXCIpO1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5vbl9yZWNvbm5lY3QpIF90aGlzLm9uX3JlY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBfdGhpcy53cy5vbmVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmNvbm5lY3Rpb25UaW1lb3V0KTtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwiZXJyb3JcIik7XG5cbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuY3VycmVudF9yZWplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuY3VycmVudF9yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBfdGhpcy53cy5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5saXN0ZW5lcihKU09OLnBhcnNlKG1lc3NhZ2UuZGF0YSkpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIF90aGlzLndzLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLnN0YXR1c0NiKSBfdGhpcy5zdGF0dXNDYihcImNsb3NlZFwiKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmNiSWQgPSAwO1xuICAgICAgICB0aGlzLmNicyA9IHt9O1xuICAgICAgICB0aGlzLnN1YnMgPSB7fTtcbiAgICAgICAgdGhpcy51bnN1YiA9IHt9O1xuICAgIH1cblxuICAgIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gY2FsbChwYXJhbXMpIHtcbiAgICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIG1ldGhvZCA9IHBhcmFtc1sxXTtcbiAgICAgICAgaWYgKFNPQ0tFVF9ERUJVRykgY29uc29sZS5sb2coXCJbQ2hhaW5XZWJTb2NrZXRdID4tLS0tIGNhbGwgLS0tLS0+ICBcXFwiaWRcXFwiOlwiICsgKHRoaXMuY2JJZCArIDEpLCBKU09OLnN0cmluZ2lmeShwYXJhbXMpKTtcblxuICAgICAgICB0aGlzLmNiSWQgKz0gMTtcblxuICAgICAgICBpZiAobWV0aG9kID09PSBcInNldF9zdWJzY3JpYmVfY2FsbGJhY2tcIiB8fCBtZXRob2QgPT09IFwic3Vic2NyaWJlX3RvX21hcmtldFwiIHx8IG1ldGhvZCA9PT0gXCJicm9hZGNhc3RfdHJhbnNhY3Rpb25fd2l0aF9jYWxsYmFja1wiIHx8IG1ldGhvZCA9PT0gXCJzZXRfcGVuZGluZ190cmFuc2FjdGlvbl9jYWxsYmFja1wiKSB7XG4gICAgICAgICAgICAvLyBTdG9yZSBjYWxsYmFjayBpbiBzdWJzIG1hcFxuICAgICAgICAgICAgdGhpcy5zdWJzW3RoaXMuY2JJZF0gPSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IHBhcmFtc1syXVswXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gUmVwbGFjZSBjYWxsYmFjayB3aXRoIHRoZSBjYWxsYmFjayBpZFxuICAgICAgICAgICAgcGFyYW1zWzJdWzBdID0gdGhpcy5jYklkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX21hcmtldFwiIHx8IG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX2FjY291bnRzXCIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGFyYW1zWzJdWzBdICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBwYXJhbWV0ZXIgb2YgdW5zdWIgbXVzdCBiZSB0aGUgb3JpZ2luYWwgY2FsbGJhY2tcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB1blN1YkNiID0gcGFyYW1zWzJdLnNwbGljZSgwLCAxKVswXTtcblxuICAgICAgICAgICAgLy8gRmluZCB0aGUgY29ycmVzcG9uZGluZyBzdWJzY3JpcHRpb25cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuc3Vicykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN1YnNbaWRdLmNhbGxiYWNrID09PSB1blN1YkNiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJbdGhpcy5jYklkXSA9IGlkO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIG1ldGhvZDogXCJjYWxsXCIsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1xuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LmlkID0gdGhpcy5jYklkO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBfdGhpczIuY2JzW190aGlzMi5jYklkXSA9IHtcbiAgICAgICAgICAgICAgICB0aW1lOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgICAgIHJlc29sdmU6IHJlc29sdmUsXG4gICAgICAgICAgICAgICAgcmVqZWN0OiByZWplY3RcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBfdGhpczIud3Mub25lcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiISEhIENoYWluV2ViU29ja2V0IEVycm9yIFwiLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBfdGhpczIud3Muc2VuZChKU09OLnN0cmluZ2lmeShyZXF1ZXN0KSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUubGlzdGVuZXIgPSBmdW5jdGlvbiBsaXN0ZW5lcihyZXNwb25zZSkge1xuICAgICAgICBpZiAoU09DS0VUX0RFQlVHKSBjb25zb2xlLmxvZyhcIltDaGFpbldlYlNvY2tldF0gPC0tLS0gcmVwbHkgLS0tLTxcIiwgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcblxuICAgICAgICB2YXIgc3ViID0gZmFsc2UsXG4gICAgICAgICAgICBjYWxsYmFjayA9IG51bGw7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlLm1ldGhvZCA9PT0gXCJub3RpY2VcIikge1xuICAgICAgICAgICAgc3ViID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlc3BvbnNlLmlkID0gcmVzcG9uc2UucGFyYW1zWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzdWIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdGhpcy5jYnNbcmVzcG9uc2UuaWRdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB0aGlzLnN1YnNbcmVzcG9uc2UuaWRdLmNhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICYmICFzdWIpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5lcnJvcikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLnJlamVjdChyZXNwb25zZS5lcnJvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLnJlc29sdmUocmVzcG9uc2UucmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNic1tyZXNwb25zZS5pZF07XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnVuc3ViW3Jlc3BvbnNlLmlkXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnN1YnNbdGhpcy51bnN1YltyZXNwb25zZS5pZF1dO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnVuc3ViW3Jlc3BvbnNlLmlkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjYWxsYmFjayAmJiBzdWIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLnBhcmFtc1sxXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIldhcm5pbmc6IHVua25vd24gd2Vic29ja2V0IHJlc3BvbnNlOiBcIiwgcmVzcG9uc2UpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uIGxvZ2luKHVzZXIsIHBhc3N3b3JkKSB7XG4gICAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmNvbm5lY3RfcHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczMuY2FsbChbMSwgXCJsb2dpblwiLCBbdXNlciwgcGFzc3dvcmRdXSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICAgICAgdGhpcy53cy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gQ2hhaW5XZWJTb2NrZXQ7XG59KCk7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IENoYWluV2ViU29ja2V0O1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzW1wiZGVmYXVsdFwiXTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIEdYQ2hhaW5BcGkgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gR1hDaGFpbkFwaSh3c19ycGMsIGFwaV9uYW1lKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBHWENoYWluQXBpKTtcblxuICAgICAgICB0aGlzLndzX3JwYyA9IHdzX3JwYztcbiAgICAgICAgdGhpcy5hcGlfbmFtZSA9IGFwaV9uYW1lO1xuICAgIH1cblxuICAgIEdYQ2hhaW5BcGkucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiB0aGlzLndzX3JwYy5jYWxsKFsxLCB0aGlzLmFwaV9uYW1lLCBbXV0pLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiW0dYQ2hhaW5BcGkuanM6MTFdIC0tLS0tIEdYQ2hhaW5BcGkuaW5pdCAtLS0tLT5cIiwgdGhpcy5hcGlfbmFtZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgc2VsZi5hcGlfaWQgPSByZXNwb25zZTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgR1hDaGFpbkFwaS5wcm90b3R5cGUuZXhlYyA9IGZ1bmN0aW9uIGV4ZWMobWV0aG9kLCBwYXJhbXMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3NfcnBjLmNhbGwoW3RoaXMuYXBpX2lkLCBtZXRob2QsIHBhcmFtc10pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCIhISEgR1hDaGFpbkFwaSBlcnJvcjogXCIsIG1ldGhvZCwgcGFyYW1zLCBlcnJvciwgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEdYQ2hhaW5BcGk7XG59KCk7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IEdYQ2hhaW5BcGk7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbXCJkZWZhdWx0XCJdOyIsIi8vIE1JVCBMaWNlbnNlOlxuLy9cbi8vIENvcHlyaWdodCAoYykgMjAxMC0yMDEyLCBKb2UgV2FsbmVzXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuLy8gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuLy8gaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuLy8gdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuLy8gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4vLyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4vLyBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuLy8gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbi8vIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbi8vIFRIRSBTT0ZUV0FSRS5cblxuLyoqXG4gKiBUaGlzIGJlaGF2ZXMgbGlrZSBhIFdlYlNvY2tldCBpbiBldmVyeSB3YXksIGV4Y2VwdCBpZiBpdCBmYWlscyB0byBjb25uZWN0LFxuICogb3IgaXQgZ2V0cyBkaXNjb25uZWN0ZWQsIGl0IHdpbGwgcmVwZWF0ZWRseSBwb2xsIHVudGlsIGl0IHN1Y2Nlc3NmdWxseSBjb25uZWN0c1xuICogYWdhaW4uXG4gKlxuICogSXQgaXMgQVBJIGNvbXBhdGlibGUsIHNvIHdoZW4geW91IGhhdmU6XG4gKiAgIHdzID0gbmV3IFdlYlNvY2tldCgnd3M6Ly8uLi4uJyk7XG4gKiB5b3UgY2FuIHJlcGxhY2Ugd2l0aDpcbiAqICAgd3MgPSBuZXcgUmVjb25uZWN0aW5nV2ViU29ja2V0KCd3czovLy4uLi4nKTtcbiAqXG4gKiBUaGUgZXZlbnQgc3RyZWFtIHdpbGwgdHlwaWNhbGx5IGxvb2sgbGlrZTpcbiAqICBvbmNvbm5lY3RpbmdcbiAqICBvbm9wZW5cbiAqICBvbm1lc3NhZ2VcbiAqICBvbm1lc3NhZ2VcbiAqICBvbmNsb3NlIC8vIGxvc3QgY29ubmVjdGlvblxuICogIG9uY29ubmVjdGluZ1xuICogIG9ub3BlbiAgLy8gc29tZXRpbWUgbGF0ZXIuLi5cbiAqICBvbm1lc3NhZ2VcbiAqICBvbm1lc3NhZ2VcbiAqICBldGMuLi5cbiAqXG4gKiBJdCBpcyBBUEkgY29tcGF0aWJsZSB3aXRoIHRoZSBzdGFuZGFyZCBXZWJTb2NrZXQgQVBJLCBhcGFydCBmcm9tIHRoZSBmb2xsb3dpbmcgbWVtYmVyczpcbiAqXG4gKiAtIGBidWZmZXJlZEFtb3VudGBcbiAqIC0gYGV4dGVuc2lvbnNgXG4gKiAtIGBiaW5hcnlUeXBlYFxuICpcbiAqIExhdGVzdCB2ZXJzaW9uOiBodHRwczovL2dpdGh1Yi5jb20vam9ld2FsbmVzL3JlY29ubmVjdGluZy13ZWJzb2NrZXQvXG4gKiAtIEpvZSBXYWxuZXNcbiAqXG4gKiBTeW50YXhcbiAqID09PT09PVxuICogdmFyIHNvY2tldCA9IG5ldyBSZWNvbm5lY3RpbmdXZWJTb2NrZXQodXJsLCBwcm90b2NvbHMsIG9wdGlvbnMpO1xuICpcbiAqIFBhcmFtZXRlcnNcbiAqID09PT09PT09PT1cbiAqIHVybCAtIFRoZSB1cmwgeW91IGFyZSBjb25uZWN0aW5nIHRvLlxuICogcHJvdG9jb2xzIC0gT3B0aW9uYWwgc3RyaW5nIG9yIGFycmF5IG9mIHByb3RvY29scy5cbiAqIG9wdGlvbnMgLSBTZWUgYmVsb3dcbiAqXG4gKiBPcHRpb25zXG4gKiA9PT09PT09XG4gKiBPcHRpb25zIGNhbiBlaXRoZXIgYmUgcGFzc2VkIHVwb24gaW5zdGFudGlhdGlvbiBvciBzZXQgYWZ0ZXIgaW5zdGFudGlhdGlvbjpcbiAqXG4gKiB2YXIgc29ja2V0ID0gbmV3IFJlY29ubmVjdGluZ1dlYlNvY2tldCh1cmwsIG51bGwsIHsgZGVidWc6IHRydWUsIHJlY29ubmVjdEludGVydmFsOiA0MDAwIH0pO1xuICpcbiAqIG9yXG4gKlxuICogdmFyIHNvY2tldCA9IG5ldyBSZWNvbm5lY3RpbmdXZWJTb2NrZXQodXJsKTtcbiAqIHNvY2tldC5kZWJ1ZyA9IHRydWU7XG4gKiBzb2NrZXQucmVjb25uZWN0SW50ZXJ2YWwgPSA0MDAwO1xuICpcbiAqIGRlYnVnXG4gKiAtIFdoZXRoZXIgdGhpcyBpbnN0YW5jZSBzaG91bGQgbG9nIGRlYnVnIG1lc3NhZ2VzLiBBY2NlcHRzIHRydWUgb3IgZmFsc2UuIERlZmF1bHQ6IGZhbHNlLlxuICpcbiAqIGF1dG9tYXRpY09wZW5cbiAqIC0gV2hldGhlciBvciBub3QgdGhlIHdlYnNvY2tldCBzaG91bGQgYXR0ZW1wdCB0byBjb25uZWN0IGltbWVkaWF0ZWx5IHVwb24gaW5zdGFudGlhdGlvbi4gVGhlIHNvY2tldCBjYW4gYmUgbWFudWFsbHkgb3BlbmVkIG9yIGNsb3NlZCBhdCBhbnkgdGltZSB1c2luZyB3cy5vcGVuKCkgYW5kIHdzLmNsb3NlKCkuXG4gKlxuICogcmVjb25uZWN0SW50ZXJ2YWxcbiAqIC0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkgYmVmb3JlIGF0dGVtcHRpbmcgdG8gcmVjb25uZWN0LiBBY2NlcHRzIGludGVnZXIuIERlZmF1bHQ6IDEwMDAuXG4gKlxuICogbWF4UmVjb25uZWN0SW50ZXJ2YWxcbiAqIC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheSBhIHJlY29ubmVjdGlvbiBhdHRlbXB0LiBBY2NlcHRzIGludGVnZXIuIERlZmF1bHQ6IDMwMDAwLlxuICpcbiAqIHJlY29ubmVjdERlY2F5XG4gKiAtIFRoZSByYXRlIG9mIGluY3JlYXNlIG9mIHRoZSByZWNvbm5lY3QgZGVsYXkuIEFsbG93cyByZWNvbm5lY3QgYXR0ZW1wdHMgdG8gYmFjayBvZmYgd2hlbiBwcm9ibGVtcyBwZXJzaXN0LiBBY2NlcHRzIGludGVnZXIgb3IgZmxvYXQuIERlZmF1bHQ6IDEuNS5cbiAqXG4gKiB0aW1lb3V0SW50ZXJ2YWxcbiAqIC0gVGhlIG1heGltdW0gdGltZSBpbiBtaWxsaXNlY29uZHMgdG8gd2FpdCBmb3IgYSBjb25uZWN0aW9uIHRvIHN1Y2NlZWQgYmVmb3JlIGNsb3NpbmcgYW5kIHJldHJ5aW5nLiBBY2NlcHRzIGludGVnZXIuIERlZmF1bHQ6IDIwMDAuXG4gKlxuICovXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKXtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ2xvYmFsLlJlY29ubmVjdGluZ1dlYlNvY2tldCA9IGZhY3RvcnkoKTtcbiAgICB9XG59KSh0aGlzLCBmdW5jdGlvbiAoKSB7XG5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhKCdXZWJTb2NrZXQnIGluIHdpbmRvdykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIFJlY29ubmVjdGluZ1dlYlNvY2tldCh1cmwsIHByb3RvY29scywgb3B0aW9ucykge1xuXG4gICAgICAgIC8vIERlZmF1bHQgc2V0dGluZ3NcbiAgICAgICAgdmFyIHNldHRpbmdzID0ge1xuXG4gICAgICAgICAgICAvKiogV2hldGhlciB0aGlzIGluc3RhbmNlIHNob3VsZCBsb2cgZGVidWcgbWVzc2FnZXMuICovXG4gICAgICAgICAgICBkZWJ1ZzogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKiBXaGV0aGVyIG9yIG5vdCB0aGUgd2Vic29ja2V0IHNob3VsZCBhdHRlbXB0IHRvIGNvbm5lY3QgaW1tZWRpYXRlbHkgdXBvbiBpbnN0YW50aWF0aW9uLiAqL1xuICAgICAgICAgICAgYXV0b21hdGljT3BlbjogdHJ1ZSxcblxuICAgICAgICAgICAgLyoqIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5IGJlZm9yZSBhdHRlbXB0aW5nIHRvIHJlY29ubmVjdC4gKi9cbiAgICAgICAgICAgIHJlY29ubmVjdEludGVydmFsOiAxMDAwLFxuICAgICAgICAgICAgLyoqIFRoZSBtYXhpbXVtIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkgYSByZWNvbm5lY3Rpb24gYXR0ZW1wdC4gKi9cbiAgICAgICAgICAgIG1heFJlY29ubmVjdEludGVydmFsOiAzMDAwMCxcbiAgICAgICAgICAgIC8qKiBUaGUgcmF0ZSBvZiBpbmNyZWFzZSBvZiB0aGUgcmVjb25uZWN0IGRlbGF5LiBBbGxvd3MgcmVjb25uZWN0IGF0dGVtcHRzIHRvIGJhY2sgb2ZmIHdoZW4gcHJvYmxlbXMgcGVyc2lzdC4gKi9cbiAgICAgICAgICAgIHJlY29ubmVjdERlY2F5OiAxLjUsXG5cbiAgICAgICAgICAgIC8qKiBUaGUgbWF4aW11bSB0aW1lIGluIG1pbGxpc2Vjb25kcyB0byB3YWl0IGZvciBhIGNvbm5lY3Rpb24gdG8gc3VjY2VlZCBiZWZvcmUgY2xvc2luZyBhbmQgcmV0cnlpbmcuICovXG4gICAgICAgICAgICB0aW1lb3V0SW50ZXJ2YWw6IDIwMDAsXG5cbiAgICAgICAgICAgIC8qKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgcmVjb25uZWN0aW9uIGF0dGVtcHRzIHRvIG1ha2UuIFVubGltaXRlZCBpZiBudWxsLiAqL1xuICAgICAgICAgICAgbWF4UmVjb25uZWN0QXR0ZW1wdHM6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKiBUaGUgYmluYXJ5IHR5cGUsIHBvc3NpYmxlIHZhbHVlcyAnYmxvYicgb3IgJ2FycmF5YnVmZmVyJywgZGVmYXVsdCAnYmxvYicuICovXG4gICAgICAgICAgICBiaW5hcnlUeXBlOiAnYmxvYidcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9wdGlvbnMpIHsgb3B0aW9ucyA9IHt9OyB9XG5cbiAgICAgICAgLy8gT3ZlcndyaXRlIGFuZCBkZWZpbmUgc2V0dGluZ3Mgd2l0aCBvcHRpb25zIGlmIHRoZXkgZXhpc3QuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzZXR0aW5ncykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zW2tleV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBzZXR0aW5nc1trZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlc2Ugc2hvdWxkIGJlIHRyZWF0ZWQgYXMgcmVhZC1vbmx5IHByb3BlcnRpZXNcblxuICAgICAgICAvKiogVGhlIFVSTCBhcyByZXNvbHZlZCBieSB0aGUgY29uc3RydWN0b3IuIFRoaXMgaXMgYWx3YXlzIGFuIGFic29sdXRlIFVSTC4gUmVhZCBvbmx5LiAqL1xuICAgICAgICB0aGlzLnVybCA9IHVybDtcblxuICAgICAgICAvKiogVGhlIG51bWJlciBvZiBhdHRlbXB0ZWQgcmVjb25uZWN0cyBzaW5jZSBzdGFydGluZywgb3IgdGhlIGxhc3Qgc3VjY2Vzc2Z1bCBjb25uZWN0aW9uLiBSZWFkIG9ubHkuICovXG4gICAgICAgIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPSAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgY29ubmVjdGlvbi5cbiAgICAgICAgICogQ2FuIGJlIG9uZSBvZjogV2ViU29ja2V0LkNPTk5FQ1RJTkcsIFdlYlNvY2tldC5PUEVOLCBXZWJTb2NrZXQuQ0xPU0lORywgV2ViU29ja2V0LkNMT1NFRFxuICAgICAgICAgKiBSZWFkIG9ubHkuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ09OTkVDVElORztcblxuICAgICAgICAvKipcbiAgICAgICAgICogQSBzdHJpbmcgaW5kaWNhdGluZyB0aGUgbmFtZSBvZiB0aGUgc3ViLXByb3RvY29sIHRoZSBzZXJ2ZXIgc2VsZWN0ZWQ7IHRoaXMgd2lsbCBiZSBvbmUgb2ZcbiAgICAgICAgICogdGhlIHN0cmluZ3Mgc3BlY2lmaWVkIGluIHRoZSBwcm90b2NvbHMgcGFyYW1ldGVyIHdoZW4gY3JlYXRpbmcgdGhlIFdlYlNvY2tldCBvYmplY3QuXG4gICAgICAgICAqIFJlYWQgb25seS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucHJvdG9jb2wgPSBudWxsO1xuXG4gICAgICAgIC8vIFByaXZhdGUgc3RhdGUgdmFyaWFibGVzXG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgd3M7XG4gICAgICAgIHZhciBmb3JjZWRDbG9zZSA9IGZhbHNlO1xuICAgICAgICB2YXIgdGltZWRPdXQgPSBmYWxzZTtcbiAgICAgICAgdmFyIHQgPSBudWxsO1xuICAgICAgICB2YXIgZXZlbnRUYXJnZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICAvLyBXaXJlIHVwIFwib24qXCIgcHJvcGVydGllcyBhcyBldmVudCBoYW5kbGVyc1xuXG4gICAgICAgIGV2ZW50VGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCAgICAgICBmdW5jdGlvbihldmVudCkgeyBzZWxmLm9ub3BlbihldmVudCk7IH0pO1xuICAgICAgICBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsICAgICAgZnVuY3Rpb24oZXZlbnQpIHsgc2VsZi5vbmNsb3NlKGV2ZW50KTsgfSk7XG4gICAgICAgIGV2ZW50VGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nvbm5lY3RpbmcnLCBmdW5jdGlvbihldmVudCkgeyBzZWxmLm9uY29ubmVjdGluZyhldmVudCk7IH0pO1xuICAgICAgICBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgICAgZnVuY3Rpb24oZXZlbnQpIHsgc2VsZi5vbm1lc3NhZ2UoZXZlbnQpOyB9KTtcbiAgICAgICAgZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAgICAgIGZ1bmN0aW9uKGV2ZW50KSB7IHNlbGYub25lcnJvcihldmVudCk7IH0pO1xuXG4gICAgICAgIC8vIEV4cG9zZSB0aGUgQVBJIHJlcXVpcmVkIGJ5IEV2ZW50VGFyZ2V0XG5cbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyID0gZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lci5iaW5kKGV2ZW50VGFyZ2V0KTtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyID0gZXZlbnRUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lci5iaW5kKGV2ZW50VGFyZ2V0KTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50ID0gZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudC5iaW5kKGV2ZW50VGFyZ2V0KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhpcyBmdW5jdGlvbiBnZW5lcmF0ZXMgYW4gZXZlbnQgdGhhdCBpcyBjb21wYXRpYmxlIHdpdGggc3RhbmRhcmRcbiAgICAgICAgICogY29tcGxpYW50IGJyb3dzZXJzIGFuZCBJRTkgLSBJRTExXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoaXMgd2lsbCBwcmV2ZW50IHRoZSBlcnJvcjpcbiAgICAgICAgICogT2JqZWN0IGRvZXNuJ3Qgc3VwcG9ydCB0aGlzIGFjdGlvblxuICAgICAgICAgKlxuICAgICAgICAgKiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE5MzQ1MzkyL3doeS1hcmVudC1teS1wYXJhbWV0ZXJzLWdldHRpbmctcGFzc2VkLXRocm91Z2gtdG8tYS1kaXNwYXRjaGVkLWV2ZW50LzE5MzQ1NTYzIzE5MzQ1NTYzXG4gICAgICAgICAqIEBwYXJhbSBzIFN0cmluZyBUaGUgbmFtZSB0aGF0IHRoZSBldmVudCBzaG91bGQgdXNlXG4gICAgICAgICAqIEBwYXJhbSBhcmdzIE9iamVjdCBhbiBvcHRpb25hbCBvYmplY3QgdGhhdCB0aGUgZXZlbnQgd2lsbCB1c2VcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdlbmVyYXRlRXZlbnQocywgYXJncykge1xuICAgICAgICBcdHZhciBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkN1c3RvbUV2ZW50XCIpO1xuICAgICAgICBcdGV2dC5pbml0Q3VzdG9tRXZlbnQocywgZmFsc2UsIGZhbHNlLCBhcmdzKTtcbiAgICAgICAgXHRyZXR1cm4gZXZ0O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub3BlbiA9IGZ1bmN0aW9uIChyZWNvbm5lY3RBdHRlbXB0KSB7XG4gICAgICAgICAgICB3cyA9IG5ldyBXZWJTb2NrZXQoc2VsZi51cmwsIHByb3RvY29scyB8fCBbXSk7XG4gICAgICAgICAgICB3cy5iaW5hcnlUeXBlID0gdGhpcy5iaW5hcnlUeXBlO1xuXG4gICAgICAgICAgICBpZiAocmVjb25uZWN0QXR0ZW1wdCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1heFJlY29ubmVjdEF0dGVtcHRzICYmIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPiB0aGlzLm1heFJlY29ubmVjdEF0dGVtcHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZ2VuZXJhdGVFdmVudCgnY29ubmVjdGluZycpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlY29ubmVjdEF0dGVtcHRzID0gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ2F0dGVtcHQtY29ubmVjdCcsIHNlbGYudXJsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxvY2FsV3MgPSB3cztcbiAgICAgICAgICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ2Nvbm5lY3Rpb24tdGltZW91dCcsIHNlbGYudXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGltZWRPdXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGxvY2FsV3MuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB0aW1lZE91dCA9IGZhbHNlO1xuICAgICAgICAgICAgfSwgc2VsZi50aW1lb3V0SW50ZXJ2YWwpO1xuXG4gICAgICAgICAgICB3cy5vbm9wZW4gPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ29ub3BlbicsIHNlbGYudXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5wcm90b2NvbCA9IHdzLnByb3RvY29sO1xuICAgICAgICAgICAgICAgIHNlbGYucmVhZHlTdGF0ZSA9IFdlYlNvY2tldC5PUEVOO1xuICAgICAgICAgICAgICAgIHNlbGYucmVjb25uZWN0QXR0ZW1wdHMgPSAwO1xuICAgICAgICAgICAgICAgIHZhciBlID0gZ2VuZXJhdGVFdmVudCgnb3BlbicpO1xuICAgICAgICAgICAgICAgIGUuaXNSZWNvbm5lY3QgPSByZWNvbm5lY3RBdHRlbXB0O1xuICAgICAgICAgICAgICAgIHJlY29ubmVjdEF0dGVtcHQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgd3Mub25jbG9zZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHdzID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoZm9yY2VkQ2xvc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5yZWFkeVN0YXRlID0gV2ViU29ja2V0LkNMT1NFRDtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChnZW5lcmF0ZUV2ZW50KCdjbG9zZScpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ09OTkVDVElORztcbiAgICAgICAgICAgICAgICAgICAgdmFyIGUgPSBnZW5lcmF0ZUV2ZW50KCdjb25uZWN0aW5nJyk7XG4gICAgICAgICAgICAgICAgICAgIGUuY29kZSA9IGV2ZW50LmNvZGU7XG4gICAgICAgICAgICAgICAgICAgIGUucmVhc29uID0gZXZlbnQucmVhc29uO1xuICAgICAgICAgICAgICAgICAgICBlLndhc0NsZWFuID0gZXZlbnQud2FzQ2xlYW47XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVjb25uZWN0QXR0ZW1wdCAmJiAhdGltZWRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JlY29ubmVjdGluZ1dlYlNvY2tldCcsICdvbmNsb3NlJywgc2VsZi51cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChnZW5lcmF0ZUV2ZW50KCdjbG9zZScpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0aW1lb3V0ID0gc2VsZi5yZWNvbm5lY3RJbnRlcnZhbCAqIE1hdGgucG93KHNlbGYucmVjb25uZWN0RGVjYXksIHNlbGYucmVjb25uZWN0QXR0ZW1wdHMpO1xuICAgICAgICAgICAgICAgICAgICB0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYucmVjb25uZWN0QXR0ZW1wdHMrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYub3Blbih0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgdGltZW91dCA+IHNlbGYubWF4UmVjb25uZWN0SW50ZXJ2YWwgPyBzZWxmLm1heFJlY29ubmVjdEludGVydmFsIDogdGltZW91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdzLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JlY29ubmVjdGluZ1dlYlNvY2tldCcsICdvbm1lc3NhZ2UnLCBzZWxmLnVybCwgZXZlbnQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBlID0gZ2VuZXJhdGVFdmVudCgnbWVzc2FnZScpO1xuICAgICAgICAgICAgICAgIGUuZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB3cy5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ29uZXJyb3InLCBzZWxmLnVybCwgZXZlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGdlbmVyYXRlRXZlbnQoJ2Vycm9yJykpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdoZXRoZXIgb3Igbm90IHRvIGNyZWF0ZSBhIHdlYnNvY2tldCB1cG9uIGluc3RhbnRpYXRpb25cbiAgICAgICAgaWYgKHRoaXMuYXV0b21hdGljT3BlbiA9PSB0cnVlKSB7XG4gICAgICAgICAgICB0aGlzLm9wZW4oZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRyYW5zbWl0cyBkYXRhIHRvIHRoZSBzZXJ2ZXIgb3ZlciB0aGUgV2ViU29ja2V0IGNvbm5lY3Rpb24uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBkYXRhIGEgdGV4dCBzdHJpbmcsIEFycmF5QnVmZmVyIG9yIEJsb2IgdG8gc2VuZCB0byB0aGUgc2VydmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZW5kID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgaWYgKHdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JlY29ubmVjdGluZ1dlYlNvY2tldCcsICdzZW5kJywgc2VsZi51cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gd3Muc2VuZChkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ0lOVkFMSURfU1RBVEVfRVJSIDogUGF1c2luZyB0byByZWNvbm5lY3Qgd2Vic29ja2V0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2xvc2VzIHRoZSBXZWJTb2NrZXQgY29ubmVjdGlvbiBvciBjb25uZWN0aW9uIGF0dGVtcHQsIGlmIGFueS5cbiAgICAgICAgICogSWYgdGhlIGNvbm5lY3Rpb24gaXMgYWxyZWFkeSBDTE9TRUQsIHRoaXMgbWV0aG9kIGRvZXMgbm90aGluZy5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbihjb2RlLCByZWFzb24pIHtcbiAgICAgICAgICAgIC8vIERlZmF1bHQgQ0xPU0VfTk9STUFMIGNvZGVcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29kZSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvZGUgPSAxMDAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yY2VkQ2xvc2UgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKHdzKSB7XG4gICAgICAgICAgICAgICAgd3MuY2xvc2UoY29kZSwgcmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHQpO1xuICAgICAgICAgICAgICAgIHQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGRpdGlvbmFsIHB1YmxpYyBBUEkgbWV0aG9kIHRvIHJlZnJlc2ggdGhlIGNvbm5lY3Rpb24gaWYgc3RpbGwgb3BlbiAoY2xvc2UsIHJlLW9wZW4pLlxuICAgICAgICAgKiBGb3IgZXhhbXBsZSwgaWYgdGhlIGFwcCBzdXNwZWN0cyBiYWQgZGF0YSAvIG1pc3NlZCBoZWFydCBiZWF0cywgaXQgY2FuIHRyeSB0byByZWZyZXNoLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5yZWZyZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAod3MpIHtcbiAgICAgICAgICAgICAgICB3cy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFuIGV2ZW50IGxpc3RlbmVyIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBXZWJTb2NrZXQgY29ubmVjdGlvbidzIHJlYWR5U3RhdGUgY2hhbmdlcyB0byBPUEVOO1xuICAgICAqIHRoaXMgaW5kaWNhdGVzIHRoYXQgdGhlIGNvbm5lY3Rpb24gaXMgcmVhZHkgdG8gc2VuZCBhbmQgcmVjZWl2ZSBkYXRhLlxuICAgICAqL1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5wcm90b3R5cGUub25vcGVuID0gZnVuY3Rpb24oZXZlbnQpIHt9O1xuICAgIC8qKiBBbiBldmVudCBsaXN0ZW5lciB0byBiZSBjYWxsZWQgd2hlbiB0aGUgV2ViU29ja2V0IGNvbm5lY3Rpb24ncyByZWFkeVN0YXRlIGNoYW5nZXMgdG8gQ0xPU0VELiAqL1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5wcm90b3R5cGUub25jbG9zZSA9IGZ1bmN0aW9uKGV2ZW50KSB7fTtcbiAgICAvKiogQW4gZXZlbnQgbGlzdGVuZXIgdG8gYmUgY2FsbGVkIHdoZW4gYSBjb25uZWN0aW9uIGJlZ2lucyBiZWluZyBhdHRlbXB0ZWQuICovXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LnByb3RvdHlwZS5vbmNvbm5lY3RpbmcgPSBmdW5jdGlvbihldmVudCkge307XG4gICAgLyoqIEFuIGV2ZW50IGxpc3RlbmVyIHRvIGJlIGNhbGxlZCB3aGVuIGEgbWVzc2FnZSBpcyByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXIuICovXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LnByb3RvdHlwZS5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCkge307XG4gICAgLyoqIEFuIGV2ZW50IGxpc3RlbmVyIHRvIGJlIGNhbGxlZCB3aGVuIGFuIGVycm9yIG9jY3Vycy4gKi9cbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQucHJvdG90eXBlLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge307XG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIGFsbCBpbnN0YW5jZXMgb2YgUmVjb25uZWN0aW5nV2ViU29ja2V0IHNob3VsZCBsb2cgZGVidWcgbWVzc2FnZXMuXG4gICAgICogU2V0dGluZyB0aGlzIHRvIHRydWUgaXMgdGhlIGVxdWl2YWxlbnQgb2Ygc2V0dGluZyBhbGwgaW5zdGFuY2VzIG9mIFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1ZyB0byB0cnVlLlxuICAgICAqL1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCA9IGZhbHNlO1xuXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LkNPTk5FQ1RJTkcgPSBXZWJTb2NrZXQuQ09OTkVDVElORztcbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuT1BFTiA9IFdlYlNvY2tldC5PUEVOO1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5DTE9TSU5HID0gV2ViU29ja2V0LkNMT1NJTkc7XG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LkNMT1NFRCA9IFdlYlNvY2tldC5DTE9TRUQ7XG5cbiAgICByZXR1cm4gUmVjb25uZWN0aW5nV2ViU29ja2V0O1xufSk7XG4iLCIiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIl19
