import 'core-js/stable';
import { do_get, set_trigger, main } from './Code';

declare const global: {
    [x: string]: any;
};

global.doGet = do_get;
global.set_trigger = (e: any) => {
    set_trigger();
};
global.main = (e: any) => {
    main();
};
