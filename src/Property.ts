export const SLACK_WEBHOOK: string = getProp('SLACK_WEBHOOK');
export const SLACK_CHANNEL: string = getProp('SLACK_CHANNEL');
export const YAHOO_API: string = getProp('YAHOO_API');
export const SHEET_ID: string = getProp('SHEET_ID');
export const ONE = getProp('ONE');
export const TWO = getProp('TWO');
export const THREE = getProp('THREE');
export const RAIN = getProp('RAIN');

export const DO_GET = getProp('DO_GET_METHOD');
export const CODE_URL = getProp('CODE_URL');
export const MESSAGE = getProp('MESSAGE');

function getProp(name: string): string {
  const prop = PropertiesService.getScriptProperties();
  const ret = prop.getProperty(name);
  if (ret === null) {
    Logger.log(`property: ${name} が定義されていない`);
    throw new Error();
  }
  return ret;
}
