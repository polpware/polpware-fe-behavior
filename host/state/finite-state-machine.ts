/**
 * @fileOverview
 * Provides a class representing a finite state machine.
 * @name FSM.js
 * @module hypercom/state/FSM
 * @author Xiaolong Tang <xxlongtang@gmail.com>
 * @license Copyright @me
 */
import * as dependencies from 'principleware-fe-dependencies';
import * as ClassBuilder from 'principleware-tinymce-tailor/src/util/Class';
import { ok as typeAssert, tyString } from 'principleware-fe-utilities/src/typing/type-checker';
import { replace } from 'principleware-fe-utilities/src/tools/string';

'use strict';
// A set of helper functions
const _ = dependencies.underscore,
    StateMachine = dependencies['state-machine'],
    isFunction = _.isFunction,
    indexOf = _.indexOf,
    without = _.without,
    transitionKeyFormat = '{from}2{to}',
    callbackKeyFormat = 'on{key}',
    errorMessageFormat = 'event{name} from {from} to {to} fails. Error code: {code} and message: {msg} and args: {args}';

/**
 * Builds a handler with necessary context information.
 * The resulting return value is a closure indeed.
 * @private
 * @function buildHandlerInClosure
 * @param {Object} context Instance of the state machine.
 * @param {String} key 
 * @returns {Function} 
 */
function buildHandlerInClosure(context, key) {
    return function() {
        var i, func, ourHandlers;
        ourHandlers = context._handlers;
        ourHandlers = ourHandlers[key];
        if (!ourHandlers) {
            return;
        }
        for (i = 0; i < ourHandlers.length; i++) {
            func = ourHandlers[i];
            func.apply(null, arguments);
        }
    };
}

/**
 * Default error handler for the FSM.
 * @private
 * @function defaultErrorHandler
 * @param {String} eventName
 * @param {String} from
 * @param {String} to
 * @param {Array} args
 * @param {Number} errorCode
 * @param {String} errorMessage
 */
function defaultErrorHandler(eventName, from, to, args, errorCode, errorMessage) {
    var info = replace(errorMessageFormat, {
        name: eventName,
        from: from,
        to: to,
        code: errorCode,
        msg: errorMessage,
        args: args
    });
    console.log(info);
}

/**
 * Represents a finite state machine.
 * The resulting FSM is built upon a commonly used javascript
 * state machine library.
 * Such a design (of architecture) is based on the following considerations:
 * - A user-friendly interface for defining states and their behaviors
 * - A kind of model-checking capability for verifying the correctness of
 * transitions
 * - Support for asychronous and synchrous transitions
 * - Support for global exception handling
 * @class FSM
 */
export const FiniteStateMachineCtor = ClassBuilder.extend({
    Properties: 'impl',
    /**
     * constructor
     * @private
     * @function init
     */
    init: function() {
        var self = this;
        self._impl = null;
        self._initState = null;
        self._errorHandler = null;
        self._stateConfiguration = {};
        self._transitionConfiguration = {};
        self._handlers = {};
    },
    /**
     * Checks if FSM is in configuration stage.
     * @private 
     * @function ensureConfigureStage
     * @throws {} 
     */
    ensureConfigureStage: function() {
        if (this._impl) {
            throw new Error('State machine has started.');
        }
    },
    /**
     * Checks if FSM is in running stage.
     * @private
     * @function ensureRunningStage
     * @throws {} 
     */
    ensureRunningStage: function() {
        if (!this._impl) {
            throw new Error('State machine has not yet started.');
        }
    },
    /**
     * Defines the behavior when the FSM moves into a state by a transition.
     * @callback FSM~stateCallback
     * @param {String} event The event corresponding to the transition of states.
     * @param {String} from The source of the transition.
     * @param {String} to The target of the transition.
     */
    /**
     * Defines a new state and optionally a callback for this state.
     * @function addState
     * @param {String} name The state name.
     * @param {FSM~stateCallback}[] callback The optional callback for this state.
     * @return {Object} self
     * @throws {Error} 
     */
    addState: function(name, callback) {
        // Pre-conditions
        typeAssert(name, tyString);
        this.ensureConfigureStage();
        var self = this,
            stateConf = self._stateConfiguration;
        if (stateConf[name]) {
            throw new Error('Redefined state: ' + name);
        }
        stateConf[name] = { callback: callback };
        return self;
    },
    /**
     * Defines the init state for the FSM.
     * @function setInitState
     * @param {String} name The init state.
     * @return {Object} self
     * @throws {} 
     */
    setInitState: function(name) {
        // Pre-conditions
        typeAssert(name, tyString);
        this.ensureConfigureStage();

        var self = this;
        if (self._initState) {
            throw new Error('Redefined init state: ' + self._initState);
        }
        self._initState = name;
        return self;
    },
    /**
     * Defines the behavior when the FSM moves from one state to another.
     * @callback FSM~transitionCallback
     * @param {String} event The event corresponding to the transition of states.
     * @param {String} from The source of the transition.
     * @param {String} to The target of the transition.
     * @param {String} msg The message along with the transition.
     */
    /**
     * Defines a new stransition.
     * @function addTransition
     * @param {String} from the source state for the new transition.
     * @param {String} to the target for the new transition.
     * @param {FSM~transitionCallback} callback the optional callback for this transition.
     * @return {Object} self
     * @throws {Error} 
     */
    addTransition: function(from, to, callback) {
        // Pre-condition
        typeAssert(from, tyString);
        typeAssert(to, tyString);
        this.ensureConfigureStage();

        var self = this,
            stateConf = self._stateConfiguration,
            transitionConf = self._transitionConfiguration,
            key;
        if (!stateConf[from]) {
            throw new Error('Undefined source state: ' + from);
        }
        if (!stateConf[to]) {
            throw new Error('Undefined target state: ' + to);
        }
        key = replace(transitionKeyFormat, { from: from, to: to });
        if (transitionConf[key]) {
            throw new Error('Redefined transition: ' + from + ' -> ' + to);
        }
        transitionConf[key] = { from: from, to: to, callback: callback };
        return self;
    },
    /**
     * Starts the FSM. Note that this method must be invoked before
     * any method which may change the state of the FSM.
     * @function start
     * @return {Object} self
     * @throws {} 
     */
    start: function() {

        this.ensureConfigureStage();
        if (!this._initState) {
            throw new Error('Init state has not been defined.');
        }

        var self = this,
            handlers = self._handlers,
            stateConf,
            transitionConf,
            events,
            key,
            element,
            callbackName;
        // Definition
        stateConf = self._stateConfiguration;
        transitionConf = self._transitionConfiguration;
        events = [];
        for (key in transitionConf) {
            element = transitionConf[key];
            events.push({
                name: key,
                from: element.from,
                to: element.to
            });
            if (isFunction(element.callback)) {
                handlers[key] = handlers[key] || [];
                handlers[key].push(element.callback);
            }
        }
        for (key in stateConf) {
            element = stateConf[key];
            if (isFunction(element.callback)) {
                callbackName = replace(callbackKeyFormat, { key: key });
                handlers[callbackName] = handlers[callbackName] || [];
                handlers[callbackName].push(element.callback);
            }
        }
        self._impl = StateMachine.create({
            initial: self._initState,
            events: events,
            error: self._errorHandler || defaultErrorHandler
        });
        handlers.onenterstate = [];
        handlers.onexitstate = [];
        for (key in handlers) {
            self._impl[key] = buildHandlerInClosure(self, key);
        }

        return self;
    },

    /**
     * Registers a handler for enterstate
     * @function onEnterState
     * @param {Function} handler
     * @throws {Error} 
     */
    onEnterState: function(handler) {
        var ourHandlers = this._handlers.onenterstate;
        if (indexOf(ourHandlers, handler) >= 0) {
            throw new Error('Re-registering a hander!');
        }
        ourHandlers.push(handler);
        return this;
    },

    /**
     * Registers a handler for exitstate
     * @param {Function} handler 
     * @throws {Error} 
     */
    onExitState: function(handler) {
        var ourHandlers = this._handlers.onexitstate;
        if (indexOf(ourHandlers, handler) >= 0) {
            throw new Error('Registering a hander!');
        }
        ourHandlers.push(handler);
        return this;
    },

    /**
     * Un-register a handler for enterstate 
     * @param {Function} handler
     */
    offEnterState: function(handler) {
        var ourHandlers = this._handlers.onenterstate;
        this._handlers.onenterstate = without(ourHandlers, handler);
        return this;
    },

    /**
     * Un-register a handler for exitstate
     * @param {Function} handler
     */
    offExitState: function(handler) {
        var ourHandlers = this._handlers.onexitstate;
        this._handlers.onexitstate = without(ourHandlers, handler);
        return this;
    },

    /**
     * Performs a transition to the given state.
     * This method also validate the transition.
     * @function go
     * @param {String} to The target state.
     * @return {Object} self
     * @throws {Error} 
     */
    go: function(to) {
        typeAssert(to, tyString);
        this.ensureRunningStage();

        var self = this,
            impl = self._impl,
            stateConf,
            currentState,
            functionName,
            func;
        stateConf = self._stateConfiguration;
        if (!stateConf[to]) {
            throw new Error('Go to undefined state: ' + to);
        }
        if (impl.is(to)) {
            // TODO: check if the underlying implementation takes into account
            // moving from one state to itself
            return self;
        }
        currentState = impl.current;
        functionName = replace(transitionKeyFormat, { from: currentState, to: to });
        // Validate if this transition is allowed or not
        if (impl.cannot(functionName)) {
            throw new Error('Transition is not allowed: ' + currentState + ' -> ' + to);
        }
        // Invoke this function
        func = impl[functionName];
        func.call(impl);
        return self;
    },
    /**
     * Defines the error handler for the FSM.
     * @callback FSM~errorHandler
     * @param {String} eventName
     * @param {String} from
     * @param {String} to
     * @param {Array} args
     * @param {Number} errorCode
     * @param {String} errorMessage
     */
    /**
     * Provides the error handler for the FSM.
     * @function addErrorHandler
     * @param {FSM~errorHandler} fn Error handler.
     * @return {Object} self
     * @throws {Error} 
     */
    addErrorHandler: function(fn) {
        this.ensureConfigureStage();
        if (isFunction(fn)) {
            this._errorHandler = fn;
        }
        return this;
    },
    /**
     * Returns the current state.
     * @function current
     * @returns {String} 
     */
    current: function() {
        this.ensureRunningStage();
        return this._impl.current;
    }
});
