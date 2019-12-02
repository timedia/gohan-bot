import { do_get } from './Code';


declare const global: {
    [x: string]: any;
}

global.do_get = (e: any) => {
    return do_get(e)
}
