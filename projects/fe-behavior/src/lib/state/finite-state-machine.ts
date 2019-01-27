/**
 * @fileOverview
 * Provides a class representing a finite state machine.
 * @author Xiaolong Tang <xxlongtang@gmail.com>
 * @license Copyright @me
 */
import * as dependencies from '@polpware/fe-dependencies';
import { replace as replaceStr } from '@polpware/fe-utilities';

// A set of helper functions
const _ = dependencies.underscore;
const StateMachine = dependencies['statemachine'];
const indexOf = _.indexOf;
const without = _.without;
const transitionKeyFormat = '{from}2{to}';
const errorMessageFormat = 'Transition {name} from {from} to {to} fails.';


function captialize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

interface IUnderlyImpl {
    state: string;
    is(stateName: string): boolean;
    cannot(transitionName: string): boolean;
    fire(transitionName: string): any;
}

interface ILifeCycleEvent {
    transition: string;
    from: string;
    to: string;
}

type MethodCallbackType = (ILifeCycleEvent) => void;
type ErrorHandlerType = (name: string, from: string, to: string) => void;

interface IStateSpecification {
    onEnterCallback?: MethodCallbackType;
    onLeaveCallback?: MethodCallbackType;
}

interface ITransitionSpecification {
    from: string;
    to: string;
    onBeforeCallback?: MethodCallbackType;
    onAfterCallback?: MethodCallbackType;
}

/**
 * Builds a handler with necessary context information.
 * The resulting return value is a closure indeed.
 */
function buildHandlerInClosure(context: { [key: string]: Array<MethodCallbackType> }, key: string) {
    return function() {
        const ourHandlers = context[key];
        if (!ourHandlers) {
            return;
        }
        for (let i = 0; i < ourHandlers.length; i++) {
            const func = ourHandlers[i];
            func.apply(null, arguments);
        }
    };
}

/**
 * Default error handler for the FSM.
 */
function defaultErrorHandler(eventName: string, from: string, to: string): void {
    const info = replaceStr(errorMessageFormat, {
        name: eventName,
        from: from,
        to: to
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
export class FiniteStateMachine {

    private _impl: IUnderlyImpl;
    private _initState: string;
    private _errorHandler: ErrorHandlerType;
    private _stateConfiguration: { [key: string]: IStateSpecification };
    private _transitionConfiguration: { [key: string]: ITransitionSpecification };
    private _handlers: { [key: string]: Array<MethodCallbackType> };

    constructor() {
        this._impl = null;
        this._initState = null;
        this._errorHandler = null;
        this._stateConfiguration = {};
        this._transitionConfiguration = {};
        this._handlers = {};
    }

    /**
     * Checks if FSM is in configuration stage.
     */
    private ensureConfigureStage() {
        if (this._impl) {
            throw new Error('State machine has started.');
        }
    }

    /**
     * Checks if FSM is in running stage.
     */
    private ensureRunningStage() {
        if (!this._impl) {
            throw new Error('State machine has not yet started.');
        }
    }

    /**
     * Defines the behavior when the FSM moves into a state by a transition.
     */
    addState(name: string,
        onEnterCallback?: MethodCallbackType,
        onLeaveCallback?: MethodCallbackType) {
        // Pre-conditions
        this.ensureConfigureStage();
        const stateConf = this._stateConfiguration;
        if (stateConf[name]) {
            throw new Error('Redefined state: ' + name);
        }
        stateConf[name] = {
            onEnterCallback: onEnterCallback,
            onLeaveCallback: onLeaveCallback
        };
        return this;
    }

    /**
     * Defines the init state for the FSM.
     */
    setInitState(name: string) {
        // Pre-conditions
        this.ensureConfigureStage();

        if (this._initState) {
            throw new Error('Redefined init state: ' + this._initState);
        }
        this._initState = name;
        return this;
    }

    /**
     * Defines a new stransition.
     */
    addTransition(from: string,
        to: string,
        onAfterCallback?: MethodCallbackType,
        onBeforeCallback?: MethodCallbackType) {
        // Pre-condition
        this.ensureConfigureStage();

        const stateConf = this._stateConfiguration;
        const transitionConf = this._transitionConfiguration;
        if (!stateConf[from]) {
            throw new Error('Undefined source state: ' + from);
        }
        if (!stateConf[to]) {
            throw new Error('Undefined target state: ' + to);
        }
        const key = replaceStr(transitionKeyFormat, { from: from, to: to });
        if (transitionConf[key]) {
            throw new Error('Redefined transition: ' + from + ' -> ' + to);
        }
        transitionConf[key] = {
            from: from, to: to,
            onAfterCallback: onAfterCallback,
            onBeforeCallback: onBeforeCallback
        };
        return this;
    }

    /**
     * Starts the FSM. Note that this method must be invoked before
     * any method which may change the state of the FSM.
     */
    start() {

        this.ensureConfigureStage();
        if (!this._initState) {
            throw new Error('Init state has not been defined.');
        }

        // Definition
        const stateConf: Object = this._stateConfiguration;
        const transitionConf: Object = this._transitionConfiguration;

        const transitions: Array<{ name: string, from: string, to: string }> = [];
        const methods: { [key: string]: MethodCallbackType } = {};

        for (const k1 in transitionConf) {
            if (transitionConf.hasOwnProperty(k1)) {
                const elem1 = transitionConf[k1];
                transitions.push({
                    name: k1,
                    from: elem1.from,
                    to: elem1.to
                });

                if (elem1.onAfterCallback) {
                    methods['onAfter' + captialize(k1)] = elem1.onAfterCallback;
                }
                if (elem1.onBeforeCallback) {
                    methods['onBefore' + captialize(k1)] = elem1.onAfterCallback;
                }
            }
        }

        for (const k2 in stateConf) {

            if (stateConf.hasOwnProperty(k2)) {
                const elem2 = stateConf[k2];

                if (elem2.onEnterCallback) {
                    methods['onEnter' + captialize(k2)] = elem2.onEnterCallback;
                }
                if (elem2.onLeaveCallback) {
                    methods['onLeave' + captialize(k2)] = elem2.onLeaveCallback;
                }
            }
        }

        const handlers = this._handlers;
        handlers.onEnterState = [];
        handlers.onLeaveState = [];

        methods['onEnterState'] = buildHandlerInClosure(this._handlers, 'onEnterState');
        methods['onLeaveState'] = buildHandlerInClosure(this._handlers, 'onLeaveState');

        this._impl = new StateMachine({
            init: this._initState,
            transitions: transitions,
            methods: methods,
            onInvalidTransition: this._errorHandler || defaultErrorHandler
        });
        return this;
    }

    /**
     * Registers a handler for enterstate
     */
    onEnterState(handler: MethodCallbackType) {
        const ourHandlers = this._handlers.onEnterState;
        if (indexOf(ourHandlers, handler) >= 0) {
            throw new Error('Re-registering a hander!');
        }
        ourHandlers.push(handler);
        return this;
    }

    /**
     * Registers a handler for exitstate
     */
    onExitState(handler: MethodCallbackType) {
        const ourHandlers = this._handlers.onLeaveState;
        if (indexOf(ourHandlers, handler) >= 0) {
            throw new Error('Registering a hander!');
        }
        ourHandlers.push(handler);
        return this;
    }

    /**
     * Un-register a handler for enterstate
     */
    offEnterState(handler: MethodCallbackType) {
        const ourHandlers = this._handlers.onEnterState;
        this._handlers.onenterstate = without(ourHandlers, handler);
        return this;
    }

    /**
     * Un-register a handler for exitstate
     */
    offExitState(handler: MethodCallbackType) {
        const ourHandlers = this._handlers.onLeaveState;
        this._handlers.onexitstate = without(ourHandlers, handler);
        return this;
    }

    /**
     * Performs a transition to the given state.
     * This method also validate the transition.
     */
    go(to: string) {
        this.ensureRunningStage();

        const stateConf = this._stateConfiguration;
        if (!stateConf[to]) {
            throw new Error('Go to undefined state: ' + to);
        }
        if (this._impl.is(to)) {
            // TODO: check if the underlying implementation takes into account
            // moving from one state to itself
            return this;
        }
        const currentState = this._impl.state;
        const transitionName = replaceStr(transitionKeyFormat, { from: currentState, to: to });
        // Validate if this transition is allowed or not
        if (this._impl.cannot(transitionName)) {
            throw new Error('Transition is not allowed: ' + currentState + ' -> ' + to);
        }

        // Invoke this function
        const func = this._impl[transitionName];
        func.call(this._impl);
        return self;
    }

    /**
     * Provides the error handler for the FSM.
     */
    addErrorHandler(fn: ErrorHandlerType) {
        this.ensureConfigureStage();

        this._errorHandler = fn;

        return this;
    }

    /**
     * Returns the current state.
     */
    current() {
        this.ensureRunningStage();
        return this._impl.state;
    }
}
