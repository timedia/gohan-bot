import "core-js/stable"
import { do_get } from './Code';


declare const global: {
    [x: string]: any;
}

global.doGet = (e: any) => {
    return do_get(e)
}
