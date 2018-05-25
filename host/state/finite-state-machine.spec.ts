import { FiniteStateMachine } from './finite-state-machine';
import * as tools from 'polpware-tinymce-tailor/src/util/Tools';

describe('can load js', () => {

    it('tools can be loaded', () => {
        expect(tools.map).toBeDefined();
    });

});

describe('finite state machine basic', () => {
    const p = new FiniteStateMachine();

    it('ctor', () => {
        expect(p).toBeDefined();
    });
});


describe('finite state working', () => {
    const p = new FiniteStateMachine();

    it('add state', (done) => {
        p.addState('n1', (evt) => {
            done();
        });

        p.setInitState('n1');
        p.start();
    });

});


describe('finite state transfer working', () => {
    const p = new FiniteStateMachine();

    p.addState('n1');

    p.addState('n2');

    it('transition', (done) => {
        p.addTransition('n1', 'n2', (evt) => {
            done();
        });

        p.setInitState('n1');
        p.start();
        p.go('n2');
    });

});


